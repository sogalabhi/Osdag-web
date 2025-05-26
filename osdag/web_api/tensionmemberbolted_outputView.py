from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from osdag_api import get_module_api
from osdag.models import Design
from osdag.serializers import Design_Serializer

@method_decorator(csrf_exempt, name='dispatch')
class TensionMemberBoltedOutputData(APIView):
    def post(self, request):
        # Obtain session cookie and input values
        cookie_id = request.COOKIES.get('tension_member_bolted_design_session')
        print('cookie id in tension member bolted design output data ', cookie_id)
        module_api = get_module_api('Tension Member Bolted Design')
        input_values = request.data

        tempData = {
            'cookie_id': cookie_id,
            'module_id': 'Tension Member Bolted Design',
            'input_values': input_values
        }

        # Retrieve and update the Design record
        try:
            designRecord = Design.objects.get(cookie_id=cookie_id)
            serializer = Design_Serializer(designRecord, data=tempData)
        except Design.DoesNotExist:
            print('abhi Design session not found')
            return Response('Session not found', status=status.HTTP_400_BAD_REQUEST)

        if serializer.is_valid():
            try:
                serializer.save()
            except Exception as e:
                print('Error saving serializer:', e)
        else:
            
            print('abhi Serializer is invalid')
            return Response('Serializer is invalid', status=status.HTTP_400_BAD_REQUEST)

        output = {}
        logs = []
        new_logs = []
        try:
            try:
                output, logs = module_api.generate_output(input_values)
            except Exception as e:
                print('Error in generating output:', e)
            for log in logs:
                if log not in new_logs:
                    new_logs.append(log)
        except Exception as e:
            print('Exception raised:', e)
            return JsonResponse({"data": {}, "logs": new_logs, "success": False}, safe=False, status=400)

        finalLogsString = self.combine_logs(new_logs)

        try:
            designObject = Design.objects.get(cookie_id=cookie_id)
            designObject.logs = finalLogsString
            designObject.output_values = output
            output_result = self.check_non_zero_output(output)
            if (output == "" or output == 0 or not output_result):
                designObject.design_status = False
            else:
                designObject.design_status = True
            designObject.save()
        except Exception as e:
            print('Error saving logs/output in Design table:', e)

        return JsonResponse({"data": output, "logs": new_logs, "success": True}, safe=False, status=201)

    def combine_logs(self, logs):
        finalLogsString = ""
        for item in logs:
            msg = item.get('msg', '')
            finalLogsString += msg + '\n'
        return finalLogsString

    def check_non_zero_output(self, output):
        flag = False
        for item in output:
            # This assumes output[item] is a dict with a 'val' or 'value' key, adjust as needed
            val = None
            if isinstance(output[item], dict):
                val = output[item].get('val') or output[item].get('value')
            elif isinstance(output[item], list) and len(output[item]) > 0:
                # If output[item] is a list of dicts, check each
                for subitem in output[item]:
                    subval = subitem.get('val') or subitem.get('value')
                    if subval and abs(float(subval)) > 1e-9:
                        return True
            if val and abs(float(val)) > 1e-9:
                flag = True
                break
        return flag
