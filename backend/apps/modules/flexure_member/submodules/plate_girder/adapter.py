"""
Plate Girder Adapter
Implements the business logic for the Plate Girder module: Customized design
(user provides all dimensions) and Optimized design (PSO finds optimal
dimensions from loads/constraints).
"""
from apps.core.utils import (
    validate_arr, validate_num, validate_string,
    InvalidInputTypeError,
    custom_list_validation, int_able, is_yes_or_no, validate_list_type,
    build_raw_output_dict
)
# PlateGirderWelded will be imported when needed in create_module()
from osdag_core.custom_logger import CustomLogger
from osdag_core.Common import (
    KEY_MODULE, KEY_MATERIAL, KEY_LENGTH, KEY_LOAD, KEY_SHEAR, KEY_MOMENT,
    KEY_OVERALL_DEPTH_PG_TYPE, KEY_OVERALL_DEPTH_PG,
    KEY_WEB_THICKNESS_PG, KEY_TOP_Bflange_PG, KEY_TOP_FLANGE_THICKNESS_PG,
    KEY_BOTTOM_Bflange_PG, KEY_BOTTOM_FLANGE_THICKNESS_PG,
    KEY_DESIGN_TYPE_FLEXURE, KEY_BENDING_MOMENT_SHAPE, KEY_TORSIONAL_RES,
    KEY_WARPING_RES, KEY_MAX_DEFL, KEY_ALLOW_CLASS, KEY_WEB_PHILOSOPHY,
    KEY_SUPPORT_WIDTH, KEY_IntermediateStiffener, KEY_IntermediateStiffener_spacing, KEY_IntermediateStiffener_thickness,
    KEY_LongitudnalStiffener, KEY_LongitudnalStiffener_thickness,
    KEY_IntermediateStiffener_thickness_val, KEY_LongitudnalStiffener_thickness_val,
    KEY_IS_IT_SYMMETRIC, KEY_DISP_SYM, KEY_DISP_UNSYM,
    KEY_DESIGN_LOAD, KEY_MEMBER_OPTIONS, KEY_SUPPORTING_OPTIONS,
    KEY_ShearBucklingOption, KEY_DP_DESIGN_METHOD,
    KEY_EFFECTIVE_AREA_PARA, KEY_LENGTH_OVERWRITE,
    KEY_T_constatnt, KEY_W_constatnt, KEY_Elastic_CM,
    KEY_OPTIMUM_UR_COMPRESSION, KEY_DISP_PLATE_GIRDER_WELDED
)
import sys
import os
import threading
from contextlib import contextmanager
from typing import Dict, Any, List, Tuple
import traceback
import json
from .schema import PlateGirderInput
from apps.core.web_keys import (
    WEB_DESIGN_INTERMEDIATESTIFFENER_THICKNESS_VALUES,
    WEB_DESIGN_LONGITUDNALSTIFFENER_THICKNESS_VALUES,
)

old_stdout = sys.stdout  # Backup log
sys.stdout = open(os.devnull, "w")  # redirect stdout
sys.stdout = old_stdout  # Reset log


def get_optimization_required_keys() -> List[str]:
    """
    Return required input parameters specifically for optimization.
    
    Note: For optimization, Total.Depth, Topflange.Width, Bottomflange.Width are NOT required
    as they will be optimized by PSO.
    """
    return [
        KEY_MODULE,
        KEY_MATERIAL,
        KEY_LENGTH,
        KEY_LOAD,
        KEY_SHEAR,
        KEY_MOMENT,
        KEY_OVERALL_DEPTH_PG_TYPE,  # Must be "Optimized"
        KEY_WEB_THICKNESS_PG,  # List of available thicknesses for discrete snapping
        KEY_TOP_FLANGE_THICKNESS_PG,  # List of available thicknesses
        KEY_BOTTOM_FLANGE_THICKNESS_PG,  # List of available thicknesses
        KEY_DESIGN_TYPE_FLEXURE,
        KEY_BENDING_MOMENT_SHAPE,
        KEY_TORSIONAL_RES,
        KEY_WARPING_RES,
        KEY_MAX_DEFL,
        KEY_ALLOW_CLASS,
        KEY_WEB_PHILOSOPHY,  # Used to determine is_thick_web
        KEY_SUPPORT_WIDTH,
        KEY_IntermediateStiffener,
        KEY_IntermediateStiffener_spacing,
        KEY_IntermediateStiffener_thickness,
        KEY_LongitudnalStiffener,
        KEY_LongitudnalStiffener_thickness,
        # Optional but recommended:
        # "Symmetry",  # Used to determine is_symmetric (defaults to "Symmetrical")
    ]


