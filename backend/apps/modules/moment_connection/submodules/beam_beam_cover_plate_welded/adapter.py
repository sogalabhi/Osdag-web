"""
Api for Cover Plate Welded Connection module
Functions:
    validate_input(input_values: Dict[str, Any]) -> None:
        Check that all required parameters are given and of the correct data type.
    create_module() -> BeamCoverPlateWeld:
        Create an instance of the cover plate welded connection module design class and set it up for use
    create_from_input(input_values: Dict[str, Any]) -> BeamCoverPlateWeld
        Create an instance of the cover plate welded connection module design class from input values.
    generate_output(input_values: Dict[str, Any]) -> Dict[str, Any]:
        Generate, format and return the output values from the given input values.
    create_cad_model(input_values: Dict[str, Any], section: str, session: str) -> str:
        Generate the CAD model from input values as a BREP file. Return file path.
"""

from apps.core.utils import (
    InvalidInputTypeError,
    write_stl, build_raw_output_dict,
)

from ...shared import setup_for_cad  # Use moment_connection shared utilities
from OCC.Core import BRepTools
from OCC.Core.Message import Message_ProgressRange
from osdag_core.cad.common_logic import CommonDesignLogic
from osdag_core.design_type.connection.beam_cover_plate_weld import BeamCoverPlateWeld
import os
from typing import Dict, Any
import traceback
from osdag_core.Common import (
    KEY_OUT_WELD_STRENGTH_RED,
)
from apps.core.web_keys import (
    WEB_FLANGE_WELD_REDUCTION,
    WEB_FLANGE_WELD_STRENGTH_RED,
    WEB_WEB_WELD_REDUCTION,
    WEB_WEB_WELD_STRENGTH_RED,
)
from .schema import BeamBeamCoverPlateWeldedInput


def validate_input(input_values: Dict[str, Any]) -> None:
    """Raise ValidationError naming every bad key. The HTTP request path runs the same model."""
    BeamBeamCoverPlateWeldedInput.validate_request(input_values)


def create_module() -> BeamCoverPlateWeld:
    """Create an instance of the cover plate welded connection module design class and set it up for use"""
    module = BeamCoverPlateWeld()
    print('MODULE', module) # Create module instance.
    module.set_osdaglogger(None, id="web")
    return module


def create_from_input(input_values: Dict[str, Any]) -> BeamCoverPlateWeld:
    """Create an instance of the cover plate welded connection module design class from input values."""
    module = create_module()
    print('INPUT SET FOR FINAL OUTPUT', input_values) # Create module instance.
    module.set_input_values(input_values)
    return module


def generate_output(input_values: Dict[str, Any]) -> Dict[str, Any]:
    """Generate, format and return formatted output"""
    output = {}
    raw_csv = {}
    module = create_from_input(input_values)
    design_status = bool(getattr(module, "design_status", False))

    # Get raw output data
    raw_output_text = module.output_values(design_status)
    raw_member_capacity = module.member_capacityoutput(design_status)
    flange_weld_details = module.flange_weld_details(design_status)
    web_weld_details = module.web_weld_details(design_status)
    web_capacity = module.webcapacity(design_status)
    flange_capacity = module.flangecapacity(design_status)
    web_block_shear_pattern = module.web_pattern(design_status)

    raw_csv = build_raw_output_dict(
        raw_output_text + raw_member_capacity + flange_weld_details + web_weld_details +
        web_capacity + flange_capacity + web_block_shear_pattern,
        design_status
    )

    from osdag_core.custom_logger import CustomLogger
    logs = []
    if hasattr(module, "logger") and isinstance(module.logger, CustomLogger):
        logs = module.logger.get_logs() or []
    else:
        logs = getattr(module, "logs", []) or []

    # Process standard text parameters
    for param in raw_output_text + raw_member_capacity + web_capacity + flange_capacity + web_block_shear_pattern:
        if param[2] == "TextBox":
            key = param[0]
            output[key] = {
                "key": key,
                "label": param[1],
                "val": param[3]
            }

    # Process flange weld details and map colliding keys
    for param in flange_weld_details:
        if param[2] == "TextBox":
            key = param[0]
            if key == "bolt.long_joint":
                key = WEB_FLANGE_WELD_REDUCTION
            elif key == KEY_OUT_WELD_STRENGTH_RED:
                key = WEB_FLANGE_WELD_STRENGTH_RED
            output[key] = {
                "key": key,
                "label": param[1],
                "val": param[3]
            }

    # Process web weld details and map colliding keys
    for param in web_weld_details:
        if param[2] == "TextBox":
            key = param[0]
            if key == "bolt.long_joint":
                key = WEB_WEB_WELD_REDUCTION
            elif key == KEY_OUT_WELD_STRENGTH_RED:
                key = WEB_WEB_WELD_STRENGTH_RED
            output[key] = {
                "key": key,
                "label": param[1],
                "val": param[3]
            }

    try:
        logs = list(reversed(logs))
    except Exception:
        pass
    return output, logs, raw_csv


