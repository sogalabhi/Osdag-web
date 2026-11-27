from apps.core.utils import (
    InvalidInputTypeError,
    write_stl, build_raw_output_dict
)
from ...shared import setup_for_cad  # Use moment_connection shared utilities
from osdag_core.cad.common_logic import CommonDesignLogic
from OCC.Core import BRepTools
from OCC.Core.TopoDS import TopoDS_Compound
from OCC.Core.BRep import BRep_Builder
from OCC.Core.Message import Message_ProgressRange
# Will log a lot of unnessecary data.
from osdag_core.design_type.connection.beam_column_end_plate import BeamColumnEndPlate
import os
import traceback
import logging
import json
from typing import Dict, Any
from osdag_core.Common import (
    KEY_ENDPLATE_TYPE,
)
from apps.core.web_keys import (
    WEB_BEAM_FLANGETHICKNESS,
    WEB_BEAM_WEBTHICKNESS,
    WEB_DETAILING_MIDDLEBOLTS,
)

# Configure logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
# Create handlers
c_handler = logging.StreamHandler()
f_handler = logging.FileHandler('beam_column_endplate_module.log')
c_handler.setLevel(logging.INFO)
f_handler.setLevel(logging.DEBUG)
# Create formatters and add it to handlers
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
c_handler.setFormatter(formatter)
f_handler.setFormatter(formatter)
# Add handlers to the logger
logger.addHandler(c_handler)
logger.addHandler(f_handler)

# Suppress output when necessary
from .schema import BeamColumnEndPlateInput


def validate_input(input_values: Dict[str, Any]) -> None:
    """Raise ValidationError naming every bad key. The HTTP request path runs the same model."""
    BeamColumnEndPlateInput.validate_request(input_values)


def create_module() -> BeamColumnEndPlate:
    """Create an instance of the Beam Column End plate connection module design class and set it up for use"""
    logger.info("Creating BeamColumnEndPlate module instance")
    try:
        module = BeamColumnEndPlate()  # Create an instance of the BeamColumnEndPlate
        logger.debug("BeamColumnEndPlate instance created successfully")
        module.set_osdaglogger(None, id="web")
        logger.debug("OSDAGLogger set to None")
        return module
    except Exception as e:
        logger.error(f"Error creating BeamColumnEndPlate module: {str(e)}")
        logger.error(traceback.format_exc())
        raise


