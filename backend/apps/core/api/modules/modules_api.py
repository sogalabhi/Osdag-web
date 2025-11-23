"""
    This file includes the Modules API
    Get Module Data.
        Get Modules API (class GetModules(View)):
            Accepts GET requests.
            Returns all developed modules in json format.
"""
from django.http import HttpResponse, HttpRequest
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
# Try new module_finder first, fall back to old osdag_api for metadata
try:
    from apps.core.module_finder import developed_modules
    # For now, still use old metadata list until we create a dynamic one
    from osdag_api import module_dict
except ImportError:
    from osdag_api import module_dict, developed_modules
import json
import typing

# Author: Aaranyak Ghosh

@method_decorator(csrf_exempt, name='dispatch')
class GetModules(View):
    """
        Get Module Data.
            Get Modules API (class GetModules(View)):
                Accepts GET requests.
                Returns all developed modules in json format.
    """
    def get(self,request: HttpRequest) -> HttpResponse:
        module_data = json.dumps(module_dict) # Convert module data to json.
        response = HttpResponse(status=200) # Status code 200 - success.
        response["content-type"] = "application/json" # Set content-type header to json.
        response.write(module_data) # Write module data to http response body.
        return response