def validate_input(input_values: Dict[str, Any]) -> None:
    """Check the design request against the plate girder model. Raise ValidationError when invalid."""
    PlateGirderInput.validate_request(input_values)


def _derive_stiffener_lists(design_dict: Dict[str, Any], input_values: Dict[str, Any]) -> None:
    """
    Put the request's stiffener thickness lists into design_dict: the list the request customized, else the
    standard VALUES_STIFFENER_THICKNESS (which is also what the core uses for an empty customized list).
    """
    from osdag_core.design_type.plate_girder.core.plate_girder import VALUES_STIFFENER_THICKNESS

    for thickness_key, values_key, web_key in (
        (KEY_IntermediateStiffener_thickness, KEY_IntermediateStiffener_thickness_val,
         WEB_DESIGN_INTERMEDIATESTIFFENER_THICKNESS_VALUES),
        (KEY_LongitudnalStiffener_thickness, KEY_LongitudnalStiffener_thickness_val,
         WEB_DESIGN_LONGITUDNALSTIFFENER_THICKNESS_VALUES),
    ):
        custom = _customized_stiffener_list(design_dict.get(thickness_key), input_values.get(web_key))
        design_dict[values_key] = custom or list(VALUES_STIFFENER_THICKNESS)


# The core's set_input_values() takes the customized stiffener thickness lists from the class attributes
# PlateGirderWelded.int_thicklist / long_thicklist, not from the design dictionary (they are what its desktop
# popups write). Class attributes are shared by every request of the process, so a list is put there only
# for the one set_input_values() call of a request, under a lock, and cleared again afterwards: a later
# 'Customized' request without a list then gets the core's fallback (the standard list), never the list of
# an earlier request.
_STIFFENER_LISTS_LOCK = threading.RLock()


def _customized_stiffener_list(mode: Any, custom_values: Any) -> List[str]:
    """The customized thickness list of one request: its own list, or [] (the core then uses the standard list)."""
    if mode != 'Customized' or not isinstance(custom_values, list):
        return []
    return [str(v) for v in custom_values]


@contextmanager
def _stiffener_lists_applied(int_list: List[str], long_list: List[str]):
    """Hold the core's class-level customized lists for one request, and leave them empty afterwards."""
    from osdag_core.design_type.plate_girder.core.plate_girder import PlateGirderWelded

    with _STIFFENER_LISTS_LOCK:
        PlateGirderWelded.int_thicklist = list(int_list)
        PlateGirderWelded.long_thicklist = list(long_list)
        try:
            yield
        finally:
            PlateGirderWelded.int_thicklist = []
            PlateGirderWelded.long_thicklist = []


def set_input_values_for_request(module, design_dict: Dict[str, Any]) -> None:
    """
    module.set_input_values(design_dict) with the request's own customized stiffener lists.

    design_dict[KEY_..._thickness_val] holds the lists create_from_input() and create_optimization_input()
    derived from the request (the standard list unless the request customized them).
    """
    with _stiffener_lists_applied(
        _customized_stiffener_list(design_dict.get(KEY_IntermediateStiffener_thickness), design_dict.get(KEY_IntermediateStiffener_thickness_val)),
        _customized_stiffener_list(design_dict.get(KEY_LongitudnalStiffener_thickness), design_dict.get(KEY_LongitudnalStiffener_thickness_val)),
    ):
        module.set_input_values(design_dict)


