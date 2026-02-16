"""
Report Customization API

This module provides APIs for customizing design reports by allowing users to:
1. Parse sections from generated LaTeX reports
2. Filter content based on selected sections
3. Generate customized PDFs

Author: AI Assistant
"""

import os
import re
import tempfile
import subprocess
import shutil
import platform
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.http import FileResponse
from django.core.files.storage import default_storage
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator


class LaTeXParser:
    """
    Parses LaTeX files to extract document structure.
    
    This class finds all \section{} and \subsection{} commands in a LaTeX
    document and organizes them into a hierarchical structure.
    """
    
    def parse_sections(self, latex_content):
        """
        Extract sections and subsections from LaTeX content.
        
        Args:
            latex_content (str): Raw LaTeX document content
            
        Returns:
            dict: Hierarchical structure of sections and subsections
        """
        sections = {}
        current_section = None
        
        # Process each line to find LaTeX section commands
        for line in latex_content.split('\n'):
            # Look for \section{Section Name} patterns
            section_match = re.search(r'\\section\{([^}]+)\}', line)
            if section_match:
                current_section = section_match.group(1).strip()
                sections[current_section] = []  # Initialize subsection list
                
            # Look for \subsection{Subsection Name} patterns
            subsection_match = re.search(r'\\subsection\{([^}]+)\}', line)
            if subsection_match and current_section:
                subsection = subsection_match.group(1).strip()
                sections[current_section].append(subsection)
                
        return sections


class LaTeXFilter:
    """
    Filters LaTeX content based on selected sections.
    """
    
    def filter_content(self, latex_content, selected_sections):
        """
        Remove unselected sections from LaTeX content.
        
        Args:
            latex_content (str): Original LaTeX content
            selected_sections (list): List of selected sections/subsections
            
        Returns:
            str: Filtered LaTeX content
        """
        if not selected_sections or not isinstance(selected_sections, (list, tuple)):
            return latex_content
            
        lines = latex_content.split('\n')
        filtered_lines = []
        current_section = None
        current_subsection = None
        include_content = True
        section_started = False
        
        for line in lines:
            # Check for new section
            section_match = re.search(r'\\section\{([^}]+)\}', line)
            if section_match:
                current_section = section_match.group(1).strip()
                current_subsection = None
                section_started = True
                # Include section if it's selected OR if any of its subsections are selected
                include_content = (current_section in selected_sections or
                                 any(sel.startswith(f"{current_section}/") for sel in selected_sections))
                
            # Check for subsection
            subsection_match = re.search(r'\\subsection\{([^}]+)\}', line)
            if subsection_match and current_section:
                current_subsection = subsection_match.group(1).strip()
                subsection_key = f"{current_section}/{current_subsection}"
                # Include subsection only if specifically selected OR parent section is fully selected
                include_content = (current_section in selected_sections or
                                 subsection_key in selected_sections)
                
            # Always include document structure and preamble
            if (include_content or
                not section_started or  # Include everything before first section
                line.startswith('\\documentclass') or
                line.startswith('\\usepackage') or
                line.startswith('\\title') or
                line.startswith('\\author') or
                line.startswith('\\date') or
                line.startswith('\\begin{document}') or
                line.startswith('\\maketitle') or
                line.startswith('\\end{document}')):
                filtered_lines.append(line)
                
        return '\n'.join(filtered_lines)


