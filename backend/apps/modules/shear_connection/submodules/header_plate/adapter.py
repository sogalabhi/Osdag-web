from apps.core.utils import (
    validate_arr, validate_num, validate_string,
    MissingKeyError, InvalidInputTypeError,
    contains_keys, custom_list_validation, float_able, int_able, is_yes_or_no, validate_list_type,
    build_raw_output_dict
)
from apps.core.utils.errors import DesignFailedError
from apps.modules.shear_connection import shared as scc
from OCC.Core import BRepTools
from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
from OCC.Core.IGESControl import IGESControl_Writer
from osdag_core.cad.common_logic import CommonDesignLogic
from osdag_core.Common import (
    KEY_AXIAL,
    KEY_CONN,
    KEY_CONNECTOR_MATERIAL,
    KEY_D,
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
    KEY_GRD,
    KEY_MATERIAL,
    KEY_MODULE,
    KEY_PLATETHK,
    KEY_SHEAR,
    KEY_SUPTDSEC,
    KEY_SUPTDSEC_MATERIAL,
    KEY_SUPTNGSEC,
    KEY_SUPTNGSEC_MATERIAL,
    KEY_TYP,
)
from osdag_core.custom_logger import CustomLogger
# Will log a lot of unnessecary data.
from osdag_core.design_type.connection.fin_plate_connection import FinPlateConnection
# from osdag_core.design_type.connection.end_plate_connection import EndPlateConnection
from osdag_core.design_type.connection.header_plate_connection import HeaderPlateConnection
import sys
import os
import typing
from typing import Dict, Any, List
import traceback
from apps.core.web_keys import (
    WEB_BEAM_WEBTHICKNESS,
    WEB_ENDPLATE_SUPPORTEDBLOCKSHEARAXIAL,
    WEB_ENDPLATE_SUPPORTEDSHEARALLOWABLE,
    WEB_ENDPLATE_SUPPORTEDSHEARYIELD,
    WEB_ENDPLATE_SUPPORTINGTENSIONYIELD,
)
# What the page shows when the core stops on a failed header plate design (see create_from_input).
HEADER_PLATE_FAILED_MESSAGE = (
    "The design failed: no end plate and weld combination is safe for these inputs. "
    "Plate moment or shear capacity is insufficient, the required plate width is greater than the "
    "available width, or the weld is not thick enough [Ref. Cl. 10.5.7, IS 800:2007]. "
    "Choose a higher thickness or grade."
)


def get_required_keys() -> List[str]:
    return [
        KEY_DP_BOLT_HOLE_TYPE,
        KEY_D,
        KEY_GRD,
        KEY_DP_BOLT_SLIP_FACTOR,
        KEY_DP_BOLT_TYPE,
        KEY_TYP,
        KEY_CONN,
        KEY_CONNECTOR_MATERIAL,
        KEY_DP_DESIGN_METHOD,
        KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
        KEY_DP_DETAILING_EDGE_TYPE,
        KEY_DP_DETAILING_GAP,
        KEY_AXIAL,
        KEY_SHEAR,
        KEY_MATERIAL,
        KEY_SUPTDSEC,
        KEY_SUPTDSEC_MATERIAL,
        KEY_SUPTNGSEC,
        KEY_SUPTNGSEC_MATERIAL,
        KEY_MODULE,
        KEY_DP_WELD_FAB,
        KEY_DP_WELD_MATERIAL_G_O,
        KEY_PLATETHK,
    ]