def create_module():
    """Create an instance of the PlateGirderWelded module design class and set it up for use"""
    from osdag_core.design_type.plate_girder.core.plate_girder import PlateGirderWelded
    module = PlateGirderWelded()
    module.set_osdaglogger(None, id="web")
    return module


def create_from_input(input_values: Dict[str, Any]):
    """Create an instance of the PlateGirderWelded module design class from input values."""
    module = None
    try:
        module = create_module()
    except Exception as e:
        print('Error in create_module:', e)
        raise
    
    # For Customized design: osdag_core calls float() on thickness keys → must be a scalar string.
    # For Optimized design: osdag_core expects a list → PSO picks from list of available thicknesses.
    design_type = input_values.get(KEY_OVERALL_DEPTH_PG_TYPE, 'Customized')

    def _thickness_val(key, default='6'):
        val = input_values.get(key, [default])
        if design_type == 'Customized':
            # Return first element as string (osdag_core does float(val))
            return str(val[0]) if isinstance(val, list) and val else str(val)
        else:
            # Return full list for PSO optimization
            return val if isinstance(val, list) else [str(val)]

    design_dict = {
        KEY_MODULE: input_values.get(KEY_MODULE, KEY_DISP_PLATE_GIRDER_WELDED),
        KEY_MATERIAL: input_values.get(KEY_MATERIAL, 'E 250 (Fe 410 W)A'),
        KEY_LENGTH: input_values.get(KEY_LENGTH, '5000'),
        KEY_LOAD: input_values.get(KEY_LOAD, ''),
        KEY_SHEAR: input_values.get(KEY_SHEAR, '0'),
        KEY_MOMENT: input_values.get(KEY_MOMENT, '0'),
        KEY_OVERALL_DEPTH_PG_TYPE: design_type,
        KEY_WEB_THICKNESS_PG: _thickness_val(KEY_WEB_THICKNESS_PG),
        KEY_TOP_FLANGE_THICKNESS_PG: _thickness_val(KEY_TOP_FLANGE_THICKNESS_PG),
        KEY_BOTTOM_FLANGE_THICKNESS_PG: _thickness_val(KEY_BOTTOM_FLANGE_THICKNESS_PG),
        KEY_DESIGN_TYPE_FLEXURE: input_values.get(KEY_DESIGN_TYPE_FLEXURE, 'Major Laterally Supported'),
        KEY_BENDING_MOMENT_SHAPE: input_values.get(KEY_BENDING_MOMENT_SHAPE, ''),
        KEY_TORSIONAL_RES: input_values.get(KEY_TORSIONAL_RES, 'No'),
        KEY_WARPING_RES: input_values.get(KEY_WARPING_RES, 'Warping not restrained in both flanges'),
        KEY_MAX_DEFL: input_values.get(KEY_MAX_DEFL, 'L/250'),
        KEY_ALLOW_CLASS: input_values.get(KEY_ALLOW_CLASS, 'Plastic'),
        KEY_WEB_PHILOSOPHY: input_values.get(KEY_WEB_PHILOSOPHY, 'Thick Web'),
        KEY_SUPPORT_WIDTH: input_values.get(KEY_SUPPORT_WIDTH, '100'),
        KEY_IntermediateStiffener: input_values.get(KEY_IntermediateStiffener, 'No'),
        KEY_IntermediateStiffener_spacing: input_values.get(KEY_IntermediateStiffener_spacing, ''),
        KEY_IntermediateStiffener_thickness: input_values.get(KEY_IntermediateStiffener_thickness, 'Standard'),
        KEY_LongitudnalStiffener: input_values.get(KEY_LongitudnalStiffener, 'No'),
        KEY_LongitudnalStiffener_thickness: input_values.get(KEY_LongitudnalStiffener_thickness, 'Standard'),
        # Additional design parameters
        KEY_DESIGN_LOAD: input_values.get(KEY_DESIGN_LOAD, 'Live load'),
        KEY_MEMBER_OPTIONS: input_values.get(KEY_MEMBER_OPTIONS, 'Simple Span'),
        KEY_SUPPORTING_OPTIONS: input_values.get(KEY_SUPPORTING_OPTIONS, 'NA'),
        KEY_ShearBucklingOption: input_values.get(KEY_ShearBucklingOption, 'Simple Post Critical'),
        KEY_DP_DESIGN_METHOD: input_values.get(KEY_DP_DESIGN_METHOD, 'Limit State Design'),
        KEY_EFFECTIVE_AREA_PARA: input_values.get(KEY_EFFECTIVE_AREA_PARA, '1.0'),
        KEY_LENGTH_OVERWRITE: input_values.get(KEY_LENGTH_OVERWRITE, 'NA'),
    }
    
    # Handle symmetry (for both Customized and Optimized design types)
    symmetry = input_values.get('Symmetry', 'Symmetrical')
    if symmetry == 'Symmetrical':
        design_dict[KEY_IS_IT_SYMMETRIC] = KEY_DISP_SYM  # 'Symmetric Girder'
    else:
        design_dict[KEY_IS_IT_SYMMETRIC] = KEY_DISP_UNSYM  # 'Unsymmetric Girder'
    
    # Add design type specific keys
    design_type = design_dict[KEY_OVERALL_DEPTH_PG_TYPE]
    if design_type == 'Customized':
        design_dict[KEY_OVERALL_DEPTH_PG] = input_values.get(KEY_OVERALL_DEPTH_PG, '500')
        design_dict[KEY_TOP_Bflange_PG] = input_values.get(KEY_TOP_Bflange_PG, '200')
        design_dict[KEY_BOTTOM_Bflange_PG] = input_values.get(KEY_BOTTOM_Bflange_PG, '200')
    elif design_type == 'Optimized':
        # For optimized, these are not required in set_input_values
        # but we'll set defaults to avoid errors
        design_dict[KEY_OVERALL_DEPTH_PG] = '1'
        design_dict[KEY_TOP_Bflange_PG] = '1'
        design_dict[KEY_BOTTOM_Bflange_PG] = '1'
    
    _derive_stiffener_lists(design_dict, input_values)

    try:
        if module is None:
            raise RuntimeError('Module instance was not created')
        set_input_values_for_request(module, design_dict)
    except Exception as e:
        traceback.print_exc()
        print('Error in set_input_values:', e)
        raise

    return module


