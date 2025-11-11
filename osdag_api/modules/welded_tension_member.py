from Common import KEY_DISP_TENSION_WELDED
from osdag_api.validation_utils import validate_arr, validate_num, validate_string
from osdag_api.errors import MissingKeyError, InvalidInputTypeError
from osdag_api.utils import contains_keys, custom_list_validation, float_able, int_able, is_yes_or_no, validate_list_type
import osdag_api.modules.tension_member_common as tbm
from OCC.Core import BRepTools
from OCC.Core.Message import Message_ProgressRange
from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
from OCC.Core.IGESControl import IGESControl_Writer
from OCC.Core.TopoDS import TopoDS_Compound
from OCC.Core.BRep import BRep_Builder
from cad.common_logic import CommonDesignLogic
# Will log a lot of unnessecary data.
from design_type.tension_member.tension_welded import Tension_welded
import sys
import os
import typing
from typing import Dict, Any, List
import json
import traceback
from osdag_api.modules.mesh_export import write_stl
old_stdout = sys.stdout  # Backup logs
sys.stdout = open(os.devnull, "w")  # redirect stdout
sys.stdout = old_stdout  # Reset log

def get_required_keys() -> List[str]:
    # Using the same KEY constants as backend for consistency
    req_keys = [
        "Member.Profile",           # KEY_SEC_PROFILE
        "Member.Designation",       # KEY_SECSIZE
        "Material",                 # KEY_MATERIAL
        "Member.Material",          # KEY_SEC_MATERIAL
        "Connector.Plate.Thickness_List",  # KEY_PLATETHK
        "Connector.Material",      # KEY_CONNECTOR_MATERIAL
        "Design.Design_Method",    # KEY_DP_DESIGN_METHOD
        "Detailing.Corrosive_Influences",  # KEY_DP_DETAILING_CORROSIVE_INFLUENCES
        "Detailing.Edge_type",     # KEY_DP_DETAILING_EDGE_TYPE
        "Detailing.Gap",          # KEY_DP_DETAILING_GAP
        "Load.Axial",             # KEY_AXIAL
        "Member.Length",          # KEY_LENGTH
        "Conn_Location",          # KEY_LOCATION
        "Module"                  # KEY_MODULE
    ]
    print("in welded_tension_member.py: get_required_keys called, returning:", req_keys)
    return req_keys

