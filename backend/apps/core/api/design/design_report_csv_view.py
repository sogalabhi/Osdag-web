from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.utils.crypto import get_random_string
from django.http import FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from apps.modules.shear_connection.submodules.fin_plate.adapter import create_from_input as fin_plate_create_from_input
from apps.modules.shear_connection.submodules.end_plate.adapter import create_from_input as end_plate_create_from_input
from apps.modules.shear_connection.submodules.cleat_angle.adapter import create_from_input as cleat_angle_create_from_input
from apps.modules.shear_connection.submodules.seated_angle.adapter import create_from_input as seated_angle_create_from_input
from apps.modules.moment_connection.submodules.beam_beam_cover_plate_bolted.adapter import create_from_input as cover_plate_bolted_create_from_input
from apps.modules.moment_connection.submodules.beam_beam_cover_plate_welded.adapter import create_from_input as cover_plate_welded_create_from_input
from apps.modules.moment_connection.submodules.beam_beam_end_plate.adapter import create_from_input as beam_beam_end_plate_create_from_input
from apps.modules.moment_connection.submodules.beam_column_end_plate.adapter import create_from_input as beam_to_column_end_plate_create_from_input
from apps.modules.moment_connection.submodules.column_column_cover_plate_bolted.adapter import create_from_input as column_cover_plate_bolted_create_from_input
from apps.modules.moment_connection.submodules.column_column_cover_plate_welded.adapter import create_from_input as column_cover_plate_welded_create_from_input
from apps.modules.moment_connection.submodules.column_column_end_plate.adapter import create_from_input as column_end_plate_create_from_input
from apps.modules.tension_member.submodules.bolted.adapter import create_from_input as tension_member_bolted_create_from_input
from apps.modules.tension_member.submodules.welded.adapter import create_from_input as tension_member_welded_create_from_input
# importing models
from apps.core.models import Design

from django.core.files.storage import default_storage


# DRF imports
from rest_framework.parsers import MultiPartParser , FormParser
from rest_framework import status 


# other imports
import os
import platform
import subprocess
import json
import time
import uuid
import re

# Helper: filter LaTeX content based on selected sections (section or section/subsection)
def filter_latex_content(latex_content: str, selected_sections):
    if not selected_sections or not isinstance(selected_sections, (list, tuple)):
        return latex_content

    lines = latex_content.split('\n')
    filtered_lines = []
    current_section = None
    current_subsection = None
    include_content = True
    section_started = False

    for line in lines:
        section_match = re.search(r'\\section\{([^}]+)\}', line)
        if section_match:
            current_section = section_match.group(1).strip()
            current_subsection = None
            section_started = True
            include_content = (
                current_section in selected_sections or
                any(sel.startswith(f"{current_section}/") for sel in selected_sections)
            )

        subsection_match = re.search(r'\\subsection\{([^}]+)\}', line)
        if subsection_match and current_section:
            current_subsection = subsection_match.group(1).strip()
            subsection_key = f"{current_section}/{current_subsection}"
            include_content = (
                current_section in selected_sections or
                subsection_key in selected_sections
            )

        if (
            include_content or
            not section_started or
            line.startswith('\\documentclass') or
            line.startswith('\\usepackage') or
            line.startswith('\\title') or
            line.startswith('\\author') or
            line.startswith('\\date') or
            line.startswith('\\begin{document}') or
            line.startswith('\\maketitle') or
            line.startswith('\\end{document}')
        ):
            filtered_lines.append(line)

    return '\n'.join(filtered_lines)

