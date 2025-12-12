"""
Adapter for Lap Joint Welded module
"""
from typing import Dict, Any, List
import os
import json
import traceback
from osdag_core.design_type.connection.lap_joint_welded import LapJointWelded
from osdag_core.cad.common_logic import CommonDesignLogic
from OCC.Core import BRepTools
from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
from OCC.Core.IGESControl import IGESControl_Writer
from OCC.Core.Message import Message_ProgressRange
from OCC.Core.TopoDS import TopoDS_Compound
from OCC.Core.BRep import BRep_Builder
from osdag_core.Common import KEY_DISP_LAPJOINTWELDED
from apps.core.utils import (
    MissingKeyError, InvalidInputTypeError,
    contains_keys, custom_list_validation, float_able, int_able, validate_list_type, write_stl
)
from ...shared import setup_for_cad

def get_required_keys() -> List[str]:
    return [
        "Module",
        "Material",
        "Load.Axial",
        "Plate1Thickness",
        "Plate2Thickness",
        "PlateWidth",
        "ButtJoint.CoverPlate",
        "Weld.Size",
        "Weld.Material_Grade_OverWrite",
        "Weld.Fab",
        "Design.For",
    ]

def validate_input(input_values: Dict[str, Any]) -> None:
    """Validate input values"""
    iv = dict(input_values or {})
    # Provide legacy defaults for weld metadata if omitted by caller
    iv.setdefault("Weld.Material_Grade_OverWrite", "410")
    iv.setdefault("Weld.Fab", "Shop Weld")
    iv.setdefault("Weld.Type", iv.get("Weld.Fab"))
    input_values.update(iv)
    missing = contains_keys(iv, get_required_keys())
    if missing:
        raise MissingKeyError(missing[0])

    weld_size = iv.get("Weld.Size")
    if isinstance(weld_size, (int, float, str)):
        iv["Weld.Size"] = [str(weld_size)]
    if (not isinstance(iv.get("Weld.Size"), list)
            or not validate_list_type(iv.get("Weld.Size"), str)
            or not custom_list_validation(iv.get("Weld.Size"), float_able)):
        raise InvalidInputTypeError("Weld.Size", "non empty List[str] convertible to float")

    for key in ("Plate1Thickness", "Plate2Thickness", "PlateWidth", "Load.Axial"):
        val = iv.get(key)
        # Normalize list/tuple to first element
        if isinstance(val, (list, tuple)) and val:
            val = val[0]
        # allow numeric and coerce to str before float check
        if isinstance(val, (int, float)):
            val = str(val)
        if not isinstance(val, str) or not float_able(val):
            raise InvalidInputTypeError(key, "str convertible to float")
        iv[key] = val
        input_values[key] = val

