from rest_framework.views import APIView
from rest_framework.parsers import JSONParser
from django.http import FileResponse, JsonResponse
import os

class CADDownload(APIView):
    def post(self, request):
        try:
            # Parse format and section from JSON body
            data = JSONParser().parse(request)
            format_type = data.get('format')
            section = data.get('section')

            # Auto-detect session_id from cookies (same logic)
            fin_plate_cookie_id = request.COOKIES.get("fin_plate_connection_session")
            cleat_angle_cookie_id = request.COOKIES.get("cleat_angle_connection_session")
            end_plate_cookie_id = request.COOKIES.get("end_plate_connection_session")
            seated_angle_cookie_id = request.COOKIES.get("seated_angle_connection")
            cover_plate_bolted_cookie_id = request.COOKIES.get("cover_plate_bolted_connection_session")
            beam_beam_end_plate_cookie_id = request.COOKIES.get("beam_beam_end_plate_connection_session")
            tension_member_bolted_cookie_id = request.COOKIES.get("tension_member_bolted_design_session")

            # Determine the correct sessionId
            session_id = None
            if fin_plate_cookie_id:
                session_id = fin_plate_cookie_id
            elif cleat_angle_cookie_id:
                session_id = cleat_angle_cookie_id
            elif end_plate_cookie_id:
                session_id = end_plate_cookie_id
            elif seated_angle_cookie_id:
                session_id = seated_angle_cookie_id
            elif cover_plate_bolted_cookie_id:
                session_id = cover_plate_bolted_cookie_id
            elif beam_beam_end_plate_cookie_id:
                session_id = beam_beam_end_plate_cookie_id
            elif tension_member_bolted_cookie_id:
                session_id = tension_member_bolted_cookie_id

            if not session_id:
                return JsonResponse({"status": "error", "message": "No session cookie found."}, status=400)

            if not format_type or not section:
                return JsonResponse({"status": "error", "message": "Missing required parameters."}, status=400)

            allowed_formats = ["obj", "brep", "step", "iges"]
            if format_type.lower() not in allowed_formats:
                return JsonResponse({"status": "error", "message": "Invalid format type requested."}, status=400)

            # Path setup
            if format_type == "obj":
                file_path = os.path.join("osdagclient", "public", f"output-{section.lower()}.obj")
            else:
                file_path = os.path.join("file_storage", "cad_models", f"{session_id}_{section}.{format_type.lower()}")

            if not os.path.exists(file_path):
                return JsonResponse({"status": "error", "message": f"{format_type.upper()} file does not exist."}, status=404)

            # Serve file
            response = FileResponse(open(file_path, 'rb'), content_type='application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{session_id}_{section}.{format_type}"'
            return response

        except Exception as e:
            print(f"Download CAD error: {e}")
            return JsonResponse({"status": "error", "message": "Internal server error"}, status=500)