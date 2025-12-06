"""
API for Compression Member module
Functions:
    get_required_keys() -> List[str]:
        Return all required input parameters for the module.
    validate_input(input_values: Dict[str, Any]) -> None:
        Go through all the input parameters.
        Check if all required parameters are given.
        Check if all parameters are of correct data type.
    create_module() -> Compression:
        Create an instance of the Compression module design class and set it up for use
    create_from_input(input_values: Dict[str, Any]) -> Compression
        Create an instance of the Compression module design class from input values.
    generate_output(input_values: Dict[str, Any]) -> Dict[str, Any]:
        Generate, format and return the output values from the given input values.
    create_cad_model(input_values: Dict[str, Any], section: str, session: str) -> str:
        Generate the CAD model from input values as a BREP file. Return file path.
"""
from osdag_api.validation_utils import validate_arr, validate_num, validate_string
from osdag_api.errors import MissingKeyError, InvalidInputTypeError
from osdag_api.utils import contains_keys, custom_list_validation, float_able, int_able, is_yes_or_no, validate_list_type
from OCC.Core import BRepTools
from OCC.Core.Message import Message_ProgressRange
from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
from OCC.Core.IGESControl import IGESControl_Writer
from cad.common_logic import CommonDesignLogic
from osdag_core.design_type.compression_member.compression import Compression
from osdag_core.custom_logger import CustomLogger
import sys
import os
from typing import Dict, Any, List
import traceback

old_stdout = sys.stdout  # Backup log
sys.stdout = open(os.devnull, "w")  # redirect stdout
sys.stdout = old_stdout  # Reset log


def get_required_keys() -> List[str]:
    """Return all required input parameters for the compression member module."""
    return [
        "Module",                           # KEY_MODULE
        "Member.Profile",                   # KEY_SEC_PROFILE
        "Member.Designation",               # KEY_SECSIZE
        "Material",                         # KEY_MATERIAL
        "Member.Material",                  # KEY_SEC_MATERIAL
        "Member.Length",                    # KEY_LENGTH
        "Load.Axial",                       # KEY_AXIAL
        "End_1",                           # KEY_END1
        "End_2",                           # KEY_END2
        "Design.Design_Method",            # KEY_DP_DESIGN_METHOD
        "Conn_Location",                   # KEY_LOCATION
    ]


def validate_input(input_values: Dict[str, Any]) -> None:
    """Validate type for all values in design dict. Raise error when invalid"""
    required_keys = get_required_keys()
    missing_keys = contains_keys(input_values, required_keys)
    if missing_keys is not None:
        raise MissingKeyError(missing_keys[0])

    # Validate string keys
    str_keys = [
        "Module",
        "Member.Profile",
        "Material",
        "Member.Material",
        "Design.Design_Method",
        "Conn_Location",
        "End_1",
        "End_2",
    ]
    for key in str_keys:
        if not isinstance(input_values.get(key), str):
            raise InvalidInputTypeError(key, "str")

    # Validate numeric keys
    if not isinstance(input_values.get("Member.Length"), str) or not int_able(input_values.get("Member.Length")):
        raise InvalidInputTypeError("Member.Length", "str where str can be converted to int")
    
    if not isinstance(input_values.get("Load.Axial"), str) or not float_able(input_values.get("Load.Axial")):
        raise InvalidInputTypeError("Load.Axial", "str where str can be converted to float")

    # Validate Member.Designation (can be list or string)
    member_designation = input_values.get("Member.Designation")
    if isinstance(member_designation, list):
        if not validate_list_type(member_designation, str):
            raise InvalidInputTypeError("Member.Designation", "List[str]")
    elif not isinstance(member_designation, str):
        raise InvalidInputTypeError("Member.Designation", "str or List[str]")


def create_module() -> Compression:
    """Create an instance of the Compression module design class and set it up for use"""
    module = Compression()
    module.set_osdaglogger(None)
    return module


