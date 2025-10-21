"""
Django REST API for Axially Loaded Column Design
"""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from osdag_core.design_type.compression_member.Column import ColumnDesign


@csrf_exempt
@require_http_methods(["POST"])
def design_axially_loaded_column(request):
    """
    Design axially loaded column based on IS 800:2007
    
    POST /api/compression-member/column/design
    
    Body:
    {
        "sectionProfile": "Beams and Columns",
        "sectionSize": ["ISMB 250"],
        "material": "E 250 (Fe 410 W)A",
        "lengthZZ": 3500,
        "lengthYY": 3500,
        "end1ZZ": "Fixed",
        "end2ZZ": "Fixed",
        "end1YY": "Fixed",
        "end2YY": "Fixed",
        "axialForce": 500
    }
    """
    try:
        # Parse JSON request
        data = json.loads(request.body)
        
        # Validate required fields
        required_fields = ['sectionProfile', 'sectionSize', 'material', 
                          'lengthZZ', 'lengthYY', 'end1ZZ', 'end2ZZ', 
                          'end1YY', 'end2YY', 'axialForce']
        
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return JsonResponse({
                'status': 'error',
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }, status=400)
        
        # Create design dictionary matching Python module format
        design_dict = {
            'Module': 'Columns with known support conditions',
            'Member.Profile': data['sectionProfile'],
            'Member.Designation': data['sectionSize'],
            'Material': data['material'],
            'Actual.Length_zz': str(data['lengthZZ']),
            'Actual.Length_yy': str(data['lengthYY']),
            'End_1': data['end1ZZ'],
            'End_2': data['end2ZZ'],
            'End_1_Y': data['end1YY'],
            'End_2_Y': data['end2YY'],
            'Load.Axial': str(data['axialForce']),
            # Design preferences with defaults
            'Member.Material': data['material'],
            'Optimum.AllowUR': '1.0',
            'Effective.Area_Para': '1.0',
            'Design.Design_Method': 'Limit State Design'
        }
        
        # Run column design
        column = ColumnDesign()
        column.set_input_values(column, design_dict)
        
        # Check design status
        if not column.design_status:
            return JsonResponse({
                'status': 'unsafe',
                'designStatus': False,
                'message': 'Design failed. No adequate section found from the provided list.',
                'results': None
            }, status=200)
        
        # Return successful results
        return JsonResponse({
            'status': 'success',
            'designStatus': True,
            'message': 'Column design completed successfully',
            'results': {
                'designation': column.result_designation,
                'utilizationRatio': round(column.result_UR, 3),
                'sectionClass': column.result_section_class,
                'effectiveArea': round(column.result_effective_area, 2),
                'effectiveLengthZZ': round(column.result_eff_len_zz * 1e-3, 2),
                'effectiveLengthYY': round(column.result_eff_len_yy * 1e-3, 2),
                'slendernessRatioZZ': round(column.result_eff_sr_zz, 2),
                'slendernessRatioYY': round(column.result_eff_sr_yy, 2),
                'eulerBucklingStressZZ': round(column.result_ebs_zz, 2),
                'eulerBucklingStressYY': round(column.result_ebs_yy, 2),
                'bucklingCurveZZ': column.result_bc_zz,
                'bucklingCurveYY': column.result_bc_yy,
                'imperfectionFactorZZ': round(column.result_IF_zz, 2),
                'imperfectionFactorYY': round(column.result_IF_yy, 2),
                'stressReductionFactorZZ': round(column.result_srf_zz, 2),
                'stressReductionFactorYY': round(column.result_srf_yy, 2),
                'designCompressiveStress': round(column.result_fcd, 2),
                'designStrength': round(column.result_capacity * 1e-3, 2),
                'capacity': round(column.result_capacity * 1e-3, 2)
            }
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'status': 'error',
            'message': 'Invalid JSON in request body'
        }, status=400)
        
    except Exception as e:
        import traceback
        return JsonResponse({
            'status': 'error',
            'message': f'Design calculation failed: {str(e)}',
            'traceback': traceback.format_exc()
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def get_column_sections(request):
    """
    Get available column section sizes
    GET /api/compression-member/column/sections?profile=Beams and Columns
    """
    try:
        profile = request.GET.get('profile', 'Beams and Columns')
        
        # TODO: Replace with actual database query
        sections_map = {
            "Beams and Columns": [
                "ISMB 100", "ISMB 125", "ISMB 150", "ISMB 175", "ISMB 200",
                "ISMB 225", "ISMB 250", "ISMB 300", "ISMB 350", "ISMB 400",
                "ISMB 450", "ISMB 500", "ISMB 550", "ISMB 600"
            ],
            "RHS and SHS": ["RHS 100x50x5", "SHS 100x100x5", "SHS 150x150x6"],
            "CHS": ["CHS 114.3x3.6", "CHS 139.7x4.5", "CHS 168.3x4.5"]
        }
        
        return JsonResponse({
            'status': 'success',
            'sections': sections_map.get(profile, [])
        }, status=200)
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)