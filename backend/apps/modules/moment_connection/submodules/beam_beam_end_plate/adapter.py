from apps.core.utils import (
    InvalidInputTypeError,
    write_stl, build_raw_output_dict,
)
from ...shared import setup_for_cad  # Use moment_connection shared utilities
from OCC.Core import BRepTools
from OCC.Core.Message import Message_ProgressRange
from osdag_core.cad.common_logic import CommonDesignLogic
# Will log a lot of unnessecary data.
from osdag_core.design_type.connection.beam_beam_end_plate_splice import BeamBeamEndPlateSplice
import os
from typing import Dict, Any
import traceback
from osdag_core.Common import (
    KEY_ENDPLATE_TYPE,
    KEY_OUT_STIFFENER_HEIGHT,
    KEY_OUT_STIFFENER_THICKNESS,
    KEY_OUT_STIFFENER_WIDTH,
)
from apps.core.web_keys import WEB_BEAM_DEPTH, WEB_BEAM_FLANGETHICKNESS, WEB_BEAM_WEBTHICKNESS
from .schema import BeamBeamEndPlateInput


def validate_input(input_values: Dict[str, Any]) -> None:
    """Raise ValidationError naming every bad key. The HTTP request path runs the same model."""
    BeamBeamEndPlateInput.validate_request(input_values)


def create_module() -> BeamBeamEndPlateSplice:
    """Create an instance of the beambeam end plate connection module design class and set it up for use"""
    module = BeamBeamEndPlateSplice()  # Create an instance of the BeamBeamEndPlateConnection
    module.set_osdaglogger(None, id="web")
    return module


def create_from_input(input_values: Dict[str, Any]) -> BeamBeamEndPlateSplice:
    """Create an instance of the beam beam end plate connection module design class from input values."""
    # validate_input(input_values)
    try : 
        module = create_module()  # Create module instance.
    except Exception as e : 
        print('e in create_module : ' , e) 
        print('error in creating module')
    
    # Set the input values on the module instance.
    try : 
        print("**********", input_values)
        module.set_input_values(input_values)
    except Exception as e : 
        traceback.print_exc()
        print('e in set_input_values ************ : ' , e)
        print('error in setting the input values **********')

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
    raw_csv = {}
    module = create_from_input(input_values)  # Create module from input.
    design_status = bool(getattr(module, "design_status", False))
    print('module : ******' , module)
    print('type of module : ******** ' , type(module))
    # Generate output values in unformatted form.
    raw_output_text = module.output_values(design_status)
    stiffener_output = module.stiffener_details(design_status)
    
    from osdag_core.custom_logger import CustomLogger
    if hasattr(module, "logger") and isinstance(module.logger, CustomLogger):
        logs = module.logger.get_logs() or []
    else:
        logs = getattr(module, "logs", []) or []
    raw_output = raw_output_text + stiffener_output
    raw_csv = build_raw_output_dict(raw_output, design_status)

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

    # Extra keys needed by the frontend detailing diagram
    try:
        extra_keys = {
            WEB_BEAM_DEPTH:          ("Beam Depth (mm)",              getattr(module, "beam_D", None)),
            WEB_BEAM_FLANGETHICKNESS: ("Beam Flange Thickness (mm)",  getattr(module, "beam_tf", None)),
            WEB_BEAM_WEBTHICKNESS:    ("Beam Web Thickness (mm)",     getattr(module, "beam_tw", None)),
            KEY_OUT_STIFFENER_HEIGHT:     ("Stiffener Height (mm)",       getattr(module, "stiffener_height", None)),
            KEY_OUT_STIFFENER_WIDTH:      ("Stiffener Width (mm)",        getattr(module, "stiffener_length", None)),
            KEY_OUT_STIFFENER_THICKNESS:  ("Stiffener Thickness (mm)",    getattr(module, "stiffener_thickness", None)),
            KEY_ENDPLATE_TYPE:         ("End Plate Type",              getattr(module, "endplate_type", None)),
        }
        for key, (label, val) in extra_keys.items():
            if val is not None:
                if hasattr(val, 'item'):
                    val = val.item()
                output[key] = {"key": key, "label": label, "val": val}
    except Exception as e:
        print(f"[B2B EP adapter] Warning: could not add extra diagram keys: {e}")

    try:
        logs = list(reversed(logs))
    except Exception:
        pass
    return output, logs, raw_csv