def create_from_input(input_values: Dict[str, Any]) -> Compression:
    """Create an instance of the Compression module design class from input values."""
    module = None
    try:
        module = create_module()
    except Exception as e:
        print('Error in create_module:', e)
        raise
    
    # Debug: Print all incoming input values
    print("=== DEBUG: Compression Input values received ===")
    for key, value in input_values.items():
        print(f"  {key}: {value}")
    print("=== End Debug ===")
    
    # Handle array conversion for Member.Designation
    member_designation = input_values.get('Member.Designation', '')
    if isinstance(member_designation, str):
        if member_designation == '[]' or member_designation == 'All':
            member_designation = []
        elif member_designation.startswith('[') and member_designation.endswith(']'):
            try:
                import json
                member_designation = json.loads(member_designation)
            except:
                member_designation = [member_designation]
    elif not isinstance(member_designation, list):
        member_designation = [str(member_designation)]
    
    # Map input_values to exact keys expected by Compression.set_input_values
    # Using exact KEY constants from osdag_core/Common.py
    design_dict = {
        'Module': input_values.get('Module', 'Struts in Trusses'),
        'Member.Profile': input_values.get('Member.Profile', 'Angles'),
        'Member.Designation': member_designation,
        'Material': input_values.get('Material', 'E 250 (Fe 410 W)A'),
        'Member.Material': input_values.get('Member.Material', 'E 250 (Fe 410 W)A'),
        'Member.Length': input_values.get('Member.Length', '3000'),
        'Load.Axial': input_values.get('Load.Axial', '100'),
        'End_1': input_values.get('End_1', 'Fixed'),
        'End_2': input_values.get('End_2', 'Fixed'),
        'Design.Design_Method': input_values.get('Design.Design_Method', 'Limit State Design'),
        'Conn_Location': input_values.get('Conn_Location', input_values.get('Location', 'Long Leg')),
        # Design preference keys with defaults (using exact KEY constant values from Common.py)
        'Optimum.AllowUR': input_values.get('Optimum.AllowUR', '1.0'),              # KEY_ALLOW_UR
        'Effective.Area_Para': input_values.get('Effective.Area_Para', '1.0'),      # KEY_EFFECTIVE_AREA_PARA
        ' In_Plane': input_values.get(' In_Plane', '1.0'),                          # KEY_Buckling_In_plane
        ' Out_of_Plane': input_values.get(' Out_of_Plane', '1.0'),                  # KEY_Buckling_Out_plane
        'Load.Type': input_values.get('Load.Type', 'Concentric Load'),              # KEY_ALLOW_LOAD
        'Bolt.Number': input_values.get('Bolt.Number', '1.0'),                      # KEY_BOLT_Number
        'Connector.Plate.Thickness_List': input_values.get('Connector.Plate.Thickness_List', '8'),  # KEY_PLATETHK
    }
    
    # Debug: Print the design dictionary
    print("=== DEBUG: Design dictionary passed to compression module ===")
    for key, value in design_dict.items():
        print(f"  {key}: {value}")
    print("=== End Debug ===")
    
    try:
        if module is None:
            raise RuntimeError('Module instance was not created')
        module.set_input_values(design_dict)
    except Exception as e:
        traceback.print_exc()
        print('Error in set_input_values:', e)
        raise

    return module


def generate_output(input_values: Dict[str, Any]):
    """
    Generate, format and return the output values from the given input values.
    """
    print("in compression_member.py: generate_output called with input_values:", input_values)
    output = {}
    module = create_from_input(input_values)
    logs = []
    
    try:
        # Generate output values
        raw_output_text = module.output_values(True)
        print('in compression_member.py: raw_output_text:', raw_output_text)
        
        # Get logs from the custom logger
        if hasattr(module, 'logger') and isinstance(module.logger, CustomLogger):
            logs = module.logger.get_logs()
            print(f'Retrieved {len(logs)} logs from custom logger')
        else:
            print('Logger is not CustomLogger instance or logger not found')
        
        raw_output = raw_output_text
        print('in compression_member.py: raw_output combined length:', len(raw_output))

        # Process each parameter
        for i, param in enumerate(raw_output):
            print(f"in compression_member.py: Processing param {i}: {param}")
            print(f"Param length: {len(param)}")
            
            if len(param) >= 4:
                key = param[0]
                label = param[1]
                param_type = param[2]
                value = param[3]
                
                print(f"Key: {key}, Label: {label}, Type: {param_type}, Value: {value}")
                
                # Check if it's a TextBox type and has a valid key
                if param_type == "TextBox" and key is not None:
                    # Handle numpy types
                    if hasattr(value, 'item'):
                        value = value.item()
                    
                    output[key] = {
                        "key": key,
                        "label": label,
                        "val": value
                    }
    except Exception as e:
        print(f'Error in generate_output: {e}')
        traceback.print_exc()
        
    print("in compression_member.py: Final output dict:", output)
    print("in compression_member.py: Output keys:", list(output.keys()))
    print("in compression_member.py: Returning logs:", logs)
    return output, logs


def create_cad_model(input_values: Dict[str, Any], section: str, session: str) -> str:
    """Generate the CAD model from input values as a BREP file. Return file path."""
    # For now, returning empty string as CAD generation might need specific implementation
    print("CAD model generation for compression member - to be implemented")
    return ""

