from osdag_api.validation_utils import validate_arr, validate_num, validate_string
from osdag_api.errors import MissingKeyError, InvalidInputTypeError
from osdag_api.utils import contains_keys, custom_list_validation, float_able, int_able, is_yes_or_no, validate_list_type
import osdag_api.modules.shear_connection_common as scc
from OCC.Core import BRepTools
from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
from OCC.Core.IGESControl import IGESControl_Writer
from OCC.Core.Message import Message_ProgressRange
from cad.common_logic import CommonDesignLogic
# Will log a lot of unnessecary data.
from design_type.connection.seated_angle_connection import SeatedAngleConnection
import sys
import os
from typing import Dict, Any, List
import traceback
from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
from OCC.Core.StlAPI import StlAPI_Writer
try:
    from OCC.Core.RWGltf import RWGltf_CafWriter
    HAS_GLB = True
except Exception:
    HAS_GLB = False

old_stdout = sys.stdout  # Backup log
sys.stdout = open(os.devnull, "w")  # redirect stdout
sys.stdout = old_stdout  # Reset log

def get_required_keys_seated_angle() -> List[str]:
    return [
        "Bolt.Bolt_Hole_Type",
        "Bolt.Diameter",
        "Bolt.Grade",
        "Bolt.Slip_Factor",
        "Bolt.TensionType",
        "Bolt.Type",
        "Connectivity",
        "Connector.Material",
        "Design.Design_Method",
        "Detailing.Corrosive_Influences",
        "Detailing.Edge_type",
        "Detailing.Gap",
        "Load.Shear",
        "Material",
        "Member.Supported_Section.Designation",
        "Member.Supported_Section.Material",
        "Member.Supporting_Section.Designation",
        "Member.Supporting_Section.Material",
        "Module",
        "Weld.Fab",
        "Weld.Material_Grade_OverWrite",
        "Connector.Angle_List",
        "Connector.Top_Angle"
    ]

