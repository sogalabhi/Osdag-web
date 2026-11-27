"""
Api for FinPlateConnection module
Functions:
    validate_input(input_values: Dict[str, Any]) -> None:
        Go through all the input parameters.
        Check that the request is a valid FinPlateInput.
    create_module() -> FinPlateConnection:
        Create an instance of the FinPlateConnection module design class and set it up for use
    create_from_input(input_values: Dict[str, Any]) -> FinPlateConnection
        Create an instance of the FinPlateConnection module design class from input values.
    generate_output(input_values: Dict[str, Any]) -> Dict[str, Any]:
        Generate, format and return the input values from the given output values.
            Output format (json): {
                "Bolt.Pitch": 
                    "key": "Bolt.Pitch",
                    "label": "Pitch Distance (mm)"
                    "val": 40
                }
            }
    create_cad_model(input_values: Dict[str, Any], section: str, session: str) -> str:
        Generate the CAD model from input values as a BREP file. Return file path.
"""
from apps.core.utils import build_raw_output_dict
from apps.modules.shear_connection.submodules.fin_plate.schema import FinPlateInput
from apps.modules.shear_connection import shared as scc
from OCC.Core import BRepTools
from OCC.Core.TopoDS import TopoDS_Compound
from OCC.Core.BRep import BRep_Builder
from OCC.Core.Message import Message_ProgressRange
from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
from OCC.Core.IGESControl import IGESControl_Writer

# from OCC.Core.StlAPI import StlAPI_Writer
# from OCC.Core.TopoDS import TopoDS_Solid, TopoDS_Shell
from osdag_core.cad.common_logic import CommonDesignLogic
# Will log a lot of unnessecary data.
from osdag_core.design_type.connection.fin_plate_connection import FinPlateConnection
from osdag_core.Common import (
    KEY_CONN,
    KEY_DISP_FINPLATE,
)
from osdag_core.custom_logger import CustomLogger
import sys
import os
import typing
from typing import Dict, Any, List
import traceback
import json
from apps.core.utils import write_stl
import traceback
def validate_input(input_values: Dict[str, Any]) -> None:
    """Raise ValidationError naming every bad key. The HTTP request path runs the same model."""
    FinPlateInput.validate_request(input_values)


