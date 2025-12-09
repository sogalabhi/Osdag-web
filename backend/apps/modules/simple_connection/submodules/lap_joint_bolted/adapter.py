"""
Adapter for Lap Joint Bolted module
"""
from typing import Dict, Any, List
from osdag_core.design_type.connection.lap_joint_bolted import LapJointBolted
from apps.core.utils import (
    validate_arr, validate_num, validate_string,
    MissingKeyError, InvalidInputTypeError,
    contains_keys, custom_list_validation, float_able, int_able, is_yes_or_no, validate_list_type
)
from ...shared import setup_for_cad
from OCC.Core import BRepTools
from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
from OCC.Core.IGESControl import IGESControl_Writer
from OCC.Core.Message import Message_ProgressRange
from osdag_core.cad.common_logic import CommonDesignLogic
import sys
import os
import traceback

def get_required_keys() -> List[str]:
    return []

def validate_input(input_values: Dict[str, Any]) -> None:
    """Validate input values"""
    pass

def generate_output(input_values: Dict[str, Any]) -> Dict[str, Any]:
    """Generate output from input values"""
    output = {}
    logs = []
    try:
        module = LapJointBolted()
        module.set_input_values(input_values)
        # module.design_module()
        # output = module.get_output_values()
        # logs = module.get_logs()
    except Exception as e:
        logs.append(f"Error in design: {str(e)}")
        traceback.print_exc()
    return output, logs

def create_cad_model(input_values: Dict[str, Any], section: str, session: str) -> str:
    """Create CAD model"""
    try:
        module = LapJointBolted()
        module.set_input_values(input_values)
        setup_for_cad(module, input_values)
        return ""
    except Exception as e:
        print(f"Error creating CAD: {e}")
        return ""

def create_from_input(input_values: Dict[str, Any]) -> Any:
    """Create module instance from input"""
    module = LapJointBolted()
    module.set_input_values(input_values)
    return module