def validate_input(input_values: Dict[str,Any])-> None:
    #check iif all required keys exist 
    required_keys = get_required_keys_seated_angle()
    # check if input_values contains all required keys
    missing_keys = contains_keys(input_values, required_keys)
    if missing_keys != None: #if keys are missing.
        #Raise error for the first missinf key.
        raise MissingKeyError(missing_keys[0])
    
    #check if Seated.Angle_Type is a string.
    if not isinstance(input_values["Bolt.Bolt_Hole_Type"],str):
        #if not raise an error
        raise InvalidInputTypeError("Bolt.Bolt_Hole_Type")
    
    #validate Bolt Diameter
    bolt_diameter =input_values["Bolt.Diameter"]
    if (not isinstance(bolt_diameter,list)
        or not validate_list_type(bolt_diameter,str)
        or not custom_list_validation(bolt_diameter)):
        raise InvalidInputTypeError(
            "Bolt.Diameter","non empty List[str] where all items can be converted to int"
        )
        
    # validate seated grade
    bolt_grade = input_values["Bolt.Grade"]
    if(not isinstance(bolt_grade,list)
        or not validate_list_type(bolt_grade,str)
        or not custom_list_validation(bolt_grade,float_able)):
        
        #if any condition fail raise an error
        raise InvalidInputTypeError(
            "Bolt.Grade", "non empty List[str] where all items can be converted to float"
        )
    
    #Validate seated.Slip_Factor
    bolt_slipfactor = input_values["Bolt.Slip_Factor"]
    if (not isinstance(bolt_slipfactor,str)
        or not float_able(bolt_slipfactor)):
        raise InvalidInputTypeError(
            "Bolt.Slip_Factor", "str where str can be converted to float"
        )
        
    #Validate seated.TensionType
    if not isinstance(input_values["Bolt.TensionType"], str):
        # If not, raise error.
        raise InvalidInputTypeError("Bolt.TensionType", "str")
    
    #Validate seated.Type
    if not isinstance(input_values["Bolt.Type"], str):
        raise InvalidInputTypeError("Bolt.Type", "str")  # If not, raise error.

    # validate connectivity
    if not isinstance(input_values["Connectivity"], str):
        # If not, raise error.
        raise InvalidInputTypeError("Connectivity", "str")

    #Validate Connector Material
    if not isinstance(input_values["Connector.Material"], str):
        # If not, raise error.
        raise InvalidInputTypeError("Connector.Material", "str")

    # Validate Design.Design_Method
    # Check if Design.Design_Method is a string.
    if not isinstance(input_values["Design.Design_Method"], str):
        # If not, raise error.
        raise InvalidInputTypeError("Design.Design_Method", "str")

    # Validate Detailing.Corrosive_Influences
    # Check if Detailing.Corrosive_Influences is 'Yes' or 'No'.
    if not is_yes_or_no(input_values["Detailing.Corrosive_Influences"]):
        # If not, raise error.
        raise InvalidInputTypeError(
            "Detailing.Corrosive_Influences", "'Yes' or 'No'")

    # Validate Detailing.Edge_type
    # Check if Detailing.Edge_type is a string.
    if not isinstance(input_values["Detailing.Edge_type"], str):
        # If not, raise error.
        raise InvalidInputTypeError("Detailing.Edge_type", "str")

    # Validate Detailing.Gap
    detailing_gap = input_values["Detailing.Gap"]
    if (not isinstance(detailing_gap, str)  # Check if Detailing.Gap is a string.
            or not int_able(detailing_gap)):  # Check if Detailing.Gap can be converted to int.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            "Detailing.Gap", "str where str can be converted to int")

    
    # Validate Load.Shear
    load_shear = input_values["Load.Shear"]
    if (not isinstance(load_shear, str)  # Check if Load.Shear is a string.
            or not int_able(load_shear)):  # Check if Load.Shear can be converted to int.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            "Load.Shear", "str where str can be converted to int")

    # Validate Material
    # Check if Material is a string.
    if not isinstance(input_values["Material"], str):
        raise InvalidInputTypeError("Material", "str")  # If not, raise error.

    # Validate Member.Supported_Section.Designation
    # Check if Member.Supported_Section.Designation is a string.
    if not isinstance(input_values["Member.Supported_Section.Designation"], str):
        # If not, raise error.
        raise InvalidInputTypeError(
            "Member.Supported_Section.Designation", "str")

    # Validate Member.Supported_Section.Material
    # Check if Member.Supported_Section.Material is a string.
    if not isinstance(input_values["Member.Supported_Section.Material"], str):
        # If not, raise error.
        raise InvalidInputTypeError("Member.Supported_Section.Material", "str")

    # Validate Member.Supporting_Section.Designation
    # Check if Member.Supporting_Section.Designation is a string.
    if not isinstance(input_values["Member.Supporting_Section.Designation"], str):
        # If not, raise error.
        raise InvalidInputTypeError(
            "Member.Supporting_Section.Designation", "str")

    # Validate Member.Supporting_Section.Material
    # Check if Member.Supporting_Section.Material is a string.
    if not isinstance(input_values["Member.Supporting_Section.Material"], str):
        # If not, raise error.
        raise InvalidInputTypeError(
            "Member.Supporting_Section.Material", "str")

    # Validate Module
    # Check if Module is a string.
    if not isinstance(input_values["Module"], str):
        raise InvalidInputTypeError("Module", "str")  # If not, raise error.

    # Validate Weld.Fab
    # Check if Weld.Fab is a string.
    if not isinstance(input_values["Weld.Fab"], str):
        raise InvalidInputTypeError("Weld.Fab", "str")  # If not, raise error.

    # Validate Weld.Material_Grade_OverWrite
    weld_materialgradeoverwrite = input_values["Weld.Material_Grade_OverWrite"]
    if (not isinstance(weld_materialgradeoverwrite, str)  # Check if Weld.Material_Grade_OverwWite is a string.
            or not int_able(weld_materialgradeoverwrite)):  # Check if Weld.Material_Grade_OverWrite can be converted to int.
        # If any of these conditions fail, raise error.
        raise InvalidInputTypeError(
            "Weld.Material_Grade_OverWrite", "str where str can be converted to int.")