@method_decorator(csrf_exempt, name='dispatch')
class ParseReportSections(APIView):
    """
    API endpoint to parse sections from a generated LaTeX report.
    
    POST /api/report/parse-sections/
    Body: {"report_id": "string"}
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            print('[report_customization_api] ParseReportSections:request', request.data)
            report_id = request.data.get('report_id')
            if not report_id:
                return Response(
                    {"error": "report_id is required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if LaTeX file exists
            tex_file_path = os.path.join(os.getcwd(), 'file_storage', 'design_report', f'{report_id}.tex')
            if not os.path.exists(tex_file_path):
                return Response(
                    {"error": "LaTeX file not found. Please generate report first."}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Read LaTeX content
            with open(tex_file_path, 'r', encoding='utf-8') as f:
                latex_content = f.read()
            
            # Parse sections
            parser = LaTeXParser()
            sections = parser.parse_sections(latex_content)
            
            if not sections:
                return Response(
                    {"error": "No sections found in LaTeX file"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            response_payload = {
                "success": True,
                "sections": sections,
                "report_id": report_id
            }
            print('[report_customization_api] ParseReportSections:response', { 'report_id': report_id, 'sections_keys': list(sections.keys()) })
            return Response(response_payload, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to parse sections: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class CustomizeReport(APIView):
    """
    API endpoint to generate customized PDF with selected sections.
    
    POST /api/report/customize/
    Body: {
        "report_id": "string",
        "selected_sections": ["Section1", "Section2/Subsection1", ...]
    }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            print('[report_customization_api] CustomizeReport:starting')
            print('[report_customization_api] CustomizeReport:request', request.data)
            report_id = request.data.get('report_id')
            selected_sections = request.data.get('selected_sections', [])
            print('[report_customization_api] CustomizeReport:parsed', {'report_id': report_id, 'selected_count': len(selected_sections)})
            
            if not report_id:
                return Response(
                    {"error": "report_id is required"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if LaTeX file exists
            tex_file_path = os.path.join(os.getcwd(), 'file_storage', 'design_report', f'{report_id}.tex')
            if not os.path.exists(tex_file_path):
                return Response(
                    {"error": "LaTeX file not found. Please generate report first."}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Read original LaTeX content
            print('[report_customization_api] CustomizeReport:reading file')
            with open(tex_file_path, 'r', encoding='utf-8') as f:
                original_latex = f.read()
            print('[report_customization_api] CustomizeReport:file read', {'length': len(original_latex)})
            
            # Filter content based on selected sections
            print('[report_customization_api] CustomizeReport:creating filter')
            filter_obj = LaTeXFilter()
            print('[report_customization_api] CustomizeReport:filtering content')
            filtered_latex = filter_obj.filter_content(original_latex, selected_sections)
            filtered_latex = filtered_latex.replace(
    		r"\usepackage{lastpage}",
    		r"\usepackage{pageslts}"
	    )
            filtered_latex = filtered_latex.replace(
    		r"\pageref{LastPage}",
    		r"\lastpageref{pagesLTS.lastpage}"
            )
            filtered_latex = (
                filtered_latex
                .lstrip('\ufeff')
                .replace('\r\n', '\n')
                .replace('\r', '\n')
            )
            print('[report_customization_api] CustomizeReport:filter', { 'report_id': report_id, 'selected_count': len(selected_sections) })
            print('[report_customization_api] CustomizeReport:filtered content length', len(filtered_latex))
            print('[report_customization_api] CustomizeReport:filtered content preview', filtered_latex[:200])
            
            # Use fixed temp directory to overwrite each time (matching desktop behavior)
            print('[report_customization_api] CustomizeReport:creating temp dir')
            # safe_temp_dir = os.path.join(tempfile.gettempdir(), "osdag_pdf_compile")
            safe_temp_dir = tempfile.mkdtemp(prefix="osdag_pdf_")
            print('[report_customization_api] CustomizeReport:temp dir path', safe_temp_dir)
            try:
                if os.path.exists(safe_temp_dir):
                    print('[report_customization_api] CustomizeReport:removing existing temp dir')
                    shutil.rmtree(safe_temp_dir, ignore_errors=True)
                print('[report_customization_api] CustomizeReport:creating temp dir')
                os.makedirs(safe_temp_dir, exist_ok=True)
                print('[report_customization_api] CustomizeReport:temp dir created successfully')
            except Exception as e:
                print('[report_customization_api] CustomizeReport:temp dir error', str(e))
                raise
            
            # Write filtered LaTeX to fixed directory
            print('[report_customization_api] CustomizeReport:writing filtered tex')
            custom_tex_path = os.path.join(safe_temp_dir, "filtered_report.tex")
            print('[report_customization_api] CustomizeReport:custom tex path', custom_tex_path)
            try:
                print("custom_tex_path:", custom_tex_path)
                print("parent dir exists:", os.path.exists(os.path.dirname(custom_tex_path)))
                print("parent dir writable:", os.access(os.path.dirname(custom_tex_path), os.W_OK))
                with open(custom_tex_path, 'w', encoding='utf-8') as f:
                    f.write(filtered_latex)
                print('[report_customization_api] CustomizeReport:filtered tex written successfully')
            except Exception as e:
                print('[report_customization_api] CustomizeReport:file write error', str(e))
                raise
            
            # Compile LaTeX to PDF
            pdf_path = custom_tex_path.replace('.tex', '.pdf')
            
            # Change to temp directory for compilation
            original_cwd = os.getcwd()
            os.chdir(safe_temp_dir)
            
            try:
                print(f'[report_customization_api] CustomizeReport:compiling in {os.getcwd()}')
                print(f'[report_customization_api] CustomizeReport:tex file exists: {os.path.exists("filtered_report.tex")}')
                
                # Compile LaTeX - use system pdflatex (same as working design_report_csv_view.py)
                print(f'[report_customization_api] CustomizeReport:using system pdflatex')
                
                # Check if pdflatex is available
                try:
                    subprocess.run(['pdflatex', '--version'], capture_output=True, text=True, timeout=10)
                    print('[report_customization_api] CustomizeReport:pdflatex is available')
                except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError):
                    print('[report_customization_api] CustomizeReport:pdflatex not found, trying alternative approach')
                    return Response(
                        {"error": "LaTeX (pdflatex) not found. Please install a LaTeX distribution like MiKTeX or TeX Live."}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
                try:
                    if platform.system().lower() == 'windows':
                        print('[report_customization_api] CustomizeReport:running pdflatex on windows')
                        result = subprocess.run([
                            'pdflatex', '-interaction=nonstopmode', 
                            'filtered_report.tex'
                        ], capture_output=True, text=True, timeout=60)
                    else:
                        print('[report_customization_api] CustomizeReport:running pdflatex on unix')
                        result = subprocess.run([
                            'pdflatex', '-interaction=nonstopmode', 
                            'filtered_report.tex'
                        ], capture_output=True, text=True, timeout=60)
                except subprocess.TimeoutExpired as e:
                    print(f'[report_customization_api] CustomizeReport:pdflatex timeout: {e}')
                    raise
                except subprocess.CalledProcessError as e:
                    print(f'[report_customization_api] CustomizeReport:pdflatex process error: {e}')
                    raise
                except Exception as e:
                    print(f'[report_customization_api] CustomizeReport:pdflatex general error: {e}')
                    raise
                
                print(f'[report_customization_api] CustomizeReport:pdflatex result: {result.returncode}')
                print(f'[report_customization_api] CustomizeReport:stdout: {result.stdout[:200]}')
                print(f'[report_customization_api] CustomizeReport:stderr: {result.stderr[:200]}')
                
                # Check if PDF was generated successfully
                # if result.returncode == 0 and os.path.exists(pdf_path):
                if os.path.exists(pdf_path):
                    print('[report_customization_api] CustomizeReport:pdflatex:success', { 'report_id': report_id, 'pdf_path': pdf_path })
                    # Return PDF file
                    response = FileResponse(
                        open(pdf_path, 'rb'),
                        content_type='application/pdf',
                        filename=f'osdag_custom_report_{report_id}.pdf'
                    )
                    return response
                else:
                    print('[report_customization_api] CustomizeReport:pdflatex:failure', { 'code': result.returncode })
                    error_msg = "PDF compilation failed"
                    if result.stderr:
                        error_msg += f"\n\nErrors:\n{result.stderr[:500]}"
                    if result.stdout:
                        error_msg += f"\n\nOutput:\n{result.stdout[:500]}"
                    
                    return Response(
                        {"error": error_msg}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                    
            except subprocess.TimeoutExpired:
                return Response(
                    {"error": "PDF compilation timed out (>60s)"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            except FileNotFoundError:
                return Response(
                    {"error": "LaTeX (pdflatex) not found. Please install a LaTeX distribution."}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            finally:
                # Restore original working directory
                os.chdir(original_cwd)
                
        except Exception as e:
            return Response(
                {"error": f"Failed to customize report: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class GenerateInitialReport(APIView):
    """
    API endpoint to generate initial LaTeX report without PDF compilation.
    This is used for the first popup to generate LaTeX and get sections.
    
    POST /api/report/generate-initial/
    Body: {
        "metadata": {...},
        "module_id": "string",
        "input_values": {...},
        "design_status": boolean,
        "logs": [...]
    }
    """
    permission_classes = [AllowAny]
    
    def dispatch(self, request, *args, **kwargs):
        """Override dispatch to log all requests, even if blocked by permissions"""
        print("\n" + "=" * 60)
        print("GenerateInitialReport.dispatch() called")
        print("=" * 60)
        print(f"   Request method: {request.method}")
        print(f"   Request path: {request.path}")
        print(f"   Request user: {request.user}")
        print(f"   User authenticated: {request.user.is_authenticated if hasattr(request.user, 'is_authenticated') else 'N/A'}")
        print(f"   Request META keys (sample): {list(request.META.keys())[:10]}")
        print(f"   Content-Type: {request.META.get('CONTENT_TYPE', 'N/A')}")
        print(f"   Authorization header: {'Present' if 'HTTP_AUTHORIZATION' in request.META else 'Missing'}")
        
        # Check permission classes
        if hasattr(self, 'permission_classes'):
            print(f"   Permission classes: {self.permission_classes}")
        else:
            print(f"   No permission_classes defined")
        
        # Check authentication classes  
        if hasattr(self, 'authentication_classes'):
            print(f"   Authentication classes: {self.authentication_classes}")
        else:
            print(f"   No authentication_classes defined")
        
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
        print("GenerateInitialReport.post() called")
        print("=" * 60)
        try:
            print(f"[GenerateInitialReport] Step 1: Parsing request...")
            print(f"   Request data keys: {list(request.data.keys()) if isinstance(request.data, dict) else 'N/A'}")
            
            # Map frontend camelCase keys to backend snake_case keys
            # Also construct metadata dict from individual fields
            mapped_data = {}
            metadata_dict = {}
            
            if isinstance(request.data, dict):
                # Map moduleId -> module_id
                if 'moduleId' in request.data:
                    mapped_data['module_id'] = request.data['moduleId']
                    print(f"   ✅ Mapped moduleId -> module_id: {request.data['moduleId']}")
                elif 'module_id' in request.data:
                    mapped_data['module_id'] = request.data['module_id']
                    print(f"   ✅ Using module_id: {request.data['module_id']}")
                
                # Map inputValues -> input_values
                if 'inputValues' in request.data:
                    mapped_data['input_values'] = request.data['inputValues']
                    print(f"   ✅ Mapped inputValues -> input_values")
                elif 'input_values' in request.data:
                    mapped_data['input_values'] = request.data['input_values']
                
                # Map designStatus -> design_status
                if 'designStatus' in request.data:
                    mapped_data['design_status'] = request.data['designStatus']
                    print(f"   ✅ Mapped designStatus -> design_status: {request.data['designStatus']}")
                elif 'design_status' in request.data:
                    mapped_data['design_status'] = request.data['design_status']
                
                # Construct metadata from individual fields (companyName, groupTeamName, etc.)
                metadata_fields = {
                    'companyName': 'CompanyName',
                    'groupTeamName': 'Group/TeamName',
                    'designer': 'Designer',
                    'projectTitle': 'ProjectTitle',
                    'subtitle': 'Subtitle',
                    'jobNumber': 'JobNumber',
                    'client': 'Client',
                    'additionalComments': 'AdditionalComments',
                    'companyLogo': 'CompanyLogo',
                    'companyLogoName': 'CompanyLogoName'
                }
                
                profile_summary = {}
                for frontend_key, backend_key in metadata_fields.items():
                    if frontend_key in request.data:
                        if frontend_key in ['companyName', 'groupTeamName', 'designer', 'companyLogo', 'companyLogoName']:
                            profile_summary[backend_key] = request.data[frontend_key]
                        else:
                            metadata_dict[backend_key] = request.data[frontend_key]
                
                if profile_summary:
                    metadata_dict['ProfileSummary'] = profile_summary
                
                # Add metadata to mapped_data
                if metadata_dict:
                    mapped_data['metadata'] = metadata_dict
                    print(f"   ✅ Constructed metadata with keys: {list(metadata_dict.keys())}")
                    if 'ProfileSummary' in metadata_dict:
                        print(f"   ProfileSummary keys: {list(metadata_dict['ProfileSummary'].keys())}")
                
                # Copy logs if present
                if 'logs' in request.data:
                    mapped_data['logs'] = request.data['logs']
                    print(f"   ✅ Added logs: {len(request.data['logs']) if isinstance(request.data['logs'], list) else 'N/A'} items")
            
            print(f"   Mapped data keys: {list(mapped_data.keys())[:10]}")
            print(f"   module_id: {mapped_data.get('module_id')}")
            print(f"   input_values keys: {list(mapped_data.get('input_values', {}).keys())[:10] if isinstance(mapped_data.get('input_values'), dict) else 'N/A'}")
            
            # Import the existing CreateDesignReport logic
            print(f"\n[GenerateInitialReport] Step 2: Importing CreateDesignReport...")
            from .design_report_csv_view import CreateDesignReport
            
            # Create a mock request object with the mapped data
            class MockRequest:
                def __init__(self, data):
                    self.data = data
            
            # Use existing CreateDesignReport but modify to return LaTeX info instead of PDF
            print(f"[GenerateInitialReport] Step 3: Creating CreateDesignReport instance...")
            create_report = CreateDesignReport()
            mock_request = MockRequest(mapped_data)
            
            # Call the existing post method but capture the LaTeX generation
            print(f"[GenerateInitialReport] Step 4: Calling CreateDesignReport.post()...")
            response = create_report.post(mock_request)
            print(f"[GenerateInitialReport] Step 5: CreateDesignReport response received")
            print(f"   Response status_code: {getattr(response, 'status_code', None)}")
            print(f"   Response type: {type(response)}")
            
            if response.status_code == 201:
                print(f"[GenerateInitialReport] Step 6: Response status is 201, extracting report_id...")
                # Extract report_id from response
                response_data = response.data
                print(f"   Response data type: {type(response_data)}")
                print(f"   Response data keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'N/A'}")
                report_id = response_data.get('report_id')
                print(f"   Extracted report_id: {report_id}")
                
                if report_id:
                    print(f"\n[GenerateInitialReport] Step 7: Parsing LaTeX sections...")
                    # Parse sections from the generated LaTeX
                    tex_file_path = os.path.join(os.getcwd(), 'file_storage', 'design_report', f'{report_id}.tex')
                    print(f"   LaTeX file path: {tex_file_path}")
                    print(f"   File exists: {os.path.exists(tex_file_path)}")
                    
                    if os.path.exists(tex_file_path):
                        file_size = os.path.getsize(tex_file_path)
                        print(f"   File size: {file_size} bytes")
                        
                        print(f"   Reading LaTeX file...")
                        with open(tex_file_path, 'r', encoding='utf-8') as f:
                            latex_content = f.read()
                        print(f"   LaTeX content length: {len(latex_content)} characters")
                        
                        print(f"   Parsing sections...")
                        parser = LaTeXParser()
                        sections = parser.parse_sections(latex_content)
                        print(f"   ✅ Parsed {len(sections)} sections")
                        print(f"   Section keys: {list(sections.keys())}")
                        
                        response_payload = {
                            "success": True,
                            "report_id": report_id,
                            "sections": sections,
                            "message": "LaTeX report generated successfully"
                        }
                        print(f"[GenerateInitialReport] Step 8: Returning success response")
                        print(f"   report_id: {report_id}")
                        print(f"   sections_count: {len(sections)}")
                        print("=" * 60)
                        return Response(response_payload, status=status.HTTP_201_CREATED)
                    else:
                        print(f"   ❌ ERROR: LaTeX file not found at {tex_file_path}")
                else:
                    print(f"   ❌ ERROR: report_id is None or empty")
            else:
                print(f"   ❌ ERROR: Response status_code is {response.status_code}, expected 201")
                if hasattr(response, 'data'):
                    print(f"   Response data: {response.data}")
            
            print(f"\n[GenerateInitialReport] Returning error response")
            print("=" * 60)
            return Response(
                {"error": "Failed to generate initial report"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        except Exception as e:
            print(f"\n[GenerateInitialReport] ❌ EXCEPTION occurred:")
            print(f"   Exception type: {type(e).__name__}")
            print(f"   Exception message: {str(e)}")
            import traceback
            traceback.print_exc()
            print("=" * 60)
            return Response(
                {"error": f"Failed to generate initial report: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
