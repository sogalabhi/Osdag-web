"""
API Adapter for Axially Loaded Column (Compression Member)
Connects Django API → osdag_core.design_type.compression_member.Column.ColumnDesign

Notes:
- Strict validation keeps only the keys the frontend actually sends.
- Removed leftover Allow.UR sanity check that caused a crash when that key was absent.
- Exported adapter under both names to avoid import errors from different callers.
"""

import logging
import os
import traceback
from typing import Dict, Any, List, Tuple

from osdag_core.design_type.compression_member.Column import ColumnDesign
from cad.common_logic import CommonDesignLogic  # best-effort usage; may be None at runtime

logger = logging.getLogger(__name__)


def get_required_keys() -> List[str]:
    """
    Keys required by the API client / UI.
    Keep this list minimal and matching the frontend payload.
    """
    return [
        "Module",
        "Member.Profile",
        "Member.Designation",
        "Material",
        "Actual.Length_zz",
        "Actual.Length_yy",
        "End_1",
        "End_2",
        "End_1_Y",
        "End_2_Y",
        "Load.Axial",
    ]


# -------------------------
# Strict validation function
# -------------------------
def validate_input(input_values: Dict[str, Any]) -> None:
    """
    Strict checks (Option A).
    Raises ValueError (or TypeError) on first failing validation.
    """

    required = get_required_keys()
    missing = [k for k in required if k not in input_values]
    if missing:
        raise ValueError(f"Missing required keys: {missing}")

    # Strings that must be single strings (but Member.Designation may be list -> handled separately)
    str_keys = [
        "Module", "Member.Profile", "Material",
        "End_1", "End_2", "End_1_Y", "End_2_Y"
    ]
    for k in str_keys:
        v = input_values.get(k)
        if not isinstance(v, str):
            raise TypeError(f"{k} must be a string. Got {type(v).__name__}")

    # Member.Designation can be a string or a list (e.g. ['All'])
    md = input_values.get("Member.Designation")
    if not (isinstance(md, str) or isinstance(md, list)):
        raise TypeError(f"Member.Designation must be a string or list. Got {type(md).__name__}")
    if isinstance(md, list):
        # ensure all items in list are strings
        for item in md:
            if not isinstance(item, str):
                raise TypeError(f"Member.Designation list items must be strings. Got {type(item).__name__}")

    # Numeric keys that should be convertible to float
    float_keys = ["Actual.Length_zz", "Actual.Length_yy", "Load.Axial"]
    for k in float_keys:
        v = input_values.get(k)
        if isinstance(v, (int, float)):
            continue
        if isinstance(v, str):
            try:
                float(v)
                continue
            except ValueError:
                raise TypeError(f"{k} must be numeric or numeric-string; cannot convert '{v}'")
        raise TypeError(f"{k} must be numeric (int/float) or numeric string; got {type(v).__name__}")

    # Required profile values - ensure Member.Profile is non-empty
    if not input_values.get("Member.Profile"):
        raise ValueError("Member.Profile cannot be empty.")



# -------------------------
# Create / map module
# -------------------------
def create_module() -> ColumnDesign:
    m = ColumnDesign()
    return m


def create_from_input(input_values: Dict[str, Any]) -> ColumnDesign:
    """
    Accepts the frontend payload and normalizes it for ColumnDesign.set_input_values.
    """
    # Validate input strictly
    validate_input(input_values)

    # Map to keys expected by ColumnDesign.set_input_values
    mapped = {
        "Module": input_values.get("Module", "Axially-Loaded-Column"),
        "Member.Profile": input_values.get("Member.Profile"),
        # pass Member.Designation as-is: allow list or string
        "Member.Designation": input_values.get("Member.Designation"),
        "Member.Material": input_values.get("Material"),
        "Actual.Length_zz": float(input_values.get("Actual.Length_zz")),
        "Actual.Length_yy": float(input_values.get("Actual.Length_yy")),
        "Unsupported.Length_zz": float(input_values["Actual.Length_zz"]),
        "Unsupported.Length_yy": float(input_values["Actual.Length_yy"]),
        "End_1": input_values.get("End_1"),
        "End_2": input_values.get("End_2"),
        "End_1_Y": input_values.get("End_1_Y"),
        "End_2_Y": input_values.get("End_2_Y"),
        "Load.Axial": float(input_values.get("Load.Axial")),
        "Load.Shear": 0.0,            #  REQUIRED by ColumnDesign.Load()
        "Load.Moment": 0.0,           #  REQUIRED
        "Load.Moment_minor": 0.0,
        "Load.shear": 0.0,
        "Load.moment": 0.0,
        "Load.moment_minor": 0.0,
    }


    module = create_module()
    module.set_input_values(mapped)
    return module