def generate_output(input_values: Dict[str, Any]):
    """
    Generate, format and return the output values from the given input values.
    """
    output = {}
    module = create_from_input(input_values)
    design_status = bool(getattr(module, "design_status", False))
    logs = []
    raw_csv = {}

    try:
        # Generate output values
        raw_output_text = module.output_values(design_status)

        # Get logs from the custom logger
        if hasattr(module, 'logger') and isinstance(module.logger, CustomLogger):
            logs = module.logger.get_logs()

        raw_output = raw_output_text
        raw_csv = build_raw_output_dict(raw_output, design_status)

        # Get design preferences for conditional outputs
        web_philosophy = input_values.get(KEY_WEB_PHILOSOPHY, 'Thick Web without ITS')
        support_type = input_values.get(KEY_DESIGN_TYPE_FLEXURE, 'Major Laterally Supported')
        is_thick_web = 'Thick Web' in web_philosophy
        is_laterally_supported = 'Laterally Supported' in support_type
        
        # Process each parameter
        for i, param in enumerate(raw_output):
            if len(param) >= 4:
                key = param[0]
                label = param[1]
                param_type = param[2]
                value = param[3]
                
                # Check if it's a TextBox type and has a valid key
                if param_type == "TextBox" and key is not None:
                    # Handle numpy types
                    if hasattr(value, 'item'):
                        value = value.item()
                    
                    # Handle None/empty values
                    if value is None or value == '':
                        # Set appropriate defaults based on field type
                        if 'Stiffener' in key and is_thick_web:
                            value = 'N/A'
                        elif key in [KEY_T_constatnt, KEY_W_constatnt, KEY_Elastic_CM] and is_laterally_supported:
                            value = 'N/A'
                        elif 'LongitudnalStiffener' in key and (is_thick_web or not hasattr(module, 'longstiffener_no') or getattr(module, 'longstiffener_no', 0) == 0):
                            if 'Position' in key:
                                value = 'N/A'
                            elif 'Numbers' in key:
                                value = 0
                            else:
                                value = 'N/A'
                        else:
                            value = 'N/A'
                    
                    # Convert numeric None to 0 or N/A
                    if isinstance(value, (int, float)) and (value == 0 or value is None):
                        # For counts/numbers, 0 is valid; for dimensions/strengths, use N/A
                        if 'Numbers' in key or 'UR' in key:
                            value = 0 if value is None else value
                        elif value == 0 and key not in [KEY_OPTIMUM_UR_COMPRESSION]:
                            value = 'N/A'
                    
                    output[key] = {
                        "key": key,
                        "label": label,
                        "val": value
                    }
    except Exception as e:
        print(f'Error in generate_output: {e}')
        traceback.print_exc()
        # Re-raise exception so service layer can handle it properly
        raise

    return output, logs, raw_csv