def generate_output(input_values: Dict[str, Any]) -> Dict[str, Any]:
    """Generate output from input values"""
    output = {}
    logs = []
    try:
        module = LapJointWelded()
        module.set_osdaglogger(None)

        validate_input(input_values)
        module.set_input_values(input_values)

        for runner in ("design", "design_main", "design_module", "run_design"):
            design_fn = getattr(module, runner, None)
            if callable(design_fn):
                design_fn()
                break

        mapped_output = {}
        def map_tuple_list(tuple_list):
            key_map = {
                "Weld.Type": "Weld.Type",
                "Weld.Size": "Weld.Size",
                "Weld.EffLength": "Weld.EffLength",
                "Utilisation Ratio": "Utilisation Ratio",
                "No Cover Plate": "No Cover Plate",
                "Width of Cover Plate": "Width of Cover Plate",
                "Length of Cover Plate": "Length of Cover Plate",
                "Thickness of Cover Plate": "Thickness of Cover Plate",
            }
            label_map = {
                "Weld.Type": "Type",
                "Weld.Size": "Size (mm)",
                "Weld.EffLength": "Eff.Length (mm)",
                "Utilisation Ratio": "Utilisation Ratio",
                "No Cover Plate": "No Cover Plate",
                "Width of Cover Plate": "Width of Cover Plate",
                "Length of Cover Plate": "Length of Cover Plate",
                "Thickness of Cover Plate": "Thickness of Cover Plate",
            }
            for tup in tuple_list or []:
                if len(tup) < 4:
                    continue
                src_key, label, param_type, val = tup[:4]
                param_type_lower = str(param_type).lower()
                if "button" in param_type_lower or callable(val):
                    continue
                target_key = key_map.get(src_key, src_key)
                display_label = label_map.get(target_key, label or target_key)
                mapped_output[target_key] = {"key": target_key, "label": display_label, "val": val}

        if hasattr(module, "output_values"):
            map_tuple_list(module.output_values(True))
        # Do not call spacing for welded (spacing() references self.plate and crashes)

        # Supplement with scalars if not already mapped
        def add_scalar(src_attr, target_key, label):
            if target_key in mapped_output:
                return
            if hasattr(module, src_attr):
                mapped_output[target_key] = {"key": target_key, "label": label, "val": getattr(module, src_attr)}

        add_scalar("weld_size", "Weld.Size", "Size (mm)")
        add_scalar("weld_strength", "Weld.Strength", "Strength (N/mm2)")
        add_scalar("weld_length_effective", "Weld.EffLength", "Eff.Length (mm)")
        add_scalar("design_for", "Design For", "Design For")
        add_scalar("weld_length_provided", "Bolt.ConnLength", "Length of Connection (mm)")

        if mapped_output:
            output = mapped_output
        elif hasattr(module, "output_values_dict") and isinstance(module.output_values_dict, dict):
            output = module.output_values_dict
        else:
            output = {}

        logs = getattr(module, "logs", [])
    except Exception as e:
        logs.append(f"Error in design: {str(e)}")
        traceback.print_exc()
    return output, logs

