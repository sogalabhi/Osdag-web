from rest_framework.views import APIView
from rest_framework.parsers import JSONParser
from django.http import FileResponse, JsonResponse
import re
import uuid
from pathlib import Path
from apps.core.utils.api_errors import error_json_response

ALLOWED_FORMATS = ("obj", "brep", "step", "iges")
# Section names are part names such as "Model", "Beam" or "Bolt": letters, digits, "_" and "-" only.
SECTION_PATTERN = re.compile(r"[A-Za-z0-9_-]{1,64}")


def _storage_dir(format_type: str) -> Path:
    """Folder a download of this format must come from (relative to the working directory, like the generators)."""
    if format_type == "obj":
        return Path("frontend") / "public"
    return Path("file_storage") / "cad_models"

class CADDownload(APIView):
    def post(self, request):
        try:
            # Parse format, section, and request_id from JSON body
            # data = JSONParser().parse(request)
            data = request.data
            format_type = data.get('format')
            section = data.get('section')
            request_id = data.get('request_id')  # Use request_id instead of session

            # If no request_id provided, generate a unique one for this request
            if not request_id:
                request_id = str(uuid.uuid4())

            if not format_type or not section:
                return error_json_response('missing_field', "Missing required parameters.", 400)

            if not isinstance(format_type, str) or format_type.lower() not in ALLOWED_FORMATS:
                return error_json_response('invalid_format', "Invalid format type requested.", 400)
            format_type = format_type.lower()

            if not isinstance(section, str) or not SECTION_PATTERN.fullmatch(section):
                return error_json_response('invalid_section', "Invalid section name.", 400)

            # The request id is the UUID the backend issued for the design run.
            try:
                request_id = str(uuid.UUID(request_id)) if isinstance(request_id, str) else None
            except ValueError:
                request_id = None
            if request_id is None:
                return error_json_response('invalid_request_id', "Invalid request id.", 400)

            # The file is looked up among the entries of the storage folder by name, so the path that
            # is opened comes from the folder listing, never from the request. A symlink that points
            # outside the folder is not served.
            storage = _storage_dir(format_type).resolve()
            if format_type == "obj":
                file_name = f"output-{section.lower()}.obj"
            else:
                file_name = f"{request_id}_{section}.{format_type}"
            file_path = None
            if storage.is_dir():
                for entry in storage.iterdir():
                    if entry.name == file_name and entry.is_file() and entry.resolve().is_relative_to(storage):
                        file_path = entry
                        break
            if file_path is None:
                return error_json_response('file_not_found', f"{format_type.upper()} file does not exist.", 404)

            # Serve file
            response = FileResponse(open(file_path, 'rb'), content_type='application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{request_id}_{section}.{format_type}"'
            return response

        except Exception as e:
            print(f"Download CAD error: {e}")
            return error_json_response('internal_error', "Internal server error", 500)