def create_module() -> FinPlateConnection:
    """Create an instance of the FinPlateConnection module design class and set it up for use"""
    print("\n[create_module] Creating FinPlateConnection instance...")
    try:
        module = FinPlateConnection()  # Create an instance of the FinPlateConnection
        print(f"   FinPlateConnection instance created: {id(module)}")
        
        print(f"   Setting logger with id='web'...")
        module.set_osdaglogger(None, id="web")
        print(f"   Logger set successfully")
        print(f"   Logger name: {getattr(module.logger, 'name', 'N/A') if hasattr(module, 'logger') else 'No logger'}")
        
        return module
    except Exception as e:
        print(f"    ERROR in create_module: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise


def create_from_input(input_values: Dict[str, Any]) -> FinPlateConnection:
    """Create an instance of the beam beam end plate connection module design class from input values."""

    module = None
    print("\n[create_from_input] Step 1: Creating module instance...")
    try:
        module = create_module()  # Create module instance.
    except Exception as e:
        print(f" ERROR in create_module: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise
    design_dictionary = input_values.copy()
    if KEY_CONN in design_dictionary and KEY_CONN not in design_dictionary:
        connectivity_value = design_dictionary.pop(KEY_CONN)
        design_dictionary[KEY_CONN] = connectivity_value
    else:
        if KEY_CONN in design_dictionary:
            print(f"   KEY_CONN value: '{design_dictionary[KEY_CONN]}'")
    
    print(f"   Final design_dictionary has {len(design_dictionary)} keys")
    print(f"   Key check - KEY_CONN present: {KEY_CONN in design_dictionary}")
    
    # Set the input values on the module instance.
    print(f"\n[create_from_input] Step 3: Setting input values on module...")
    print(f"   Module is None: {module is None}")
    try:
        if module is None:
            raise RuntimeError('Module instance was not created')
        module.set_input_values(design_dictionary)
        print(f"   set_input_values() completed successfully")
        
        # Verify key was set correctly
        if hasattr(module, 'connectivity'):
            print(f"   Module connectivity attribute: '{module.connectivity}'")
        else:
            print(f"     Module has no 'connectivity' attribute")
            
    except Exception as e:
        print(f"\n ERROR in set_input_values:")
        print(f"   Exception type: {type(e).__name__}")
        print(f"   Exception message: {str(e)}")
        print(f"   Design dictionary keys: {list(design_dictionary.keys())[:10]}")
        print(f"   KEY_CONN in design_dictionary: {KEY_CONN in design_dictionary}")
        if KEY_CONN in design_dictionary:
            print(f"   KEY_CONN value: '{design_dictionary[KEY_CONN]}'")
        traceback.print_exc()
        print('error in setting the input values')
        raise

    print("=" * 60)
    return module


def generate_output(input_values: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate, format and return the input values from the given output values.
    Output format (json): {
        "Bolt.Pitch": 
            "key": "Bolt.Pitch",
            "label": "Pitch Distance (mm)"
            "val": 40
        }
    }
    """
    print("\n" + "=" * 60)
    print("generate_output() called")
    print("=" * 60)
    print(f"Input values keys (first 10): {list(input_values.keys())[:10]}")
    
    output = {}  # Dictionary for formatted values
    
    print("\n[Step 1] Creating module from input...")
    try:
        module = create_from_input(input_values)  # Create module from input.
        design_status = bool(getattr(module, "design_status", False))
        print(f"Module created: {type(module).__name__}")
        print(f"Module object: {module}")
    except Exception as e:
        print(f"Failed to create module: {e}")
        raise
    
    # Initialize logs variable first
    logs = []
    
    try:
        print("\n[Step 2] Calling module.output_values(design_status)...")
        print(f"   Module type: {type(module)}")
        print(f"   Module has output_values method: {hasattr(module, 'output_values')}")
        try:
            raw_output_text = module.output_values(design_status)
            print(f"output_values() returned {len(raw_output_text)} parameters")
            if len(raw_output_text) > 0:
                print(f"   First parameter sample: {raw_output_text[0] if isinstance(raw_output_text[0], (list, tuple)) else 'N/A'}")
        except Exception as e:
            print(f" ERROR in output_values(): {type(e).__name__}: {e}")
            traceback.print_exc()
            raise

        raw_csv = build_raw_output_dict(raw_output_text, design_status)

        print("\n[Step 3] Calling module.spacing(design_status)...")
        print(f"   Module has spacing method: {hasattr(module, 'spacing')}")
        try:
            raw_output_spacing = module.spacing(design_status)
            print(f"spacing() returned {len(raw_output_spacing)} parameters")
            if len(raw_output_spacing) > 0:
                print(f"   First spacing parameter: {raw_output_spacing[0] if isinstance(raw_output_spacing[0], (list, tuple)) else 'N/A'}")
        except Exception as e:
            print(f" ERROR in spacing(): {type(e).__name__}: {e}")
            print(f"   Error details: {str(e)}")
            traceback.print_exc()
            raise
        
        print("\n[Step 4] Calling module.capacities(design_status)...")
        print(f"   Module has capacities method: {hasattr(module, 'capacities')}")
        try:
            raw_output_capacities = module.capacities(design_status)
            print(f"capacities() returned {len(raw_output_capacities)} parameters")
            if len(raw_output_capacities) > 0:
                print(f"   First capacity parameter: {raw_output_capacities[0] if isinstance(raw_output_capacities[0], (list, tuple)) else 'N/A'}")
        except Exception as e:
            print(f" ERROR in capacities(): {type(e).__name__}: {e}")
            traceback.print_exc()
            raise
        
        print("\n[Step 5] Calling module.section_capacities(design_status)...")
        print(f"   Module has section_capacities method: {hasattr(module, 'section_capacities')}")
        try:
            raw_output_section_capacities = module.section_capacities(design_status)
            print(f"section_capacities() returned {len(raw_output_section_capacities)} parameters")
            if len(raw_output_section_capacities) > 0:
                print(f"   First section_capacity parameter: {raw_output_section_capacities[0] if isinstance(raw_output_section_capacities[0], (list, tuple)) else 'N/A'}")
        except Exception as e:
            print(f" ERROR in section_capacities(): {type(e).__name__}: {e}")
            traceback.print_exc()
            raise
        
        print("\n[Step 6] Retrieving logs from logger...")
        # Get logs from the custom logger
        if hasattr(module, 'logger'):
            print(f"   Logger exists: {type(module.logger)}")
            print(f"   Logger name: {getattr(module.logger, 'name', 'N/A')}")
            if isinstance(module.logger, CustomLogger):
                try:
                    logs = module.logger.get_logs()
                    print(f"   Retrieved {len(logs) if logs else 0} logs from custom logger")
                    if logs and len(logs) > 0:
                        print(f"   First log entry: {logs[0] if isinstance(logs[0], (str, dict)) else 'N/A'}")
                except Exception as e:
                    print(f"    Error getting logs: {e}")
                    logs = []
            else:
                print(f"    Logger is not CustomLogger instance, type: {type(module.logger)}")
                logs = []
        else:
            print("    Module has no logger attribute")
            logs = []

        print("\n[Step 7] Combining all raw outputs...")
        print(f"   raw_output_text length: {len(raw_output_text)}")
        print(f"   raw_output_spacing length: {len(raw_output_spacing)}")
        print(f"   raw_output_capacities length: {len(raw_output_capacities)}")
        print(f"   raw_output_section_capacities length: {len(raw_output_section_capacities)}")
        raw_output = raw_output_text + raw_output_spacing + raw_output_capacities + raw_output_section_capacities
        print(f"Combined raw_output length: {len(raw_output)}")

        print("\n[Step 8] Processing parameters into output dict...")
        processed_count = 0
        skipped_count = 0
        
        # Process each parameter with handling for both 4 and 5 element tuples
        for i, param in enumerate(raw_output):
            if i < 5 or i % 50 == 0:  # Print first 5 and every 50th
                print(f"  Processing param {i}/{len(raw_output)}: {param[:2] if len(param) >= 2 else param}")
            
            # Handle both 4-element and 5-element tuples
            if len(param) >= 4:
                key = param[0]
                label = param[1] 
                param_type = param[2]
                value = param[3]
                
                # Check if it's a TextBox type and has a valid key
                if param_type == "TextBox" and key is not None:
                    # Handle numpy types
                    if hasattr(value, 'item'):  # numpy scalar
                        value = value.item()
                    
                    output[key] = {
                        "key": key,
                        "label": label,
                        "val": value
                    }
                    processed_count += 1
                else:
                    skipped_count += 1
                    if i < 5:  # Only print details for first few
                        print(f"     Skipped: type={param_type}, key={key}")
        
        print(f"Processed {processed_count} parameters, skipped {skipped_count}")
    except Exception as e:
        print("\n" + "=" * 60)
        print("ERROR in generate_output()")
        print("=" * 60)
        print(f"Exception type: {type(e).__name__}")
        print(f"Exception message: {str(e)}")
        print(f"Exception args: {e.args if hasattr(e, 'args') else 'N/A'}")
        
        print(f"\nModule state at error:")
        if 'module' in locals():
            print(f"   Module exists: {module is not None}")
            if module:
                print(f"   Module type: {type(module)}")
                print(f"   Module has logger: {hasattr(module, 'logger')}")
                if hasattr(module, 'connectivity'):
                    print(f"   Module connectivity: {module.connectivity}")
                if hasattr(module, 'design_status'):
                    print(f"   Module design_status: {module.design_status}")
        
        # Check if exception has error attribute
        if hasattr(e, 'error'):
            print(f"Exception has 'error' attribute: {e.error}")
            if e.error is None:
                print(" WARNING: Exception.error is None!")
        
        print(f"\nFull traceback:")
        traceback.print_exc()
        print("=" * 60)
        raise
        
        print("\nFull traceback:")
        traceback.print_exc()
        print("=" * 60)
        
        # Re-raise the exception so service layer can handle it
        raise
    
    print("\n" + "=" * 60)
    print("generate_output() completed successfully")
    print("=" * 60)
    print(f"Final output dict has {len(output)} keys")
    print(f"Output keys (first 10): {list(output.keys())[:10]}")
    print(f"Logs count: {len(logs) if logs else 0}")
    if logs:
        print(f"First log entry (original order): {logs[0] if len(logs) > 0 else 'N/A'}")
        print(f"Last log entry (original order):  {logs[-1] if len(logs) > 0 else 'N/A'}")

    print("=" * 60)
    
    try:
        logs = list(reversed(logs))
    except Exception:
        pass
    return output, logs, raw_csv


def create_cad_model(input_values: Dict[str, Any], section: str, session: str, export_formats=None, module=None) -> str:
    """Generate the CAD model from input values as a BREP file. Return file path."""
    if section not in ("Model", "Beam", "Column", "Plate", "Bolt", "Weld"):  # Error checking: If section is valid.
        raise InvalidInputTypeError(
            "section", "'Model', 'Beam', 'Column', 'Plate', 'Bolt' or 'Weld'")
    module = module if module is not None else create_from_input(input_values)  # Create module from input.
    print('module from input values : ' , module)
    print('module.module value:', repr(module.module))
    # IMPORTANT: Ensure module.module is set to KEY_DISP_FINPLATE for CAD generation
    # module.module might be overwritten by input dictionary value
    if module.module != KEY_DISP_FINPLATE:
        print(f'WARNING: module.module is {repr(module.module)}, setting to KEY_DISP_FINPLATE')
        module.module = KEY_DISP_FINPLATE
    # Object that will create the CAD model.
    # CommonDesignLogic signature: (display, cad_widget, folder, connection, mainmodule)
    # connection should be KEY_DISP_FINPLATE for proper CAD generation
    connection_key = KEY_DISP_FINPLATE
    print('Using connection key:', repr(connection_key))
    print('KEY_DISP_FINPLATE value:', repr(KEY_DISP_FINPLATE))
    try : 
        cld = CommonDesignLogic(None, None, '', connection_key, module.mainmodule)
        print('CommonDesignLogic created, cdl.connection:', cld.connection)
    except Exception as e : 
        print('error in cld e : ' , e)
        traceback.print_exc()
        raise  # Re-raise to prevent using undefined cld
    
    try : 
        # Setup the calculations object for generating CAD model.
        scc.setup_for_cad(cld, module)
    except Exception as e : 
        traceback.print_exc()
        print('Error in setting up cad e : ' , e)
        raise  # Re-raise to prevent using undefined cld
 
    # The section of the module that will be generated.
    if section == "Model":
        # Build merged compound from Beam + Column + Plate and write *_Model.brep + *_Model.stl.
        try:
            part_names = ["Beam", "Column", "Plate", "Bolt", "Weld"]
            builder = BRep_Builder()
            compound = TopoDS_Compound()
            builder.MakeCompound(compound)

            for part in part_names:
                cld.component = part
                print(f'[CAD Adapter] Generating merged Model part: cld.component = {part}')
                part_shape = cld.create2Dcad()
                if part_shape is None:
                    continue
                builder.Add(compound, part_shape)

            model = compound
        except Exception as e:
            print('Error while building merged Model compound in fin-plate:', e)
            traceback.print_exc()
            raise

        # Ensure output directory exists
        cad_models_path = os.path.join(os.getcwd(), "file_storage", "cad_models")
        if not os.path.exists(cad_models_path):
            print('path does not exists cad_models , creating one')
            os.makedirs(cad_models_path, exist_ok=True)

        file_name = f"{session}_Model.brep"
        file_path = f"file_storage/cad_models/{file_name}"
        print('brep file path in create_cad_model : ' , file_path)

        # Write merged BREP
        try:
            BRepTools.breptools.Write(model, file_path, Message_ProgressRange())
        except Exception as e:
            print('Writing to merged BREP file failed e : ' , e)
            raise

        # Write merged STL next to BREP
        try:
            merged_stl_rel = file_path.replace(".brep", ".stl")
            write_stl(model, os.path.join(os.getcwd(), merged_stl_rel))
            print(f"STL file saved at {os.path.join(os.getcwd(), merged_stl_rel)}")
        except Exception as stle:
            print(f"Warning: Failed to save merged STL for {section}: {stle}")

        try:
            from apps.core.utils.cad_export import export_step, export_iges

            export_formats_lc = {f.lower() for f in export_formats} if export_formats else set()
            if "step" in export_formats_lc:
                step_rel = file_path.replace(".brep", ".step")
                export_step(model, os.path.join(os.getcwd(), step_rel))
            if "iges" in export_formats_lc:
                iges_rel = file_path.replace(".brep", ".iges")
                export_iges(model, os.path.join(os.getcwd(), iges_rel))
        except Exception as e:
            # If export fails, keep the brep/stl exports as long as the core CAD exists.
            print(f"Warning: Optional step/iges export failed for fin-plate Model: {e}")

        return file_path

    cld.component = section
    print(f'[CAD Adapter] Setting cld.component = {section}')

    try:
        print(f'[CAD Adapter] Generating individual part: cld.component = {cld.component}')
        model = cld.create2Dcad()
        print(f'[CAD Adapter] Generated model type: {type(model)}')
    except Exception as e:
        print('Error in cld.create2Dcad() e : ' , e)
        return False

    # check if the cad_models folder exists or not 
    # if no, then create one 
    cad_models_path = os.path.join(os.getcwd(), "file_storage", "cad_models")
    if not os.path.exists(cad_models_path):
        print('path does not exists cad_models , creating one')
        os.makedirs(cad_models_path, exist_ok=True)

    print('2d model : ' , model)
    file_name = session + "_" + section + ".brep"
    file_path = "file_storage/cad_models/" + file_name
    print('brep file path in create_cad_model : ' , file_path)

    try:
        BRepTools.breptools.Write(model, file_path, Message_ProgressRange())
    except Exception as e:
        print('Writing to BREP file failed e : ' , e)

    # Export single STL next to BREP
    try:
        single_stl_rel = file_path.replace(".brep", ".stl")
        write_stl(model, os.path.join(os.getcwd(), single_stl_rel))
        print(f"STL file saved at {os.path.join(os.getcwd(), single_stl_rel)}")
    except Exception as stle:
        print(f"Warning: Failed to save STL for {section}: {stle}")

    return file_path
