from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from osdag_api import get_module_api

@method_decorator(csrf_exempt, name='dispatch')
class LapJointWeldedOutputView(APIView):
    def post(self, request):
        input_values = request.data
        module_name = input_values.get('Module', 'LapJointWelded')
        print('in lap_joint_welded_output.py: Processing request for module:', module_name)
        print('in lap_joint_welded_output.py: Input values keys:', list(input_values.keys()))
        print('in lap_joint_welded_output.py: Module field value:', input_values.get('Module', 'NOT_FOUND'))
        required_fields = ["Member.Profile", "Member.Designation", "Material", "Module"]
        missing_fields = [field for field in required_fields if field not in input_values]
        if missing_fields:
            print('in lap_joint_welded_output.py: Missing required fields:', missing_fields)
        try:
            module_api = get_module_api(module_name)
        except Exception as e:
            print('in lap_joint_welded_output.py: Error getting module API:', e)
            return JsonResponse({"data": {}, "logs": [], "success": False, "error": "Module not found"}, safe=False, status=400)
        output = {}
        logs = []
        new_logs = []
        try:
            print('in lap_joint_welded_output.py: Trying to generate output')
            output, logs = module_api.generate_output(input_values)
            print('in lap_joint_welded_output.py: Output generated successfully')
            for log in logs:
                if log not in new_logs:
                    new_logs.append(log)
        except Exception as e:
            print('in lap_joint_welded_output.py: Exception raised:', e)
            return JsonResponse({"data": {}, "logs": new_logs, "success": False, "error": str(e)}, safe=False, status=400)
        print('in lap_joint_welded_output.py: Returning final response')
        return JsonResponse({"data": output, "logs": new_logs, "success": True}, safe=False, status=201) 