def validate_input(input_values: Dict[str, Any]) -> None:
    print("in welded_tension_member.py: validate_input called with input_values:", input_values)
    required_keys = get_required_keys()
    print("in welded_tension_member.py: Required keys:", required_keys)
    missing_keys = contains_keys(input_values, required_keys)
    print("in welded_tension_member.py: Missing keys:", missing_keys)
    if missing_keys is not None:
        print("in welded_tension_member.py: Missing key detected:", missing_keys[0])
        raise MissingKeyError(missing_keys[0])

    # Validate Connector.Material
    print("in welded_tension_member.py: Validating Connector.Material")
    if not isinstance(input_values["Connector.Material"], str):
        print("in welded_tension_member.py: Invalid type for Connector.Material")
        raise InvalidInputTypeError("Connector.Material", "str")

    # Validate Design.Design_Method
    print("in welded_tension_member.py: Validating Design.Design_Method")
    if not isinstance(input_values["Design.Design_Method"], str):
        print("in welded_tension_member.py: Invalid type for Design.Design_Method")
        raise InvalidInputTypeError("Design.Design_Method", "str")

    # Validate Detailing.Corrosive_Influences
    print("in welded_tension_member.py: Validating Detailing.Corrosive_Influences")
    if not is_yes_or_no(input_values["Detailing.Corrosive_Influences"]):
        print("in welded_tension_member.py: Invalid value for Detailing.Corrosive_Influences")
        raise InvalidInputTypeError("Detailing.Corrosive_Influences", "'Yes' or 'No'")

    # Validate Detailing.Edge_type
    print("in welded_tension_member.py: Validating Detailing.Edge_type")
    if not isinstance(input_values["Detailing.Edge_type"], str):
        print("in welded_tension_member.py: Invalid type for Detailing.Edge_type")
        raise InvalidInputTypeError("Detailing.Edge_type", "str")

    # Validate Detailing.Gap
    print("in welded_tension_member.py: Validating Detailing.Gap")
    detailing_gap = input_values["Detailing.Gap"]
    if (not isinstance(detailing_gap, str)
            or not int_able(detailing_gap)):
        print("in welded_tension_member.py: Invalid type for Detailing.Gap")
        raise InvalidInputTypeError("Detailing.Gap", "str where str can be converted to int")

    # Validate Load.Axial
    print("in welded_tension_member.py: Validating Load.Axial")
    load_axial = input_values["Load.Axial"]
    if (not isinstance(load_axial, str)
            or not int_able(load_axial)):
        print("in welded_tension_member.py: Invalid type for Load.Axial")
        raise InvalidInputTypeError("Load.Axial", "str where str can be converted to int")

    # Validate Material
    print("in welded_tension_member.py: Validating Material")
    if not isinstance(input_values["Material"], str):
        print("in welded_tension_member.py: Invalid type for Material")
        raise InvalidInputTypeError("Material", "str")

    # Validate Member.Profile
    print("in welded_tension_member.py: Validating Member.Profile")
    if not isinstance(input_values["Member.Profile"], str):
        print("in welded_tension_member.py: Invalid type for Member.Profile")
        raise InvalidInputTypeError("Member.Profile", "str")

    # Validate Member.Designation
    print("in welded_tension_member.py: Validating Member.Designation")
    if not isinstance(input_values["Member.Designation"], str):
        print("in welded_tension_member.py: Invalid type for Member.Designation")
        raise InvalidInputTypeError("Member.Designation", "str")

    # Validate Member.Length
    print("in welded_tension_member.py: Validating Member.Length")
    if not isinstance(input_values["Member.Length"], str):
        print("in welded_tension_member.py: Invalid type for Member.Length")
        raise InvalidInputTypeError("Member.Length", "str")

    # Validate Conn_Location
    print("in welded_tension_member.py: Validating Conn_Location")
    if not isinstance(input_values["Conn_Location"], str):
        print("in welded_tension_member.py: Invalid type for Conn_Location")
        raise InvalidInputTypeError("Conn_Location", "str")

    # Validate Module
    print("in welded_tension_member.py: Validating Module")
    if not isinstance(input_values["Module"], str):
        print("in welded_tension_member.py: Invalid type for Module")
        raise InvalidInputTypeError("Module", "str")

    # Validate Connector.Plate.Thickness_List
    print("in welded_tension_member.py: Validating Connector.Plate.Thickness_List")
    connector_plate_thicknesslist = input_values["Connector.Plate.Thickness_List"]
    if (not isinstance(connector_plate_thicknesslist, list)
            or not validate_list_type(connector_plate_thicknesslist, str)
            or not custom_list_validation(connector_plate_thicknesslist, int_able)):
        print("in welded_tension_member.py: Invalid type for Connector.Plate.Thickness_List")
        raise InvalidInputTypeError("Connector.Plate.Thickness_List", "List[str] where all items can be converted to int")

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
    str_keys = ["Design.Design_Method",  # List of all parameters that are strings
                "Detailing.Edge_type",
                "Material",
                "Member.Supported_Section.Designation",
                "Member.Supported_Section.Material",
                "Member.Supporting_Section.Designation",
                "Member.Supporting_Section.Material",
                "Module",
                "Weld.Fab"]
    for key in str_keys:  # Loop through all keys.
        print('validating string key')
        
        try : 
            validate_string(key)  # Check if key is a string. If not, raise error.
        except : 
            print('error in validating string keys')
            print('string key passed  : ' , key )

    # Validate for keys that are numbers
    num_keys = [("Detailing.Gap", False),  # List of all parameters that are numbers (key, is_float)
                ("Load.Axial", False),
                ("Load.Shear", False),]
    for key in num_keys:  # Loop through all keys.
        # Check if key is a number. If not, raise error.
        print('validating num keys')
        validate_num(key[0], key[1])

    # Validate for keys that are arrays
    arr_keys = [("Connector.Plate.Thickness_List", False)]  # List of all parameters that can be converted to numbers (key, is_float)
    for key in arr_keys:
        print('validating arr key')
        # Check if key is a list where all items can be converted to numbers. If not, raise error.
        validate_arr(key[0], key[1])


