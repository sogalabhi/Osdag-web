"""
Base Plate Adapter
Maps web API payload to osdag_core BasePlateConnection keys and back.
"""
from apps.core import catalog
from apps.core.utils import (
    validate_arr, validate_num, validate_string,
    MissingKeyError, InvalidInputTypeError, InvalidInputError,
    contains_keys, custom_list_validation, float_able, int_able, is_yes_or_no, validate_list_type,
    write_stl, build_raw_output_dict,
)
from osdag_core.design_type.connection.base_plate_connection import BasePlateConnection
from osdag_core.custom_logger import CustomLogger
from osdag_core.cad.common_logic import CommonDesignLogic
from osdag_core.Common import (
    KEY_AXIAL,
    KEY_AXIAL_BP,
    KEY_AXIAL_TENSION_BP,
    KEY_BASE_PLATE_MATERIAL,
    KEY_CONN,
    KEY_DIA_ANCHOR_ICF,
    KEY_DIA_ANCHOR_OCF,
    KEY_DISP_BASE_PLATE,
    KEY_DP_ANCHOR_BOLT_DESIGNATION_ICF,
    KEY_DP_ANCHOR_BOLT_DESIGNATION_OCF,
    KEY_DP_ANCHOR_BOLT_FRICTION,
    KEY_DP_ANCHOR_BOLT_GALVANIZED_ICF,
    KEY_DP_ANCHOR_BOLT_GALVANIZED_OCF,
    KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF,
    KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF,
    KEY_DP_ANCHOR_BOLT_LENGTH_ICF,
    KEY_DP_ANCHOR_BOLT_LENGTH_OCF,
    KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_ICF,
    KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_OCF,
    KEY_DP_ANCHOR_BOLT_TYPE_ICF,
    KEY_DP_ANCHOR_BOLT_TYPE_OCF,
    KEY_DP_DESIGN_BASE_PLATE,
    KEY_DP_DESIGN_METHOD,
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DETAILING_EDGE_TYPE,
    KEY_DP_WELD_FAB,
    KEY_DP_WELD_MATERIAL_G_O,
    KEY_DP_WELD_TYPE,
    KEY_END_CONDITION,
    KEY_GRD_ANCHOR_ICF,
    KEY_GRD_ANCHOR_OCF,
    KEY_GRD_FOOTING,
    KEY_MATERIAL,
    KEY_MODULE,
    KEY_MOMENT,
    KEY_MOMENT_MAJOR,
    KEY_MOMENT_MINOR,
    KEY_SECSIZE,
    KEY_SEC_MATERIAL,
    KEY_SHEAR,
    KEY_SHEAR_MAJOR,
    KEY_SHEAR_MINOR,
    KEY_ST_KEY_MATERIAL,
    KEY_TYP_ANCHOR,
    KEY_WELD_TYPE,
)
from OCC.Core import BRepTools
from OCC.Core.Message import Message_ProgressRange
import sys
import os
from typing import Dict, Any, List
import traceback
import json
from apps.core.web_keys import (
    WEB_COLUMN_DEPTH,
    WEB_COLUMN_TF,
    WEB_COLUMN_TW,
    WEB_COLUMN_WIDTH,
    WEB_STIFFENERHOLLOW_B_THICKNESS,
    WEB_STIFFENERHOLLOW_D_THICKNESS,
    WEB_STIFFENERHOLLOW_OD_THICKNESS,
)

HOLLOW_CONNECTIVITY = 'Hollow/Tubular Column Base'
HOLLOW_SECTION_TABLES = ('RHS', 'SHS', 'CHS')

# Core expects these key names (from osdag_core.Common / base_plate_connection.set_input_values)


def get_required_keys() -> List[str]:
    """Return required input parameters matching desktop Base Plate input dock only."""
    return [
        KEY_MODULE,
        KEY_CONN,
        KEY_END_CONDITION,
        KEY_SECSIZE,
        KEY_MATERIAL,
        KEY_AXIAL,
        KEY_AXIAL_TENSION_BP,
        KEY_SHEAR_MAJOR,
        KEY_SHEAR_MINOR,
        KEY_MOMENT_MAJOR,
        KEY_MOMENT_MINOR,
    ]


