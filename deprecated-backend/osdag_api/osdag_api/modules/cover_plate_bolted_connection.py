from osdag_api.validation_utils import validate_arr, validate_num, validate_string
from osdag_api.errors import MissingKeyError, InvalidInputTypeError
from osdag_api.utils import contains_keys, custom_list_validation, float_able, int_able, is_yes_or_no, validate_list_type
import osdag_api.modules.moment_connection_common as mcc
from OCC.Core import BRepTools
from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
from OCC.Core.IGESControl import IGESControl_Writer
from OCC.Core.Message import Message_ProgressRange
from osdag_api.modules.mesh_export import write_stl
import json
from osdag_core.cad.common_logic import CommonDesignLogic
# Will log a lot of unnessecary data.
from osdag_core.design_type.connection.beam_cover_plate import BeamCoverPlate
import sys
import os
from typing import Dict, Any, List
import traceback

old_stdout = sys.stdout  # Backup log
sys.stdout = open(os.devnull, "w")  # redirect stdout
sys.stdout = old_stdout  # Reset log


def get_required_keys() -> List[str]:
    return [
        "Bolt.Bolt_Hole_Type",
        "Bolt.Diameter",
        "Bolt.Grade",
        "Bolt.Slip_Factor",
        "Bolt.TensionType",
        "Bolt.Type",
        "Connector.Flange_Plate.Preferences",
        "Connector.Flange_Plate.Thickness_list",
        "Connector.Material",
        "Connector.Web_Plate.Thickness_List",
        "Design.Design_Method",
        "Detailing.Corrosive_Influences",
        "Detailing.Edge_type",
        "Detailing.Gap",
        "Load.Axial",
        "Load.Moment",
        "Load.Shear",
        "Material",
        "Member.Designation",
        "Member.Material",
        "Module",
    ]


