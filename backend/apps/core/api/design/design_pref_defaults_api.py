"""
POST /api/design-preferences/defaults/

Resolve Additional Inputs defaults from current module + dock inputs. Keyed by core key and module id.
"""
from apps.core.permissions import IsEmailVerifiedIfAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.core.api.design.sync_merge import build_design_pref_defaults, lookup_sources, unchanged
from apps.core.design_dictionary import CORE_CLASSES
from apps.core.osdag_overrides import user_id_from_request, user_rows
from apps.core.utils.api_errors import error_response


class DesignPreferenceDefaults(APIView):
    permission_classes = [IsEmailVerifiedIfAuthenticated]

    def post(self, request):
        body = request.data if isinstance(request.data, dict) else {}
        module_id = body.get("module_id") or ""
        inputs = body.get("inputs") or {}
        if not module_id:
            return error_response('missing_field', "module_id is required", status.HTTP_400_BAD_REQUEST)

        try:
            if module_id not in CORE_CLASSES:
                default_pref_inputs, metadata, material_details, section_details = unchanged(module_id, inputs, "reset")
            else:
                # osdag_core computes some defaults from the selected material, so it must see custom rows too.
                with user_rows(user_id_from_request(request)):
                    default_pref_inputs, metadata, material_details, section_details = build_design_pref_defaults(
                        module_id=module_id,
                        inputs=inputs,
                        **lookup_sources(request.user),
                    )
        except Exception as exc:
            return error_response('internal_error', str(exc), status.HTTP_500_INTERNAL_SERVER_ERROR, success=False)

        return Response(
            {
                "success": True,
                "default_pref_inputs": default_pref_inputs,
                "metadata": metadata,
                "material_details": material_details,
                "section_details": section_details,
                "version": 1,
            },
            status=status.HTTP_200_OK,
        )
