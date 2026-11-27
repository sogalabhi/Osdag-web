"""
Tension Member - Bolted Design Adapter
Implements the business logic directly (not re-exporting from osdag_api)
"""
from osdag_core.Common import (
    KEY_DISP_TENSION_BOLTED,
    KEY_LOCATION,
    KEY_OUT_PLATETHK,
    KEY_PLATETHK,
    KEY_SEC_PROFILE,
)
from apps.core.utils import build_raw_output_dict
from apps.modules.tension_member import shared as tbm
from apps.modules.tension_member.submodules.bolted.schema import BoltedTensionInput
from osdag_core.design_type.tension_member.tension_bolted import Tension_bolted
from typing import Dict, Any


def validate_input(input_values: Dict[str, Any]) -> None:
    """Raise ValidationError naming every bad key. The HTTP request path runs the same model."""
    BoltedTensionInput.validate_request(input_values)


def create_module() -> Tension_bolted:
    """Create an instance of the Tension_bolted module design class and set it up for use"""
    module = Tension_bolted()
    module.set_osdaglogger(None, id="web")
    return module


def create_from_input(input_values: Dict[str, Any]) -> Tension_bolted:
    """Create an instance of the Tension_bolted module design class from input values."""
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
    """Connector part shape for bolted: fused nut-bolt array(s)."""
    shapes = []
    if hasattr(t_obj, "get_nut_bolt_array_models"):
        b = t_obj.get_nut_bolt_array_models()
        if b is not None:
            shapes.append(b)
    if hasattr(t_obj, "get_end_nut_bolt_array_models"):
        eb = t_obj.get_end_nut_bolt_array_models()
        if eb is not None:
            shapes.append(eb)
    return tbm.fuse_shapes(shapes)


def create_cad_model(input_values: Dict[str, Any], section: str, session: str, export_formats=None, module=None) -> str:
    """Generate the CAD model from input values as a BREP file. Return file path."""
    module = module if module is not None else create_from_input(input_values)
    return tbm.create_cad_model(module, KEY_DISP_TENSION_BOLTED, _get_connector_shape, section, session, export_formats)