def validate_input_new(input_values: Dict[str, Any]) -> None:
    """Validate type for all values in design dict. Raise error when invalid"""

    # Check if all required keys exist
    required_keys = get_required_keys_seated_angle()
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
    str_keys = ["Bolt.Bolt_Hole_Type",  # List of all parameters that are strings
                "Bolt.TensionType",
                "Bolt.Type",
                "Bolt.Connectivity",
                "Bolt.Connector_Material",
                "Design.Design_Method",
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
    num_keys = [("Bolt.Slip_Factor", True),  # List of all parameters that are numbers (key, is_float)
                ("Detailing.Gap", False),
                ("Load.Shear", False),
                ("Weld.Material_Grade_OverWrite", False)]
    for key in num_keys:  # Loop through all keys.
        # Check if key is a number. If not, raise error.
        print('validating num keys')
        validate_num(key[0], key[1])

    # Validate for keys that are arrays
    arr_keys = [("Bolt.Diameter", False),  # List of all parameters that can be converted to numbers (key, is_float)
                ("Bolt.Grade", True),]
    for key in arr_keys:
        print('validating arr key')
        # Check if key is a list where all items can be converted to numbers. If not, raise error.
        validate_arr(key[0], key[1])

def create_module() -> SeatedAngleConnection:
    """Create an instance of the FinPlateConnection module design class and set it up for use"""
    module = SeatedAngleConnection()  # Create an instance of the FinPlateConnection
    module.set_osdaglogger(None)
    return module

def create_from_input(input_values: Dict[str, Any]) -> SeatedAngleConnection:
    """Create an instance of the FinPlateConnection module design class from input values."""
    # validate_input(input_values)
    try : 
        module = create_module()  # Create module instance.
    except Exception as e : 
        print('e in create_module : ' , e) 
        print('error in creating module')
    
    # Set the input values on the module instance.
    try :
        print('setting input values : ' , input_values) 
        module.set_input_values(input_values)
    except Exception as e : 
        traceback.print_exc()
        print('e in set_input_values : ' , e)
        print('error in setting the input values')

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
    output = {}  # Dictionary for formatted values
    module = create_from_input(input_values)  # Create module from input.
    print('module : ' , module)
    print('type of module : ' , type(module))

    # Generate output values in unformatted form.
    raw_output_text = module.output_values(True)
    raw_output_capacities = module.capacities(True)
    raw_output_seated_spacing_beam = module.spacing(True)
    raw_output_seated_spacing_col = module.seated_spacing_col(True)
    raw_output_top_spacing_col = module.top_spacing_col(True)
    raw_output_top_spacing_beam = module.top_spacing_beam(True)
    
    raw_seated_spacing_beam = [
        (f"{key}_seated_beam", label, typ, value, visible if len(item) == 5 else True)
        for item in raw_output_seated_spacing_beam
        if len(item) >= 4 and item[0] and item[2] == "TextBox"
        for (key, label, typ, value, *rest) in [item]
        for visible in [rest[0] if rest else True]
    ]

    raw_seated_spacing_col = [
        (f"{key}_seated_col", label, typ, value, visible if len(item) == 5 else True)
        for item in raw_output_seated_spacing_col
        if len(item) >= 4 and item[0] and item[2] == "TextBox"
        for (key, label, typ, value, *rest) in [item]
        for visible in [rest[0] if rest else True]
    ]

    raw_top_spacing_col = [
        (f"{key}_top_col", label, typ, value, visible if len(item) == 5 else True)
        for item in raw_output_top_spacing_col
        if len(item) >= 4 and item[0] and item[2] == "TextBox"
        for (key, label, typ, value, *rest) in [item]
        for visible in [rest[0] if rest else True]
    ]

    raw_top_spacing_beam = [
        (f"{key}_top_beam", label, typ, value, visible if len(item) == 5 else True)
        for item in raw_output_top_spacing_beam
        if len(item) >= 4 and item[0] and item[2] == "TextBox"
        for (key, label, typ, value, *rest) in [item]
        for visible in [rest[0] if rest else True]
    ]
    
    logs = module.logs
    raw_output = raw_output_text + raw_output_capacities + raw_seated_spacing_col + raw_seated_spacing_beam + raw_top_spacing_beam + raw_top_spacing_col
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
    return output, logs


def create_cad_model(input_values: Dict[str, Any], section: str, session: str) -> str:
    """Generate the CAD model from input values as a BREP file. Return file path."""
    if section not in ("Model", "Beam", "Column", "SeatedAngle"):  # Error checking: If section is valid.
        raise InvalidInputTypeError(
            "section", "'Model', 'Beam', 'Column' or 'SeatedAngle'")
    module = create_from_input(input_values)  # Create module from input.
    print('module from input values : ' , module)
    # Object that will create the CAD model.
    try : 
        print(module.module)
        cld = CommonDesignLogic(None, '', module.module , module.mainmodule)
    except Exception as e : 
        print('error in cld e : ' , e)
    
    try : 
        # Setup the calculations object for generating CAD model.
        scc.setup_for_cad(cld, module)
    except Exception as e : 
        traceback.print_exc()
        print('Error in setting up cad e : ' , e)

    # The section of the module that will be generated.
    cld.component = section
    
    try : 
        model = cld.create2Dcad()  # Generate CAD Model.
    except Exception as e :
        print('Error in cld.create2Dcad() e : ' , e)
        return False

    # Ensure output directory exists
    cad_models_dir = os.path.join(os.getcwd(), "file_storage", "cad_models")
    print("CAD - ensuring cad_models dir:", cad_models_dir)
    try:
        os.makedirs(cad_models_dir, exist_ok=True)
    except Exception as e:
        print(f"Error creating directory {cad_models_dir}: {e}")
        return False

    print('2d model : ' , model)
    file_base = f"{session}_{section}"

    # Optional: still write BREP for archival (API will consume GLB)
    brep_rel = os.path.join("file_storage", "cad_models", file_base + ".brep")
    print("CAD - writing optional BREP:", brep_rel)
    try:
        BRepTools.breptools.Write(model, brep_rel, Message_ProgressRange())
    except Exception as e:
        print('Writing to BREP file failed e : ' , e)

    glb_rel = os.path.join("file_storage", "cad_models", file_base + ".glb")
    glb_abs = os.path.join(os.getcwd(), glb_rel)

    # Prefer native OCCT GLB export
    print("CAD - exporter: RWGltf available ->", HAS_GLB)
    if HAS_GLB:
        try:
            from OCC.Core.XCAFApp import XCAFApp_Application
            from OCC.Core.TDocStd import TDocStd_Document
            from OCC.Core.TCollection import TCollection_ExtendedString
            from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool
            from OCC.Core.Quantity import Quantity_Color, Quantity_TOC_RGB
            from OCC.Core.TDataStd import TDataStd_Name

            app = XCAFApp_Application.GetApplication()
            doc = TDocStd_Document(TCollection_ExtendedString("XmlXCAF"))
            app.NewDocument(TCollection_ExtendedString("MDTV-CAF"), doc)
            root = doc.Main()
            shape_tool = XCAFDoc_DocumentTool.ShapeTool(root)
            color_tool = XCAFDoc_DocumentTool.ColorTool(root)

            # For now, export the overall shape as one part; subparts can be added later
            lbl = shape_tool.NewShape()
            shape_tool.SetShape(lbl, model)
            TDataStd_Name.Set(lbl, TCollection_ExtendedString(section))
            color_tool.SetColor(lbl, Quantity_Color(0.7, 0.7, 0.7, Quantity_TOC_RGB), 0)

            print("CAD - RWGltf performing to:", glb_abs)
            writer = RWGltf_CafWriter(glb_abs, True)
            ok = writer.Perform(doc, None)
            if ok:
                print("CAD - GLB written (RWGltf):", glb_rel)
                return glb_rel
            else:
                print("glTF export failed with RWGltf_CafWriter, falling back to trimesh")
        except Exception as e:
            print(f"RWGltf_CafWriter error: {e}. Falling back to trimesh")

    # Fallback: triangulate and export STL -> GLB via trimesh
    try:
        print("CAD - fallback: meshing OCC -> STL")
        BRepMesh_IncrementalMesh(model, 0.5, True, 0.5, True)
        stl_rel = os.path.join("file_storage", "cad_models", file_base + ".stl")
        stl_abs = os.path.join(os.getcwd(), stl_rel)
        print("CAD - writing STL:", stl_rel)
        StlAPI_Writer().Write(model, stl_abs)

        import trimesh
        print("CAD - loading STL in trimesh")
        mesh = trimesh.load_mesh(stl_abs)
        print("CAD - exporting GLB via trimesh:", glb_rel)
        mesh.export(glb_abs)
        print("CAD - GLB written (fallback):", glb_rel)
        return glb_rel
    except Exception as e:
        print(f"STL/GLB fallback export failed: {e}")
        return False