def validate_input(input_values: Dict[str, Any]) -> None:
    """Validate type for values; only keys present in desktop Base Plate input dock."""
    required_keys = get_required_keys()
    missing_keys = contains_keys(input_values, required_keys)
    if missing_keys is not None:
        raise MissingKeyError(missing_keys[0])

    str_keys = [KEY_MODULE, KEY_MATERIAL, KEY_CONN, KEY_END_CONDITION]
    for key in str_keys:
        if not isinstance(input_values.get(key), str):
            raise InvalidInputTypeError(key, "str")

    load_keys = [
        KEY_AXIAL, KEY_AXIAL_TENSION_BP,
        KEY_SHEAR_MAJOR, KEY_SHEAR_MINOR,
        KEY_MOMENT_MAJOR, KEY_MOMENT_MINOR,
    ]
    for key in load_keys:
        val = input_values.get(key)
        if val is not None and val != "":
            if not isinstance(val, str) or not float_able(val):
                raise InvalidInputTypeError(key, "str (number)")

    member_designation = input_values.get(KEY_SECSIZE)
    if isinstance(member_designation, list):
        if not validate_list_type(member_designation, str):
            raise InvalidInputTypeError(KEY_SECSIZE, "List[str]")
    elif not isinstance(member_designation, str):
        raise InvalidInputTypeError(KEY_SECSIZE, "str or List[str]")


def create_module() -> BasePlateConnection:
    """Create an instance of the BasePlateConnection module design class and set it up for use"""
    module = BasePlateConnection()
    module.set_osdaglogger(None, id="web")
    return module


def _ensure_list(val, default=None):
    if val is None:
        return default if default is not None else []
    if isinstance(val, list):
        return val
    return [val] if val != "" and val != "All" else []


def _normalize_anchor_diameter(dia):
    """Ensure core format: 'M20', 'M24' etc. Accepts 20, '20', 'M20'."""
    if dia is None or dia == "":
        return "M20"
    s = str(dia).strip()
    if s.upper().startswith("M"):
        return s if s[1:].isdigit() else "M20"
    if s.isdigit():
        return f"M{int(s)}"
    return "M20"


def _normalize_anchor_diameter_list(lst, default=None):
    """Return list of anchor diameter strings in core format (e.g. ['M20'])."""
    if not lst:
        return [default or "M20"]
    out = []
    for x in lst:
        out.append(_normalize_anchor_diameter(x))
    return out if out else [default or "M20"]


def _first_or_str(val):
    """Return first element if list, else string value. For single section used by core."""
    if isinstance(val, list):
        return val[0] if len(val) > 0 else "Select Section"
    if val == "All" or val == "[]" or (isinstance(val, str) and val.startswith("[") and val.endswith("]")):
        return "Select Section"
    return str(val) if val is not None else "Select Section"


def hollow_section_designations() -> List[str]:
    """Hollow column sections for the dropdown, in the desktop app's order, without the catalog's leading space."""
    return [
        name.strip()
        for table in HOLLOW_SECTION_TABLES
        for name in catalog.designations(table)
    ]


def _catalog_hollow_designation(name: str) -> str:
    """The catalog's spelling of a hollow section; osdag_core needs its leading space."""
    wanted = str(name).strip()
    for table in HOLLOW_SECTION_TABLES:
        for candidate in catalog.designations(table):
            if candidate.strip() == wanted:
                return candidate
    return name


