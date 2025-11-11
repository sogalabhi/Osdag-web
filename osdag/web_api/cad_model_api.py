"""
    This file includes the CAD Model Generation and CAD Conversion API
    Update input values in database.
        CAD Model API (class CADGeneration(View)):
            Accepts GET requests.
            Saves obj file as output in osdagclient/public/output-obj.obj 
            Returns ouput dir name as content_type text/plain.
            Request must provide session cookie id.
"""
from django.http import HttpResponse, JsonResponse, HttpRequest
from django.views import View
from osdag.models import Design
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from osdag_api import developed_modules, get_module_api
import shutil
import json
import os
import subprocess
from io import BytesIO

# rest_framework
from rest_framework import status
from rest_framework.response import Response

@method_decorator(csrf_exempt, name='dispatch')
class CADGeneration(View):
    """
        CAD Model API (class CADGeneration(View)):
            Accepts POST requests with input data and module information.
            Generates CAD models directly from input data without requiring sessions.
    """

    def post(self, request: HttpRequest):
        try:
            # Parse JSON request body
            import json
            request_data = json.loads(request.body)
            
            # Get module information and input values from request
            module_id = request_data.get('module_id')
            input_values = request_data.get('input_values')
            
            if not module_id:
                return JsonResponse({"status": "error", "message": "module_id is required"}, status=400)
            
            if not input_values:
                return JsonResponse({"status": "error", "message": "input_values are required"}, status=400)
            
            # Get module API
            module_api = get_module_api(module_id)
            
            # Determine session type from module_id
            module_type_mapping = {
                "FinPlateConnection": "FinPlateConnection",
                "Cleat-Angle-Connection": "CleatAngle", 
                "End-Plate-Connection": "EndPlate",
                "SeatedAngleConnection": "SeatedAngleConnection",
                "Cover-Plate-Bolted-Connection": "CoverPlateBolted",
                "Beam-Beam-End-Plate-Connection": "BeamBeamEndPlate",
                "Cover-Plate-Welded-Connection": "CoverPlateWelded",
                "Beam-to-Column-End-Plate-Connection": "BeamToColumnEndPlate",
                "Tension-Member-Bolted-Design": "TensionMember",
                "Tension-Member-Welded-Design": "TensionMember"

            }
            
            session_type = module_type_mapping.get(module_id)
            if not session_type:
                return JsonResponse({"status": "error", "message": f"Unknown module type: {module_id}"}, status=400)
                
        except json.JSONDecodeError:
            return JsonResponse({"status": "error", "message": "Invalid JSON in request body"}, status=400)
        except Exception as e:
            return JsonResponse({"status": "error", "message": f"Error parsing request: {str(e)}"}, status=500)
        
        # Directory setup
        current_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(os.path.dirname(current_dir))
    
        # Determine sections based on the session type and what each backend module expects
        if session_type == "FinPlateConnection":
            sections = ["Model", "Beam", "Column", "Plate"]
        elif session_type == "CleatAngle":
            sections = ["Model", "Beam", "Column", "cleatAngle"]
        elif session_type == "EndPlate":
            sections = ["Model", "Beam", "Column", "Plate"]
        elif session_type == "SeatedAngleConnection":
            sections = ["Model", "Beam", "Column", "SeatedAngle"]
        elif session_type == "CoverPlateBolted":
            sections = ["Model", "Beam", "Plate"]
        elif session_type == "BeamBeamEndPlate":
            sections = ["Model", "Beam", "EndPlate"]
        elif session_type == "CoverPlateWelded":
            sections = ["Model", "Beam", "Plate"]
        elif session_type == "BeamToColumnEndPlate":
            sections = ["Model", "Beam", "Column", "Connector"]
        elif session_type == "TensionMember":
            sections = ["Model", "Member", "Plate", "Endplate"]
        else:
            return JsonResponse({"status": "error", "message": "Unknown module type"}, status=400)
        
        # initialize the empty dictionary to hold model data and collect errors
        output_files = {}
        error_details = []
        print("Design sections: ", sections)
        
        # Generate a unique session identifier for this CAD generation
        import uuid
        session_id = str(uuid.uuid4())
        
        for section in sections:
            print(f'Generating section: {section}')
            try:
                if not hasattr(module_api, 'create_cad_model'):
                    error_details.append({"section": section, "error": "create_cad_model not implemented"})
                    continue
                path = module_api.create_cad_model(input_values, section, session_id)

                if not path:
                    print(f'Error generating {section}: create_cad_model() returned None or empty string')
                    continue  # Skip to the next section
                
                print(f'{section} generated successfully')

                # Prefer STL; fall back to BREP
                path_to_file = os.path.join(parent_dir, path)
                if not os.path.exists(path_to_file):
                    msg = f'Generated file for {section} does not exist at: {path_to_file}'
                    print(msg)
                    error_details.append({"section": section, "error": msg})
                    continue

                stl_path = path_to_file.replace(".brep", ".stl")
                import base64
                try:
                    if os.path.exists(stl_path):
                        with open(stl_path, "rb") as f:
                            b64 = base64.b64encode(f.read()).decode("ascii")
                        output_files[section] = f"data:application/octet-stream;base64,{b64}"
                        print(f"Loaded STL for {section}")
                    else:
                        with open(path_to_file, "rb") as f:
                            b64 = base64.b64encode(f.read()).decode("ascii")
                        output_files[section] = f"data:application/octet-stream;base64,{b64}"
                        print(f"Loaded BREP for {section}")

                    # If this is the merged Model, also try to include per-part STLs from manifest
                    if section == "Model":
                        try:
                            manifest_path = path_to_file.replace(".brep", ".parts.json")
                            if os.path.exists(manifest_path):
                                import json as _json
                                with open(manifest_path, "r", encoding="utf-8") as mf:
                                    manifest = _json.load(mf)
                                parts = manifest.get("parts", [])
                                for entry in parts:
                                    name = entry.get("name")
                                    stl_rel = entry.get("stlPath")
                                    brep_rel = entry.get("brepPath")
                                    if not name:
                                        continue
                                    # Prefer STL
                                    part_file_abs = None
                                    if stl_rel and os.path.exists(os.path.join(parent_dir, stl_rel)):
                                        part_file_abs = os.path.join(parent_dir, stl_rel)
                                    elif brep_rel and os.path.exists(os.path.join(parent_dir, brep_rel)):
                                        part_file_abs = os.path.join(parent_dir, brep_rel)
                                    if part_file_abs and name not in output_files:
                                        with open(part_file_abs, "rb") as pf:
                                            b64p = base64.b64encode(pf.read()).decode("ascii")
                                        output_files[name] = f"data:application/octet-stream;base64,{b64p}"
                                        print(f"Loaded part {name} from manifest")
                        except Exception as me:
                            print(f"Failed to load parts from manifest: {me}")
                except Exception as e:
                    print(f"Failed reading model file for {section}: {e}")
                    error_details.append({"section": section, "error": f"Failed reading file: {str(e)}"})
                    continue
                
            except Exception as e:
                print(f"Exception while generating {section}: {e}")
                error_details.append({"section": section, "error": str(e)})
                
        if not output_files:
            # Unprocessable due to inputs or environment; include details to aid debugging
            return JsonResponse({"status": "error", "message": "No CAD models were generated.", "errors": error_details}, status=422)
                
        # Build hover_dict if possible using module APIs (e.g., FinPlateConnection)
        hover_dict = {}
        try:
            if hasattr(module_api, 'create_from_input') and callable(module_api.create_from_input):
                mdl = module_api.create_from_input(input_values)
                cand = getattr(mdl, 'hover_dict', None)
                if isinstance(cand, dict) and len(cand) > 0:
                    hover_dict = cand
                else:
                    # Minimal fallback for Bolt info when detailed dict is not available
                    bolt_grade = None
                    bolt_dia = None
                    try:
                        grades = input_values.get('Bolt.Grade') or []
                        dias = input_values.get('Bolt.Diameter') or []
                        if isinstance(grades, list) and grades:
                            bolt_grade = grades[-1]
                        if isinstance(dias, list) and dias:
                            bolt_dia = dias[-1]
                    except Exception:
                        pass
                    if bolt_grade or bolt_dia:
                        parts = []
                        if bolt_grade:
                            parts.append(f"Grade: {bolt_grade}")
                        if bolt_dia:
                            parts.append(f"Diameter: {bolt_dia} mm")
                        hover_dict['Bolt'] = ' '.join(parts)
        except Exception as _e:
            # Ignore hover_dict build failures; not critical
            pass
        return JsonResponse({
            "status": "success",
            "files": output_files,
            "message": "CAD models generated successfully",
            "warnings": error_details,  # include any partial failures
            "hover_dict": hover_dict
        }, status=201)