def get_optimization_bounds(input_values: Dict[str, Any]) -> Dict[str, tuple]:
    """
    Extract optimization bounds from input_values.
    
    Args:
        input_values: Dictionary with keys like "Total.Depth_lb", "Total.Depth_ub", etc.
        
    Returns:
        Dictionary mapping variable names to (lb, ub, inc) tuples
        Example: {'D': (200, 2000, 25), 'bf_top': (100, 1000, 10)}
    """
    bounds = {}
    
    # Map frontend keys to backend variable names
    variable_mapping = {
        KEY_OVERALL_DEPTH_PG: 'D',
        KEY_TOP_Bflange_PG: 'bf_top',
        KEY_BOTTOM_Bflange_PG: 'bf_bot',
    }
    
    for frontend_key, backend_var in variable_mapping.items():
        lb_key = f"{frontend_key}_lb"
        ub_key = f"{frontend_key}_ub"
        inc_key = f"{frontend_key}_inc"
        
        lb = input_values.get(lb_key)
        ub = input_values.get(ub_key)
        inc = input_values.get(inc_key, '0')
        
        if lb and ub:
            try:
                lb_val = float(lb)
                ub_val = float(ub)
                inc_val = float(inc) if inc else 0
                
                # Validate bounds
                if lb_val >= ub_val:
                    raise ValueError(f"Lower bound ({lb_val}) must be less than upper bound ({ub_val}) for {frontend_key}")
                
                bounds[backend_var] = (lb_val, ub_val, inc_val)
            except (ValueError, TypeError) as e:
                print(f"Warning: Invalid bounds for {frontend_key}: {e}")
                continue
    
    # Handle symmetric case: if symmetric, use bf for both top and bot
    if 'bf_top' in bounds and 'bf_bot' not in bounds:
        bounds['bf'] = bounds['bf_top']
    elif 'bf_bot' in bounds and 'bf_top' not in bounds:
        bounds['bf'] = bounds['bf_bot']
    
    return bounds


