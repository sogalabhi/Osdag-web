"""
Adapter for Lap Joint Bolted module
"""
from typing import Dict, Any, List
import os
import json
import traceback
from osdag_core.design_type.connection.lap_joint_bolted import LapJointBolted
from osdag_core.cad.common_logic import CommonDesignLogic
from OCC.Core import BRepTools
from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
from OCC.Core.IGESControl import IGESControl_Writer
from OCC.Core.Message import Message_ProgressRange
from OCC.Core.TopoDS import TopoDS_Compound
from OCC.Core.BRep import BRep_Builder
from OCC.Core.BRepAlgoAPI import BRepAlgoAPI_Fuse
from osdag_core.Common import KEY_DISP_LAPJOINTBOLTED
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
        "Bolt.Diameter",
        "Bolt.Grade",
        "Bolt.Type",
        "Bolt.Bolt_Hole_Type",
        "Bolt.Slip_Factor",
        "Design.For",
    ]

def validate_input(input_values: Dict[str, Any]) -> None:
    """Validate input values"""
    iv = dict(input_values or {})
    missing = contains_keys(iv, get_required_keys())
    if missing:
        raise MissingKeyError(missing[0])

    bolt_dia = iv.get("Bolt.Diameter")
    if (not isinstance(bolt_dia, list)
            or not validate_list_type(bolt_dia, str)
            or not custom_list_validation(bolt_dia, int_able)):
        raise InvalidInputTypeError("Bolt.Diameter", "non empty List[str] convertible to int")

    bolt_grade = iv.get("Bolt.Grade")
    if (not isinstance(bolt_grade, list)
            or not validate_list_type(bolt_grade, str)
            or not custom_list_validation(bolt_grade, float_able)):
        raise InvalidInputTypeError("Bolt.Grade", "non empty List[str] convertible to float")

    for key in ("Plate1Thickness", "Plate2Thickness", "PlateWidth", "Load.Axial", "Bolt.Slip_Factor"):
        val = iv.get(key)
        if not isinstance(val, str) or not float_able(val):
            raise InvalidInputTypeError(key, "str convertible to float")

def generate_output(input_values: Dict[str, Any]) -> Dict[str, Any]:
    """Generate output from input values"""
    output = {}
    logs = []
    try:
        module = LapJointBolted()
        module.set_osdaglogger(None, id="web")

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
                "Bolt.Diameter_Provided": "Bolt.Diameter",
                "Bolt.Grade_Provided": "Bolt.Grade_Provided",
                "Bolt.Type_Provided": "Bolt.Type_Provided",
                "Bolt.Shear": "Bolt.Shear",
                "Bolt.Bearing": "Bolt.Bearing",
                "Bolt.Capacity": "Bolt.Capacity",
                "Bolt.Total_Number": "Bolt.number",
                "PackingPlate.Thickness": "PackingPlate thk",
                "Bolt.Rows_Provided": "Bolt.Rows",
                "Bolt.Columns_Provided": "Bolt.Cols",
                "Utilization.Ratio": "Bolt.UtilizationRatio",
                "Design.For": "Design For",
                "Plate.BaseCapacity": "Plate.BaseCapacity",
                "Plate.BaseUtilization": "Plate.BaseUtilization",
                "Bolt.Utilization": "Bolt.Utilization",
                "Bolt.Connection_Length": "Bolt.ConnLength",
            }
            label_map = {
                "Bolt.Diameter": "Diameter (mm)",
                "Bolt.Grade_Provided": "Property Class",
                "Bolt.Type_Provided": "Type",
                "Bolt.Shear": "Shear Capacity (kN)",
                "Bolt.Bearing": "Bearing Capacity (kN)",
                "Bolt.Capacity": "Capacity (kN)",
                "Bolt.number": "Number of Bolts",
                "PackingPlate thk": "Packing Plate Thickness (mm)",
                "Bolt.Rows": "Rows of Bolts",
                "Bolt.Cols": "Columns of Bolts",
                "Bolt.UtilizationRatio": "Utilisation Ratio",
                "Design For": "Design For",
                "Plate.BaseCapacity": "Base Metal Capacity (kN)",
                "Plate.BaseUtilization": "Base Metal Utilization",
                "Bolt.Utilization": "Bolt Utilization",
                "Bolt.ConnLength": "Length of Connection (mm)",
            }
            for tup in tuple_list or []:
                if len(tup) < 4:
                    continue
                src_key, label, param_type, val = tup[:4]
                param_type_lower = str(param_type).lower()
                # skip buttons or callables (e.g., spacing OutButton)
                if "button" in param_type_lower or callable(val):
                    continue
                target_key = key_map.get(src_key, src_key)
                display_label = label_map.get(target_key, label or target_key)
                mapped_output[target_key] = {"key": target_key, "label": display_label, "val": val}

        if hasattr(module, "output_values"):
            map_tuple_list(module.output_values(True))
        # Do not call spacing for lap-joint-bolted to avoid OutButton/callable serialization

        if mapped_output:
            output = mapped_output
        elif hasattr(module, "get_output_values"):
            output = module.get_output_values()
        elif hasattr(module, "output"):
            output = module.output

        logs = getattr(module, "logs", [])
    except Exception as e:
        logs.append(f"Error in design: {str(e)}")
        traceback.print_exc()
    return output, logs

