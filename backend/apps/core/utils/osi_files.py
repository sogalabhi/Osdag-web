import json
import re
from datetime import datetime
from typing import Any, Dict, Tuple

import yaml
from apps.core.web_keys import WEB_OSDAGWEB_VERSION
from django.core.files.base import ContentFile

from osdag_core.Common import (
    KEY_ACTUAL_LEN_YY,
    KEY_ACTUAL_LEN_ZZ,
    KEY_ANGLE_LIST,
    KEY_AXIAL,
    KEY_AXIAL_FORCE,
    KEY_CONNECTOR_MATERIAL,
    KEY_D,
    KEY_DESIGN_FOR,
    KEY_DISP_HEADERPLATE,
    KEY_DP_BOLT_HOLE_TYPE,
    KEY_DP_BOLT_SLIP_FACTOR,
    KEY_DP_BOLT_TYPE,
    KEY_DP_DESIGN_METHOD,
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DETAILING_EDGE_TYPE,
    KEY_DP_DETAILING_GAP,
    KEY_DP_WELD_FAB,
    KEY_DP_WELD_MATERIAL_G_O,
    KEY_END1,
    KEY_END1_Y,
    KEY_END2,
    KEY_END2_Y,
    KEY_FLANGEPLATE_THICKNESS,
    KEY_GRD,
    KEY_MATERIAL,
    KEY_MODULE,
    KEY_PLATE1_THICKNESS,
    KEY_PLATE2_THICKNESS,
    KEY_PLATE_WIDTH,
    KEY_PLATETHK,
    KEY_SEC_PROFILE,
    KEY_SHEAR,
    KEY_TYP,
    KEY_WEBPLATE_THICKNESS,
    KEY_WELD_SIZE,
    KEY_WELD_TYPE,
)

OSI_SCHEMA_VERSION = "1.0"
SUPPORTED_VERSIONS = {"1.0"}

# Desktop module names that differ from the web module id. The desktop calls the shear
# header plate module "End Plate Connection".
DESKTOP_MODULE_NAMES = {"End Plate Connection": KEY_DISP_HEADERPLATE}


def validate_module_id(module_id: str) -> bool:
    if not isinstance(module_id, str):
        return False
    # allow letters, numbers, spaces, dashes and underscores
    return bool(re.fullmatch(r"[A-Za-z0-9 _-]{2,64}", module_id))


# Frontend field name -> core key, for exporting a stored project. A project saved with the web
# field names ({dock, pref}) has no core keys, so the export writes each field under the key the
# desktop reads. Every value is a core key (a value in osdag_core.Common). Opening a file needs no
# table: the frontend reads each module's declared `coreKeys`.
FIELD_TO_OSI_KEY: Dict[str, str] = {
    "bolt_hole_type": KEY_DP_BOLT_HOLE_TYPE,
    "bolt_diameter": KEY_D,
    "bolt_grade": KEY_GRD,
    "bolt_slip_factor": KEY_DP_BOLT_SLIP_FACTOR,
    "bolt_tension_type": KEY_DP_BOLT_TYPE,
    "bolt_type": KEY_TYP,
    "connector_material": KEY_CONNECTOR_MATERIAL,
    "plate_thickness": KEY_PLATETHK,
    "flange_plate_thickness": KEY_FLANGEPLATE_THICKNESS,
    "web_plate_thickness": KEY_WEBPLATE_THICKNESS,
    "angle_list": KEY_ANGLE_LIST,
    "section_profile": KEY_SEC_PROFILE,
    "end_condition_1": KEY_END1,
    "end_condition_2": KEY_END2,
    "end_condition_1_y": KEY_END1_Y,
    "end_condition_2_y": KEY_END2_Y,
    "actual_length_zz": KEY_ACTUAL_LEN_ZZ,
    "actual_length_yy": KEY_ACTUAL_LEN_YY,
    "design_method": KEY_DP_DESIGN_METHOD,
    "detailing_corr_status": KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    "detailing_edge_type": KEY_DP_DETAILING_EDGE_TYPE,
    "detailing_gap": KEY_DP_DETAILING_GAP,
    "design_for": KEY_DESIGN_FOR,
    "load_axial": KEY_AXIAL,
    "axial_force": KEY_AXIAL_FORCE,
    "load_shear": KEY_SHEAR,
    "material": KEY_MATERIAL,
    "plate1_thickness": KEY_PLATE1_THICKNESS,
    "plate2_thickness": KEY_PLATE2_THICKNESS,
    "plate_width": KEY_PLATE_WIDTH,
    "weld_fab": KEY_DP_WELD_FAB,
    "weld_material_grade": KEY_DP_WELD_MATERIAL_G_O,
    "weld_size": KEY_WELD_SIZE,
    "weld_type": KEY_WELD_TYPE,
}


