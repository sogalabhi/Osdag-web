from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import JSONParser
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from osdag_api import get_module_api
from django.http import HttpResponse, HttpRequest
from osdag_api.modules.beam_column_end_plate import *
from osdag_api.errors import MissingKeyError, InvalidInputTypeError, OsdagApiException
import logging
import traceback
import json

# importing from DRF
from rest_framework.response import Response
from rest_framework import status

# importing models
from osdag.models import Columns, Beams, Bolt, Bolt_fy_fu, Material
from osdag.models import Design

# importing serializers
from osdag.serializers import Design_Serializer

# Configure logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
# Create handlers
c_handler = logging.StreamHandler()
f_handler = logging.FileHandler('beam_column_endplate.log')
c_handler.setLevel(logging.DEBUG)
f_handler.setLevel(logging.DEBUG)
# Create formatters and add it to handlers
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
c_handler.setFormatter(formatter)
f_handler.setFormatter(formatter)
# Add handlers to the logger
logger.addHandler(c_handler)
logger.addHandler(f_handler)

"""
    Author : Raghav Sharma ( FOSSEE'25 )

    Example input:
    {
        "Bolt.Bolt_Hole_Type": "Standard",
        "Bolt.Diameter": [
            "8", "10", "12", "14", "16", "18", "20", "22", "24", "27", "30",
            "33", "36", "39", "42", "45", "48", "52", "56", "60", "64"
        ],
        "Bolt.Grade": [
            "3.6", "4.6", "4.8", "5.6", "5.8", "6.8", "8.8", "9.8", "10.9", "12.9"
        ],
        "Bolt.Slip_Factor": "0.3",
        "Bolt.TensionType": "Pre-tensioned",
        "Bolt.Type": "Bearing Bolt",
        "Connectivity": "Column-Flange-Beam-Web",
        "EndPlateType": "Flushed - Reversible",
        "Connector.Material": "E 165 (Fe 290)",
        "Design.Design_Method": "Limit State Design",
        "Detailing.Corrosive_Influences": "No",
        "Detailing.Edge_type": "Rolled, machine-flame cut, sawn and planed",
        "Detailing.Gap": "10",
        "Load.Axial": "0",
        "Load.Shear": "2",
        "Load.Moment": "2",
        "Material": "E 165 (Fe 290)",
        "Member.Supported_Section.Designation": "JB 150",
        "Member.Supported_Section.Material": "E 165 (Fe 290)",
        "Member.Supporting_Section.Designation": "HB 150",
        "Member.Supporting_Section.Material": "E 165 (Fe 290)",
        "Module": "Beam-to-Column End Plate Connection",
        "Weld.Fab": "Shop Weld",
        "Weld.Material_Grade_OverWrite": "410",
        "Weld.Type": "Groove Weld",
        "Connector.Plate.Thickness_List": [
            "8", "10", "12", "14", "16", "18", "20", "22", "25", "28", "32",
            "36", "40", "45", "50", "56", "63", "75", "80", "90", "100", "110", "120"
        ]
    }
"""