def validate_input(input_values: Dict[str, Any]) -> None:
    """Validate type for all values in design dict. Raise error when invalid"""

    # Check if all required keys exist
    required_keys = get_required_keys()
    # Check if input_values contains all required keys.
    missing_keys = contains_keys(input_values, required_keys)
    if missing_keys != None:  # If keys are missing.
        # Raise error for the first missing key.
        raise MissingKeyError(missing_keys[0])

    # Validate key types one by one:

    # Validate Bolt.Bolt_Hole_Type.
    # Check if Bolt.Bolt_Hole_Type is a string.
    if not isinstance(input_values["Bolt.Bolt_Hole_Type"], str):
        # If not, raise error.
        raise InvalidInputTypeError("Bolt.Bolt_Hole_Type", "str")

     # Validate Bolt.Diameter.
    bolt_diameter = input_values["Bolt.Diameter"]
    if (not isinstance(bolt_diameter, list)  # Check if Bolt.Diameter is a list.
            # Check if all items in Bolt.Diameter are str.
            or not validate_list_type(bolt_diameter, str)
            or not custom_list_validation(bolt_diameter, int_able)):  # Check if all items in Bolt.Diameter can be converted to int.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            "Bolt.Diameter", "non empty List[str] where all items can be converted to int")

    # Validate Bolt.Grade
    bolt_grade = input_values["Bolt.Grade"]
    if (not isinstance(bolt_grade, list)  # Check if Bolt.Grade is a list.
            # Check if all items in Bolt.Grade are str.
            or not validate_list_type(bolt_grade, str)
            or not custom_list_validation(bolt_grade, float_able)):  # Check if all items in Bolt.Grade can be converted to float.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            "Bolt.Grade", "non empty List[str] where all items can be converted to float")

    # Validate Bolt.Slip_Factor
    bolt_slipfactor = input_values["Bolt.Slip_Factor"]
    if (not isinstance(bolt_slipfactor, str)  # Check if Bolt.Slip_Factor is a string.
            or not float_able(bolt_slipfactor)):  # Check if Bolt.Slip_Factor can be converted to float.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            "Bolt.Slip_Factor", "str where str can be converted to float")

    # Validate Bolt.TensionType
    # Check if Bolt.TensionType is a string.
    if not isinstance(input_values["Bolt.TensionType"], str):
        # If not, raise error.
        raise InvalidInputTypeError("Bolt.TensionType", "str")

    # Validate Bolt.Type
    # Check if Bolt.Type is a string.
    if not isinstance(input_values["Bolt.Type"], str):
        raise InvalidInputTypeError("Bolt.Type", "str")  # If not, raise error.

     # Validate Connector.Flange_Plate.Preferences
    if not isinstance(input_values["Connector.Flange_Plate.Preferences"], str):
        raise InvalidInputTypeError("Connector.Flange_Plate.Preferences", "str")

    # Validate Connector.Flange_Plate.Thickness_list
    flange_thickness_list = input_values["Connector.Flange_Plate.Thickness_list"]
    if (not isinstance(flange_thickness_list, list)
            or not validate_list_type(flange_thickness_list, str)
            or not custom_list_validation(flange_thickness_list, int_able)):
        raise InvalidInputTypeError(
            "Connector.Flange_Plate.Thickness_list", "List[str] where all items can be converted to int")
    # Validate Connector.Material
    # Check if Connector.Material is a string.
    if not isinstance(input_values["Connector.Material"], str):
        # If not, raise error.
        raise InvalidInputTypeError("Connector.Material", "str")

     # Validate Connector.Web_Plate.Thickness_List
    web_thickness_list = input_values["Connector.Web_Plate.Thickness_List"]
    if (not isinstance(web_thickness_list, list)
            or not validate_list_type(web_thickness_list, str)
            or not custom_list_validation(web_thickness_list, int_able)):
        raise InvalidInputTypeError(
            "Connector.Web_Plate.Thickness_List", "List[str] where all items can be converted to int")
        
    # Validate Design.Design_Method
    # Check if Design.Design_Method is a string.
    if not isinstance(input_values["Design.Design_Method"], str):
        # If not, raise error.
        raise InvalidInputTypeError("Design.Design_Method", "str")

    # Validate Detailing.Corrosive_Influences
    # Check if Detailing.Corrosive_Influences is 'Yes' or 'No'.
    if not is_yes_or_no(input_values["Detailing.Corrosive_Influences"]):
        # If not, raise error.
        raise InvalidInputTypeError(
            "Detailing.Corrosive_Influences", "'Yes' or 'No'")

    # Validate Detailing.Edge_type
    # Check if Detailing.Edge_type is a string.
    if not isinstance(input_values["Detailing.Edge_type"], str):
        # If not, raise error.
        raise InvalidInputTypeError("Detailing.Edge_type", "str")

    # Validate Detailing.Gap
    detailing_gap = input_values["Detailing.Gap"]
    if (not isinstance(detailing_gap, str)  # Check if Detailing.Gap is a string.
            or not int_able(detailing_gap)):  # Check if Detailing.Gap can be converted to int.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            "Detailing.Gap", "str where str can be converted to int")

    # Validate Load.Axial
    load_axial = input_values["Load.Axial"]
    if (not isinstance(load_axial, str)  # Check if Load.Axial is a string.
            or not int_able(load_axial)):  # Check if Load.Axial can be converted to int.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            "Load.Axial", "str where str can be converted to int")
        
    # Validate Load.Moment
    load_moment = input_values["Load.Moment"]
    if not isinstance(load_moment, str) or not int_able(load_moment):
        raise InvalidInputTypeError("Load.Moment", "str where str can be converted to int")

    # Validate Load.Shear
    load_shear = input_values["Load.Shear"]
    if (not isinstance(load_shear, str)  # Check if Load.Shear is a string.
            or not int_able(load_shear)):  # Check if Load.Shear can be converted to int.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            "Load.Shear", "str where str can be converted to int")

    # Validate Material
    # Check if Material is a string.
    if not isinstance(input_values["Material"], str):
        raise InvalidInputTypeError("Material", "str")  # If not, raise error.
    
    # Validate Member.Designation
    if not isinstance(input_values["Member.Designation"], str):
        raise InvalidInputTypeError("Member.Designation", "str")

    # Validate Member.Material
    if not isinstance(input_values["Member.Material"], str):
        raise InvalidInputTypeError("Member.Material", "str")

    # Check if Module is a string.
    if not isinstance(input_values["Module"], str):
        raise InvalidInputTypeError("Module", "str")  # If not, raise error.

