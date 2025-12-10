"""
Adapter for Butt Joint Welded module
"""
from typing import Dict, Any, List
from osdag_core.design_type.connection.butt_joint_welded import ButtJointWelded
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
    """Validate required inputs for ButtJointWelded (no fallbacks)."""
    iv = dict(input_values or {})

    required_keys = [
        "Material",
        "Weld.Material_Grade_OverWrite",
        "Weld.Fab",
        "Weld.Size",
        "Plate1Thickness",
        "Plate2Thickness",
        "PlateWidth",
        "ButtJoint.CoverPlate",
        "Load.Axial",
        "Design.For",
    ]

    missing = [k for k in required_keys if k not in iv or iv[k] in (None, "")]
    if missing:
        raise ValueError(f"Missing required inputs: {', '.join(missing)}")

    # Weld.Size must be a non-empty list/tuple
    weld_size = iv.get("Weld.Size")
    if isinstance(weld_size, (int, float, str)):
        iv["Weld.Size"] = [weld_size]
    elif not isinstance(weld_size, (list, tuple)) or len(weld_size) == 0:
        raise ValueError("Weld.Size must be a non-empty list")


def generate_output(input_values: Dict[str, Any]) -> Dict[str, Any]:
    """Generate output from input values"""
    output = {}
    logs = []
    try:
        module = ButtJointWelded()
        validate_input(input_values)
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
        module = ButtJointWelded()
        validate_input(input_values)
        module.set_input_values(input_values)
        setup_for_cad(module, input_values)
        return ""
    except Exception as e:
        print(f"Error creating CAD: {e}")
        return ""

def create_from_input(input_values: Dict[str, Any]) -> Any:
    """Create module instance from input"""
    module = ButtJointWelded()
    validate_input(input_values)
    module.set_input_values(input_values)
    return module
