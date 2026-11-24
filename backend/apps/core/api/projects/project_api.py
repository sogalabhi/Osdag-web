from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from apps.core.models import Project
from apps.core.permissions import IsEmailVerified
from django.db.models import Q
from apps.core.utils.api_errors import error_json_response, internal_error_json_response

# Project text columns are 200 characters wide.
_TEXT_LIMIT = 200


def _text_field_errors(data, names):
    """Message per field for the project text fields that are present but not text of a valid length."""
    fields = {}
    for name in names:
        value = data.get(name)
        if value is None:
            if name == 'name' and name in data:  # the name column cannot be empty
                fields[name] = 'Must be text.'
            continue
        if not isinstance(value, str):
            fields[name] = 'Must be text.'
        elif len(value) > _TEXT_LIMIT:
            fields[name] = f'Must be at most {_TEXT_LIMIT} characters.'
    return fields


def _invalid_text_response(data, names):
    fields = _text_field_errors(data, names)
    if fields:
        return error_json_response('validation_error', 'Invalid project data.', 400, fields=fields, success=False)
    return None


@method_decorator(csrf_exempt, name='dispatch')
class ProjectAPI(APIView):
    """API for managing user projects"""
    permission_classes = [IsEmailVerified]
    
    def get(self, request):
        """Get user-specific projects (for recent projects list)"""
        try:
            # Disallow guest users from listing projects (guests don't send authentication tokens)
            if not (hasattr(request, 'user') and request.user.is_authenticated):
                return error_json_response('guest_not_allowed', 'Guest users cannot access projects', 403, success=False)

            user_email = getattr(request.user, 'email', None)
            if not user_email and hasattr(request, 'auth') and isinstance(request.auth, dict):
                user_email = request.auth.get('email')
                
            search_query = request.GET.get('q', '').strip()
            projects_query = Project.objects.filter(user_email=user_email)
            
            if search_query:
                projects_query = projects_query.filter(
                    Q(name__icontains=search_query) | 
                    Q(module__icontains=search_query) |
                    Q(submodule__icontains=search_query)
                )
                # If searching, we might want to return more than 10
                projects = projects_query.order_by('-updated_at')[:20]
            else:
                # Default recent projects behavior
                projects = projects_query.order_by('-updated_at')[:10]
                
            print(f"Found {projects.count()} projects for user {user_email}")
            
            project_list = []
            for project in projects:
                project_list.append({
                    'id': project.id,
                    'name': project.name,
                    'module': getattr(project, 'module', None),
                    'submodule': getattr(project, 'submodule', None),
                    'created_at': project.created_at.isoformat(),
                    'updated_at': project.updated_at.isoformat(),
                })
            
            print(f"Returning {len(project_list)} projects")
            return JsonResponse({
                'success': True,
                'projects': project_list
            }, safe=False)
            
        except Exception:
            return internal_error_json_response('Listing projects', success=False)
    
    def post(self, request):
        """Create a new project"""
        try:
            # Disallow guest users from creating projects (guests don't send authentication tokens)
            if not (hasattr(request, 'user') and request.user.is_authenticated):
                return error_json_response('guest_not_allowed', 'Guest users cannot create projects', 403, success=False)

            data = request.data
            print(f"Creating project with data: {data}")
            
            # Validate required fields
            required_fields = ['name']
            for field in required_fields:
                if field not in data:
                    return error_json_response('missing_field', f'Missing required field: {field}', 400, success=False)
            
            invalid = _invalid_text_response(data, ('name', 'module', 'submodule', 'module_id'))
            if invalid:
                return invalid

            # Determine user email from authenticated user or JWT claims
            user_email = getattr(request.user, 'email', None)
            if not user_email and hasattr(request, 'auth') and isinstance(request.auth, dict):
                user_email = request.auth.get('email')
            if not user_email:
                return error_json_response('bad_request', 'Authenticated user email not found', 400, success=False)

            # Create new project with user email
            project = Project.objects.create(
                name=data['name'],
                module=data.get('module'),
                submodule=data.get('submodule') or data.get('module_id'),
                inputs_json=data.get('inputs_json'),
                outputs_json=data.get('outputs_json'),
                user_email=user_email
            )
            
            return JsonResponse({
                'success': True,
                'project_id': project.id,
                'message': 'Project created successfully'
            }, safe=False, status=201)
            
        except Exception:
            return internal_error_json_response('Creating a project', success=False)