def validate_input_new(input_values: Dict[str, Any]) -> None:
    """Validate type for all values in design dict. Raise error when invalid"""

    # Check if all required keys exist
    required_keys = get_required_keys()
    print('required_keys : ' , required_keys)
    # Check if input_values contains all required keys.
    missing_keys = contains_keys(input_values, required_keys)
    print('missing keys : ' , missing_keys)
    if missing_keys != None:  # If keys are missing.
        # Raise error for the first missing key.
        print("missing keys is not None")
        raise MissingKeyError(missing_keys[0])

    # Validate key types using loops.

    # Validate all strings.
    str_keys = ["Bolt.Bolt_Hole_Type",  # List of all parameters that are strings
                "Bolt.TensionType",
                "Bolt.Type",
                "Bolt.Connectivity",
                "Bolt.Connector_Material",
                "Connector.Flange_Plate.Preferences",
                "Design.Design_Method",
                "Detailing.Edge_type",
                "Material",
                "Member.Designation",
                "Member.Material",
                "Module"
            ]
    for key in str_keys:  # Loop through all keys.
        print('validating string key')
        
        try : 
            validate_string(key) # Check if key is a string. If not, raise error.
        except : 
            print('error in validating string keys')
            print('string key passed  : ' , key )

    # Validate for keys that are numbers
    num_keys = [("Bolt.Slip_Factor", True),  # List of all parameters that are numbers (key, is_float)
                ("Detailing.Gap", False),
                ("Load.Axial", False),
                ("Load.Moment", False),
                ("Load.Shear", False),
            ]
    for key in num_keys:  # Loop through all keys.
        # Check if key is a number. If not, raise error.
        print('validating num keys')
        validate_num(key[0], key[1])

    # Validate for keys that are arrays
    arr_keys = [("Bolt.Diameter", False),  # List of all parameters that can be converted to numbers (key, is_float)
                ("Bolt.Grade", True),
                ("Connector.Flange_Plate.Thickness_List", False),
                ("Connector.Web_Plate.Thicness_List", False)]
    for key in arr_keys:
        print('validating arr key')
        # Check if key is a list where all items can be converted to numbers. If not, raise error.
        validate_arr(key[0], key[1])


def create_module() -> BeamCoverPlate:
    """Create an instance of the FinPlateConnection module design class and set it up for use"""
    module = BeamCoverPlate()  # Create an instance of the FinPlateConnection
    module.set_osdaglogger(None)
    return module


