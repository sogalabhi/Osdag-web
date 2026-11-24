"""
On-demand CAD export endpoint.

This regenerates the merged CAD shape from `input_values` in the module adapter and
exports the requested format (step/iges/brep/stl/ifc). IFC is produced in this view
from the generated BREP via `cad_export.export_ifc` (IfcOpenShell mesh).

The view is a DRF `APIView`: guests are limited by the `cad_export_anon` rate (10 a minute by default,
`THROTTLE_CAD_EXPORT_ANON_RATE`), signed-in users by the default user rate, and errors use the standard
format. Before any CAD is built the module id, the input values (the module's own
`validate_input`, as the design endpoint does), the format and the section are checked.
"""

import json
import logging
import os
import re
import uuid
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

from django.http import FileResponse
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from apps.core.design_dictionary import fill_request_prefs
from apps.core.module_finder import get_module_api
from apps.core.osdag_overrides import unknown_material_error, user_id_from_request, user_rows
from apps.core.utils.api_errors import error_response
from apps.core.utils.errors import OsdagApiException

EXPORT_FORMATS = ("step", "iges", "brep", "stl", "ifc")
# Section names are part names such as "Model" or "Plate 1": letters, digits, space, "_" and "-".
SECTION_PATTERN = re.compile(r"[A-Za-z0-9 _-]{1,64}")


def _resolve_file_path(path: str, repo_root: str, backend_root: str) -> str:
    """Resolve a relative or absolute file path to an absolute path."""
    if os.path.isabs(path):
        return path

    candidate_repo = os.path.join(repo_root, path)
    if os.path.exists(candidate_repo):
        return candidate_repo

    candidate_backend = os.path.join(backend_root, path)
    if os.path.exists(candidate_backend):
        return candidate_backend

    return candidate_repo


class CadExportAnonThrottle(AnonRateThrottle):
    """Guests: a tighter limit than the global anonymous rate, since a CAD build is expensive."""

    scope = "cad_export_anon"


