"""
Api for Cover Plate Welded Connection module
Functions:
    get_required_keys() -> List[str]:
        Return all required input parameters for the module.
    validate_input(input_values: Dict[str, Any]) -> None:
        Go through all the input parameters.
        Check if all required parameters are given.
        Check if all parameters are of correct data type.
    create_module() -> ColumnCoverPlateWeld:
        Create an instance of the cover plate welded connection module design class and set it up for use
    create_from_input(input_values: Dict[str, Any]) -> ColumnCoverPlateWeld
        Create an instance of the cover plate welded connection module design class from input values.
    generate_output(input_values: Dict[str, Any]) -> Dict[str, Any]:
        Generate, format and return the output values from the given input values.
    create_cad_model(input_values: Dict[str, Any], section: str, session: str) -> str:
        Generate the CAD model from input values as a BREP file. Return file path.
"""

from osdag_api.validation_utils import validate_arr, validate_num, validate_string
from osdag_api.errors import MissingKeyError, InvalidInputTypeError
from osdag_api.utils import (
    contains_keys,
    custom_list_validation,
    float_able,
    int_able,
    is_yes_or_no,
    validate_list_type,
)

import osdag_api.modules.moment_connection_common as scc
from OCC.Core import BRepTools
from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
from OCC.Core.IGESControl import IGESControl_Writer
from OCC.Core.Message import Message_ProgressRange
from OCC.Core.BRepTools import breptools_Write
from osdag_api.modules.mesh_export import write_stl
import json
from cad.common_logic import CommonDesignLogic
from osdag_core.design_type.connection.column_cover_plate_weld import ColumnCoverPlateWeld
import sys
import os
import typing
from typing import Dict, Any, List
import traceback

old_stdout = sys.stdout
sys.stdout = open(os.devnull, "w")
sys.stdout = old_stdout


def get_required_keys() -> List[str]:
    return [
        "Module",
        "Member.Designation",  
        "Member.Material",
        "Material",
        "Load.Moment",
        "Load.Shear", 
        "Load.Axial",
        "Weld.Type",
        "Weld.Fab",
        "Weld.Material_Grade_OverWrite",
        "Design.Design_Method",
        "Detailing.Gap",
        "Connector.Material",
        "Connector.Flange_Plate.Preferences", 
        "Connector.Flange_Plate.Thickness_list",
        "Connector.Web_Plate.Thickness_List"
    ]


def validate_input(input_values: Dict[str, Any]) -> None:
    """Validate type for all values in design dict. Raise error when invalid"""
    try:
        required_keys = get_required_keys()
        
        # Filter out UI-specific keys that are not required by the backend module
        filtered_input = {k: v for k, v in input_values.items() if k != "out_titles_status"}
        
        missing_keys = contains_keys(filtered_input, required_keys)
        if missing_keys != None:
            raise MissingKeyError(f"Required key '{missing_keys[0]}' is missing from input")

        # Validate string fields
        string_fields = [
            "Module",
            "Member.Designation",
            "Member.Material",
            "Material",
            "Weld.Type",
            "Weld.Fab", 
            "Design.Design_Method",
            "Connector.Material",
            "Connector.Flange_Plate.Preferences"
        ]
        for key in string_fields:
            if key in filtered_input and not isinstance(filtered_input[key], str):
                raise InvalidInputTypeError(
                    f"Field '{key}' must be a string, got {type(filtered_input[key]).__name__}"
                )

        # Validate numeric fields
        numeric_fields = [
            "Load.Moment",
            "Load.Shear",
            "Load.Axial",
            "Weld.Material_Grade_OverWrite",
            "Detailing.Gap"
        ]
        for key in numeric_fields:
            if key in filtered_input:
                value = filtered_input[key]
                if not isinstance(value, str) or not float_able(value):
                    raise InvalidInputTypeError(
                        f"Field '{key}' must be a string that can be converted to float, got '{value}'"
                    )
                # Additional numeric validation
                float_val = float(value)
                if key == "Detailing.Gap" and float_val < 0:
                    raise ValueError(f"Gap value must be non-negative, got {float_val}")

        # Validate plate thickness lists
        thickness_lists = [
            "Connector.Flange_Plate.Thickness_list",
            "Connector.Web_Plate.Thickness_List"
        ]
        for key in thickness_lists:
            if key in filtered_input:
                thickness = filtered_input[key]
                if not isinstance(thickness, list):
                    raise InvalidInputTypeError(
                        f"Field '{key}' must be a list, got {type(thickness).__name__}"
                    )
                if not validate_list_type(thickness, str):
                    raise InvalidInputTypeError(
                        f"All items in '{key}' must be strings"
                    )
                if not custom_list_validation(thickness, float_able):
                    invalid_items = [x for x in thickness if not float_able(x)]
                    raise InvalidInputTypeError(
                        f"All items in '{key}' must be convertible to float. Invalid items: {invalid_items}"
                    )

    except Exception as e:
        raise type(e)(f"Input validation failed: {str(e)}")