def flatten_and_translate_keys(inputs: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(inputs, dict):
        return {}

    dock = inputs.get("dock") or {}
    pref = inputs.get("pref") or {}

    # If it is not nested under dock/pref, assume it is already flat
    if not dock and not pref:
        inner_inputs = inputs.get("inputs")
        if isinstance(inner_inputs, dict) and ("dock" in inner_inputs or "pref" in inner_inputs):
            dock = inner_inputs.get("dock") or {}
            pref = inner_inputs.get("pref") or {}
        else:
            return inputs

    combined = {}

    # 1. Translate and flatten dock keys
    for k, v in dock.items():
        if k in FIELD_TO_OSI_KEY:
            combined[FIELD_TO_OSI_KEY[k]] = v
        else:
            # Fallback: convert snake_case to PascalCase (best effort)
            pascal_key = ''.join(word.capitalize() for word in k.split('_'))
            combined[pascal_key] = v

    # 2. Translate and flatten pref keys (prefix with Pref.)
    for k, v in pref.items():
        pascal_key = ''.join(word.capitalize() for word in k.split('_'))
        combined[f"Pref.{pascal_key}"] = v

    return combined


def build_osi_payload(name: str, module_id: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
    if not name or not isinstance(name, str):
        raise ValueError("Invalid project name")
    if not validate_module_id(module_id):
        raise ValueError("Invalid module_id")
    if not isinstance(inputs, dict):
        raise ValueError("Invalid inputs; expected object")
    return {
        "version": OSI_SCHEMA_VERSION,
        "name": name,
        "module_id": module_id,
        "inputs": flatten_and_translate_keys(inputs),
        "meta": {
            "saved_at": datetime.utcnow().isoformat() + "Z",
        },
    }


def _to_flat_yaml(module_id: str, name: str, inputs: Dict[str, Any]) -> str:
    """Render a flat dictionary of inputs into OSI flat YAML with dotted keys."""
    def qt(s: Any) -> str:
        # quote list items as strings in YAML as per standard flat files
        return f"'{str(s)}'"

    flat_inputs = {**inputs}
    
    # Guarantee Module and Version are set
    if KEY_MODULE not in flat_inputs and "module" not in flat_inputs:
        flat_inputs[KEY_MODULE] = module_id
    if WEB_OSDAGWEB_VERSION not in flat_inputs:
        flat_inputs[WEB_OSDAGWEB_VERSION] = "1.0"

    # Build YAML string manually
    lines: list[str] = []
    
    # Sort keys for deterministic output
    for key in sorted(flat_inputs.keys()):
        if key in ["name", "project_name"]:
            continue
        value = flat_inputs[key]
        if value is None:
            continue
        if isinstance(value, list):
            if len(value) == 0:
                continue
            lines.append(f"{key}:")
            for item in value:
                lines.append(f"- {qt(item)}")
        else:
            if isinstance(value, str) and value.strip() == "":
                continue
            lines.append(f"{key}: {value}")

    return "\n".join(lines) + "\n"


def serialize_osi(payload: Dict[str, Any]) -> str:
    module_id = payload.get("module_id") or ""
    name = payload.get("name") or "project"
    inputs = payload.get("inputs") or {}

    # If payload inputs are already nested, fallback to JSON
    if "dock" in inputs or "pref" in inputs:
        return json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n"

    # Otherwise, serialize as generic flat YAML
    return _to_flat_yaml(module_id, name, inputs)


class _StringSafeLoader(yaml.SafeLoader):
    """SafeLoader that keeps every plain scalar a string.

    .osi values are strings (desktop quotes numbers, the web writes them bare), so
    `No`, `08` or `1.0` must not become a bool, int or float. Only an empty plain
    value (`Key:`) still resolves to null.
    """


_StringSafeLoader.yaml_implicit_resolvers = {}
_StringSafeLoader.add_implicit_resolver("tag:yaml.org,2002:null", re.compile(r"^$"), [""])


def _parse_flat_yaml(text: str) -> Dict[str, Any]:
    """Read the flat `.osi` YAML written by desktop Osdag and by the web app.

    Keys stay flat and dotted (`Bolt.Diameter`). Values are strings or lists of
    strings. Anchors and aliases (`&id001` / `*id001`, which PyYAML writes when the
    same list occurs twice) are resolved, so each key gets its own copy of the list.
    An empty value becomes an empty list.
    """
    data = yaml.load(text, Loader=_StringSafeLoader)
    if not isinstance(data, dict):
        raise ValueError("Malformed OSI file")

    flat_inputs: Dict[str, Any] = {}
    for key, value in data.items():
        if value is None:
            value = []
        elif isinstance(value, list):
            value = ["" if item is None else str(item) for item in value]
        flat_inputs[str(key)] = value
    return flat_inputs


def parse_osi(text: str) -> Tuple[str, str, Dict[str, Any]]:
    """Read an `.osi` file into (module id, name, design dictionary).

    The design dictionary is the file's keys and values as written (core keys such as
    `Bolt.Diameter`); the frontend reads it with each module's declared `coreKeys`.
    """
    # Try modern JSON first
    try:
        data = json.loads(text)
        version = data.get("version")
        if version not in SUPPORTED_VERSIONS:
            raise ValueError("Unsupported OSI version")
        name = data.get("name")
        module_id = data.get("module_id")
        inputs = data.get("inputs")
        if not name or not validate_module_id(module_id) or not isinstance(inputs, dict):
            raise ValueError("Malformed OSI payload")
        return module_id, name, inputs
    except Exception:
        # Fallback to flat YAML
        flat_inputs = _parse_flat_yaml(text)
        module_id = flat_inputs.get(KEY_MODULE) or flat_inputs.get("module") or ""

        if not module_id:
            raise ValueError("Module missing in OSI")
        module_id = DESKTOP_MODULE_NAMES.get(module_id, module_id)

        name = flat_inputs.get("name") or module_id
        return module_id, name, flat_inputs


def make_osifile_contentfile(payload: Dict[str, Any]) -> ContentFile:
    content = serialize_osi(payload)
    return ContentFile(content.encode("utf-8"))