def create_cad_model(input_values: Dict[str, Any], section: str, session: str) -> str:
    """Generate the CAD model from input values as a BREP file. Return file path."""
    if section not in ("Model", "Column", "Plate"):
        raise InvalidInputTypeError("section", "'Model', 'Column', 'Plate'")

    module = LapJointWelded()
    module.set_osdaglogger(None)
    validate_input(input_values)
    module.set_input_values(input_values)
    if getattr(module, "module", None) != KEY_DISP_LAPJOINTWELDED:
        print(f"[CAD DEBUG] Adjusting module.module from {getattr(module, 'module', None)} to {KEY_DISP_LAPJOINTWELDED}")
        module.module = KEY_DISP_LAPJOINTWELDED

    try:
        connection_key = KEY_DISP_LAPJOINTWELDED
        mainmodule = "Moment Connection"
        folder = ""
        print(f"[CAD DEBUG] init CommonDesignLogic: connection={connection_key}, mainmodule={mainmodule}, folder='{folder}'")
        cdl = CommonDesignLogic(None, '', folder, connection_key, mainmodule)
    except Exception as e:
        print('Error initializing CommonDesignLogic:', e)
        return ""

    try:
        setup_for_cad(cdl, module)
    except Exception as e:
        traceback.print_exc()
        print('Error in setup_for_cad:', e)

    candidate_components = ["Model", "Beam", "Column", "Plate", "Weld", "Bolt", "Bolts", "Connector"]
    probed_shapes = {}
    for comp in candidate_components:
        try:
            cdl.component = comp
            shape = cdl.create2Dcad()
            probed_shapes[comp] = shape
            shape_type = type(shape).__name__ if shape is not None else None
            print(f"[CAD DEBUG] component={comp} -> {shape_type}")
        except Exception as exc:
            probed_shapes[comp] = exc
            print(f"[CAD DEBUG] component={comp} raised: {exc}")

    def _is_valid_shape(val: Any) -> bool:
        return val is not None and not isinstance(val, Exception)

    # Check if CAD generation is available (all components return None means CAD not implemented)
    valid_shapes = [comp for comp in candidate_components if _is_valid_shape(probed_shapes.get(comp))]
    if not valid_shapes:
        error_msg = "3D CAD model generation is not available for LapJointWelded yet. CAD generation methods need to be implemented in osdag_core."
        print(f"[CAD DEBUG] {error_msg}")
        raise NotImplementedError(error_msg)

    cdl.component = section
    part_names = [comp for comp in ("Beam", "Column", "Plate", "Weld", "Bolt", "Bolts", "Connector") if _is_valid_shape(probed_shapes.get(comp))]
    print(f"[CAD DEBUG] requested section={section}; valid parts discovered={part_names}")
    part_files = {}
    compound_model = None

    try:
        if section == "Model":
            builder = BRep_Builder()
            compound = TopoDS_Compound()
            builder.MakeCompound(compound)

            for part in part_names:
                try:
                    part_shape = probed_shapes.get(part)
                    if part_shape is None or isinstance(part_shape, Exception):
                        print(f"[CAD DEBUG] skip part {part}: {part_shape}")
                        continue
                    builder.Add(compound, part_shape)
                    part_file_name = f"{session}_{part}.brep"
                    part_file_path_rel = os.path.join("file_storage", "cad_models", part_file_name)
                    BRepTools.breptools.Write(part_shape, part_file_path_rel, Message_ProgressRange())
                    part_files[part] = part_file_path_rel
                    try:
                        part_stl_rel = part_file_path_rel.replace(".brep", ".stl")
                        write_stl(part_shape, os.path.join(os.getcwd(), part_stl_rel))
                    except Exception as stle:
                        print(f"Failed to write STL for part {part}: {stle}")
                except Exception as e:
                    print(f"Failed to build/write part {part}: {e}")

            cdl.component = section
            compound_model = compound

        model = compound_model if compound_model is not None else cdl.create2Dcad()
    except Exception as e:
        print("Error in cdl.create2Dcad():", e)
        return ""

    cad_dir = os.path.join(os.getcwd(), "file_storage", "cad_models")
    os.makedirs(cad_dir, exist_ok=True)

    file_name = f"{session}_{section}.brep"
    file_path = os.path.join("file_storage", "cad_models", file_name)

    if model is None:
        print(f"[CAD DEBUG] No model generated for section={section}; skipping write.")
        return ""

    try:
        BRepTools.breptools.Write(model, file_path, Message_ProgressRange())

        if section == "Model":
            try:
                manifest = {
                    "session": session,
                    "mergedBrep": file_path,
                    "parts": [{"name": name, "brepPath": part_files.get(name)} for name in part_names if part_files.get(name)]
                }
                for entry in manifest["parts"]:
                    if entry.get("brepPath"):
                        entry["stlPath"] = entry["brepPath"].replace(".brep", ".stl")
                manifest_path = file_path.replace(".brep", ".parts.json")
                full_manifest_path = os.path.join(os.getcwd(), manifest_path)
                with open(full_manifest_path, "w", encoding="utf-8") as mf:
                    json.dump(manifest, mf)
            except Exception as me:
                print(f"Warning: Failed to write manifest: {me}")

            try:
                step_writer = STEPControl_Writer()
                step_writer.Transfer(model, STEPControl_AsIs)
                step_file_path = file_path.replace(".brep", ".step")
                full_step_file_path = os.path.join(os.getcwd(), step_file_path)
                if step_writer.Write(full_step_file_path) != 1:
                    print("Warning: Failed to save STEP file")
            except Exception as stepe:
                print(f"Warning: STEP export failed: {stepe}")

            try:
                iges_writer = IGESControl_Writer()
                iges_writer.AddShape(model)
                iges_file_path = file_path.replace(".brep", ".iges")
                full_iges_file_path = os.path.join(os.getcwd(), iges_file_path)
                if iges_writer.Write(full_iges_file_path) != 1:
                    print("Warning: Failed to save IGES file")
            except Exception as igee:
                print(f"Warning: IGES export failed: {igee}")

            try:
                merged_stl_rel = file_path.replace(".brep", ".stl")
                write_stl(model, os.path.join(os.getcwd(), merged_stl_rel))
            except Exception as stle:
                print(f"Warning: Failed to save merged STL: {stle}")

    except Exception as e:
        print("Writing to BREP file failed:", e)

    if section != "Model":
        try:
            single_stl_rel = file_path.replace(".brep", ".stl")
            write_stl(model, os.path.join(os.getcwd(), single_stl_rel))
        except Exception as stle:
            print(f"Warning: Failed to save STL for {section}: {stle}")

    return file_path

def create_from_input(input_values: Dict[str, Any]) -> Any:
    """Create module instance from input"""
    module = LapJointWelded()
    module.set_input_values(input_values)
    return module