def create_cad_model(input_values: Dict[str, Any], section: str, session: str) -> str:
    """Generate the CAD model from input values as a BREP file. Return file path."""
    if section not in ("Model", "Column", "Plate", "Bolt", "Bolts", "Connector"):
        raise InvalidInputTypeError("section", "'Model', 'Column', 'Plate', 'Bolt', 'Bolts', 'Connector'")

    module = LapJointBolted()
    module.set_input_values(input_values)
    if getattr(module, "module", None) != KEY_DISP_LAPJOINTBOLTED:
        print(f"[CAD DEBUG] Adjusting module.module from {getattr(module, 'module', None)} to {KEY_DISP_LAPJOINTBOLTED}")
        module.module = KEY_DISP_LAPJOINTBOLTED

    try:
        connection_key = KEY_DISP_LAPJOINTBOLTED
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

    # Call CAD method directly (bypassing create2Dcad since it doesn't have a branch for LapJointBolted)
    try:
        lap_joint, plate1, plate2, bolts, nuts = cdl.createBoltedLapJoint()
        print(f"[CAD DEBUG] LapJointBolted CAD created; components -> lap_joint:{type(lap_joint)}, plate1:{type(plate1)}, plate2:{type(plate2)}, bolts:{type(bolts)}, nuts:{type(nuts)}")
    except Exception as exc:
        print(f"[CAD DEBUG] LapJointBolted CAD build failed: {exc}")
        traceback.print_exc()
        return ""

    # Helper to flatten lists of shapes
    def _flatten_shapes(items):
        flat = []
        for m in items if isinstance(items, (list, tuple)) else [items]:
            if isinstance(m, (list, tuple)):
                flat.extend([x for x in m if x])
            elif m:
                flat.append(m)
        return flat

    # Helper to fuse shapes
    def _fuse_shapes(shapes):
        shapes = [s for s in shapes if s]
        if not shapes:
            return None
        if len(shapes) == 1:
            return shapes[0]
        fused = shapes[0]
        for s in shapes[1:]:
            fused = BRepAlgoAPI_Fuse(fused, s).Shape()
        return fused

    # Helper to create compound
    def _compound_shapes(shapes):
        shapes = [s for s in shapes if s]
        if not shapes:
            return None
        builder = BRep_Builder()
        comp = TopoDS_Compound()
        builder.MakeCompound(comp)
        for s in shapes:
            builder.Add(comp, s)
        return comp

    # Route components based on section
    part_files = {}
    model = None

    try:
        if section == "Model":
            # Combine all parts for Model
            fused_main = _fuse_shapes([p for p in [lap_joint, plate1, plate2] if p])
            bolts_comp = _compound_shapes(_flatten_shapes([bolts, nuts]))
            
            if fused_main and bolts_comp:
                model = BRepAlgoAPI_Fuse(fused_main, bolts_comp).Shape()
            elif fused_main:
                model = fused_main
            elif bolts_comp:
                model = bolts_comp
            
            # Write Plate part (combined plate1 + plate2)
            if plate1 or plate2:
                plate_combined = _fuse_shapes([p for p in [plate1, plate2] if p])
                if plate_combined:
                    part_file_name = f"{session}_Plate.brep"
                    part_file_path_rel = os.path.join("file_storage", "cad_models", part_file_name)
                    BRepTools.breptools.Write(plate_combined, part_file_path_rel, Message_ProgressRange())
                    part_files["Plate"] = part_file_path_rel
                    try:
                        part_stl_rel = part_file_path_rel.replace(".brep", ".stl")
                        write_stl(plate_combined, os.path.join(os.getcwd(), part_stl_rel))
                    except Exception as stle:
                        print(f"Failed to write STL for Plate: {stle}")
            
            # Write Bolts part
            if bolts_comp:
                part_file_name = f"{session}_Bolts.brep"
                part_file_path_rel = os.path.join("file_storage", "cad_models", part_file_name)
                BRepTools.breptools.Write(bolts_comp, part_file_path_rel, Message_ProgressRange())
                part_files["Bolts"] = part_file_path_rel
                try:
                    part_stl_rel = part_file_path_rel.replace(".brep", ".stl")
                    write_stl(bolts_comp, os.path.join(os.getcwd(), part_stl_rel))
                except Exception as stle:
                    print(f"Failed to write STL for Bolts: {stle}")
        
        elif section == "Plate":
            # Return combined plates
            model = _fuse_shapes([p for p in [plate1, plate2] if p])
        
        elif section in ("Bolt", "Bolts", "Connector"):
            # Return bolts/nuts as compound
            model = _compound_shapes(_flatten_shapes([bolts, nuts]))
        
        else:
            # Default: return lap_joint
            model = lap_joint
        
    except Exception as e:
        print(f"Error processing CAD components: {e}")
        traceback.print_exc()
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
                    "parts": [{"name": name, "brepPath": part_files.get(name)} for name in part_files.keys()]
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
    module = LapJointBolted()
    module.set_input_values(input_values)
    return module