@method_decorator(csrf_exempt, name='dispatch')
class BeamToColumnEndPlateOutputData(APIView):

    def post(self, request):
        logger.info("Inside post method of BeamToColumnEndPlateOutputData")
        
        try:
            # obtaining the session, module_id, input_values
            cookie_id = request.COOKIES.get('beam_to_column_end_plate_connection_session')
            logger.debug(f'Cookie ID: {cookie_id}')
            
            if not cookie_id:
                logger.error("No cookie ID found in request")
                return JsonResponse({
                    "data": {}, 
                    "logs": [{"type": "error", "msg": "No session cookie found. Please start a new design session."}],
                    "success": False
                }, status=400)
                
            module_api = get_module_api('Beam-to-Column End Plate Connection')
            logger.debug(f'Module API obtained: {module_api}')
            
            input_values = request.data
            logger.debug(f'Input values type: {type(input_values)}')
            logger.debug(f'Input values: {json.dumps(input_values, indent=2)}')
            
            tempData = {
                'cookie_id': cookie_id,
                'module_id': 'Beam-to-Column End Plate Connection',
                'input_values': input_values
            }
            logger.debug(f'tempData: {tempData}')
            
            # obtaining the record from the Design model
            try:
                designRecord = Design.objects.get(cookie_id=cookie_id)
                logger.debug(f'Design record found for cookie_id: {cookie_id}')
            except Design.DoesNotExist:
                logger.error(f"No design record found for cookie ID: {cookie_id}")
                return JsonResponse({
                    "data": {}, 
                    "logs": [{"type": "error", "msg": "Design session not found. Please start a new design session."}],
                    "success": False
                }, status=404)
                
            serailizer = Design_Serializer(designRecord, data=tempData)

            # checking the validtity of the serializer
            if serailizer.is_valid():
                logger.info('Serializer is valid')
                try:  # try saving the serializer
                    serailizer.save()
                    logger.info('Serializer saved successfully')
                except Exception as e:
                    logger.error(f'Error in saving the serializer: {str(e)}')
                    logger.error(traceback.format_exc())
            else:
                logger.error(f'Serializer is invalid. Errors: {serailizer.errors}')
                return Response('Serializer is invalid', status=status.HTTP_400_BAD_REQUEST)

            output = {}
            logs = []
            new_logs = []
            
            # Validate input before processing
            try:
                # This will check if all required fields are present and valid
                validate_input(input_values)
                logger.info("Input validation passed successfully")
            except MissingKeyError as e:
                logger.error(f"Missing key error: {str(e)}")
                return JsonResponse({
                    "data": {}, 
                    "logs": [{"type": "error", "msg": str(e)}],
                    "success": False
                }, status=400)
            except InvalidInputTypeError as e:
                logger.error(f"Invalid input type error: {str(e)}")
                return JsonResponse({
                    "data": {}, 
                    "logs": [{"type": "error", "msg": str(e)}],
                    "success": False
                }, status=400)
            except Exception as e:
                logger.error(f"Unexpected error during input validation: {str(e)}")
                logger.error(traceback.format_exc())
                return JsonResponse({
                    "data": {}, 
                    "logs": [{"type": "error", "msg": f"Validation error: {str(e)}"}],
                    "success": False
                }, status=400)
                
            try:
                logger.info("Generating output from module API")
                output, logs = module_api.generate_output(input_values)
                logger.info(f"Output generation successful. Log count: {len(logs)}")
                logger.debug(f"Output data: {json.dumps(output, indent=2)}")
                
                for log in logs:
                    # removing duplicates
                    if log not in new_logs:
                        new_logs.append(log)
                        logger.debug(f"Log entry: {log}")

            except OsdagApiException as e:
                logger.error(f"Osdag API exception: {str(e)}")
                logger.error(traceback.format_exc())
                return JsonResponse({
                    "data": {}, 
                    "logs": new_logs + [{"type": "error", "msg": str(e)}],
                    "success": False
                }, status=400)
            except Exception as e:
                logger.error(f"Exception raised during output generation: {str(e)}")
                logger.error(traceback.format_exc())
                return JsonResponse({
                    "data": {}, 
                    "logs": new_logs + [{"type": "error", "msg": f"Error generating output: {str(e)}"}],
                    "success": False
                }, status=400)
            
            logger.debug(f'New logs: {new_logs}')
            logger.debug(f'New logs type: {type(new_logs)}')
            finalLogsString = self.combine_logs(new_logs)
            logger.debug(f'Final logs string: {finalLogsString}')

            try:
                # save the logs, output, design_status in the Design table for that specific cookie_id
                designObject = Design.objects.get(cookie_id=cookie_id)
                designObject.logs = finalLogsString
                designObject.output_values = output
                logger.debug(f'Output outside the condition: {output}')
                output_result = self.check_non_zero_output(output)
                logger.debug(f'Output result: {output_result}')

                if(output == "" or output == {} or output is None or output_result is False):
                    logger.warning('Output is empty or output_result is False')
                    logger.debug(f'Output: {output}')
                    designObject.design_status = False
                else:
                    logger.info('Output is valid, setting design_status to True')
                    # if the output is successfully generated, then set the design_status to True 
                    designObject.design_status = True

                designObject.save()
                logger.info("Design object saved successfully")
            except Exception as e:
                logger.error(f'Error in saving the logs in Design table: {str(e)}')
                logger.error(traceback.format_exc())
                # Continue execution to return results to user even if DB save fails

            logger.info("Returning successful response with output data and logs")
            return JsonResponse({"data": output, "logs": new_logs, "success": True}, safe=False, status=201)
            
        except Exception as e:
            # Catch-all for any unexpected exceptions
            logger.critical(f"Unhandled exception in BeamToColumnEndPlateOutputData.post: {str(e)}")
            logger.critical(traceback.format_exc())
            return JsonResponse({
                "data": {}, 
                "logs": [{"type": "error", "msg": f"Internal server error: {str(e)}"}],
                "success": False
            }, status=500)
    
    def combine_logs(self, logs):
        """
        Combine log objects into a single string.
        The logs here is an array of objects.
        This function extracts the objects to string and combines them into a single string,
        also converting the type key value to upper case.
        """
        logger.debug(f"Combining {len(logs)} log entries into a single string")
        finalLogsString = ""

        for item in logs:
            try:
                logger.debug(f'Log item: {item}')
                logger.debug(f'Item keys: {item.keys()}')
                
                # Ensure 'type' key exists
                if 'type' not in item:
                    logger.warning(f"Log item missing 'type' key: {item}")
                    item['type'] = 'INFO'  # Default to INFO
                
                # Ensure 'msg' key exists
                if 'msg' not in item:
                    logger.warning(f"Log item missing 'msg' key: {item}")
                    item['msg'] = "Unknown message"  # Default message
                    
                item['type'] = item['type'].upper()
                msg = item['msg']
                finalLogsString = finalLogsString + item['type'] + " : " + msg + '\n'
            except Exception as e:
                logger.error(f"Error processing log item {item}: {str(e)}")
                logger.error(traceback.format_exc())
                # Continue with next log item

        logger.debug(f'Final logs string: {finalLogsString}')
        return finalLogsString

    def check_non_zero_output(self, output):
        """
        Check if any output value is non-zero.
        Returns True if any output value is not zero, False otherwise.
        """
        logger.debug("Checking for non-zero output values")
        
        if not output:
            logger.debug("Output is empty or None")
            return False
            
        flag = False
        try:
            for item in output:
                # Ensure 'value' key exists
                if 'value' not in output[item]:
                    logger.warning(f"Output item {item} missing 'value' key: {output[item]}")
                    continue
                    
                # Try to convert value to float for comparison
                try:
                    value = float(output[item]['value'])
                    logger.debug(f"Output item {item} value: {value}")
                    
                    # comparing the float values
                    if(abs(value - 0.0) > 1e-9):
                        logger.debug(f"Found non-zero value {value} for item {item}")
                        flag = True
                        break
                except (ValueError, TypeError) as e:
                    logger.warning(f"Cannot convert output[{item}]['value'] to float: {str(e)}")
                    # If we can't convert to float, check if the value is a non-empty string
                    value = output[item]['value']
                    if isinstance(value, str) and value.strip() and value.strip() != "0":
                        logger.debug(f"Found non-empty string value '{value}' for item {item}")
                        flag = True
                        break
        except Exception as e:
            logger.error(f"Error checking non-zero output: {str(e)}")
            logger.error(traceback.format_exc())
            return False
        
        logger.debug(f"Non-zero output check result: {flag}")
        return flag