def create_from_input(input_values: Dict[str, Any]) -> BasePlateConnection:
    """Create BasePlateConnection from web input and run set_input_values with full design_dict."""
    module = create_module()

    member_designation = input_values.get(KEY_SECSIZE, "")
    if isinstance(member_designation, str):
        if member_designation in ("[]", "All", ""):
            member_designation = []
        elif member_designation.startswith("[") and member_designation.endswith("]"):
            try:
                member_designation = json.loads(member_designation)
            except Exception:
                member_designation = [member_designation]
        else:
            member_designation = [member_designation]
    elif not isinstance(member_designation, list):
        member_designation = [str(member_designation)]

    # Single section string for core (core expects one section per design run)
    section_str = _first_or_str(member_designation) if member_designation else "Select Section"
    if input_values.get(KEY_CONN) == HOLLOW_CONNECTIVITY:
        section_str = _catalog_hollow_designation(section_str)

    material = input_values.get(KEY_MATERIAL, "E 250 (Fe 410 W)A")
    if isinstance(material, dict):
        material = material.get("Grade", material.get("grade", str(material)))
    member_material = input_values.get(KEY_SEC_MATERIAL, material)
    if isinstance(member_material, dict):
        member_material = member_material.get("Grade", member_material.get("grade", str(member_material)))

    # Anchor: core expects list of strings like ['M20'], ['8.8'] (IS 5624 format)
    anchor_dia_ocf = input_values.get(KEY_DIA_ANCHOR_OCF, [])
    anchor_grd_ocf = input_values.get(KEY_GRD_ANCHOR_OCF, [])
    anchor_dia_icf = input_values.get(KEY_DIA_ANCHOR_ICF, anchor_dia_ocf)
    anchor_grd_icf = input_values.get(KEY_GRD_ANCHOR_ICF, anchor_grd_ocf)
    anchor_dia_ocf = _normalize_anchor_diameter_list(anchor_dia_ocf, "M20")
    anchor_grd_ocf = _ensure_list(anchor_grd_ocf, ["8.8"])
    anchor_dia_icf = _normalize_anchor_diameter_list(anchor_dia_icf, "M20")
    anchor_grd_icf = _ensure_list(anchor_grd_icf, anchor_grd_ocf)

    connectivity = input_values.get(KEY_CONN, input_values.get("Connectivity *", "Welded Column Base"))
    axial = input_values.get(KEY_AXIAL, "100")
    shear = input_values.get(KEY_SHEAR, "50")
    shear_major = input_values.get(KEY_SHEAR_MAJOR, shear)
    shear_minor = input_values.get(KEY_SHEAR_MINOR, "0")
    moment = input_values.get(KEY_MOMENT, "20")
    moment_major = input_values.get(KEY_MOMENT_MAJOR, moment)
    moment_minor = input_values.get(KEY_MOMENT_MINOR, "0")
    axial_tension = input_values.get(KEY_AXIAL_TENSION_BP, "0")
    # Only a moment base plate takes moments; the form can still hold a value typed before
    # the connectivity changed.
    if connectivity != "Moment Base Plate":
        moment_major = "Disabled"
        moment_minor = "Disabled"
    if connectivity != "Moment Base Plate" or axial_tension == "":
        axial_tension = "Disabled"

    footing_grade = input_values.get(KEY_GRD_FOOTING, "M20")
    if footing_grade == "" or footing_grade is None:
        footing_grade = "M20"
    weld_type = input_values.get(KEY_WELD_TYPE, "Fillet Weld")
    anchor_type = input_values.get(KEY_TYP_ANCHOR, "End Plate Type")

    # Additional Inputs: the request carries them, saved by the user or filled from the core
    # (design_dictionary.fill_prefs), so the adapter adds no defaults of its own.
    prefs = {key: input_values.get(key) for key in (
        KEY_BASE_PLATE_MATERIAL,
        KEY_ST_KEY_MATERIAL,
        KEY_DP_ANCHOR_BOLT_DESIGNATION_OCF,
        KEY_DP_ANCHOR_BOLT_DESIGNATION_ICF,
        KEY_DP_ANCHOR_BOLT_TYPE_OCF,
        KEY_DP_ANCHOR_BOLT_TYPE_ICF,
        KEY_DP_ANCHOR_BOLT_GALVANIZED_OCF,
        KEY_DP_ANCHOR_BOLT_GALVANIZED_ICF,
        KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF,
        KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF,
        KEY_DP_ANCHOR_BOLT_LENGTH_OCF,
        KEY_DP_ANCHOR_BOLT_LENGTH_ICF,
        KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_OCF,
        KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_ICF,
        KEY_DP_ANCHOR_BOLT_FRICTION,
        KEY_DP_WELD_FAB,
        KEY_DP_WELD_MATERIAL_G_O,
        KEY_DP_DETAILING_EDGE_TYPE,
        KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
        KEY_DP_DESIGN_METHOD,
        KEY_DP_DESIGN_BASE_PLATE,
    )}
    # The core computes with these as numbers.
    for key in (KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_OCF, KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_ICF, KEY_DP_WELD_MATERIAL_G_O):
        if prefs[key] is not None:
            prefs[key] = float(prefs[key])

    # Parent MomentConnection.set_input_values() -> Load() requires numeric strings; use "0" when "Disabled"
    shear_for_load = "0" if shear_major == "Disabled" else str(shear_major)
    moment_for_load = "0" if moment_major == "Disabled" else str(moment_major)
    design_dict = {
        KEY_CONN: connectivity,
        'Connectivity *': connectivity,    # desktop Common.py KEY_CONN value (Celery worker may resolve this)
        KEY_END_CONDITION: "Pinned",
        KEY_SECSIZE: section_str,
        KEY_MATERIAL: material,
        KEY_SEC_MATERIAL: member_material,
        KEY_AXIAL: str(axial),
        KEY_AXIAL_BP: str(axial),
        KEY_AXIAL_TENSION_BP: str(axial_tension),
        KEY_SHEAR: shear_for_load,
        KEY_MOMENT: moment_for_load,
        KEY_SHEAR_MAJOR: str(shear_major),
        KEY_SHEAR_MINOR: str(shear_minor),
        KEY_MOMENT_MAJOR: str(moment_major),
        KEY_MOMENT_MINOR: str(moment_minor),
        KEY_DIA_ANCHOR_OCF: anchor_dia_ocf,
        KEY_GRD_ANCHOR_OCF: anchor_grd_ocf,
        KEY_DIA_ANCHOR_ICF: anchor_dia_icf,
        KEY_GRD_ANCHOR_ICF: anchor_grd_icf,
        KEY_TYP_ANCHOR: anchor_type,
        KEY_GRD_FOOTING: str(footing_grade),
        KEY_WELD_TYPE: weld_type,
        KEY_DP_WELD_TYPE: weld_type,
        **prefs,
    }

    try:
        module.set_input_values(design_dict)
        # Run the actual design (bp_parameters); desktop calls this via func_for_validation
        validation_errors = module.func_for_validation(design_dict)
        if validation_errors is not None and len(validation_errors) > 0:
            raise InvalidInputError(str(validation_errors[0]) if validation_errors else "Validation failed")
    except Exception as e:
        traceback.print_exc()
        raise

    return module