def create_cad_model(input_values: Dict[str, Any], section: str, session: str, export_formats=None, module=None) -> str:
    """Generate the CAD model from input values as a BREP file. Return file path."""
    if section not in ("Model", "Beam", "Connector", "Bolt", "Weld"):
        raise InvalidInputTypeError("section", "'Model', 'Beam', 'Connector', 'Bolt' or 'Weld'")

    module = module if module is not None else create_from_input(input_values)
    from osdag_core.Common import KEY_DISP_BB_EP_SPLICE
    # Force correct keys for CAD routing
    if getattr(module, "module", None) != KEY_DISP_BB_EP_SPLICE:
        print(f"[CAD DEBUG] Adjusting module.module from {getattr(module,'module',None)} to {KEY_DISP_BB_EP_SPLICE}")
        module.module = KEY_DISP_BB_EP_SPLICE
    if getattr(module, "mainmodule", None) != "Moment Connection":
        print(f"[CAD DEBUG] Adjusting module.mainmodule from {getattr(module,'mainmodule',None)} to Moment Connection")
        module.mainmodule = "Moment Connection"

    print(f"[CAD DEBUG] building CommonDesignLogic with module={module.module}, mainmodule={module.mainmodule}, section={section}")
    # CommonDesignLogic(display, cad_widget, folder, connection, mainmodule)
    cld = CommonDesignLogic(None, "", "", module.module, module.mainmodule)
    setup_for_cad(cld, module)

    cld.component = section

    # When section == "Model", also ensure per-part shapes exist and prepare a compound
    part_names = ["Beam", "Connector", "Bolt", "Weld"]
    part_files = {}
    compound_model = None

    try:
        if section == "Model":
            from OCC.Core.TopoDS import TopoDS_Compound
            from OCC.Core.BRep import BRep_Builder
            import json

            builder = BRep_Builder()
            compound = TopoDS_Compound()
            builder.MakeCompound(compound)

            for part in part_names:
                try:
                    cld.component = part
                    part_shape = cld.create2Dcad()
                    if part_shape is None:
                        continue

                    # Add to compound
                    builder.Add(compound, part_shape)

                    # Ensure per-part BREP file exists
                    part_file_name = f"{session}_{part}.brep"
                    part_file_path_rel = os.path.join("file_storage", "cad_models", part_file_name)
                    BRepTools.breptools.Write(part_shape, part_file_path_rel, Message_ProgressRange())
                    part_files[part] = part_file_path_rel

                    # Write STL for this part
                    try:
                        part_stl_rel = part_file_path_rel.replace(".brep", ".stl")
                        write_stl(part_shape, os.path.join(os.getcwd(), part_stl_rel))
                    except Exception as stle:
                        print(f"Failed to write STL for part {part}: {stle}")
                except Exception as e:
                    print(f"Failed to build/write part {part}: {e}")

            cld.component = section
            compound_model = compound

        if compound_model is not None:
            model = compound_model
        else:
            model = cld.create2Dcad()
    except Exception as e:
        print('Error in cld.create2Dcad() e : ', e)
        traceback.print_exc()
        raise

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

    try:
        BRepTools.breptools.Write(model, file_path, Message_ProgressRange())  # Generate CAD Model

        # Always try to write STL for the requested section
        try:
            stl_rel = file_path.replace(".brep", ".stl")
            full_stl = os.path.join(os.getcwd(), stl_rel)
            write_stl(model, full_stl)
            print(f"STL file saved at {full_stl}")
        except Exception as stle:
            print(f"Warning: Failed to save STL at {file_path}: {stle}")

        if section == "Model":
            try:
                import json
                manifest = {
                    "session": session,
                    "mergedBrep": file_path,
                    "parts": [
                        {"name": name, "brepPath": part_files.get(name)} for name in part_names if part_files.get(name)
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
                print(f"Warning: Failed to write manifest: {me}")

            export_formats_lc = {f.lower() for f in export_formats} if export_formats else set()

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

    except Exception as e:
        print('Writing to BREP/STL file failed e : ', e)
    
    return file_path