def validate_input(input_values: Dict[str, Any]) -> None:
    """Validate type for all values in design dict. Raise error when invalid"""

    # Check if all required keys exist
    required_keys = get_required_keys()
    # Check if input_values contains all required keys.
    missing_keys = contains_keys(input_values, required_keys)
    if missing_keys != None:  # If keys are missing.
        # Raise error for the first missing key.a
        raise MissingKeyError(missing_keys[0])

    # Validate key types one by one:

    # Validate Bolt.Bolt_Hole_Type.
    # Check if Bolt.Bolt_Hole_Type is a string.
    if not isinstance(input_values[KEY_DP_BOLT_HOLE_TYPE], str):
        # If not, raise error.
        raise InvalidInputTypeError(KEY_DP_BOLT_HOLE_TYPE, "str")

     # Validate Bolt.Diameter.
    bolt_diameter = input_values[KEY_D]
    if (not isinstance(bolt_diameter, list)  # Check if Bolt.Diameter is a list.
            # Check if all items in Bolt.Diameter are str.
            or not validate_list_type(bolt_diameter, str)
            or not custom_list_validation(bolt_diameter, int_able)):  # Check if all items in Bolt.Diameter can be converted to int.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            KEY_D, "non empty List[str] where all items can be converted to int")

    # Validate Bolt.Grade
    bolt_grade = input_values[KEY_GRD]
    if (not isinstance(bolt_grade, list)  # Check if Bolt.Grade is a list.
            # Check if all items in Bolt.Grade are str.
            or not validate_list_type(bolt_grade, str)
            or not custom_list_validation(bolt_grade, float_able)):  # Check if all items in Bolt.Grade can be converted to float.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            KEY_GRD, "non empty List[str] where all items can be converted to float")

    # Validate Bolt.Slip_Factor
    bolt_slipfactor = input_values[KEY_DP_BOLT_SLIP_FACTOR]
    if (not isinstance(bolt_slipfactor, str)  # Check if Bolt.Slip_Factor is a string.
            or not float_able(bolt_slipfactor)):  # Check if Bolt.Slip_Factor can be converted to float.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            KEY_DP_BOLT_SLIP_FACTOR, "str where str can be converted to float")

    # Validate Bolt.TensionType
    # Check if Bolt.TensionType is a string.
    if not isinstance(input_values[KEY_DP_BOLT_TYPE], str):
        # If not, raise error.
        raise InvalidInputTypeError(KEY_DP_BOLT_TYPE, "str")

    # Validate Bolt.Type
    # Check if Bolt.Type is a string.
    if not isinstance(input_values[KEY_TYP], str):
        raise InvalidInputTypeError(KEY_TYP, "str")  # If not, raise error.

    # Validate Connectivity
    # Check if Connectivity is a string.
    if not isinstance(input_values[KEY_CONN], str):
        # If not, raise error.
        raise InvalidInputTypeError(KEY_CONN, "str")

    # Validate Connector.Material
    # Check if Connector.Material is a string.
    if not isinstance(input_values[KEY_CONNECTOR_MATERIAL], str):
        # If not, raise error.
        raise InvalidInputTypeError(KEY_CONNECTOR_MATERIAL, "str")

    # Validate Design.Design_Method
    # Check if Design.Design_Method is a string.
    if not isinstance(input_values[KEY_DP_DESIGN_METHOD], str):
        # If not, raise error.
        raise InvalidInputTypeError(KEY_DP_DESIGN_METHOD, "str")

    # Validate Detailing.Corrosive_Influences
    # Check if Detailing.Corrosive_Influences is 'Yes' or 'No'.
    if not is_yes_or_no(input_values[KEY_DP_DETAILING_CORROSIVE_INFLUENCES]):
        # If not, raise error.
        raise InvalidInputTypeError(
            KEY_DP_DETAILING_CORROSIVE_INFLUENCES, "'Yes' or 'No'")

    # Validate Detailing.Edge_type
    # Check if Detailing.Edge_type is a string.
    if not isinstance(input_values[KEY_DP_DETAILING_EDGE_TYPE], str):
        # If not, raise error.
        raise InvalidInputTypeError(KEY_DP_DETAILING_EDGE_TYPE, "str")

    # Validate Detailing.Gap
    detailing_gap = input_values[KEY_DP_DETAILING_GAP]
    if (not isinstance(detailing_gap, str)  # Check if Detailing.Gap is a string.
            or not int_able(detailing_gap)):  # Check if Detailing.Gap can be converted to int.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            KEY_DP_DETAILING_GAP, "str where str can be converted to int")

    # Validate Load.Axial
    load_axial = input_values[KEY_AXIAL]
    if (not isinstance(load_axial, str)  # Check if Load.Axial is a string.
            or not int_able(load_axial)):  # Check if Load.Axial can be converted to int.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            KEY_AXIAL, "str where str can be converted to int")

    # Validate Load.Shear
    load_shear = input_values[KEY_SHEAR]
    if (not isinstance(load_shear, str)  # Check if Load.Shear is a string.
            or not int_able(load_shear)):  # Check if Load.Shear can be converted to int.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            KEY_SHEAR, "str where str can be converted to int")

    # Validate Material
    # Check if Material is a string.
    if not isinstance(input_values[KEY_MATERIAL], str):
        raise InvalidInputTypeError(KEY_MATERIAL, "str")  # If not, raise error.

    # Validate Member.Supported_Section.Designation
    # Check if Member.Supported_Section.Designation is a string.
    if not isinstance(input_values[KEY_SUPTDSEC], str):
        # If not, raise error.
        raise InvalidInputTypeError(
            KEY_SUPTDSEC, "str")

    # Validate Member.Supported_Section.Material
    # Check if Member.Supported_Section.Material is a string.
    if not isinstance(input_values[KEY_SUPTDSEC_MATERIAL], str):
        # If not, raise error.
        raise InvalidInputTypeError(KEY_SUPTDSEC_MATERIAL, "str")

    # Validate Member.Supporting_Section.Designation
    # Check if Member.Supporting_Section.Designation is a string.
    if not isinstance(input_values[KEY_SUPTNGSEC], str):
        # If not, raise error.
        raise InvalidInputTypeError(
            KEY_SUPTNGSEC, "str")

    # Validate Member.Supporting_Section.Material
    # Check if Member.Supporting_Section.Material is a string.
    if not isinstance(input_values[KEY_SUPTNGSEC_MATERIAL], str):
        # If not, raise error.
        raise InvalidInputTypeError(
            KEY_SUPTNGSEC_MATERIAL, "str")

    # Validate Module
    # Check if Module is a string.
    if not isinstance(input_values[KEY_MODULE], str):
        raise InvalidInputTypeError(KEY_MODULE, "str")  # If not, raise error.

    # Validate Weld.Fab
    # Check if Weld.Fab is a string.
    if not isinstance(input_values[KEY_DP_WELD_FAB], str):
        raise InvalidInputTypeError(KEY_DP_WELD_FAB, "str")  # If not, raise error.

    # Validate Weld.Material_Grade_OverWrite
    weld_materialgradeoverwrite = input_values[KEY_DP_WELD_MATERIAL_G_O]
    if (not isinstance(weld_materialgradeoverwrite, str)  # Check if Weld.Material_Grade_OverwWite is a string.
            or not int_able(weld_materialgradeoverwrite)):  # Check if Weld.Material_Grade_OverWrite can be converted to int.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            KEY_DP_WELD_MATERIAL_G_O, "str where str can be converted to int.")

    # Validate Connector.Plate.Thickness_List
    connector_plate_thicknesslist = input_values[KEY_PLATETHK]
    if (not isinstance(connector_plate_thicknesslist, list)  # Check if Connector.Plate.Thickness_List is a list.
            # Check if all items in Connector.Plate.Thickness_List are str.
            or not validate_list_type(connector_plate_thicknesslist, str)
            or not custom_list_validation(connector_plate_thicknesslist, int_able)):  # Check if all items in Connector.Plate.Thickness_List can be converted to int.
        raise InvalidInputTypeError(
            KEY_PLATETHK, "List[str] where all items can be converted to int")



