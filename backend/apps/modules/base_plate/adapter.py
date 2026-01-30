"""
Base Plate Adapter
Implements the business logic directly (not re-exporting from osdag_api)
"""
from apps.core.utils import (
    validate_arr, validate_num, validate_string,
    MissingKeyError, InvalidInputTypeError,
    contains_keys, custom_list_validation, float_able, int_able, is_yes_or_no, validate_list_type
)
from osdag_core.design_type.connection.base_plate_connection import BasePlateConnection
from osdag_core.custom_logger import CustomLogger
import sys
import os
from typing import Dict, Any, List
import traceback
import json

old_stdout = sys.stdout  # Backup log
sys.stdout = open(os.devnull, "w")  # redirect stdout
sys.stdout = old_stdout  # Reset log


def get_required_keys() -> List[str]:
    """Return all required input parameters for the base plate module."""
    return [
        "Module",                           # KEY_MODULE
        "Member.Profile",                   # KEY_SEC_PROFILE
        "Member.Designation",               # KEY_SECSIZE
        "Material",                         # KEY_MATERIAL
        "Member.Material",                  # KEY_SEC_MATERIAL
        "Load.Axial",                       # KEY_AXIAL
        "Load.Shear",                       # KEY_SHEAR
        "Load.Moment",                      # KEY_MOMENT
        "Design.Design_Method",            # KEY_DP_DESIGN_METHOD
        "Detailing.Corrosive_Influences",  # KEY_DP_DETAILING_CORROSIVE_INFLUENCES
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
        "Detailing.Corrosive_Influences",
    ]
    for key in str_keys:
        if not isinstance(input_values.get(key), str):
            raise InvalidInputTypeError(key, "str")

    # Validate numeric keys
    num_keys = [
        "Load.Axial",
        "Load.Shear",
        "Load.Moment",
    ]
    for key in num_keys:
        if not isinstance(input_values.get(key), str) or not float_able(input_values.get(key)):
            raise InvalidInputTypeError(key, "str where str can be converted to float")

    # Validate Member.Designation (can be list or string)
    member_designation = input_values.get("Member.Designation")
    if isinstance(member_designation, list):
        if not validate_list_type(member_designation, str):
            raise InvalidInputTypeError("Member.Designation", "List[str]")
    elif not isinstance(member_designation, str):
        raise InvalidInputTypeError("Member.Designation", "str or List[str]")


def create_module() -> BasePlateConnection:
    """Create an instance of the BasePlateConnection module design class and set it up for use"""
    module = BasePlateConnection()
    module.set_osdaglogger(None, id="web")
    return module


def create_from_input(input_values: Dict[str, Any]) -> BasePlateConnection:
    """Create an instance of the BasePlateConnection module design class from input values."""
    module = None
    try:
        module = create_module()
    except Exception as e:
        print('Error in create_module:', e)
        raise
    
    # Handle array conversion for Member.Designation
    member_designation = input_values.get('Member.Designation', '')
    if isinstance(member_designation, str):
        if member_designation == '[]' or member_designation == 'All':
            member_designation = []
        elif member_designation.startswith('[') and member_designation.endswith(']'):
            try:
                member_designation = json.loads(member_designation)
            except:
                member_designation = [member_designation]
    elif not isinstance(member_designation, list):
        member_designation = [str(member_designation)]
    
    # Map input_values to exact keys expected by BasePlateConnection.set_input_values
    design_dict = {
        'Module': input_values.get('Module', 'Base Plate'),
        'Member.Profile': input_values.get('Member.Profile', 'Columns'),
        'Member.Designation': member_designation,
        'Material': input_values.get('Material', 'E 250 (Fe 410 W)A'),
        'Member.Material': input_values.get('Member.Material', 'E 250 (Fe 410 W)A'),
        'Load.Axial': input_values.get('Load.Axial', '100'),
        'Load.Shear': input_values.get('Load.Shear', '50'),
        'Load.Moment': input_values.get('Load.Moment', '20'),
        'Design.Design_Method': input_values.get('Design.Design_Method', 'Limit State Design'),
        'Detailing.Corrosive_Influences': input_values.get('Detailing.Corrosive_Influences', 'No'),
        # Add other optional keys with defaults if needed
        'Bolt.Diameter': input_values.get('Bolt.Diameter', []),
        'Bolt.Grade': input_values.get('Bolt.Grade', []),
        'Anchor.Diameter': input_values.get('Anchor.Diameter', []),
        'Anchor.Grade': input_values.get('Anchor.Grade', []),
        'Footing.Grade': input_values.get('Footing.Grade', ''),
    }
    
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
    output = {}
    module = create_from_input(input_values)
    logs = []
    
    try:
        # Generate output values
        raw_output_text = module.output_values(True)
        
        # Get logs from the custom logger
        if hasattr(module, 'logger') and isinstance(module.logger, CustomLogger):
            logs = module.logger.get_logs()
        
        raw_output = raw_output_text

        # Process each parameter
        for i, param in enumerate(raw_output):
            if len(param) >= 4:
                key = param[0]
                label = param[1]
                param_type = param[2]
                value = param[3]
                
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
        
    return output, logs


def create_cad_model(input_values: Dict[str, Any], section: str, session: str) -> str:
    """Generate the CAD model from input values as a BREP file. Return file path."""
    # For now, returning empty string as CAD generation might need specific implementation
    return ""