@method_decorator(csrf_exempt, name='dispatch')
class CreateDesignReport(APIView):
    permission_classes = [AllowAny]

    def dispatch(self, request, *args, **kwargs):
        """Override dispatch to log all requests, even if blocked by permissions"""
        print("\n" + "=" * 60)
        print("CreateDesignReport.dispatch() called")
        print("=" * 60)
        print(f"   Request method: {request.method}")
        print(f"   Request path: {request.path}")
        print(f"   Request user: {request.user}")
        print(f"   User authenticated: {request.user.is_authenticated if hasattr(request.user, 'is_authenticated') else 'N/A'}")
        print(f"   Content-Type: {request.META.get('CONTENT_TYPE', 'N/A')}")
        print(f"   Authorization header: {'Present' if 'HTTP_AUTHORIZATION' in request.META else 'Missing'}")
        
        try:
            result = super().dispatch(request, *args, **kwargs)
            print(f"   ✅ Dispatch completed successfully")
            print(f"   Response status: {getattr(result, 'status_code', 'N/A')}")
            print("=" * 60)
            return result
        except Exception as e:
            print(f"   ❌ ERROR in dispatch:")
            print(f"   Exception type: {type(e).__name__}")
            print(f"   Exception message: {str(e)}")
            import traceback
            traceback.print_exc()
            print("=" * 60)
            raise

    def post(self, request):
        print("\n" + "=" * 60)
        print("CreateDesignReport.post() called")
        print("=" * 60)
        
        # Get metadata and design data from request
        metadata = request.data.get('metadata')
        module_id = request.data.get('module_id')
        input_values = request.data.get('input_values') 
        design_status = request.data.get('design_status', True)
        logs = request.data.get('logs', [])
        # Optional: sections to include (from UI customization popup) and other customization
        sections = request.data.get('sections')  # e.g., ["Introduction", "Inputs", "Outputs/Spacing"]
        customization = request.data.get('customization')  # generic dict for future options
        
        print(f"[CreateDesignReport] Step 1: Parsing request data...")
        print(f"   module_id: {module_id}")
        print(f"   design_status: {design_status}")
        print(f"   logs count: {len(logs) if isinstance(logs, list) else 'N/A'}")
        print(f"   sections: {sections}")
        print(f"   customization: {customization}")
        print(f"   metadata keys: {list(metadata.keys()) if isinstance(metadata, dict) else 'N/A'}")
        print(f"   input_values keys (first 10): {list(input_values.keys())[:10] if isinstance(input_values, dict) else 'N/A'}")
        
        # Map module IDs to their respective create_from_input functions
        module_function_map = {
            'FinPlateConnection': fin_plate_create_from_input,
            'EndPlateConnection': end_plate_create_from_input,
            'CleatAngleConnection': cleat_angle_create_from_input,
            'Seated-Angle-Connection': seated_angle_create_from_input,
            'Cover-Plate-Bolted-Connection': cover_plate_bolted_create_from_input,
            'Beam-Beam-End-Plate-Connection': beam_beam_end_plate_create_from_input,
            'Cover-Plate-Welded-Connection': cover_plate_welded_create_from_input,
            'Beam-to-Column-End-Plate-Connection': beam_to_column_end_plate_create_from_input,
            'ColumnCoverPlateBolted': column_cover_plate_bolted_create_from_input,
            'Column-to-Column-Cover-Plate-Welded-Connection': column_cover_plate_welded_create_from_input,
            'Column-to-Column-End-Plate-Connection': column_end_plate_create_from_input,
            'Tension-Member-Bolted-Design': tension_member_bolted_create_from_input,
            'Tension-Member-Welded-Design': tension_member_welded_create_from_input
        }
        
        print(f"\n[CreateDesignReport] Step 2: Validating module_id...")
        print(f"   module_id in map: {module_id in module_function_map if module_id else False}")
        print(f"   Available modules: {list(module_function_map.keys())}")
        
        if not module_id or module_id not in module_function_map:
            print(f"   ❌ ERROR: Invalid or missing module_id: {module_id}")
            return Response({"error": "Invalid or missing module_id"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not input_values:
            print(f"   ❌ ERROR: Missing input_values")
            return Response({"error": "Missing input_values"}, status=status.HTTP_400_BAD_REQUEST)
            
        create_module_func = module_function_map[module_id]
        print(f"   ✅ Module function found: {create_module_func.__name__}")
        print(f"   Module function location: {create_module_func.__module__}")

        # obtain the currenct working directory as it gets changed in the osdag desktop code, then 
        # we will use the same value to bring it back to the current directory 
        current_directory = os.getcwd()
        print(f"\n[CreateDesignReport] Step 3: Saving current directory...")
        print(f"   current_directory: {current_directory}")

        print(f"\n[CreateDesignReport] Step 4: Checking data types...")
        print(f"   input_values type: {type(input_values)}")
        print(f"   logs type: {type(logs)}")
        print(f"   design_status: {design_status}")
        if isinstance(input_values, dict):
            print(f"   input_values has 'Connectivity': {'Connectivity' in input_values}")
            if 'Connectivity' in input_values:
                print(f"   Connectivity value: {input_values['Connectivity']}")

        print(f"\n[CreateDesignReport] Step 5: Processing metadata...")
        if (metadata is None or metadata == ''):
            print('   ⚠️  The metadata is None or empty')
            print('   Setting the default metadata values')
            metadata_profile = {
                "CompanyName": "Your Company",
                "CompanyLogo": "",
                "Group/TeamName": "Your Team",
                "Designer": "You"
            }

            metadata_other = {
                "ProjectTitle": "Osdag",
                "Subtitle": "",
                "JobNumber": "1",
                "AdditionalComments": "No Comments",
                "Client": "Someone else",
            }
            # generate a random string for report id
            report_id = get_random_string(length=16)
            file_path = os.path.join(os.getcwd(), "file_storage", "design_report", report_id)

            # appenend the file path in the meta data
            metadata_final = {
                "ProfileSummary": metadata_profile, "filename": file_path}
            for key in metadata_other.keys():
                metadata_final[key] = metadata_other[key]

            metadata_final['does_design_exist'] = design_status
            # Convert logs to string format for LaTeX
            if logs and isinstance(logs, list):
                logger_string = '\n'.join([f"{log.get('timestamp', '')} - {log.get('type', 'INFO')} - {log.get('message', '')}" for log in logs])
            else:
                logger_string = "No logs available"
            metadata_final['logger_messages'] = logger_string
            # Attach optional UI customization
            if sections:
                metadata_final['selected_sections'] = sections
            if customization:
                metadata_final['customization'] = customization
            print(f"   ✅ Metadata final prepared with default values")
            print(f"   metadata final keys: {list(metadata_final.keys())}")

        else : 
            print(f"   ✅ Using provided metadata")
            # generate a random string for report id
            report_id = get_random_string(length=16)
            file_path = os.path.join(os.getcwd(), "file_storage", "design_report", report_id)
            print(f"   Generated report_id: {report_id}")
            print(f"   File path: {file_path}")
            metadata_final = metadata
            metadata_final['does_design_exist'] = design_status
            # Convert logs to string format for LaTeX
            if logs and isinstance(logs, list):
                logger_string = '\n'.join([f"{log.get('timestamp', '')} - {log.get('type', 'INFO')} - {log.get('message', '')}" for log in logs])
            else:
                logger_string = "No logs available"
            metadata_final['logger_messages'] = logger_string
            metadata_final['filename'] = file_path
            # Attach optional UI customization
            if sections:
                metadata_final['selected_sections'] = sections
            if customization:
                metadata_final['customization'] = customization
            print(f"   ✅ Metadata final prepared with provided values")
            print(f"   metadata final keys: {list(metadata_final.keys())}")
            # print('LogoFullPath : ' , metadata_final['CompanyLogo'])

        # check if the design_report folder has been created or not 
        # if not, create one 
        print(f"\n[CreateDesignReport] Step 6: Checking/creating design_report directory...")
        cwd = os.path.join(os.getcwd() , "file_storage/design_report/")
        print(f"   cwd_path: {cwd}")
        print(f"   Directory exists: {os.path.exists(cwd)}")
        if(not os.path.exists(cwd)):
            print(f"   ⚠️  Path does not exist, creating: {cwd}")
            os.makedirs(cwd, exist_ok=True)
            print(f"   ✅ Directory created")
        else:
            print(f"   ✅ Directory already exists") 

        print(f"\n[CreateDesignReport] Step 7: Creating module from input...")
        print(f"   Using function: {create_module_func.__name__}")
        print(f"   Input values count: {len(input_values) if isinstance(input_values, dict) else 'N/A'}")
        print(f"   Sample input keys: {list(input_values.keys())[:5] if isinstance(input_values, dict) else 'N/A'}")
        
        try:
            print(f"   Calling {create_module_func.__name__}(input_values)...")
            module = create_module_func(input_values)
            print(f"   ✅ Module created successfully!")
            print(f"   Module type: {type(module)}")
            print(f"   Module object: {module}")
            if hasattr(module, 'module'):
                print(f"   module.module attribute: {module.module}")
                print(f"   module.module type: {type(module.module)}")
                # Check if module.module matches KEY_DISP_FINPLATE
                from osdag_core.Common import KEY_DISP_FINPLATE
                print(f"   KEY_DISP_FINPLATE constant: '{KEY_DISP_FINPLATE}'")
                print(f"   module.module == KEY_DISP_FINPLATE: {module.module == KEY_DISP_FINPLATE}")
            if hasattr(module, 'connectivity'):
                print(f"   module.connectivity: {module.connectivity}")
            if hasattr(module, 'logger'):
                print(f"   module.logger exists: {hasattr(module, 'logger')}")
                if hasattr(module, 'logger'):
                    print(f"   Logger name: {getattr(module.logger, 'name', 'N/A')}")
        except Exception as e:
            print(f"   ❌ ERROR while creating module:")
            print(f"   Exception type: {type(e).__name__}")
            print(f"   Exception message: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

        # ------------------------------------------------------------
        # Normalize metadata/logs for legacy save_design()
        # The desktop report code expects string fields and may call
        # .split() on them; make sure we don't pass lists/dicts.
        # ------------------------------------------------------------
        try:
            raw_logs = metadata_final.get('logs')
            if isinstance(raw_logs, list):
                normalized_lines = []
                for log in raw_logs:
                    if isinstance(log, dict):
                        ts = log.get('timestamp', '')
                        lvl = log.get('type', 'INFO')
                        msg = log.get('message', '')
                        normalized_lines.append(f"{ts} - {lvl} - {msg}")
                    else:
                        normalized_lines.append(str(log))
                metadata_final['logs'] = "\n".join(normalized_lines)

            # Ensure logger_messages is a plain string
            if isinstance(metadata_final.get('logger_messages'), list):
                metadata_final['logger_messages'] = "\n".join(
                    str(x) for x in metadata_final['logger_messages']
                )
        except Exception as norm_exc:
            # Don't fail report generation just because normalization failed;
            # log and continue with original metadata.
            print('WARN: error normalizing metadata/logs before save_design:', norm_exc)

        print(f"\n[CreateDesignReport] Step 7.5: Ensuring module.module is set correctly...")
        from osdag_core.Common import KEY_DISP_FINPLATE, KEY_DISP_ENDPLATE
        print(f"   Current module.module: {getattr(module, 'module', 'N/A')}")
        print(f"   KEY_DISP_FINPLATE: '{KEY_DISP_FINPLATE}'")
        print(f"   KEY_DISP_ENDPLATE: '{KEY_DISP_ENDPLATE}'")
        
        # Fix module.module if it doesn't match KEY_DISP_FINPLATE or KEY_DISP_ENDPLATE
        # This is needed for parent save_design() to set report_input
        if hasattr(module, 'module'):
            if module.module == 'FinPlateConnection' and module_id == 'FinPlateConnection':
                print(f"   ⚠️  module.module is 'FinPlateConnection', setting to KEY_DISP_FINPLATE...")
                module.module = KEY_DISP_FINPLATE
                print(f"   ✅ Set to: '{module.module}'")
            elif module.module == 'EndPlateConnection' and module_id == 'EndPlateConnection':
                print(f"   ⚠️  module.module is 'EndPlateConnection', setting to KEY_DISP_ENDPLATE...")
                module.module = KEY_DISP_ENDPLATE
                print(f"   ✅ Set to: '{module.module}'")
            else:
                print(f"   ✅ module.module is already correct: '{module.module}'")
        
        print(f"\n[CreateDesignReport] Step 7.6: Running design calculation (if needed)...")
        print(f"   Module design_status: {getattr(module, 'design_status', 'N/A')}")
        print(f"   Module has 'load' attribute: {hasattr(module, 'load')}")
        print(f"   Module has 'bolt' attribute: {hasattr(module, 'bolt')}")
        
        # Check if design has been run - output_values() typically triggers design
        # But for report generation, we need to ensure design is complete
        try:
            print(f"   Checking if design needs to be run...")
            # Try calling output_values to trigger design if not already done
            if not getattr(module, 'design_status', False):
                print(f"   ⚠️  Design status is False, calling output_values() to trigger design...")
                try:
                    _ = module.output_values(True)
                    print(f"   ✅ output_values() called, design should be complete now")
                    print(f"   New design_status: {getattr(module, 'design_status', 'N/A')}")
                except Exception as design_err:
                    print(f"   ⚠️  Warning: output_values() raised exception (may be OK): {design_err}")
            else:
                print(f"   ✅ Design status is True, design already complete")
        except Exception as check_err:
            print(f"   ⚠️  Warning checking design status: {check_err}")
        
        print(f"\n[CreateDesignReport] Step 8: Generating report (calling save_design)...")
        print(f"   Metadata keys: {list(metadata_final.keys())[:10]}")
        print(f"   File path: {file_path}")
        print(f"   Expected .tex file: {file_path}.tex")
        print(f"   Module.module attribute: {getattr(module, 'module', 'N/A')}")
        print(f"   Module.mainmodule attribute: {getattr(module, 'mainmodule', 'N/A')}")
        print(f"   Module.connectivity: {getattr(module, 'connectivity', 'N/A')}")
        print(f"   Module has 'report_input' before save_design: {hasattr(module, 'report_input')}")
        print(f"   Module has 'load' attribute: {hasattr(module, 'load')}")
        if hasattr(module, 'load'):
            print(f"   Module.load type: {type(module.load)}")
            print(f"   Module.load.shear_force: {getattr(module.load, 'shear_force', 'N/A')}")
            print(f"   Module.load.axial_force: {getattr(module.load, 'axial_force', 'N/A')}")
        else:
            print(f"   ❌ ERROR: Module has no 'load' attribute!")
        print(f"   Module has 'bolt' attribute: {hasattr(module, 'bolt')}")
        if hasattr(module, 'bolt'):
            print(f"   Module.bolt type: {type(module.bolt)}")
            print(f"   Module.bolt.bolt_diameter: {getattr(module.bolt, 'bolt_diameter', 'N/A')}")
            print(f"   Module.bolt.bolt_diameter type: {type(getattr(module.bolt, 'bolt_diameter', None))}")
        else:
            print(f"   ❌ ERROR: Module has no 'bolt' attribute!")
        print(f"   Module has 'plate' attribute: {hasattr(module, 'plate')}")
        if hasattr(module, 'plate'):
            print(f"   Module.plate type: {type(module.plate)}")
            print(f"   Module.plate.thickness: {getattr(module.plate, 'thickness', 'N/A')}")
        else:
            print(f"   ❌ ERROR: Module has no 'plate' attribute!")
        print(f"   Module has 'supported_section' attribute: {hasattr(module, 'supported_section')}")
        print(f"   Module has 'supporting_section' attribute: {hasattr(module, 'supporting_section')}")
        
        try:
            print(f"   Calling module.save_design(metadata_final)...")
            resultBoolean = module.save_design(metadata_final)
            print(f"   ✅ save_design() returned: {resultBoolean}")
            print(f"   Result type: {type(resultBoolean)}")
        except Exception as e:
            # Legacy desktop save_design sometimes raises even after writing .tex,
            # for example when it calls .split() on an internal list.
            # Treat this as non-fatal if the expected LaTeX file was created.
            print(f"   ⚠️  WARNING: save_design() raised exception:")
            print(f"   Exception type: {type(e).__name__}")
            print(f"   Exception message: {str(e)}")
            import traceback
            traceback.print_exc()
            
            tex_path = f'{file_path}.tex'
            print(f"   Checking if LaTeX file exists at: {tex_path}")
            if os.path.exists(tex_path):
                print(f"   ✅ LaTeX file exists despite exception - treating as success")
                resultBoolean = True
            else:
                print(f"   ❌ LaTeX file does not exist - treating as failure")
                resultBoolean = False  # Set default value if save_design fails and no file
        
        print(f"\n[CreateDesignReport] Step 9: Verifying report generation...")
        if(resultBoolean):
            print(f"   ✅ Report generation successful!")
            tex_path = f'{file_path}.tex'
            print(f"   Checking LaTeX file: {tex_path}")
            if os.path.exists(tex_path):
                file_size = os.path.getsize(tex_path)
                print(f"   ✅ LaTeX file exists, size: {file_size} bytes")
            else:
                print(f"   ⚠️  LaTeX file not found at expected path")
        else:
            print(f"   ❌ Report generation failed (resultBoolean=False)")
        
        print(f"\n[CreateDesignReport] Step 10: Restoring working directory...")
        os.chdir(current_directory)
        print(f"   cwd after chdir: {os.getcwd()}")

        print("***")
        if (resultBoolean):
            print("**")
            print('inside sleep')
            time.sleep(3)
            isExists = os.path.exists(f'{file_path}.tex')
            print('report path : ' , f'{file_path}.tex')
            print('isExists : ' , isExists)
            # If sections provided, post-filter LaTeX file to include only selected sections
            try:
                if sections:
                    tex_path = f'{file_path}.tex'
                    with open(tex_path, 'r', encoding='utf-8') as rf:
                        original_tex = rf.read()
                    filtered_tex = filter_latex_content(original_tex, sections)
                    with open(tex_path, 'w', encoding='utf-8') as wf:
                        wf.write(filtered_tex)
                    print('Applied section filtering to LaTeX file')
            except Exception as e:
                print('WARN: Failed to apply section filtering:', e)

            # open and read the file contents (for debug only)
            f = open(f'{os.getcwd()}/file_storage/design_report/{report_id}.tex', 'rb')

            return Response({'success': 'Design report created', 'report_id': report_id, 'fileContents : ': f}, status=status.HTTP_201_CREATED)

        elif(not resultBoolean): 
            print('Error in generating the desing_report')
            return Response({"message" : "Error in generating the design report"})


class GetPDF(APIView):

    def get(self, request):
        print('Inside get PDF')

        # obtain the param from the Query
        report_id = request.GET.get('report_id')
        print('report_id:', report_id)

        # TeX source filename
        tex_filename = f'{report_id}.tex'
        filename, ext = os.path.splitext(tex_filename)
        print('filename:', filename)
        # the corresponding PDF filename
        pdf_filename = filename + '.pdf'

        # change the working directory
        path = os.getcwd()
        print('pdf path : ' , pdf_filename)
        os.chdir(path)
        print('current path after chdir : ' , path)
        pdfFilePath = f'{os.getcwd()}/file_storage/design_report/{report_id}.pdf'
        print('pdfFilePath : ' , pdfFilePath)

        # compile TeX file for different operating systems
        if platform.system().lower() == 'windows':
            subprocess.run(['cmd', '/c', 'echo', '%cd%'])
            subprocess.run(
                ['pdflatex', '-interaction=nonstopmode', tex_filename])
        else:
            subprocess.run(['pwd'])
            subprocess.run(
                ['pdflatex', '-interaction=nonstopmode', tex_filename])

        # check if PDF is successfully generated
        if not os.path.exists(pdfFilePath):
            raise RuntimeError('PDF output not found')

        # open PDF with platform-specific command
        if platform.system().lower() == 'darwin':
            subprocess.run(['open', pdfFilePath])
        elif platform.system().lower() == 'windows':
            os.startfile(pdfFilePath)
        elif platform.system().lower() == 'linux':
            subprocess.run(['xdg-open', pdfFilePath])
        else:
            raise RuntimeError(
                'Unknown operating system "{}"'.format(platform.system()))

        # delete the extra aux, log files, tex files generated in design_report
        print('getcwd : ' , os.getcwd())
        try:
            # delete the following paths onyl when the pdf file is created 
            if(os.path.exists(f'{os.getcwd()}/file_storage/design_report/{report_id}.pdf')) : 
                os.remove(f'{os.getcwd()}/file_storage/design_report/{report_id}.aux')
                os.remove(f'{os.getcwd()}/file_storage/design_report/{report_id}.log')
                os.remove(f'{os.getcwd()}/file_storage/design_report/{report_id}.tex')
            else : 
                print('the pdf file is being created, cannot remove the other files')
        except Exception as e:
            print('e:', e)

        # Return the PDF file as a response
        # pdf_path = f'{os.getcwd()}/{report_id}.pdf'
        response = FileResponse(open(pdfFilePath, 'rb'))
        response['Content-Type'] = 'application/pdf'
        response['Content-Disposition'] = f'attachment; filename="{report_id}.pdf"'
        for key, value in response.items():
            print(f'{key}: {value}')
        return response


class CompanyLogoView(APIView) : 
    parser_classes = (MultiPartParser , FormParser)

    def post(self, request):
        print('inside company logo post') 
        # check cookie
        try:
            cookie_id = request.COOKIES.get('fin_plate_connection_session')
            print('cookie id in companyLogo:', cookie_id)
        except Exception as e:
            print('e:', e)

        # obtain the file 
        print('request data : ' , request.data)
        file = request.data['file']
        
        # generate a unique name for the file 
        fileName = ''.join(str(uuid.uuid4()).split('-')) + ".png"
        print('fileName created : ' , fileName)
        currentDirectory = os.getcwd()
        
        # create the png file 
        try :       
            with open(currentDirectory+"/file_storage/company_logo/"+fileName , 'w') as fp : 
                pass 
        except : 
            print('Error in creating the image file')

        print('currentWorkingDirectory : ' , currentDirectory)
        try : 
            with default_storage.open(currentDirectory+"/file_storage/company_logo/"+fileName, 'wb+') as destination : 
                for chunk in file.chunks() :                 
                    destination.write(chunk)
            print('file saved')

            # full path of the company logo w.r.t the Project 
            logoFullPath = currentDirectory+"/file_storage/company_logo/"+fileName
            print('logoFullPath : ' , logoFullPath)
            return Response({'message' : 'successfully saved file' , 'logoFullPath' : logoFullPath} , status = status.HTTP_201_CREATED)
        except : 
            print('Error in saving the file ')

            return Response({'message' : 'Error in saving the file'} , status = status.HTTP_400_BAD_REQUEST)