def create_module() -> HeaderPlateConnection:
    """Create an instance of the End plate connection module design class and set it up for use"""
    module = HeaderPlateConnection()
    module.set_osdaglogger(None, id="web")
    return module


def create_from_input(input_values: Dict[str, Any]) -> HeaderPlateConnection:
    """Create an instance of the End plate connection module design class from input values."""
    # validate_input(input_values)
    print("\n[EndPlateAdapter.create_from_input] called")
    print(f"[EndPlateAdapter.create_from_input] input keys={list(input_values.keys()) if isinstance(input_values, dict) else type(input_values)}")
    try:
        module = create_module()  # Create module instance.
        print(f"[EndPlateAdapter.create_from_input] module created={type(module).__name__}")
    except Exception as e:
        print('e in create_module : ' , e)
        print('error in creating module')
        traceback.print_exc()
        raise
    
    # Map frontend keys to osdag_core keys
    # Frontend sends 'Connectivity' but osdag_core expects 'Connectivity *' (KEY_CONN)
    design_dictionary = input_values.copy()
    if KEY_CONN in design_dictionary and KEY_CONN not in design_dictionary:
        design_dictionary[KEY_CONN] = design_dictionary.pop(KEY_CONN)
        print(f"[EndPlateAdapter.create_from_input] mapped 'Connectivity' -> {KEY_CONN!r} value={design_dictionary.get(KEY_CONN)!r}")
    else:
        print(f"[EndPlateAdapter.create_from_input] connectivity mapping skipped; has KEY_CONN={KEY_CONN in design_dictionary}")
    
    # Set the input values on the module instance.
    try:
        print(f"[EndPlateAdapter.create_from_input] set_input_values with keys={list(design_dictionary.keys())[:20]}")
        module.set_input_values(design_dictionary)
        print("[EndPlateAdapter.create_from_input] set_input_values passed")
    except IndexError as e:
        # Core defect: when every bolt arrangement fits but no plate or weld does, set_values_to_class
        # reads the (empty) list of failed bolt arrangements. The design has failed; say so.
        if getattr(module, "design_status", None) is False:
            raise DesignFailedError(HEADER_PLATE_FAILED_MESSAGE) from e
        raise
    except Exception as e:
        print('e in set_input_values : ' , e)
        print('error in setting the input values')
        traceback.print_exc()
        raise

    return module