def _append_detail_list(output: dict, detail_list: list):
    """Append TYPE_TEXTBOX entries from a detail method (e.g. stiffener_flange_details) into output."""
    if not detail_list:
        return
    for param in detail_list:
        if len(param) >= 4:
            key, label, param_type, value = param[0], param[1], param[2], param[3]
            if key is None or param_type != "TextBox":
                continue
            if hasattr(value, "item"):
                value = value.item()
            output[key] = {"key": key, "label": label, "val": value}


def generate_output(input_values: Dict[str, Any]):
    """Run design and return output dict + logs. Output keys match desktop output_values keys."""
    output = {}
    module = create_from_input(input_values)
    design_status = bool(getattr(module, "design_status", False))
    logs = []
    raw_csv = {}

    try:
        raw_output = module.output_values(design_status)
        raw_csv = build_raw_output_dict(raw_output, design_status)
        if hasattr(module, "logger") and isinstance(module.logger, CustomLogger):
            logs = module.logger.get_logs()

        for param in raw_output:
            if len(param) >= 4:
                key, label, param_type, value = param[0], param[1], param[2], param[3]
                if key is None or param_type != "TextBox":
                    continue
                if hasattr(value, "item"):
                    value = value.item()
                output[key] = {"key": key, "label": label, "val": value}

        # Stiffener detail modals: merge flange, along web, across web details into output
        if hasattr(module, "stiffener_flange_details"):
            _append_detail_list(output, module.stiffener_flange_details(design_status))
        if hasattr(module, "stiffener_along_web_details"):
            _append_detail_list(output, module.stiffener_along_web_details(design_status))
        if hasattr(module, "stiffener_across_web_details"):
            _append_detail_list(output, module.stiffener_across_web_details(design_status))
        if hasattr(module, "stiffener_hollow_details"):
            hollow_list = module.stiffener_hollow_details(design_status)
            _append_detail_list(output, hollow_list)
            # stiffener_hollow_details() returns 3 groups (D, B, OD/CHS) that
            # all reuse the same KEY_OUT_STIFFENER_THICKNESS / _CHS constants
            # (both literally 'Stiffener.Thickness' in Common.py) - the naive
            # flatten-by-key above only keeps whichever group is written last,
            # silently dropping the other two. Recover all 3 explicitly by
            # index, matching desktop's own stiffdata[3]/[11]/[19] access in
            # base_plate_hollow.py.
            try:
                hollow_thickness_indices = {
                    WEB_STIFFENERHOLLOW_D_THICKNESS: 3,
                    WEB_STIFFENERHOLLOW_B_THICKNESS: 11,
                    WEB_STIFFENERHOLLOW_OD_THICKNESS: 19,
                }
                for out_key, idx in hollow_thickness_indices.items():
                    if idx < len(hollow_list) and len(hollow_list[idx]) >= 4:
                        val = hollow_list[idx][3]
                        if hasattr(val, "item"):
                            val = val.item()
                        output[out_key] = {"key": out_key, "label": hollow_list[idx][1], "val": val}
            except Exception as e:
                print(f"[BasePlate adapter] Warning: could not add hollow stiffener extra keys: {e}")

        # Add column dimensions to output for dynamic sketch drawing
        if hasattr(module, "column_properties") and module.column_properties:
            output[WEB_COLUMN_DEPTH] = {"key": WEB_COLUMN_DEPTH, "label": "Column Depth", "val": module.column_properties.depth}
            output[WEB_COLUMN_WIDTH] = {"key": WEB_COLUMN_WIDTH, "label": "Column Flange Width", "val": module.column_properties.flange_width}
            output[WEB_COLUMN_TF] = {"key": WEB_COLUMN_TF, "label": "Column Flange Thickness", "val": module.column_properties.flange_thickness}
            output[WEB_COLUMN_TW] = {"key": WEB_COLUMN_TW, "label": "Column Web/Hollow Thickness", "val": module.column_properties.web_thickness}

        member_designation = input_values.get(KEY_SECSIZE, "")
        if isinstance(member_designation, list) and member_designation:
            section_str = member_designation[0]
        else:
            section_str = str(member_designation)
        output[KEY_SECSIZE] = {"key": KEY_SECSIZE, "label": "Section Designation", "val": section_str}
    except Exception as e:
        traceback.print_exc()
        raise

    try:
        logs = list(reversed(logs))
    except Exception:
        pass
    return output, logs, raw_csv