def create_cad_model(input_values: Dict[str, Any], section: str, session: str, export_formats=None, module=None) -> str:
    """Generate the CAD model from input values as a BREP/STL file.

    External API uses section names: "Model", "Beam", "CoverPlate", "Bolt", "Weld".
    Internally, the legacy CAD logic uses component name "Connector"
    for the cover plate + welds assembly. Map CoverPlate -> Connector for CAD routing,
    but keep the external section name for file naming and response keys.
    """
    if section not in ("Model", "Beam", "CoverPlate", "Bolt", "Weld"):
        raise InvalidInputTypeError("section", "'Model', 'Beam', 'CoverPlate', 'Bolt' or 'Weld'")

    module = module if module is not None else create_from_input(input_values)

    from osdag_core.Common import KEY_DISP_BEAMCOVERPLATEWELD
    if getattr(module, "module", None) != KEY_DISP_BEAMCOVERPLATEWELD:
        module.module = KEY_DISP_BEAMCOVERPLATEWELD
    module.mainmodule = "Moment Connection"

    print(f"[CAD DEBUG] BB cover plate welded: module={module.module}, mainmodule={module.mainmodule}, section={section}")
    cld = CommonDesignLogic(None, "", "", module.module, module.mainmodule)
    setup_for_cad(cld, module)

    # Map external section names to internal component names expected by CommonDesignLogic
    internal_section = section
    if section == "CoverPlate":
        internal_section = "Connector"

    cld.component = internal_section
    print(f"[cadissue] BB cover plate welded: cld.component set to {internal_section} for section={section}")

    def normalize_and_fuse(obj):
        if obj is None:
            return None
        from OCC.Core.TopoDS import TopoDS_Shape
        def _flatten(o):
            if o is None:
                return []
            if isinstance(o, dict):
                out = []
                for v in o.values():
                    out.extend(_flatten(v))
                return out
            if isinstance(o, (list, tuple)):
                out = []
                for i in o:
                    out.extend(_flatten(i))
                return out
            return [o]
        def _explode_compound(shape):
            from OCC.Core.TopExp import TopExp_Explorer
            from OCC.Core.TopAbs import TopAbs_SOLID
            solids = []
            exp = TopExp_Explorer(shape, TopAbs_SOLID)
            while exp.More():
                solids.append(exp.Current())
                exp.Next()
            return solids if solids else [shape]
        shapes = []
        for s in _flatten(obj):
            if isinstance(s, TopoDS_Shape):
                shapes.extend(_explode_compound(s))
        if not shapes:
            return None
        from OCC.Core.BRepAlgoAPI import BRepAlgoAPI_Fuse
        result = shapes[0]
        for shp in shapes[1:]:
            result = BRepAlgoAPI_Fuse(result, shp).Shape()
        return result

    def get_shape_for_part(part_name):
        if part_name == "Beam":
            return normalize_and_fuse(cld.CPObj.get_beam_models())
        elif part_name in ("Connector", "CoverPlate", "Cover Plate"):
            return normalize_and_fuse(cld.CPObj.get_plate_models())
        elif part_name == "Weld":
            return normalize_and_fuse(cld.CPObj.get_welded_modules())
        return None

    part_names = ["Beam", "Connector", "Bolt", "Weld"]
    part_files = {}

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
                    part_shape = get_shape_for_part(part)
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

            model = compound
        else:
            model = get_shape_for_part(section)
    except Exception as e:
        print('Error in resolving component shape e : ', e)
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

            # Optional on-demand STEP/IGES exports (only when frontend requests them)
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
