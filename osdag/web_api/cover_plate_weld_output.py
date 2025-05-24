from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import JSONParser
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from osdag_api import get_module_api
from django.http import HttpResponse, HttpRequest
from osdag_api.modules.cover_plate_welded_connection import *

# importing from DRF
from rest_framework.response import Response
from rest_framework import status

# importing models
from osdag.models import Columns, Beams, Bolt, Bolt_fy_fu, Material
from osdag.models import Design

# importing serializers
from osdag.serializers import Design_Serializer
"""
Author : Raghav Sharma ( FOSSEE'25 )

Example input:
{
    INPUT VALUES :  {
         'Module': 'Cover Plate Welded',
         'Section.Designation': 'JB 175',
         'Section.Material': 'E 250 (Fe 410 W)A',
         'Weld.Type': 'Fillet Weld',
         'Load.Moment': '10',
         'Load.Shear': '15',
         'Load.Axial': '20',
         'FlangePlate.Preference': 'Outside',
         'FlangePlate.Thickness': [],
         'WebPlate.Thickness': [],
         'Design.DesignMethod': 'Limit State Design',
         'Weld.Fab': 'Shop Weld',
         'Weld.MaterialGrade': '410'
    }
}
"""


@method_decorator(csrf_exempt, name='dispatch')
class CoverPlateWeldedOutputData(APIView):
    def post(self, request):
        print("Inside post method of Cover Plate Welded OutputData")

        # obtaining the session, module_id, input_values
        cookie_id = request.COOKIES.get('cover_plate_welded_connection_session')
        module_api = get_module_api('Cover Plate Welded Connection')
        input_values = request.data
        tempData = {
            'cookie_id': cookie_id,
            'module_id': 'Cover Plate Welded Connection',
            'input_values': input_values
        }
        print('INPUT VALUES', input_values)

        # obtaining the record from the Design model
        try:
            designRecord = Design.objects.get(cookie_id=cookie_id)
            serailizer = Design_Serializer(designRecord, data=tempData)

            if serailizer.is_valid():
                try:
                    serailizer.save()
                    print('Serializer saved successfully')
                except Exception as save_err:
                    error_msg = f"Error saving serializer: {str(save_err)}"
                    print(error_msg)
                    return Response({'error': error_msg}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                error_msg = f"Serializer validation failed: {serailizer.errors}"
                print(error_msg)
                return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)

        except Design.DoesNotExist:
            error_msg = f"Design not found for cookie_id: {cookie_id}"
            print(error_msg)
            return Response({'error': error_msg}, status=status.HTTP_404_NOT_FOUND)

        output = {}
        logs = []
        new_logs = []
        
        try:
            # Generate output from module API
            output, logs = module_api.generate_output(input_values)
            print('OUTPUT OF MODULE:', output)
            print('LOGS:', logs)
            
            # Process and deduplicate logs
            try:
                for log in logs:
                    if log not in new_logs:
                        new_logs.append(log)
            except Exception as log_err:
                print(f"Warning: Error processing logs: {str(log_err)}")
                # Continue execution even if log processing fails
                
        except Exception as e:
            error_msg = f"Error generating output: {str(e)}\nTraceback: {traceback.format_exc()}"
            print(error_msg)
            return JsonResponse({
                "data": {}, 
                "logs": new_logs,
                "success": False,
                "error": error_msg
            }, safe=False, status=400)

        try:
            finalLogsString = self.combine_logs(new_logs)
        except Exception as log_err:
            print(f"Warning: Error combining logs: {str(log_err)}")
            finalLogsString = str(new_logs)  # Fallback to string representation

        try:
            # save the logs, output, design_status in Design table
            designObject = Design.objects.get(cookie_id=cookie_id)
            designObject.logs = finalLogsString
            designObject.output_values = output

            # Validate weld output
            output_result = self.check_output_validity(output)
            designObject.design_status = output_result
            
            designObject.save()
        except Exception as e:
            print('Error saving design results:', e)
            return Response("Error saving results", status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return JsonResponse({
            "data": output, 
            "logs": new_logs, 
            "success": True
        }, safe=False, status=201)

    def combine_logs(self, logs):
        # Match bolted connection log format
        finalLogsString = ""
        for item in logs:
            msg = item['msg']
            finalLogsString = finalLogsString + msg + '\n'
        return finalLogsString

    def check_output_validity(self, output):
        # Check weld-specific outputs in addition to general checks
        if not output:
            return False
            
        required_keys = [
            'Weld.Size',
            'Weld.Length',
            'Weld.Strength'
        ]
        
        # Check if required weld outputs exist and are non-zero
        for key in required_keys:
            if key not in output:
                return False
            try:
                value = float(output[key]['value'])
                if abs(value) < 1e-9:
                    return False
            except (ValueError, KeyError):
                return False
                
        return True