BASE_PLATE_CAD_SECTIONS = ("Model", "Column", "Plate", "Welds", "Bolts", "Concrete", "Grout")


def create_cad_model(input_values: Dict[str, Any], section: str, session: str, export_formats=None, module=None) -> str:
    """Generate CAD model from input values as BREP/STL. Returns file path or empty string.
    Desktop options: Model, Column, Base Plate (Plate), Welds, Bolts, Concrete, Grout.
    """
    if section not in BASE_PLATE_CAD_SECTIONS:
        raise InvalidInputTypeError(
            "section",
            "'Model', 'Column', 'Plate', 'Welds', 'Bolts', 'Concrete', 'Grout'",
        )

    try:
        module = module if module is not None else create_from_input(input_values)
    except Exception as e:
        traceback.print_exc()
        print(f"[BasePlate CAD] create_from_input failed: {e}")
        return ""

    try:
        cdl = CommonDesignLogic(
            None, None, "", KEY_DISP_BASE_PLATE, "Moment Connection",
        )
        cdl.module_object = module
        base_plate = cdl.createBasePlateCAD()
    except Exception as e:
        traceback.print_exc()
        print(f"[BasePlate CAD] createBasePlateCAD failed: {e}")
        return ""

    section_getters = {
        "Model": lambda: base_plate.get_models(),
        "Column": lambda: base_plate.get_column_model(),
        "Plate": lambda: base_plate.get_plate_connector_models(),
        "Welds": lambda: base_plate.get_welded_models(),
        "Bolts": lambda: base_plate.get_nut_bolt_array_models(),
        "Concrete": lambda: base_plate.get_concrete_models(),
        "Grout": lambda: base_plate.get_grout_models(),
    }
    get_shape = section_getters.get(section)
    if not get_shape:
        return ""

    try:
        model = get_shape()
    except Exception as e:
        traceback.print_exc()
        print(f"[BasePlate CAD] getter for section '{section}' failed: {e}")
        return ""

    if model is None:
        print(f"[BasePlate CAD] No shape for section '{section}'; skipping write.")
        return ""

    cad_dir = os.path.join(os.getcwd(), "file_storage", "cad_models")
    os.makedirs(cad_dir, exist_ok=True)
    section_safe = section.replace(" ", "_")
    file_name = f"{session}_{section_safe}.brep"
    file_path = os.path.join("file_storage", "cad_models", file_name)

    try:
        BRepTools.breptools.Write(model, file_path, Message_ProgressRange())
    except Exception as e:
        print(f"[BasePlate CAD] BREP write failed for {section}: {e}")
        return ""

    try:
        stl_path = os.path.join(os.getcwd(), file_path.replace(".brep", ".stl"))
        write_stl(model, stl_path)
    except Exception as stle:
        print(f"[BasePlate CAD] Warning: STL write failed for {section}: {stle}")

    return file_path
