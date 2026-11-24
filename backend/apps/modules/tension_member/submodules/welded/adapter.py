"""
Tension Member - Welded Design Adapter
Implements the business logic directly (not re-exporting from osdag_api)
"""
from osdag_core.Common import (
    KEY_AXIAL,
    KEY_CONNECTOR_MATERIAL,
    KEY_DISP_TENSION_WELDED,
    KEY_DP_DESIGN_METHOD,
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DETAILING_EDGE_TYPE,
    KEY_DP_DETAILING_GAP,
    KEY_DP_WELD_FAB,
    KEY_DP_WELD_MATERIAL_G_O,
    KEY_LENGTH,
    KEY_LOCATION,
    KEY_MATERIAL,
    KEY_MODULE,
    KEY_OUT_PLATETHK,
    KEY_PLATETHK,
    KEY_SECSIZE,
    KEY_SEC_MATERIAL,
    KEY_SEC_PROFILE,
)
from apps.core.utils import (
    validate_arr, validate_num, validate_string,
    MissingKeyError, InvalidInputTypeError,
    contains_keys, custom_list_validation, float_able, int_able, is_yes_or_no, validate_list_type,
    build_raw_output_dict,
)
from apps.modules.tension_member import shared as tbm
from osdag_core.design_type.tension_member.tension_welded import Tension_welded
import sys
import typing
from typing import Dict, Any, List

def get_required_keys() -> List[str]:
    """Return all required input parameters for the module."""
    return [
        KEY_SEC_PROFILE,
        KEY_SECSIZE,
        KEY_MATERIAL,
        KEY_SEC_MATERIAL,
        KEY_PLATETHK,
        KEY_CONNECTOR_MATERIAL,
        KEY_DP_DESIGN_METHOD,
        KEY_AXIAL,
        KEY_LENGTH,
        KEY_LOCATION,
        KEY_MODULE
    ]


def validate_input(input_values: Dict[str, Any]) -> None:
    """Validate type for all values in design dict. Raise error when invalid"""
    required_keys = get_required_keys()
    missing_keys = contains_keys(input_values, required_keys)
    if missing_keys is not None:
        raise MissingKeyError(missing_keys[0])

    # Validate Connector.Material
    if not isinstance(input_values[KEY_CONNECTOR_MATERIAL], str):
        raise InvalidInputTypeError(KEY_CONNECTOR_MATERIAL, "str")

    # Validate Design.Design_Method
    if not isinstance(input_values[KEY_DP_DESIGN_METHOD], str):
        raise InvalidInputTypeError(KEY_DP_DESIGN_METHOD, "str")

    # The Detailing values are optional: the welded tension core neither derives nor reads them.
    # A saved value is still checked.
    if KEY_DP_DETAILING_CORROSIVE_INFLUENCES in input_values and not is_yes_or_no(input_values[KEY_DP_DETAILING_CORROSIVE_INFLUENCES]):
        raise InvalidInputTypeError(KEY_DP_DETAILING_CORROSIVE_INFLUENCES, "'Yes' or 'No'")

    # Validate Detailing.Edge_type
    if KEY_DP_DETAILING_EDGE_TYPE in input_values and not isinstance(input_values[KEY_DP_DETAILING_EDGE_TYPE], str):
        raise InvalidInputTypeError(KEY_DP_DETAILING_EDGE_TYPE, "str")

    # Validate Detailing.Gap
    detailing_gap = input_values.get(KEY_DP_DETAILING_GAP, "0")
    if (not isinstance(detailing_gap, str)
            or not int_able(detailing_gap)):
        raise InvalidInputTypeError(KEY_DP_DETAILING_GAP, "str where str can be converted to int")

    # Validate Load.Axial
    load_axial = input_values[KEY_AXIAL]
    if (not isinstance(load_axial, str)
            or not int_able(load_axial)):
        raise InvalidInputTypeError(KEY_AXIAL, "str where str can be converted to int")

    # Validate Material
    if not isinstance(input_values[KEY_MATERIAL], str):
        raise InvalidInputTypeError(KEY_MATERIAL, "str")

    # Validate Member.Profile
    if not isinstance(input_values[KEY_SEC_PROFILE], str):
        raise InvalidInputTypeError(KEY_SEC_PROFILE, "str")

    # Validate Member.Designation
    section_designation = input_values[KEY_SECSIZE]

    if (not isinstance(section_designation, list)
            or not validate_list_type(section_designation, str)):
        raise InvalidInputTypeError(KEY_SECSIZE, "List[str]")

    # Validate Member.Length
    if not isinstance(input_values[KEY_LENGTH], str):
        raise InvalidInputTypeError(KEY_LENGTH, "str")

    # Validate Conn_Location
    if not isinstance(input_values[KEY_LOCATION], str):
        raise InvalidInputTypeError(KEY_LOCATION, "str")

    # Validate Module
    if not isinstance(input_values[KEY_MODULE], str):
        raise InvalidInputTypeError(KEY_MODULE, "str")

    # Validate Connector.Plate.Thickness_List
    connector_plate_thicknesslist = input_values[KEY_PLATETHK]
    if (not isinstance(connector_plate_thicknesslist, list)
            or not validate_list_type(connector_plate_thicknesslist, str)
            or not custom_list_validation(connector_plate_thicknesslist, int_able)):
        raise InvalidInputTypeError(KEY_PLATETHK, "List[str] where all items can be converted to int")


