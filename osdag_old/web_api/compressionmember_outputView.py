"""
API View for Axially Loaded Column (Compression Member)
Handles output generation request for module 'Axially-Loaded-Column'
"""

from rest_framework.views import APIView
from django.http import JsonResponse
from osdag_api.module_finder import get_module_api

class CompressionMemberOutputData(APIView):
    def post(self, request):
        try:
            # Get API adapter
            module_api = get_module_api("Axially-Loaded-Column")

            # Input values from frontend
            input_values = request.data

            # Generate output via backend adapter
            output, logs = module_api.generate_output(input_values)

            return JsonResponse(
                {"data": output, "logs": logs, "success": True},
                safe=False,
                status=200,
            )
        except Exception as e:
            return JsonResponse(
                {"data": {}, "logs": [f"Error: {str(e)}"], "success": False},
                safe=False,
                status=500,
            )