def create_module() -> Tension_welded:
    print("in welded_tension_member.py: create_module called")
    module = Tension_welded()
    print("in welded_tension_member.py: Tension_welded instance created:", module)
    module.set_osdaglogger(None)
    print("in welded_tension_member.py: set_osdaglogger called with None")
    return module


def create_from_input(input_values: Dict[str, Any]) -> Tension_welded:
    try:
        module = create_module()
        print("in welded_tension_member.py: Module created successfully")
    except Exception as e:
        print("in welded_tension_member.py: Exception in create_module:", e)
        print("in welded_tension_member.py: Error in creating module")
    # Plate.Thickness expects a list, take the first value if present, else ""
    if isinstance(input_values.get("Connector.Plate.Thickness_List", None), list) and input_values["Connector.Plate.Thickness_List"]:
        input_values["Plate.Thickness"] = input_values["Connector.Plate.Thickness_List"][0]
    else:
        input_values["Plate.Thickness"] = ""

    # Now call set_input_values with the updated dictionary
    try:
        input_values["Weld.Material_Grade_OverWrite"] = "410"
        input_values["Weld.Fab"] = "Shop Weld"
        module.set_input_values(input_values)
        print("in welded_tension_member.py: set_input_values called successfully")
    except Exception as e:
        print(type(e))
        print("in welded_tension_member.py: Exception in set_input_values:", e)
        print("in welded_tension_member.py: Error in setting the input values")
    
    return module



def generate_output(input_values: Dict[str, Any]) -> Dict[str, Any]:
    print("in welded_tension_member.py: generate_output called with input_values:", input_values)
    output = {}
    module = create_from_input(input_values)
    print("in welded_tension_member.py: Module after create_from_input:", module)
    print("in welded_tension_member.py: type of module:", type(module))
    raw_output_text = module.output_values(True)
    print("in welded_tension_member.py: raw_output_text:", raw_output_text)
    raw_output_spacing = module.spacing(True)
    print("in welded_tension_member.py: raw_output_spacing:", raw_output_spacing)
    # raw_output_capacities = module.capacities(True)
    # print("in welded_tension_member.py: raw_output_capacities:", raw_output_capacities)
    # raw_output_bolt_capacity = module.bolt_capacity_details(True)
    # print("in welded_tension_member.py: raw_output_bolt_capacity:", raw_output_bolt_capacity)
    logs = module.logs
    print("in welded_tension_member.py: logs:", logs)
    raw_output = raw_output_spacing + raw_output_text
    print("in welded_tension_member.py: raw_output combined:", raw_output)
    for param in raw_output:
        print("in welded_tension_member.py: Processing param:", param)
        if param[2] == "TextBox":
            key = param[0]
            label = param[1]
            value = param[3]
            output[key] = {
                "key": key,
                "label": label,
                "val": value  # Changed from "value" to "val" to match frontend expectations
            }
            print(f"in welded_tension_member.py: Added output[{key}] = {output[key]}")
    print("in welded_tension_member.py: Final output dict:", output)
    print("in welded_tension_member.py: Output keys:", list(output.keys()))
    print("in welded_tension_member.py: Returning logs:", logs)
    return output, logs