class CADExport(APIView):
    """
    POST /api/design/exportCad

    Body:
      {
        "module_id": "...",
        "input_values": {...},
        "section": "Model" (optional),
        "format": "step" | "iges" | "brep" | "stl" | "ifc"
      }
    """

    permission_classes = [AllowAny]  # guests can export too, at a lower rate than signed-in users
    throttle_classes = [CadExportAnonThrottle, UserRateThrottle]

    def post(self, request):
        data = request.data
        if not isinstance(data, dict):
            return error_response('invalid_json', "Request body must be a JSON object", 400)

        module_id = data.get("module_id")
        input_values = data.get("input_values") or data.get("inputs")
        section = data.get("section") or "Model"
        format_type = data.get("format") or ""

        if not module_id:
            return error_response('missing_field', "module_id is required", 400)
        if not input_values:
            return error_response('missing_field', "input_values are required", 400)
        if not format_type:
            return error_response('missing_field', "format is required", 400)
        if not isinstance(format_type, str) or format_type.lower() not in EXPORT_FORMATS:
            return error_response('invalid_format', "Invalid format type requested", 400)
        format_type = format_type.lower()
        if not isinstance(section, str) or not SECTION_PATTERN.fullmatch(section):
            return error_response('invalid_section', "Invalid section name", 400)

        try:
            module_api = get_module_api(module_id) if isinstance(module_id, str) else None
        except KeyError:
            module_api = None
        if module_api is None:
            return error_response('unknown_module', "Unknown module", 400)

        if not isinstance(input_values, dict):
            return error_response('invalid_type', "input_values must be an object", 400)

        user_id = user_id_from_request(request)
        material_error = unknown_material_error(input_values, user_id)
        if material_error:
            return error_response('bad_request', material_error, 400)

        # Make the requesting user's custom sections/materials visible to osdag_core.
        with user_rows(user_id):
            # The export builds the design the Design button built: the core's Additional Inputs where unsaved.
            input_values = fill_request_prefs(input_values, module_id)
            try:
                # Same input checks as the design endpoint (raises the standard validation errors).
                module_api.validate_input(input_values)
            except OsdagApiException:
                raise
            except Exception:
                logger.exception("CAD export input check failed (module_id=%s)", module_id)
                return error_response('invalid_input', "The input values are not valid for this module", 400)
            return self._export(module_api, module_id, input_values, section, format_type)

    def _export(self, module_api, module_id: str, input_values: Dict[str, Any], section: str, format_type: str):
        # Resolve repo/back roots for file path handling
        current_dir = os.path.dirname(os.path.abspath(__file__))
        repo_root = os.path.abspath(os.path.join(current_dir, "../../../../../"))
        backend_root = os.path.join(repo_root, "backend")

        session_id = str(uuid.uuid4())

        export_formats = [format_type]

        # Call adapter to regenerate CAD and export requested format.
        # Adapter is expected to still write a merged brep and return its path. One call: the module
        # API passes `export_formats` only to adapters that take it, so there is no retry here.
        brep_path = module_api.create_cad_model(input_values, section, session_id, export_formats=export_formats)

        if not brep_path:
            return error_response('cad_export_failed', "CAD export failed: adapter returned empty brep_path", 422)

        brep_abs = _resolve_file_path(brep_path, repo_root, backend_root)

        # Derive output path even if adapter returns non-brep (some adapters prefer STL/STEP).
        def _swap_ext(abs_path: str, new_ext: str) -> str:
            for ext in (".brep", ".stl", ".step", ".iges", ".ifc"):
                if abs_path.lower().endswith(ext):
                    return abs_path[: -len(ext)] + new_ext
            # Fallback: attempt brep replace
            if ".brep" in abs_path:
                return abs_path.replace(".brep", new_ext)
            return abs_path

        if format_type == "ifc":
            from apps.core.utils.cad_export import export_ifc
            from apps.core.utils.report_image_generator import read_brep_file

            out_abs_path = os.path.normpath(_swap_ext(brep_abs, ".ifc"))
            try:
                shape = read_brep_file(brep_abs)
                export_ifc(shape, out_abs_path)
            except Exception as e:
                logger.exception(
                    "IFC export failed (module_id=%s, brep=%s, out=%s)",
                    module_id,
                    brep_abs,
                    out_abs_path,
                )
                return error_response('cad_export_failed', f"IFC export failed: {e!s}", 500)
        elif format_type == "brep":
            out_abs_path = _swap_ext(brep_abs, ".brep")
        elif format_type == "stl":
            out_abs_path = _swap_ext(brep_abs, ".stl")
        elif format_type == "step":
            out_abs_path = _swap_ext(brep_abs, ".step")
        elif format_type == "iges":
            out_abs_path = _swap_ext(brep_abs, ".iges")
        else:
            out_abs_path = _swap_ext(brep_abs, f".{format_type}")

        # Only a file inside the CAD storage folder is read or removed.
        storage_root = os.path.realpath(os.path.join(backend_root, "file_storage", "cad_models"))
        out_abs_path = os.path.realpath(out_abs_path)
        if not out_abs_path.startswith(storage_root + os.sep) or not os.path.isfile(out_abs_path):
            logger.error("[CADExport] Expected output file missing or outside the CAD storage folder")
            return error_response('file_not_found', f"{format_type.upper()} file does not exist.", 404)

        # Read into memory then delete - zero disk accumulation for on-demand exports
        from io import BytesIO
        with open(out_abs_path, "rb") as f:
            file_bytes = f.read()
        try:
            os.remove(out_abs_path)
            logger.info(f"[CADExport] Deleted temp file: {out_abs_path}")
        except Exception as e:
            logger.warning(f"[CADExport] Could not delete temp file {out_abs_path}: {e}")

        response = FileResponse(BytesIO(file_bytes), content_type="application/octet-stream")
        response["Content-Disposition"] = f'attachment; filename="{session_id}_{section}.{format_type}"'
        return response