def create_from_input(input_values: Dict[str, Any]) -> BeamColumnEndPlate:
    """Create an instance of the Beam Column End plate connection module design class from input values."""
    logger.info("Creating module from input values")
    
    # Validate input values first to catch issues early
    try:
        logger.debug("Validating input values")
        validate_input(input_values)
        logger.debug("Input validation successful")
    except Exception as e:
        logger.error(f"Input validation failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise
    
    try:
        logger.debug("Creating module instance")
        module = create_module()  # Create module instance.
        logger.debug("Module instance created successfully")
    except Exception as e:
        logger.error(f"Error in create_module: {str(e)}")
        logger.error(traceback.format_exc())
        raise
    
    # Set the input values on the module instance.
    try:
        logger.debug("Setting input values on module instance")
        logger.debug(f"Input values: {input_values}")
        module.set_input_values(input_values)
        logger.debug("Input values set successfully")
    except Exception as e:
        logger.error(f"Error in set_input_values: {str(e)}")
        logger.error(traceback.format_exc())
        raise

    logger.info("Module created and initialized with input values successfully")
    return module

def generate_output(input_values: Dict[str, Any]) -> Dict[str, Any]:
    """Generate, format and return formatted output"""
    logger.info("Generating output for Beam-to-Column End Plate")
    output = {}
    logs = []  # Initialize logs
    raw_csv = {}

    try:
        module = create_from_input(input_values)
        design_status = bool(getattr(module, "design_status", False))

        # Get raw output data
        raw_output_text = module.output_values(design_status)
        detailing = module.detailing(design_status)
        continuity_plate_details = module.continuity_plate_details(design_status)
        stiffener_plate_details = module.web_stiffener_plate_details(design_status)
        stiffener_details = module.stiffener_details(design_status)
        stiffener_detailing = module.stiffener_detailing(design_status)
        weld_details = module.weld_details(design_status)
        
        from osdag_core.custom_logger import CustomLogger
        if hasattr(module, "logger") and isinstance(module.logger, CustomLogger):
            logs = module.logger.get_logs() or []
            print(f'Retrieved {len(logs)} logs from custom logger')
        else:
            logs = getattr(module, "logs", []) or []

        raw_output = (
            raw_output_text +
            detailing + continuity_plate_details +
            stiffener_plate_details + stiffener_details +
            stiffener_detailing + weld_details
        )
        raw_csv = build_raw_output_dict(raw_output, design_status)

        # Format output
        for param in raw_output:
            if len(param) >= 4 and param[2] == "TextBox":
                key = param[0]
                label = param[1] 
                value = param[3]
                
                # Handle numpy types
                if hasattr(value, 'item'):
                    value = value.item()
                
                output[key] = {
                    "key": key,
                    "label": label,
                    "val": value
                }
        
        # Extra keys needed by the frontend bolt-pattern diagram (not exposed
        # via output_values()/detailing() as TextBox rows on osdag_core's side)
        try:
            extra_keys = {
                WEB_BEAM_WEBTHICKNESS:    ("Beam Web Thickness (mm)",    getattr(module, "beam_tw", None)),
                WEB_BEAM_FLANGETHICKNESS: ("Beam Flange Thickness (mm)", getattr(module, "beam_tf", None)),
                KEY_ENDPLATE_TYPE:         ("End Plate Type",             getattr(module, "endplate_type", None)),
                WEB_DETAILING_MIDDLEBOLTS: ("Middle Bolt Row (0/1)",     getattr(module, "bolt_row_web", None)),
            }
            for key, (label, val) in extra_keys.items():
                if val is not None:
                    if hasattr(val, 'item'):
                        val = val.item()
                    output[key] = {"key": key, "label": label, "val": val}
        except Exception as e:
            logger.warning(f"Could not add extra diagram keys: {e}")

        logger.info(f"Output generation completed. Generated {len(output)} output fields and {len(logs)} log messages")

    except Exception as e:
        logger.error(f"Error in generate_output: {str(e)}")
        logger.error(traceback.format_exc())
        # Return what we have so far
    logger.debug(f"Final logs being returned: {logs}")
    try:
        logs = list(reversed(logs))
    except Exception:
        pass
    return output, logs, raw_csv



def create_cad_model(input_values: Dict[str, Any], section: str, session: str, export_formats=None, module=None) -> str:
    """Generate the CAD model from input values as a BREP file. Return file path."""
    if section == "Plate":
        section = "Connector"
    if section not in ("Model", "Beam", "Column", "Connector", "Bolt", "Weld"):
        raise InvalidInputTypeError("section", "'Model', 'Beam', 'Column', 'Connector', 'Bolt' or 'Weld'")

    module = module if module is not None else create_from_input(input_values)
    from osdag_core.Common import KEY_DISP_BCENDPLATE
    if getattr(module, "module", None) != KEY_DISP_BCENDPLATE:
        print(f"[CAD DEBUG] Adjusting module.module from {getattr(module,'module',None)} to {KEY_DISP_BCENDPLATE}")
        module.module = KEY_DISP_BCENDPLATE
    if getattr(module, "mainmodule", None) != "Moment Connection":
        print(f"[CAD DEBUG] Adjusting module.mainmodule from {getattr(module,'mainmodule',None)} to Moment Connection")
        module.mainmodule = "Moment Connection"

    print(f"[CAD DEBUG] building CommonDesignLogic with module={module.module}, mainmodule={module.mainmodule}, section={section}")
    # CommonDesignLogic(display, cad_widget, folder, connection, mainmodule)
    cld = CommonDesignLogic(None, "", "", module.module, module.mainmodule)
    setup_for_cad(cld, module)

    # The section of the module that will be generated.
    cld.component = section

    # When section == "Model", also ensure per-part shapes exist and prepare a compound
    # Try to include additional subparts like Welds and Bolts if available
    part_names = ["Beam", "Column", "Connector", "Bolt", "Weld"]
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
        print('Error in cld.create2Dcad() e : ' , e)
        return False

    # check if the cad_models folder exists or not 
    # if no, then create one 
    cad_models_path = os.path.join(os.getcwd(), "file_storage", "cad_models")
    if not os.path.exists(cad_models_path):
        print('path does not exists cad_models , creating one')
        os.makedirs(cad_models_path, exist_ok=True)
      
    print('2d model : ' , model)
    # os.system("clear")  # clear the terminal
    file_name = session + "_" + section + ".brep"
    file_path = "file_storage/cad_models/" + file_name
    print('brep file path in create_cad_model : ' , file_path)

    try : 
        BRepTools.breptools.Write(model, file_path, Message_ProgressRange()) # Generate CAD Model

        # Always try to write STL for the requested section
        try:
            stl_rel = file_path.replace(".brep", ".stl")
            full_stl = os.path.join(os.getcwd(), stl_rel)
            write_stl(model, full_stl)
            print(f"STL file saved at {full_stl}")
        except Exception as stle:
            print(f"Warning: Failed to save STL at {file_path}: {stle}")

        # If it's 'Model' section, write a manifest referencing per-part breps and save extra formats
        if section == "Model":
            export_formats_lc = {f.lower() for f in export_formats} if export_formats else set()
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

            # Optional on-demand STEP/IGES exports
            if export_formats_lc:
                try:
                    from apps.core.utils.cad_export import export_step, export_iges

                    if "step" in export_formats_lc:
                        step_rel = file_path.replace(".brep", ".step")
                        export_step(model, os.path.join(os.getcwd(), step_rel))
                    if "iges" in export_formats_lc:
                        iges_rel = file_path.replace(".brep", ".iges")
                        export_iges(model, os.path.join(os.getcwd(), iges_rel))
                except Exception as e:
                    print(f"Warning: Optional STEP/IGES export failed: {e}")
            # Write merged STL for Model
            try:
                merged_stl_rel = file_path.replace(".brep", ".stl")
                write_stl(model, os.path.join(os.getcwd(), merged_stl_rel))
                print(f"STL file saved at {os.path.join(os.getcwd(), merged_stl_rel)}")
            except Exception as stle:
                print(f"Warning: Failed to save merged STL: {stle}")
    except Exception as e : 
        print('Writing to BREP file failed e : ' , e)

    # For non-Model sections, export single STL next to BREP
    if section != "Model":
        try:
            single_stl_rel = file_path.replace(".brep", ".stl")
            write_stl(model, os.path.join(os.getcwd(), single_stl_rel))
            print(f"STL file saved at {os.path.join(os.getcwd(), single_stl_rel)}")
        except Exception as stle:
            print(f"Warning: Failed to save STL for {section}: {stle}")

    return file_path