def create_optimization_input(input_values: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build the design dictionary for PlateGirderWelded.optimized_method(): forces
    Total.Design_Type to "Optimized" and ensures thickness lists are present for
    discrete variable snapping. Total.Depth/Topflange.Width/Bottomflange.Width
    are not required since PSO determines them.

    Args:
        input_values: Dictionary from WebSocket/Celery task with optimization inputs

    Returns:
        Design dictionary ready for PlateGirderWelded.optimized_method()
    """
    optimization_input = input_values.copy()
    optimization_input[KEY_OVERALL_DEPTH_PG_TYPE] = "Optimized"
    
    # Use the same create_from_input logic but ensure Optimized flag is set
    # The design dictionary format is the same as normal design
    design_dict = {
        KEY_MODULE: optimization_input.get(KEY_MODULE, KEY_DISP_PLATE_GIRDER_WELDED),
        KEY_MATERIAL: optimization_input.get(KEY_MATERIAL, 'E 250 (Fe 410 W)A'),
        KEY_LENGTH: optimization_input.get(KEY_LENGTH, '5000'),
        KEY_LOAD: optimization_input.get(KEY_LOAD, 'Normal'),
        KEY_SHEAR: optimization_input.get(KEY_SHEAR, '0'),
        KEY_MOMENT: optimization_input.get(KEY_MOMENT, '0'),
        KEY_OVERALL_DEPTH_PG_TYPE: 'Optimized',  # Force Optimized
        KEY_WEB_THICKNESS_PG: optimization_input.get(KEY_WEB_THICKNESS_PG, ['6', '8', '10', '12', '16', '20', '25', '32', '40']),
        KEY_TOP_FLANGE_THICKNESS_PG: optimization_input.get(KEY_TOP_FLANGE_THICKNESS_PG, ['6', '8', '10', '12', '16', '20', '25', '32', '40']),
        KEY_BOTTOM_FLANGE_THICKNESS_PG: optimization_input.get(KEY_BOTTOM_FLANGE_THICKNESS_PG, ['6', '8', '10', '12', '16', '20', '25', '32', '40']),
        KEY_DESIGN_TYPE_FLEXURE: optimization_input.get(KEY_DESIGN_TYPE_FLEXURE, 'Major Laterally Supported'),
        KEY_BENDING_MOMENT_SHAPE: optimization_input.get(KEY_BENDING_MOMENT_SHAPE, 'Uniform Loading with pinned-pinned support'),
        KEY_TORSIONAL_RES: optimization_input.get(KEY_TORSIONAL_RES, 'Fully Restrained'),
        KEY_WARPING_RES: optimization_input.get(KEY_WARPING_RES, 'Both flanges fully restrained'),
        KEY_MAX_DEFL: optimization_input.get(KEY_MAX_DEFL, 'L/250'),
        KEY_ALLOW_CLASS: optimization_input.get(KEY_ALLOW_CLASS, 'Plastic'),
        KEY_WEB_PHILOSOPHY: optimization_input.get(KEY_WEB_PHILOSOPHY, 'Thick Web without ITS'),
        KEY_SUPPORT_WIDTH: optimization_input.get(KEY_SUPPORT_WIDTH, '100'),
        KEY_IntermediateStiffener: optimization_input.get(KEY_IntermediateStiffener, 'No'),
        KEY_IntermediateStiffener_spacing: optimization_input.get(KEY_IntermediateStiffener_spacing, 'NA'),
        KEY_IntermediateStiffener_thickness: optimization_input.get(KEY_IntermediateStiffener_thickness, 'Standard'),
        KEY_LongitudnalStiffener: optimization_input.get(KEY_LongitudnalStiffener, 'No'),
        KEY_LongitudnalStiffener_thickness: optimization_input.get(KEY_LongitudnalStiffener_thickness, 'Standard'),
        # Additional design parameters (matching create_from_input)
        KEY_DESIGN_LOAD: optimization_input.get(KEY_DESIGN_LOAD, 'Live load'),
        KEY_MEMBER_OPTIONS: optimization_input.get(KEY_MEMBER_OPTIONS, 'Simple Span'),
        KEY_SUPPORTING_OPTIONS: optimization_input.get(KEY_SUPPORTING_OPTIONS, 'NA'),
        KEY_ShearBucklingOption: optimization_input.get(KEY_ShearBucklingOption, 'Simple Post Critical'),
        KEY_DP_DESIGN_METHOD: optimization_input.get(KEY_DP_DESIGN_METHOD, 'Limit State Design'),
        KEY_EFFECTIVE_AREA_PARA: optimization_input.get(KEY_EFFECTIVE_AREA_PARA, '1.0'),
        KEY_LENGTH_OVERWRITE: optimization_input.get(KEY_LENGTH_OVERWRITE, 'NA'),
    }
    
    # Handle symmetry (for optimization)
    symmetry = optimization_input.get('Symmetry', 'Symmetrical')
    if symmetry == 'Symmetrical':
        design_dict[KEY_IS_IT_SYMMETRIC] = KEY_DISP_SYM  # 'Symmetric Girder'
    else:
        design_dict[KEY_IS_IT_SYMMETRIC] = KEY_DISP_UNSYM  # 'Unsymmetric Girder'
    
    # For Optimized design type, set dummy values (will be optimized by PSO)
    design_dict[KEY_OVERALL_DEPTH_PG] = '1'
    design_dict[KEY_TOP_Bflange_PG] = '1'
    design_dict[KEY_BOTTOM_Bflange_PG] = '1'
    
    # Import VALUES_STIFFENER_THICKNESS from plate_girder module (standard list)
    try:
        from osdag_core.design_type.plate_girder.core.plate_girder import VALUES_STIFFENER_THICKNESS
    except (ImportError, ModuleNotFoundError):
        # Fallback: Standard stiffener thickness values if import fails
        VALUES_STIFFENER_THICKNESS = ['6', '8', '10', '12', '14', '16', '18', '20', 
                                      '22', '24', '26', '28', '30', '32', '36', '40']
     
    # Same customized-list handling as create_from_input(), sourced from optimization_input.
    _derive_stiffener_lists(design_dict, optimization_input)

    return design_dict


def apply_optimization_bounds(module, input_values: Dict[str, Any]) -> None:
    """
    Apply custom optimization bounds to module.bounds_map.
    
    Args:
        module: PlateGirderWelded instance
        input_values: Dictionary with bounds keys (e.g., "Total.Depth_lb", "Total.Depth_ub")
    """
    bounds = get_optimization_bounds(input_values)
    
    for var, (lb, ub, inc) in bounds.items():
        if inc > 0:
            module.bounds_map[var] = (lb, ub, inc)
        else:
            module.bounds_map[var] = (lb, ub)
    
    # Log applied bounds
    if bounds:
        print(f"📏 Applied custom optimization bounds:")
        for var, (lb, ub, inc) in bounds.items():
            step_str = f", step={inc}" if inc > 0 else ""
            print(f"  {var}: [{lb}, {ub}]{step_str}")


def determine_optimization_flags(input_values: Dict[str, Any]) -> Tuple[bool, bool]:
    """
    Determine is_thick_web and is_symmetric flags for optimization.
    
    This function extracts the flags needed by PlateGirderWelded.optimized_method()
    from the input dictionary.
    
    Args:
        input_values: Input dictionary with design parameters (can be either frontend format
                     or design_dictionary format)
        
    Returns:
        Tuple of (is_thick_web, is_symmetric) booleans
        
    is_thick_web:
        - True if KEY_WEB_PHILOSOPHY == "Thick Web without ITS"
        - False if KEY_WEB_PHILOSOPHY == "Thin Web with ITS"
        
    is_symmetric:
        - True if "Symmetry" == "Symmetrical" OR "Girder.Symmetry" == "Symmetric Girder"
        - False if "Symmetry" == "Unsymmetrical" OR "Girder.Symmetry" == "Unsymmetric Girder"
        - Defaults to True (symmetric) if not specified
    """
    # Check web philosophy (can be in either format)
    web_philosophy = input_values.get(KEY_WEB_PHILOSOPHY) or input_values.get(KEY_WEB_PHILOSOPHY, 'Thick Web without ITS')
    is_thick_web = (web_philosophy == 'Thick Web without ITS')
    
    # Check symmetry (can be in either format)
    symmetry = input_values.get('Symmetry', 'Symmetrical')
    symmetry_key = input_values.get(KEY_IS_IT_SYMMETRIC)
    
    if symmetry_key:
        # Design dictionary format: 'Symmetric Girder' or 'Unsymmetric Girder'
        is_symmetric = (symmetry_key == KEY_DISP_SYM)
    else:
        # Frontend format: 'Symmetrical' or 'Unsymmetrical'
        is_symmetric = (symmetry == 'Symmetrical')
    
    return is_thick_web, is_symmetric


def build_plate_girder_cad(module, section: str, session: str) -> str:
    """
    Build a 3D CAD model of the (designed) plate girder from a module instance
    whose section dimensions are already populated, write BREP + STL to
    file_storage/cad_models, and return the relative BREP path.

    `section` selects which component to export, matching the desktop parts:
      "Model" (full girder), "Web", "Top Flange", "Bottom Flange", "Stiffeners".

    Works for both Customized (dims set via set_input_values) and Optimized
    (dims set after optimized_method) modules.
    """
    from osdag_core.cad.FlexuralMember.plate_girder import create_plate_girder
    from OCC.Core.BRepTools import breptools_Write
    from apps.core.utils import write_stl

    def _num(value, fallback):
        try:
            n = float(value)
            return n if n > 0 else fallback
        except (TypeError, ValueError):
            return fallback

    D = _num(getattr(module, "total_depth", None), 0)
    tw = _num(getattr(module, "web_thickness", None), 0)
    length = _num(getattr(module, "length", None), 0)
    T_ft = _num(getattr(module, "top_flange_thickness", None), 0)
    T_fb = _num(getattr(module, "bottom_flange_thickness", None), T_ft)
    B_ft = _num(getattr(module, "top_flange_width", None), 0)
    B_fb = _num(getattr(module, "bottom_flange_width", None), B_ft)

    # A non-designed (Optimized-but-not-run) module leaves depth/width at 1 -> skip.
    if D <= 2 or tw <= 0 or B_ft <= 2 or length <= 0:
        raise RuntimeError(
            f"Plate girder section not designed (D={D}, tw={tw}, B_ft={B_ft}, length={length})"
        )

    include_intermediate = str(getattr(module, "intermediate_stiffener", "Yes")).strip().lower() in ("yes", "y", "true")
    T_is = _num(getattr(module, "intermediate_stiffener_thickness_provided", None), 15)
    stiffener_spacing = _num(getattr(module, "stiffener_spacing", None), max(500.0, min(length / 4.0, 1500.0)))

    result = create_plate_girder(
        D=D,
        tw=tw,
        length=length,
        T_ft=T_ft,
        T_fb=T_fb,
        B_ft=B_ft,
        B_fb=B_fb,
        stiffener_spacing=stiffener_spacing,
        T_is=T_is,
        include_intermediate_stiffeners=include_intermediate,
    )
    if not isinstance(result, dict):
        result = {"model": result}

    # Map the requested display section to a component shape from create_plate_girder.
    section_key = str(section).strip().lower()
    component_map = {
        "model": "model",
        "web": "web_plate",
        "top flange": "top_flange",
        "bottom flange": "bottom_flange",
        "stiffeners": "stiffener_plates",
        "stiffener": "stiffener_plates",
        "girder": "model",
    }
    comp = component_map.get(section_key, "model")
    model = result.get(comp) or result.get("model")
    if model is None:
        raise RuntimeError(f"create_plate_girder returned no shape for section '{section}'")

    cad_models_path = os.path.join(os.getcwd(), "file_storage", "cad_models")
    os.makedirs(cad_models_path, exist_ok=True)

    file_name = f"{session}_{section}.brep"
    file_path = os.path.join("file_storage", "cad_models", file_name)
    full_path = os.path.join(os.getcwd(), file_path)

    breptools_Write(model, full_path)

    try:
        write_stl(model, full_path.replace(".brep", ".stl"))
    except Exception as stle:  # STL is best-effort
        print("STL write warning:", stle)

    return file_path


def create_cad_model(input_values: Dict[str, Any], section: str, session: str, module=None) -> str:
    """Generate a plate girder CAD part as a BREP file. Returns the relative path."""
    valid = ("Model", "Web", "Top Flange", "Bottom Flange", "Stiffeners", "Girder")
    if section not in valid:
        raise InvalidInputTypeError("section", f"one of {valid}")

    try:
        module = module if module is not None else create_from_input(input_values)
    except Exception:
        traceback.print_exc()
        return ""

    try:
        return build_plate_girder_cad(module, section, session)
    except Exception:
        traceback.print_exc()
        return ""