def create_module() -> Tension_welded:
    """Create an instance of the Tension_welded module design class and set it up for use"""
    module = Tension_welded()
    module.set_osdaglogger(None, id="web")
    return module


def create_from_input(input_values: Dict[str, Any]) -> Tension_welded:
    """Create an instance of the Tension_welded module design class from input values."""
    module = create_module()
    # Plate.Thickness expects a list, take the first value if present, else ""
    if isinstance(input_values.get(KEY_PLATETHK, None), list) and input_values[KEY_PLATETHK]:
        input_values[KEY_OUT_PLATETHK] = input_values[KEY_PLATETHK][0]
    else:
        input_values[KEY_OUT_PLATETHK] = ""
    
    # Auto-normalize Conn_Location for Channels / Angles
    profile = input_values.get(KEY_SEC_PROFILE, "")
    if profile in ["Channels", "Back to Back Channels"]:
        input_values[KEY_LOCATION] = "Web"
    elif profile in ["Angles", "Back to Back Angles", "Star Angles"] and input_values.get(KEY_LOCATION) not in ["Long Leg", "Short Leg"]:
        input_values[KEY_LOCATION] = "Long Leg"

    # Weld fabrication/grade defaults (only when not supplied by the user)
    if not input_values.get(KEY_DP_WELD_MATERIAL_G_O):
        input_values[KEY_DP_WELD_MATERIAL_G_O] = "410"
    if not input_values.get(KEY_DP_WELD_FAB):
        input_values[KEY_DP_WELD_FAB] = "Shop Weld"
    module.set_input_values(input_values)
    return module


def generate_output(input_values: Dict[str, Any]) -> Dict[str, Any]:
    """Generate, format and return the output values from the given input values."""
    output = {}
    raw_csv = {}
    module = create_from_input(input_values)
    design_status = bool(getattr(module, "design_status", False))

    # Get raw output data
    raw_output_text = module.output_values(design_status)
    raw_output_spacing = module.spacing(design_status)

    from osdag_core.custom_logger import CustomLogger

    if hasattr(module, "logger") and isinstance(module.logger, CustomLogger):
        logs = module.logger.get_logs() or []
    else:
        logs = getattr(module, "logs", []) or []

    raw_output = raw_output_spacing + raw_output_text
    raw_csv = build_raw_output_dict(raw_output, design_status)

    for param in raw_output:
        if param[2] == "TextBox":
            key = param[0]
            label = param[1]
            value = param[3]
            output[key] = {
                "key": key,
                "label": label,
                "val": value
            }
    try:
        logs = list(reversed(logs))
    except Exception:
        pass
    return output, logs, raw_csv


def _get_connector_shape(t_obj):
    """Connector part shape for welded: weld model."""
    shapes = []
    if hasattr(t_obj, "get_welded_models"):
        w = t_obj.get_welded_models()
        if w is not None:
            shapes.append(w)
    return tbm.fuse_shapes(shapes)


def create_cad_model(input_values: Dict[str, Any], section: str, session: str, export_formats=None, module=None) -> str:
    """Generate the CAD model from input values as a BREP file. Return file path."""
    module = module if module is not None else create_from_input(input_values)
    return tbm.create_cad_model(module, KEY_DISP_TENSION_WELDED, _get_connector_shape, section, session, export_formats)