@method_decorator(csrf_exempt, name='dispatch')
class ProjectDetailAPI(APIView):
    """API for individual project operations"""
    permission_classes = [IsEmailVerified]
    
    def get(self, request, project_id):
        """Get a specific project"""
        try:
            # Disallow guest users from reading projects (guests don't send authentication tokens)
            if not (hasattr(request, 'user') and request.user.is_authenticated):
                return error_json_response('guest_not_allowed', 'Guest users cannot access projects', 403, success=False)
            user_email = getattr(request.user, 'email', None)
            if not user_email and hasattr(request, 'auth') and isinstance(request.auth, dict):
                user_email = request.auth.get('email')
            
            # Get project and verify ownership
            project = Project.objects.get(id=project_id, user_email=user_email)
            print(f"Found project: {project.name}")
            
            return JsonResponse({
                'success': True,
                'project': {
                    'id': project.id,
                    'name': project.name,
                    'module': getattr(project, 'module', None),
                    'submodule': getattr(project, 'submodule', None),
                    'inputs_json': getattr(project, 'inputs_json', None),
                    'outputs_json': getattr(project, 'outputs_json', None),
                    'created_at': project.created_at.isoformat(),
                    'updated_at': project.updated_at.isoformat()
                }
            }, safe=False)
            
        except Project.DoesNotExist:
            print(f"Project {project_id} not found or access denied")
            return error_json_response('not_found', 'Project not found or access denied', 404, success=False)
        except Exception:
            return internal_error_json_response('Getting a project', success=False)
    
    def put(self, request, project_id):
        """Update project data (name, inputs_json, osi_file_path)"""
        try:
            # Disallow guest users from updating projects (guests don't send authentication tokens)
            if not (hasattr(request, 'user') and request.user.is_authenticated):
                return error_json_response('guest_not_allowed', 'Guest users cannot update projects', 403, success=False)
            user_email = getattr(request.user, 'email', None)
            if not user_email and hasattr(request, 'auth') and isinstance(request.auth, dict):
                user_email = request.auth.get('email')

            print(f"Project API PUT - Project ID: {project_id}, User email: {user_email}")
            print(f"Request data: {request.data}")
            
            # Get project and verify ownership
            project = Project.objects.get(id=project_id, user_email=user_email)
            data = request.data
            invalid = _invalid_text_response(data, ('name', 'module', 'submodule', 'module_id'))
            if invalid:
                return invalid
            
            print(f"Found project: {project.name}")
            print(f"Updating with data: {data}")
            
            # Update fields if provided
            if 'name' in data:
                project.name = data['name']
            if 'module' in data:
                project.module = data['module']
            if 'submodule' in data or 'module_id' in data:
                project.submodule = data.get('submodule') or data.get('module_id')
            if 'inputs_json' in data:
                project.inputs_json = data['inputs_json']
            if 'outputs_json' in data:
                project.outputs_json = data['outputs_json']
            
            project.save()
            print(f"Project {project_id} updated successfully")
            
            return JsonResponse({
                'success': True,
                'message': 'Project updated successfully'
            }, safe=False)
            
        except Project.DoesNotExist:
            print(f"Project {project_id} not found or access denied")
            return error_json_response('not_found', 'Project not found or access denied', 404, success=False)
        except Exception:
            return internal_error_json_response('Updating a project', success=False)
    
    def delete(self, request, project_id):
        """Delete a project"""
        try:
            # Disallow guest users from deleting projects (guests don't send authentication tokens)
            if not (hasattr(request, 'user') and request.user.is_authenticated):
                return error_json_response('guest_not_allowed', 'Guest users cannot delete projects', 403, success=False)
            user_email = getattr(request.user, 'email', None)
            if not user_email and hasattr(request, 'auth') and isinstance(request.auth, dict):
                user_email = request.auth.get('email')
            
            # Get project and verify ownership
            project = Project.objects.get(id=project_id, user_email=user_email)
            project.delete()
            
            return JsonResponse({
                'success': True,
                'message': 'Project deleted successfully'
            }, safe=False)
            
        except Project.DoesNotExist:
            return error_json_response('not_found', 'Project not found or access denied', 404, success=False)
        except Exception:
            return internal_error_json_response('Deleting a project', success=False)

@method_decorator(csrf_exempt, name='dispatch')
class ProjectByNameAPI(APIView):
    """API for finding and updating projects by name"""
    permission_classes = [IsEmailVerified]
    
    def get(self, request, project_name):
        """Get a specific project by name"""
        try:
            # Disallow guest users from reading projects by name (guests don't send authentication tokens)
            if not (hasattr(request, 'user') and request.user.is_authenticated):
                return error_json_response('guest_not_allowed', 'Guest users cannot access projects', 403, success=False)
            user_email = getattr(request.user, 'email', None)
            if not user_email and hasattr(request, 'auth') and isinstance(request.auth, dict):
                user_email = request.auth.get('email')
            
            # Get project by name and verify ownership
            project = Project.objects.get(name=project_name, user_email=user_email)
            print(f"Found project: {project.name}")
            
            return JsonResponse({
                'success': True,
                'data': {
                    'id': project.id,
                    'name': project.name,
                    'created_at': project.created_at.isoformat(),
                    'updated_at': project.updated_at.isoformat()
                }
            }, safe=False)
            
        except Project.DoesNotExist:
            print(f"Project '{project_name}' not found or access denied")
            return error_json_response('not_found', 'Project not found or access denied', 404, success=False)
        except Exception:
            return internal_error_json_response('Getting a project by name', success=False)

    def put(self, request, project_name):
        """Update project data (name, osi_file_path) by name"""
        try:
            # Disallow guest users from updating projects by name (guests don't send authentication tokens)
            if not (hasattr(request, 'user') and request.user.is_authenticated):
                return error_json_response('guest_not_allowed', 'Guest users cannot update projects', 403, success=False)
            user_email = getattr(request.user, 'email', None)
            if not user_email and hasattr(request, 'auth') and isinstance(request.auth, dict):
                user_email = request.auth.get('email')

            # Get project and verify ownership by name
            project = Project.objects.get(name=project_name, user_email=user_email)
            data = request.data
            invalid = _invalid_text_response(data, ('name',))
            if invalid:
                return invalid

            # Update fields if provided
            if 'name' in data:
                project.name = data['name']
            project.save()
            return JsonResponse({
                'success': True,
                'message': 'Project updated successfully'
            }, safe=False)
        except Project.DoesNotExist:
            return error_json_response('not_found', 'Project not found or access denied', 404, success=False)
        except Exception:
            return internal_error_json_response('Updating a project by name', success=False)
