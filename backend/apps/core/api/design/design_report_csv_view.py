from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.utils.crypto import get_random_string
from django.http import FileResponse

from apps.modules.shear_connection.submodules.fin_plate.adapter import create_from_input as fin_plate_create_from_input
from apps.modules.shear_connection.submodules.end_plate.adapter import create_from_input as end_plate_create_from_input
from apps.modules.shear_connection.submodules.cleat_angle.adapter import create_from_input as cleat_angle_create_from_input
from apps.modules.shear_connection.submodules.seated_angle.adapter import create_from_input as seated_angle_create_from_input
from apps.modules.moment_connection.submodules.cover_plate_bolted.adapter import create_from_input as cover_plate_bolted_create_from_input
from apps.modules.moment_connection.submodules.beam_beam_end_plate.adapter import create_from_input as beam_beam_end_plate_create_from_input
from apps.modules.moment_connection.submodules.cover_plate_welded.adapter import create_from_input as cover_plate_welded_create_from_input
from apps.modules.moment_connection.submodules.beam_column_end_plate.adapter import create_from_input as beam_to_column_end_plate_create_from_input
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

class CreateDesignReport(APIView):

    def post(self, request):
        # Get metadata and design data from request
        metadata = request.data.get('metadata')
        module_id = request.data.get('module_id')
        input_values = request.data.get('input_values') 
        design_status = request.data.get('design_status', True)
        logs = request.data.get('logs', [])
        # Optional: sections to include (from UI customization popup) and other customization
        sections = request.data.get('sections')  # e.g., ["Introduction", "Inputs", "Outputs/Spacing"]
        customization = request.data.get('customization')  # generic dict for future options
        
        print('metadata:', metadata)
        print('module_id:', module_id)
        print('input_values:', input_values)
        
        # Map module IDs to their respective create_from_input functions
        module_function_map = {
            'FinPlateConnection': fin_plate_create_from_input,
            'End-Plate-Connection': end_plate_create_from_input,
            'Cleat-Angle-Connection': cleat_angle_create_from_input,
            'Seated-Angle-Connection': seated_angle_create_from_input,
            'Cover-Plate-Bolted-Connection': cover_plate_bolted_create_from_input,
            'Beam-Beam-End-Plate-Connection': beam_beam_end_plate_create_from_input,
            'Cover-Plate-Welded-Connection': cover_plate_welded_create_from_input,
            'Beam-to-Column-End-Plate-Connection': beam_to_column_end_plate_create_from_input,
            'Tension-Member-Bolted-Design': tension_member_bolted_create_from_input,
            'Tension-Member-Welded-Design': tension_member_welded_create_from_input
        }
        
        if not module_id or module_id not in module_function_map:
            return Response({"error": "Invalid or missing module_id"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not input_values:
            return Response({"error": "Missing input_values"}, status=status.HTTP_400_BAD_REQUEST)
            
        create_module_func = module_function_map[module_id]

        # obtain the currenct working directory as it gets changed in the osdag desktop code, then 
        # we will use the same value to bring it back to the current directory 
        current_directory = os.getcwd()
        print('current_directory : '  , current_directory)


        print('input_values type:', type(input_values))
        print('logs type:', type(logs))
        print('design_status:', design_status)

        if (metadata is None or metadata == ''):
            print('The metadata is None ')
            print('Setting the default metadata values')
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
            print('metadata final : ', json.dumps(metadata_final, indent=4))

        else : 
            # generate a random string for report id
            report_id = get_random_string(length=16)
            file_path = os.path.join(os.getcwd(), "file_storage", "design_report", report_id)
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
            print('metadata final : ' , metadata_final)
            # print('LogoFullPath : ' , metadata_final['CompanyLogo'])

        # check if the design_report folder has been created or not 
        # if not, create one 
        cwd = os.path.join(os.getcwd() , "file_storage/design_report/")
        print('cwd_path : ' , cwd)
        print("****")
        if(not os.path.exists):
            print('path does not exists, creating one : ', cwd)
            os.mkdir(cwd) 

        try:
            print('Creating module from input')
            print("*******")
            module = create_module_func(input_values)
            print("*$$$*", input_values)
            print("*$$$$$$$*", module)
            print("*******************")
        except Exception as e:
            print('Error while creating module:', e)

        try:
            print('generating the report .save_design')
            resultBoolean = module.save_design(metadata_final)
            print(resultBoolean)
        except Exception as e:
            print('e : ', e)
            resultBoolean = False  # Set default value if save_design fails
        
        if(resultBoolean):
            print('The LaTEX file has been created successfully')
        
        os.chdir(current_directory)
        print('cwd after chdir : ' , os.getcwd())

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