def create_module() -> ColumnCoverPlateWeld:
    """Create an instance of the cover plate welded connection module design class and set it up for use"""
    module = ColumnCoverPlateWeld()
    print('MODULE', module) # Create module instance.
    module.set_osdaglogger(None)
    return module


def create_from_input(input_values: Dict[str, Any]) -> ColumnCoverPlateWeld:
    """Create an instance of the cover plate welded connection module design class from input values."""
    module = create_module()
    print('INPUT SET FOR FINAL OUTPUT', input_values) # Create module instance.
    module.set_input_values(input_values)
    return module


def generate_output(input_values: Dict[str, Any]) -> Dict[str, Any]:
    """Generate, format and return formatted output"""
    output = {}
    module = create_from_input(input_values)

    logs = []
    try:
        if hasattr(module, "logger") and hasattr(module.logger, "get_logs"):
            logs = module.logger.get_logs()
    except:
        logs = []

    raw_output_text = module.output_values(True)
    raw_member_capacity = module.member_capacityoutput(True)
    flange_weld_details = module.flange_weld_details(True)
    web_weld_details = module.web_weld_details(True)
    web_capacity = module.webcapacity(True)
    flange_capacity = module.flangecapacity(True)
    web_block_shear_pattern = module.web_pattern(True)

    raw_output = (
        raw_output_text +
        raw_member_capacity
        + flange_weld_details +
        web_weld_details
        + web_capacity +
        flange_capacity
        + web_block_shear_pattern
    )
    print('RAW OUTPUT', raw_output)  # Debugging output
    # Format output
    for param in raw_output:
        if param[2] == "TextBox":
            key = param[0]
            label = param[1] 
            value = param[3]
            output[key] = {
                "key": key,
                "label": label,
                "val": value  # Changed from "value" to "val" to match frontend expectations
            }
    return output, logs


# def create_cad_model(input_values: Dict[str, Any], section: str, session: str) -> str:
#     """Generate the CAD model from input values as a BREP file. Return file path."""
#     if section not in ("Model", "Column", "Connector"):  # Error checking: If section is valid.
#         raise InvalidInputTypeError(
#             "section", "'Model', 'Column' or 'Connector'")
#     module = create_from_input(input_values)  # Create module from input.
#     # Object that will create the CAD model.
#     try : 
#         cld = CommonDesignLogic(None, '', module.module , module.mainmodule)
#         print('CAD MODULE', module.mainmodule)  # Create CommonDesignLogic instance.
#     except Exception as e : 
#         print('error in cld e : ' , e)
    
#     try : 
#         # Setup the calculations object for generating CAD model.
#         mcc.setup_for_cad(cld, module)
#     except Exception as e : 
#         traceback.print_exc()
#         print('Error in setting up cad e : ' , e)

#     # The section of the module that will be generated.
#     cld.component = section
    
#     try : 
#         model = cld.create2Dcad()  # Generate CAD Model.
#     except Exception as e :
#         print('Error in cld.create2Dcad() e : ' , e)
#         return False

#     # check if the cad_models folder exists or not 
#     # if no, then create one 
#     if(not os.path.exists(os.path.join(os.getcwd() , "file_storage/cad_models/"))) :
#         print('path does not exists cad_models , creating one')
#         os.mkdir(os.path.join(os.getcwd() , "file_storage/cad_models/"))
      
#     print('2d model : ' , model)
#     # os.system("clear")  # clear the terminal
#     file_name = session + "_" + section + ".brep"
#     file_path = "file_storage/cad_models/" + file_name
#     print('brep file path in create_cad_model : ' , file_path)