# -------------------------
# Output flattening
# -------------------------
def generate_output(input_values: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    """
    Return flattened output dict and logs list.
    """
    print("\n\n\n\n\n")
    print("error in generate output")
    print("\n\n\n\n")
    
    logs: List[str] = []
    output: Dict[str, Any] = {}

    try:
        module = create_from_input(input_values)
    except Exception as e:
        logger.exception("create_from_input failed")
        return {}, [f"Error while creating module: {e}"]

    try:
        raw_output = module.output_values(True)

        # Some modules expose extra tuples (spacing etc.); attempt to append if present
        try:
            raw_spacing = module.spacing(True)
            raw_output = list(raw_output) + list(raw_spacing)
        except Exception:
            pass

        # Flatten tuples -> { key: {key,label,val} }
        for param in raw_output:
            if not isinstance(param, (list, tuple)):
                continue
            if len(param) < 4:
                continue
            key = param[0]
            label = param[1]
            # ptype = param[2]   # not used by API flattening, but available when needed
            val = param[3]
            if key is None:
                continue
            # numpy scalar handling
            if hasattr(val, "item"):
                try:
                    val = val.item()
                except Exception:
                    pass
            output[key] = {"key": key, "label": label, "val": val}

        # try to grab logs if module exposes them
        if hasattr(module, "logger") and hasattr(module.logger, "get_logs"):
            try:
                logs = module.logger.get_logs()
            except Exception:
                logs = []
        else:
            logs = [f"Axially Loaded Column computation completed."]

        return output, logs

    except Exception as e:
        logger.exception("generate_output failed")
        return {}, [f"Error generating output: {e}\n{traceback.format_exc()}"]


# -------------------------
# CAD generation
# -------------------------
def create_cad_model(input_values: Dict[str, Any], section: str, session_id: str) -> str:
    """
    Generate CAD model for requested section. Returns path to .brep/.stl/.step file.
    Writes outputs under: <this_module_dir>/tmp_cad/<session_id>/<section>.<ext>
    This function is best-effort: it tries various writers and falls back to a small placeholder file on failure.
    """
    print("\n\n\n\n\n\n")
    
    print(section)
    print("\n\n\n\n\n\n")
    if section not in ("Model", "Beam", "Column", "EndPlate"):  # Error checking: If section is valid.
        logger.error(f"Invalid section: {section}")
        raise InvalidInputTypeError("section", "'Model', 'Beam', 'Column' or 'EndPlate'")
    
    try:
        module = create_from_input(input_values)
    except Exception as e:
        logger.exception("create_from_input failed (CAD)")
        tmp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tmp_cad")
        os.makedirs(tmp_dir, exist_ok=True)
        dummy = os.path.join(tmp_dir, f"{session_id}_{section}_invalid_input.brep")
        with open(dummy, "w", encoding="utf-8") as f:
            f.write(f"Invalid input: {e}")
        return dummy

    base_tmp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tmp_cad")
    session_folder = os.path.join(base_tmp, session_id)
    os.makedirs(session_folder, exist_ok=True)

    brep_path = os.path.join(session_folder, f"{section}.brep")
    stl_path = os.path.join(session_folder, f"{section}.stl")
    step_path = os.path.join(session_folder, f"{section}.step")

    try:
        # 1) Try to initialise module 3D structures (best-effort)
        try:
            module.call_3DModel(True, module.__class__)
        except Exception as err:
            logger.debug("call_3DModel warning: %s", err)

        # 2) Try to obtain final model via module.create2Dcad()
        final_model = None
        try:
            final_model = module.create2Dcad()
        except Exception as err:
            logger.debug("module.create2Dcad() failed: %s", err)
            final_model = None

        # 3) Heuristic: if None, try typical connectivity objects get_models()
        if final_model is None:
            for attr in ("connectivityObj", "BPObj", "CPObj", "ExtObj", "TObj"):
                obj = getattr(module, attr, None)
                if obj is None:
                    continue
                fn = getattr(obj, "get_models", None)
                if callable(fn):
                    try:
                        gm = fn()
                        if gm:
                            final_model = gm
                            break
                    except Exception:
                        continue

        # 4) As a last attempt set component and re-create
        if final_model is None:
            try:
                module.display_3DModel("Model", "gradient_bg")
                final_model = module.create2Dcad()
            except Exception:
                final_model = None

        if final_model is None:
            # produce a small placeholder file (avoid huge/invalid payloads)
            with open(brep_path, "w", encoding="utf-8") as f:
                f.write("No CAD model produced for this input (empty).")
            logger.warning("No CAD model produced; wrote placeholder to %s", brep_path)
            return brep_path

        # Normalize final_model -> occ_shape (TopoDS_Shape) where possible
        occ_shape = None
        try:
            # If it's a list/tuple, try to fuse them via pythonOCC (best-effort)
            if isinstance(final_model, (list, tuple)):
                try:
                    from OCC.Core.BRepAlgoAPI import BRepAlgoAPI_Fuse
                    merged = None
                    for obj in final_model:
                        sh = obj.Shape() if hasattr(obj, "Shape") else obj
                        if merged is None:
                            merged = sh
                        else:
                            merged = BRepAlgoAPI_Fuse(merged, sh).Shape()
                    occ_shape = merged
                except Exception:
                    # fallback: pick first element shape
                    first = final_model[0]
                    occ_shape = first.Shape() if hasattr(first, "Shape") else first
            else:
                if hasattr(final_model, "Shape"):
                    occ_shape = final_model.Shape()
                else:
                    occ_shape = final_model
        except Exception as err:
            logger.debug("Error normalizing final_model: %s", err)
            occ_shape = final_model  # keep whatever we have

        # 5) Try CommonDesignLogic helpers
        wrote = False
        try:
            cl = CommonDesignLogic()
        except Exception:
            cl = None

        if cl is not None and occ_shape is not None:
            if hasattr(cl, "write_brep"):
                try:
                    cl.write_brep(occ_shape, brep_path)
                    wrote = True
                except Exception as e:
                    logger.debug("cl.write_brep failed: %s", e)
            elif hasattr(cl, "export_shape_to_file"):
                try:
                    cl.export_shape_to_file(occ_shape, brep_path)
                    wrote = True
                except Exception as e:
                    logger.debug("cl.export_shape_to_file failed: %s", e)

        # 6) pythonOCC fallback writers
        if (not wrote) and occ_shape is not None:
            try:
                from OCC.Core.BRepTools import breptools_Write
                try:
                    breptools_Write(occ_shape, brep_path)
                    wrote = True
                except Exception as e:
                    logger.debug("breptools_Write failed: %s", e)
            except Exception:
                logger.debug("BRepTools not available")

            if (not wrote):
                try:
                    from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
                    writer = STEPControl_Writer()
                    writer.Transfer(occ_shape, STEPControl_AsIs)
                    writer.Write(step_path)
                    if os.path.exists(step_path):
                        wrote = True
                except Exception:
                    logger.debug("STEP writer unavailable or failed")

            try:
                from OCC.Core.StlAPI import StlAPI_Writer
                stl_writer = StlAPI_Writer()
                ok = stl_writer.Write(occ_shape, stl_path)
                if ok:
                    wrote = True
            except Exception:
                logger.debug("STL writer unavailable or failed")

        # 7) Final fallback placeholder if nothing wrote
        if not wrote:
            with open(brep_path, "w", encoding="utf-8") as f:
                f.write("Failed to export true CAD model. This is a small fallback placeholder.")
            logger.warning("Failed to write real CAD files; placeholder written to %s", brep_path)
            return brep_path

        # Prefer STL > STEP > BREP
        if os.path.exists(stl_path):
            return stl_path
        if os.path.exists(step_path):
            return step_path
        return brep_path

    except Exception as exc:
        logger.exception("CAD generation failed: %s", exc)
        fallback = os.path.join(session_folder, f"{session_id}_{section}_failed.brep")
        try:
            with open(fallback, "w", encoding="utf-8") as f:
                f.write(f"CAD generation exception: {exc}\n")
        except Exception:
            # last-ditch: return a path under /tmp
            fallback = os.path.join("/tmp", f"{session_id}_{section}_failed.brep")
            with open(fallback, "w", encoding="utf-8") as f:
                f.write(f"CAD generation exception: {exc}\n")
        return fallback