def create_from_input(input_values: Dict[str, Any]) -> BeamCoverPlate:
    """Create an instance of the FinPlateConnection module design class from input values."""
    # validate_input(input_values)
    module = None
    try : 
        module = create_module()  # Create module instance.
    except Exception as e : 
        print('e in create_module : ' , e) 
        print('error in creating module')
    
    # Set the input values on the module instance.
    try : 
        print("INPUT SET FOR FINAL OUTPUT",input_values)
        module.set_input_values(input_values)
    except Exception as e : 
        traceback.print_exc()
        print('e in set_input_values : ' , e)
        print('error in setting the input values')

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
    print("************")
    output = {}  # Dictionary for formatted values
    module = create_from_input(input_values)  # Create module from input.
    print('module : ' , module)
    print('type of module : ' , type(module))

    # --- LOGGER EXTRACTION ---
    logs = []

    try:
        if hasattr(module, "logger") and hasattr(module.logger, "get_logs"):
            logs = module.logger.get_logs()
        else:
            logs = []
    except Exception as e:
        print("Error extracting logs:", e)
        logs = []

    # Generate output values in unformatted form.
    raw_output_text = module.output_values(True)
    raw_member_capacity = module.member_capacityoutput(True)
    raw_flange_bolt_capacity = [
        (f"{key}_flange_bolt_capacity", label, typ, value, visible if len(item) == 5 else True)
        for item in module.flange_bolt_capacity(True)
        if len(item) >= 4 and item[0] and item[2] == "TextBox"
        for (key, label, typ, value, *rest) in [item]
        for visible in [rest[0] if rest else True]
    ]

    raw_web_bolt_capacity = [
        (f"{key}_web_bolt_capacity", label, typ, value, visible if len(item) == 5 else True)
        for item in module.web_bolt_capacity(True)
        if len(item) >= 4 and item[0] and item[2] == "TextBox"
        for (key, label, typ, value, *rest) in [item]
        for visible in [rest[0] if rest else True]
    ]

    raw_flange_capacity = [
        (f"{key}_flange_capacity", label, typ, value, visible if len(item) == 5 else True)
        for item in module.flangecapacity(True)
        if len(item) >= 4 and item[0] and item[2] == "TextBox"
        for (key, label, typ, value, *rest) in [item]
        for visible in [rest[0] if rest else True]
    ]

    raw_web_capacity = [
        (f"{key}_web_capacity", label, typ, value, visible if len(item) == 5 else True)
        for item in module.webcapacity(True)
        if len(item) >= 4 and item[0] and item[2] == "TextBox"
        for (key, label, typ, value, *rest) in [item]
        for visible in [rest[0] if rest else True]
    ]

    raw_flange_spacing = [
        (f"{key}_flange_spacing", label, typ, value, visible if len(item) == 5 else True)
        for item in module.flangespacing(True)
        if len(item) >= 4 and item[0] and item[2] == "TextBox"
        for (key, label, typ, value, *rest) in [item]
        for visible in [rest[0] if rest else True]
    ]

    raw_web_spacing = [
        (f"{key}_web_spacing", label, typ, value, visible if len(item) == 5 else True)
        for item in module.webspacing(True)
        if len(item) >= 4 and item[0] and item[2] == "TextBox"
        for (key, label, typ, value, *rest) in [item]
        for visible in [rest[0] if rest else True]
    ]
    
    raw_output = ( 
        raw_output_text +
        raw_member_capacity + 
        raw_flange_bolt_capacity +
        raw_web_bolt_capacity +
        raw_flange_capacity +
        raw_web_capacity +
        raw_flange_spacing +
        raw_web_spacing
    )
    # os.system("clear")
    # Loop over all the text values and add them to ouptut dict.
    for param in raw_output:
        if param[2] == "TextBox":  # If the parameter is a text output,
            key = param[0]  # id/key
            label = param[1]  # label text.
            value = param[3]  # Value as string.
            output[key] = {
                "key": key,
                "label": label,
                "val": value  # Changed from "value" to "val" to match frontend expectations
            }  # Set label, key and value in output
    return output, logs