#     try : 
#         BRepTools.breptools.Write(model, file_path) # Generate CAD Model
#     except Exception as e : 
#         print('Writing to BREP file failed e : ' , e)
    
#     return file_path

def create_cad_model(input_values: Dict[str, Any], section: str, session: str) -> str:
    """Generate the CAD model from input values as a BREP file. Return file path."""

    if section not in ("Model", "Column", "Cover Plate"):
        raise InvalidInputTypeError("section", "'Model', 'Column', 'Column' or 'Connector'")

    module = create_from_input(input_values)
    print('module from input values:', module)

    # Initialize logic
    try:
        cld = CommonDesignLogic(None, '', module.module, module.mainmodule)
    except Exception as e:
        print("error in CommonDesignLogic:", e)
        return False

    try:
        scc.setup_for_cad(cld, module)
    except Exception as e:
        traceback.print_exc()
        print("Error in setup_for_cad:", e)
        return False

    cld.component = section

    part_names = ["Column", "CoverPlate"]
    part_files = {}
    compound_model = None

    try:
        if section == "Model":
            builder = BRep_Builder()
            compound = TopoDS_Compound()
            builder.MakeCompound(compound)

            # Generate each part
            for part in part_names:
                try:
                    cld.component = part
                    part_shape = cld.create2Dcad()
                    if part_shape is None:
                        continue

                    builder.Add(compound, part_shape)

                    # Write each part BREP
                    part_file_name = f"{session}_{part}.brep"
                    part_path_rel = os.path.join("file_storage", "cad_models", part_file_name)

                    breptools_Write(part_shape, part_path_rel)
                    part_files[part] = part_path_rel

                    # Write STL for each part
                    try:
                        part_stl_rel = part_path_rel.replace(".brep", ".stl")
                        write_stl(part_shape, os.path.join(os.getcwd(), part_stl_rel))
                    except Exception as stle:
                        print(f"Failed STL for {part}: {stle}")

                except Exception as e:
                    print(f"Failed part {part}: {e}")

            cld.component = section
            compound_model = compound

        # If not model, just generate normally
        if compound_model is not None:
            model = compound_model
        else:
            model = cld.create2Dcad()

    except Exception as e:
        print("Error in create2Dcad():", e)
        return False

    # SAFETY CHECK
    if model is None:
        print("ERROR: create2Dcad returned None — cannot write output.")
        return False

    cad_dir = os.path.join(os.getcwd(), "file_storage", "cad_models")
    if not os.path.exists(cad_dir):
        print("cad_models folder missing — creating...")
        os.makedirs(cad_dir, exist_ok=True)

    file_name = f"{session}_{section}.brep"
    file_path = os.path.join("file_storage", "cad_models", file_name)
    print("Writing BREP:", file_path)

    try:
        breptools_Write(model, file_path)
    except Exception as e:
        print("BREP write failed:", e)
        return False

    if section == "Model":
        try:
            manifest = {
                "session": session,
                "mergedBrep": file_path,
                "parts": [
                    {"name": n, "brepPath": part_files[n], "stlPath": part_files[n].replace(".brep", ".stl")}
                    for n in part_names if n in part_files
                ]
            }
            manifest_path = file_path.replace(".brep", ".parts.json")
            with open(os.path.join(os.getcwd(), manifest_path), "w", encoding="utf-8") as mf:
                json.dump(manifest, mf)
        except Exception as me:
            print("Warning: failed manifest:", me)

        # Export STEP
        step_path = file_path.replace(".brep", ".step")
        step_writer = STEPControl_Writer()
        step_writer.Transfer(model, STEPControl_AsIs)
        step_writer.Write(os.path.join(os.getcwd(), step_path))

        # Export IGES
        iges_path = file_path.replace(".brep", ".iges")
        iges_writer = IGESControl_Writer()
        iges_writer.AddShape(model)
        iges_writer.Write(os.path.join(os.getcwd(), iges_path))

        # Export merged STL
        try:
            stl_path = file_path.replace(".brep", ".stl")
            write_stl(model, os.path.join(os.getcwd(), stl_path))
        except Exception as e:
            print("Warning: STL merge failed:", e)

    else:
        try:
            stl_path = file_path.replace(".brep", ".stl")
            write_stl(model, os.path.join(os.getcwd(), stl_path))
        except Exception as e:
            print(f"Warning: STL failed for {section}:", e)

    return file_path