def generate_output(input_values: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate, format and return the input values from the given output values.
    Output format (json): {
        "Bolt.Pitch": 
            "key": "Bolt.Pitch",
            "label": "Pitch Distance (mm)"
            "value": 40
        }
    }
    """
    print("\n[EndPlateAdapter.generate_output] called")
    output = {}  # Dictionary for formatted values
    module = create_from_input(input_values)  # Create module from input.
    design_status = bool(getattr(module, "design_status", False))
    if module is None:
        raise RuntimeError("create_from_input returned None module")

    print(f"[EndPlateAdapter.generate_output] module={type(module).__name__}")
    print(f"[EndPlateAdapter.generate_output] has logger={hasattr(module, 'logger')}")
    # Generate output values in unformatted form.
    try:
        raw_output_text = module.output_values(design_status)
        print(f"[EndPlateAdapter.generate_output] raw_output_text={len(raw_output_text)}")
        raw_output_spacing = module.spacing(design_status)  # Generate output val
        print(f"[EndPlateAdapter.generate_output] raw_output_spacing={len(raw_output_spacing)}")
        raw_output_capacities = module.capacities(design_status)
        print(f"[EndPlateAdapter.generate_output] raw_output_capacities={len(raw_output_capacities)}")
        raw_output_bolt_capacity = module.bolt_capacity_details(design_status)
        print(f"[EndPlateAdapter.generate_output] raw_output_bolt_capacity={len(raw_output_bolt_capacity)}")
    except Exception as e:
        print(f"[EndPlateAdapter.generate_output] error while collecting raw outputs: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise

    raw_csv = build_raw_output_dict(raw_output_text, design_status)

    # Prefer CustomLogger if attached
    if hasattr(module, 'logger') and isinstance(module.logger, CustomLogger):
        logs = module.logger.get_logs()
    else:
        logs = module.logs if hasattr(module, 'logs') else []
    # Ensure logs is a list even if empty
    if not logs:
        logs = ["No logs generated"]

    raw_output = raw_output_capacities + raw_output_spacing + raw_output_text + raw_output_bolt_capacity
    print(f"[EndPlateAdapter.generate_output] total_raw_output={len(raw_output)}")
    # os.system("clear")
    # Loop over all the text values and add them to ouptut dict.
    for idx, param in enumerate(raw_output):
        if not isinstance(param, (tuple, list)):
            print(f"[EndPlateAdapter.generate_output] skipping non-sequence param at idx={idx}: {type(param)}")
            continue
        if len(param) < 4:
            print(f"[EndPlateAdapter.generate_output] skipping short param at idx={idx}: {param}")
            continue
        if param[2] == "TextBox":  # If the parameter is a text output,
            key = param[0]  # id/key
            label = param[1]  # label text.
            value = param[3]  # Value as string.
            output[key] = {
                "key": key,
                "label": label,
                "val": value  # Changed from "value" to "val" to match frontend expectations
            }  # Set label, key and value in output

    # Extra key needed by the frontend spacing diagram (weld center-gap pattern)
    try:
        web_thickness = getattr(getattr(module, "supported_section", None), "web_thickness", None)
        if web_thickness is not None:
            if hasattr(web_thickness, 'item'):
                web_thickness = web_thickness.item()
            output[WEB_BEAM_WEBTHICKNESS] = {
                "key": WEB_BEAM_WEBTHICKNESS,
                "label": "Beam Web Thickness (mm)",
                "val": web_thickness,
            }
    except Exception as e:
        print(f"[EndPlateAdapter.generate_output] Warning: could not add Beam.WebThickness diagram key: {e}")

    # Section-capacity values for the "Section Capacity" popup: desktop's
    # EndPlateSectionDetails reads these directly off supported_section /
    # supporting_section attributes (not via any output_values()/capacities()
    # tuple list), so they are not exposed by the generic flatten loop above.
    try:
        supported = getattr(module, "supported_section", None)
        supporting = getattr(module, "supporting_section", None)
        shear_yield = getattr(supported, "shear_yielding_capacity", None)
        tension_yield = getattr(supporting, "tension_yielding_capacity", None)
        block_shear_axial = getattr(supported, "block_shear_capacity_axial", None)

        extra_section_keys = {
            WEB_ENDPLATE_SUPPORTEDSHEARYIELD: ("Supported Section Shear Yielding Capacity (kN)", shear_yield),
            WEB_ENDPLATE_SUPPORTEDSHEARALLOWABLE: ("Supported Section Allowable Shear Capacity (kN)", shear_yield),
            WEB_ENDPLATE_SUPPORTINGTENSIONYIELD: ("Supporting Section Tension Yielding Capacity (kN)", tension_yield),
            WEB_ENDPLATE_SUPPORTEDBLOCKSHEARAXIAL: ("Section Tension Block Shear Capacity (kN)", block_shear_axial),
        }
        for key, (label, raw_val) in extra_section_keys.items():
            if raw_val is not None:
                val = round(raw_val / 1000, 2)
                if hasattr(val, 'item'):
                    val = val.item()
                output[key] = {"key": key, "label": label, "val": val}
    except Exception as e:
        print(f"[EndPlateAdapter.generate_output] Warning: could not add section-capacity extra keys: {e}")

    print(f"[EndPlateAdapter.generate_output] output keys count={len(output)}")
    try:
        logs = list(reversed(logs))
    except Exception:
        pass
    return output, logs, raw_csv


def create_cad_model(input_values: Dict[str, Any], section: str, session: str, export_formats=None, module=None) -> str:
    """Generate the CAD model from input values as a BREP file. Return file path."""
    from apps.core.utils import write_stl
    from OCC.Core.BRep import BRep_Builder
    from OCC.Core.TopoDS import TopoDS_Compound
    from OCC.Core.Message import Message_ProgressRange

    if section not in ("Model", "Beam", "Column", "Plate", "Bolt", "Weld"):  # Error checking: If section is valid.
        raise InvalidInputTypeError(
            "section", "'Model', 'Beam', 'Column', 'Plate', 'Bolt' or 'Weld'")
    module = module if module is not None else create_from_input(input_values)  # Create module from input.
    # Object that will create the CAD model.
    try :
        # cld = CommonDesignLogic(None, None, '', KEY_DISP_ENDPLATE, module.mainmodule)
        cld = CommonDesignLogic(None, None, '', KEY_DISP_HEADERPLATE, module.mainmodule)
    except Exception as e : 
        print('error in cld e : ' , e)
    
    try : 
        # Setup the calculations object for generating CAD model.
        scc.setup_for_cad(cld, module)
    except Exception as e : 
        print('Error in setting up cad e : ' , e)

    # The section of the module that will be generated.
    cld.component = section

    part_names = ["Beam", "Column", "Plate", "Weld", "Welds", "Bolt", "Bolts"]
    part_files = {}
    compound_model = None

    try:
        if section == "Model":
            # Build compound by adding each part shape without fusing
            builder = BRep_Builder()
            compound = TopoDS_Compound()
            builder.MakeCompound(compound)

            for part in part_names:
                try:
                    # Generate shape for this part
                    cld.component = part
                    part_shape = cld.create2Dcad()
                    if part_shape is None:
                        continue
                    # Add to compound
                    builder.Add(compound, part_shape)
                    # Ensure per-part BREP file exists (write or overwrite)
                    part_file_name = f"{session}_{part}.brep"
                    part_file_path_rel = os.path.join("file_storage", "cad_models", part_file_name)
                    full_brep_path = os.path.join(os.getcwd(), part_file_path_rel)
                    # Write per-part BREP
                    from OCC.Core import BRepTools
                    BRepTools.breptools.Write(part_shape, full_brep_path, Message_ProgressRange())
                    try:
                        module.logs.append(f"Wrote {part} BREP: {full_brep_path}")
                    except Exception:
                        pass
                    # Ensure per-part STL as well
                    part_stl_file = part_file_path_rel.replace(".brep", ".stl")
                    full_stl_path = os.path.join(os.getcwd(), part_stl_file)
                    try:
                        write_stl(part_shape, full_stl_path)
                        try:
                            module.logs.append(f"Wrote {part} STL: {full_stl_path}")
                        except Exception:
                            pass
                    except Exception as e:
                        print(f"Failed to write STL for part {part}:", e)
                except Exception as e:
                    print(f"Failed generating cad part {part} in EndPlate: {e}")
            
            # Now write the compound as the Model
            cld.component = "Model"  # Optionally switch context
            model = compound
            compound_file_name = f"{session}_Model.brep"
            compound_file_path_rel = os.path.join("file_storage", "cad_models", compound_file_name)
            BRepTools.breptools.Write(model, os.path.join(os.getcwd(), compound_file_path_rel), Message_ProgressRange())
            try:
                module.logs.append(f"Wrote Model BREP: {os.path.join(os.getcwd(), compound_file_path_rel)}")
            except Exception:
                pass
            # Compound/model STL (for completeness, but will not be loaded in UI)
            compound_stl_file = compound_file_path_rel.replace(".brep", ".stl")
            try:
                write_stl(model, os.path.join(os.getcwd(), compound_stl_file))
                try:
                    module.logs.append(f"Wrote Model STL: {os.path.join(os.getcwd(), compound_stl_file)}")
                except Exception:
                    pass
            except Exception as e:
                print("Failed to write Model STL for EndPlate:", e)

            # Optional on-demand exports (only when frontend requests them)
            try:
                from apps.core.utils.cad_export import export_step, export_iges

                export_formats_lc = {f.lower() for f in export_formats} if export_formats else set()
                if "step" in export_formats_lc:
                    step_rel = compound_file_path_rel.replace(".brep", ".step")
                    export_step(model, os.path.join(os.getcwd(), step_rel))
                if "iges" in export_formats_lc:
                    iges_rel = compound_file_path_rel.replace(".brep", ".iges")
                    export_iges(model, os.path.join(os.getcwd(), iges_rel))
            except Exception as e:
                print(f"Warning: Optional step/iges export failed for EndPlate Model: {e}")
            return compound_file_path_rel
        else:
            try : 
                model = cld.create2Dcad()  # Generate CAD Model.
            except Exception as e :
                print('Error in cld.create2Dcad() e : ' , e)
                return False
            # check if the cad_models folder exists or not 
            # if no, then create one 
            cad_models_path = os.path.join(os.getcwd(), "file_storage", "cad_models")
            if not os.path.exists(cad_models_path):
                print('path does not exists cad_models , creating one')
                os.makedirs(cad_models_path, exist_ok=True)
            file_name = session + "_" + section + ".brep"
            file_path = "file_storage/cad_models/" + file_name
            try : 
                from OCC.Core import BRepTools
                full_brep = os.path.join(os.getcwd(), file_path)
                BRepTools.breptools.Write(model, full_brep, Message_ProgressRange()) # Generate CAD Model
                try:
                    module.logs.append(f"Wrote {section} BREP: {full_brep}")
                except Exception:
                    pass
                # Write STL too
                stl_file_path = file_path.replace(".brep", ".stl")
                full_stl = os.path.join(os.getcwd(), stl_file_path)
                write_stl(model, full_stl)
                try:
                    module.logs.append(f"Wrote {section} STL: {full_stl}")
                except Exception:
                    pass
            except Exception as e : 
                print('Writing to BREP or STL file failed e : ' , e)
            return file_path
    except Exception as top_e:
        print('Top-level error in EndPlate create_cad_model:', top_e)
        return False

