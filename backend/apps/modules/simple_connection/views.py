"""
Simple Connection ViewSet - routes to sub-module services via slug.
Mirrors shear_connection pattern (design + options endpoints).
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.models import Material, CustomMaterials, Bolt
from apps.core.utils.module_helpers import handle_design_request
from apps.core.utils.cad_helpers import generate_cad_models, get_default_sections
from .registry import SimpleConnectionRegistry


class SimpleConnectionViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'], url_path='(?P<submodule_slug>[^/.]+)/design')
    def design(self, request, submodule_slug=None):
        """
        POST /api/modules/simple-connection/{slug}/design/
        Request body supports {inputs: {...}} or raw dict for backward compatibility.
        """
        ServiceClass = SimpleConnectionRegistry.get_service_by_slug(submodule_slug)
        if not ServiceClass:
            return Response({'error': f'Sub-module {submodule_slug} not found'}, status=404)

        inputs = request.data.get('inputs', request.data)
        project_id = request.data.get('project_id')

        context = handle_design_request(
            request=request,
            inputs=inputs,
            project_id=project_id,
            submodule_slug=submodule_slug,
            module_name='simple-connection'
        )

        try:
            result = ServiceClass.calculate(
                inputs=inputs,
                request=request,
                project_id=project_id if not context['is_guest'] else None,
                user_email=context['user_email']
            )

            if context['project_result']:
                result['project_saved'] = context['project_result']['saved']
                if context['project_result'].get('project_id'):
                    result['project_id'] = context['project_result']['project_id']
                if context['project_result'].get('error'):
                    result['project_error'] = context['project_result']['error']

            status_code = 200 if result.get('success', True) else 400
            return Response(result, status=status_code)
        except Exception as exc:
            return Response({'error': str(exc), 'success': False}, status=400)

    @action(detail=False, methods=['get'], url_path='(?P<submodule_slug>[^/.]+)/options')
    def options(self, request, submodule_slug=None):
        """
        GET /api/modules/simple-connection/{slug}/options/
        Provides dropdown/options data for simple connections.
        """
        email = request.query_params.get("email")
        slug = submodule_slug

        def material_list():
            mats = list(Material.objects.all().values())
            if email:
                mats += list(CustomMaterials.objects.filter(email=email).values())
            mats.append({"id": -1, "Grade": "Custom"})
            return mats

        def bolt_diameters():
            lst = list(Bolt.objects.values_list('Bolt_diameter', flat=True))
            lst.sort()
            # frontend expects strings convertible to numbers
            return [str(x) for x in lst]

        property_classes = ['3.6', '4.6', '4.8', '5.6', '5.8', '6.8', '8.8', '9.8', '10.9', '12.9']
        thickness_list = [
            '8', '10', '12', '14', '16', '18', '20', '22', '25', '28', '32', '36', '40', '45', '50',
            '56', '63', '75', '80', '90', '100', '110', '120'
        ]
        cover_plate_list = ['Single-Cover', 'Double-Cover']
        weld_size_list = ['4', '5', '6', '8', '10', '12']

        try:
            if slug in ('butt-joint-bolted', 'lap-joint-bolted'):
                data = {
                    'materialList': material_list(),
                    'thicknessList': thickness_list,
                    'coverPlateList': cover_plate_list,
                    'boltDiameterList': bolt_diameters(),
                    'propertyClassList': property_classes,
                }
                return Response(data, status=status.HTTP_200_OK)

            if slug in ('butt-joint-welded', 'lap-joint-welded'):
                data = {
                    'materialList': material_list(),
                    'thicknessList': thickness_list,
                    'coverPlateList': cover_plate_list,
                    'weldSizeList': weld_size_list,
                }
                return Response(data, status=status.HTTP_200_OK)

            return Response({'error': f'Sub-module {slug} not found'}, status=404)
        except Exception as exc:
            return Response({'error': str(exc)}, status=500)
    
    @action(detail=False, methods=['post'], url_path='(?P<submodule_slug>[^/.]+)/cad')
    def cad(self, request, submodule_slug=None):
        """
        POST /api/modules/simple-connection/{submodule_slug}/cad/
        
        Request body:
        {
            "inputs": {...},  # Design input parameters
            "sections": ["Model", "Column", ...]  # Optional: specific sections to generate
        }
        
        Returns:
        {
            "status": "success",
            "files": {section: base64_data, ...},
            "hover_dict": {...},
            "warnings": [...]
        }
        """
        # Get service from registry
        ServiceClass = SimpleConnectionRegistry.get_service_by_slug(submodule_slug)
        
        if not ServiceClass:
            return Response(
                {'error': f'Sub-module {submodule_slug} not found'},
                status=404
            )
        
        # Extract inputs
        inputs = request.data.get('inputs', request.data)
        
        if not inputs:
            return Response(
                {'error': 'inputs are required'},
                status=400
            )
        
        # Get sections from request or use defaults
        sections = request.data.get('sections')
        if not sections:
            sections = get_default_sections('simple-connection', submodule_slug)
        
        if not sections:
            return Response(
                {'error': f'No sections defined for {submodule_slug}'},
                status=400
            )
        
        try:
            # Import adapter to get create_from_input function for hover_dict
            create_from_input_func = None
            try:
                if submodule_slug == 'butt-joint-bolted':
                    from .submodules.butt_joint_bolted.adapter import create_from_input
                    create_from_input_func = create_from_input
                elif submodule_slug == 'butt-joint-welded':
                    from .submodules.butt_joint_welded.adapter import create_from_input
                    create_from_input_func = create_from_input
                elif submodule_slug == 'lap-joint-bolted':
                    from .submodules.lap_joint_bolted.adapter import create_from_input
                    create_from_input_func = create_from_input
                elif submodule_slug == 'lap-joint-welded':
                    from .submodules.lap_joint_welded.adapter import create_from_input
                    create_from_input_func = create_from_input
            except ImportError as e:
                print(f"[SimpleConnectionViewSet] Could not import create_from_input for {submodule_slug}: {e}")
            
            # Generate CAD models
            result = generate_cad_models(
                service_class=ServiceClass,
                inputs=inputs,
                sections=sections,
                create_from_input_func=create_from_input_func
            )
            
            if not result['files']:
                return Response(
                    {
                        'status': 'error',
                        'message': 'No CAD models were generated',
                        'errors': result['warnings']
                    },
                    status=422
                )
            
            return Response({
                'status': 'success',
                'files': result['files'],
                'hover_dict': result['hover_dict'],
                'message': 'CAD models generated successfully',
                'warnings': result['warnings']
            }, status=201)
            
        except Exception as e:
            print(f"[SimpleConnectionViewSet] Error generating CAD: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e), 'status': 'error'},
                status=500
            )