def create_cad_model(input_values: Dict[str, Any], section: str, session: str) -> str:
    """Generate the CAD model from input values as a BREP file. Return file path."""
    if section not in ("Model", "Member", "Plate", "Endplate"):  # Error checking: If section is valid.
        raise InvalidInputTypeError(
            "section", "'Model', 'Member', 'Plate', 'Endplate'")
    module = create_from_input(input_values)  # Create module from input.
    print('module from input values : ' , module)
    # Object that will create the CAD model.
    try: 
        cld = CommonDesignLogic(None, '', KEY_DISP_TENSION_WELDED , module.mainmodule)
    except Exception as e : 
        print('error in cld e : ' , e)
    
    try: 
        # Setup the calculations object for generating CAD model.
        tbm.setup_for_cad(cld, module)
    except Exception as e : 
        traceback.print_exc()
        print('Error in setting up cad e : ' , e)
 
    # The section of the module that will be generated.
    cld.component = section

    # When section == "Model", also ensure per-part shapes exist and prepare a compound
    # Try to include additional subparts like Welds and Bolts if available
    part_names = ["Member", "Plate", "Endplate"]
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
                    BRepTools.breptools.Write(part_shape, part_file_path_rel, Message_ProgressRange())
                    part_files[part] = part_file_path_rel
                    # Also write STL for this part
                    try:
                        part_stl_rel = part_file_path_rel.replace(".brep", ".stl")
                        write_stl(part_shape, os.path.join(os.getcwd(), part_stl_rel))
                    except Exception as stle:
                        print(f"Failed to write STL for part {part}: {stle}")
                except Exception as e:
                    print(f"Failed to build/write part {part}: {e}")

            # Reset component to Model and set compound as the model to write
            cld.component = section
            compound_model = compound
        # Generate model for non-Model sections (or fallback)
        if compound_model is not None:
            model = compound_model
        else:
            model = cld.create2Dcad()
    except Exception as e :
        print("Error in cld.create2Dcad() e : " , e)
        return False

    # check if the cad_models folder exists or not 
    # if no, then create one 
    if(not os.path.exists(os.path.join(os.getcwd() , "file_storage/cad_models/"))) :
        print("path does not exists cad_models , creating one")
        os.mkdir(os.path.join(os.getcwd() , "file_storage/cad_models/"))
      
    print("2d model : " , model)
    # os.system("clear")  # clear the terminal
    file_name = session + "_" + section + ".brep"
    file_path = "file_storage/cad_models/" + file_name
    print("brep file path in create_cad_model : " , file_path)

    try: 
        BRepTools.breptools.Write(model, file_path, Message_ProgressRange()) # Generate CAD Model

        # If it's "Model" section, write a manifest referencing per-part breps and save extra formats
        if section == "Model":
            try:
                manifest = {
                    "session": session,
                    "mergedBrep": file_path,
                    "parts": [
                        {"name": name, "brepPath": part_files.get(name)} for name in part_names if part_files.get(name)
                    ]
                }
                # add stlPath for parts
                for entry in manifest["parts"]:
                    if entry.get("brepPath"):
                        entry["stlPath"] = entry["brepPath"].replace(".brep", ".stl")
                manifest_path = file_path.replace(".brep", ".parts.json")
                full_manifest_path = os.path.join(os.getcwd(), manifest_path)
                with open(full_manifest_path, "w", encoding="utf-8") as mf:
                    json.dump(manifest, mf)
                print(f"Parts manifest saved at {full_manifest_path}")
            except Exception as me:
                print(f"Warning: Failed to write manifest: {me}")

            # Save STEP
            step_writer = STEPControl_Writer()
            step_writer.Transfer(model, STEPControl_AsIs)
            step_file_path = file_path.replace(".brep", ".step")
            full_step_file_path = os.path.join(os.getcwd(), step_file_path)
            if step_writer.Write(full_step_file_path) == 1:
                print(f"STEP file saved at {full_step_file_path}")
            else:
                print("Warning: Failed to save STEP file!")

            # Save IGES
            iges_writer = IGESControl_Writer()
            iges_writer.AddShape(model)
            iges_file_path = file_path.replace(".brep", ".iges")
            full_iges_file_path = os.path.join(os.getcwd(), iges_file_path)
            if iges_writer.Write(full_iges_file_path) == 1:
                print(f"IGES file saved at {full_iges_file_path}")
            else:
                print("Warning: Failed to save IGES file!")
            # Write merged STL for Model
            try:
                merged_stl_rel = file_path.replace(".brep", ".stl")
                write_stl(model, os.path.join(os.getcwd(), merged_stl_rel))
                print(f"STL file saved at {os.path.join(os.getcwd(), merged_stl_rel)}")
            except Exception as stle:
                print(f"Warning: Failed to save merged STL: {stle}")
    except Exception as e : 
        print("Writing to BREP file failed e : " , e)

    # For non-Model sections, export single STL next to BREP
    if section != "Model":
        try:
            single_stl_rel = file_path.replace(".brep", ".stl")
            write_stl(model, os.path.join(os.getcwd(), single_stl_rel))
            print(f"STL file saved at {os.path.join(os.getcwd(), single_stl_rel)}")
        except Exception as stle:
            print(f"Warning: Failed to save STL for {section}: {stle}")

    return file_path