def create_cad_model(input_values: Dict[str, Any], section: str, session: str) -> str:
    """Generate the CAD model from input values as a BREP file. Return file path."""

    # Valid sections
    if section not in ("Model", "Beam", "Connector"):
        raise InvalidInputTypeError(
            "section", "'Model', 'Beam', 'Plate'"
        )

    # Create module from JSON input
    module = create_from_input(input_values)
    print("module from input values:", module)

    # CAD logic object
    try:
        cld = CommonDesignLogic(None, "", module.module, module.mainmodule)
    except Exception as e:
        print("error in cld:", e)

    # Setup design logic for CAD generation
    try:
        mcc.setup_for_cad(cld, module)
    except Exception as e:
        traceback.print_exc()
        print("Error in setting up CAD:", e)

    part_names = ["Model", "Beam", "CoverPlate"]
    part_files = {}
    compound_model = None

    try:
        if section == "Model":
            from OCC.Core.BRep import BRep_Builder
            from OCC.Core.TopoDS import TopoDS_Compound

            builder = BRep_Builder()
            compound = TopoDS_Compound()
            builder.MakeCompound(compound)

            for part in part_names:
                try:
                    cld.component = part
                    part_shape = cld.create2Dcad()
                    if part_shape is None:
                        continue

                    # Add to combined model
                    builder.Add(compound, part_shape)

                    # Save per-part BREP
                    part_file_name = f"{session}_{part}.brep"
                    part_rel_path = os.path.join(
                        "file_storage", "cad_models", part_file_name
                    )
                    BRepTools.breptools.Write(
                        part_shape, part_rel_path, Message_ProgressRange()
                    )
                    part_files[part] = part_rel_path

                    # Also write per-part STL
                    try:
                        part_stl_rel = part_rel_path.replace(".brep", ".stl")
                        write_stl(part_shape, os.path.join(os.getcwd(), part_stl_rel))
                    except Exception as stle:
                        print(f"Failed to write STL for {part}: {stle}")

                except Exception as e:
                    print(f"Failed to build/write part {part}: {e}")

            cld.component = section
            compound_model = compound

        if compound_model is not None:
            model = compound_model
        else:
            cld.component = section
            model = cld.create2Dcad()

    except Exception as e:
        print("Error in cld.create2Dcad():", e)
        return False

    # Ensure output folder exists
    cad_dir = os.path.join(os.getcwd(), "file_storage", "cad_models")
    if not os.path.exists(cad_dir):
        print("cad_models folder missing → creating it")
        os.makedirs(cad_dir, exist_ok=True)

    file_name = session + "_" + section + ".brep"
    file_path = os.path.join("file_storage", "cad_models", file_name)

    print("Saving BREP to:", file_path)

    try:
        BRepTools.breptools.Write(model, file_path, Message_ProgressRange())

        if section == "Model":
            try:
                manifest = {
                    "session": session,
                    "mergedBrep": file_path,
                    "parts": [
                        {"name": name, "brepPath": part_files.get(name)}
                        for name in part_names if part_files.get(name)
                    ]
                }

                for entry in manifest["parts"]:
                    if entry.get("brepPath"):
                        entry["stlPath"] = entry["brepPath"].replace(".brep", ".stl")

                manifest_path = file_path.replace(".brep", ".parts.json")
                full_manifest_path = os.path.join(os.getcwd(), manifest_path)

                with open(full_manifest_path, "w", encoding="utf-8") as mf:
                    json.dump(manifest, mf)

                print(f"Parts manifest saved at {full_manifest_path}")

            except Exception as me:
                print("Warning: Failed to write manifest:", me)

            try:
                step_writer = STEPControl_Writer()
                step_writer.Transfer(model, STEPControl_AsIs)
                step_out = os.path.join(
                    os.getcwd(), file_path.replace(".brep", ".step")
                )
                if step_writer.Write(step_out) == 1:
                    print("STEP saved:", step_out)
            except Exception as e:
                print("STEP export failed:", e)

            try:
                iges_writer = IGESControl_Writer()
                iges_writer.AddShape(model)
                iges_out = os.path.join(
                    os.getcwd(), file_path.replace(".brep", ".iges")
                )
                if iges_writer.Write(iges_out) == 1:
                    print("IGES saved:", iges_out)
            except Exception as e:
                print("IGES export failed:", e)

            try:
                merged_stl = os.path.join(
                    os.getcwd(), file_path.replace(".brep", ".stl")
                )
                write_stl(model, merged_stl)
                print("Merged STL saved:", merged_stl)
            except Exception as e:
                print("Merged STL export failed:", e)

    except Exception as e:
        print("Writing BREP failed:", e)

    if section != "Model":
        try:
            stl_path = os.path.join(
                os.getcwd(), file_path.replace(".brep", ".stl")
            )
            write_stl(model, stl_path)
            print("STL saved:", stl_path)
        except Exception as stle:
            print(f"Warning: STL save failed for {section}: {stle}")

    return file_path
