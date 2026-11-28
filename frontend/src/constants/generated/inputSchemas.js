// Generated from the design request models (backend/apps/core/schemas/base.py `DesignInput`) by
// scripts/gen_core_keys.py. Per module id: the model name and its keys, required or optional, with
// the kind of value each takes (text, present, int, float, yesNo, or a List of them).
// Do not edit by hand; run `python scripts/gen_core_keys.py` to regenerate.

export const INPUT_SCHEMAS = {
  "Base Plate Connection": {
    "model": "BasePlateInput",
    "required": {
      "Connectivity": "text",
      "End Condition": "text",
      "Load.Axial": "float",
      "Load.Axial_Tension": "float",
      "Load.Moment.Major": "float",
      "Load.Moment.Minor": "float",
      "Load.Shear.Major": "float",
      "Load.Shear.Minor": "float",
      "Material": "text",
      "Member.Designation": "text",
      "Module": "text"
    },
    "optional": {}
  },
  "Beam-to-Beam Cover Plate Bolted Connection": {
    "model": "BeamBeamCoverPlateBoltedInput",
    "required": {
      "Bolt.Bolt_Hole_Type": "text",
      "Bolt.Diameter": "intList",
      "Bolt.Grade": "floatList",
      "Bolt.Slip_Factor": "float",
      "Bolt.TensionType": "text",
      "Bolt.Type": "text",
      "Connector.Flange_Plate.Preferences": "text",
      "Connector.Flange_Plate.Thickness_list": "intList",
      "Connector.Material": "text",
      "Connector.Web_Plate.Thickness_List": "intList",
      "Design.Design_Method": "text",
      "Detailing.Corrosive_Influences": "yesNo",
      "Detailing.Edge_type": "text",
      "Detailing.Gap": "int",
      "Load.Axial": "int",
      "Load.Moment": "int",
      "Load.Shear": "int",
      "Material": "text",
      "Member.Designation": "text",
      "Member.Material": "text",
      "Module": "text"
    },
    "optional": {}
  },
  "Beam-to-Beam Cover Plate Welded Connection": {
    "model": "BeamBeamCoverPlateWeldedInput",
    "required": {
      "Connector.Flange_Plate.Preferences": "text",
      "Connector.Flange_Plate.Thickness_list": "floatList",
      "Connector.Material": "text",
      "Connector.Web_Plate.Thickness_List": "floatList",
      "Design.Design_Method": "text",
      "Detailing.Gap": "float",
      "Load.Axial": "float",
      "Load.Moment": "float",
      "Load.Shear": "float",
      "Material": "text",
      "Member.Designation": "text",
      "Member.Material": "text",
      "Module": "text",
      "Weld.Fab": "text",
      "Weld.Material_Grade_OverWrite": "float",
      "Weld.Type": "text"
    },
    "optional": {}
  },
  "Beam-to-Beam End Plate Connection": {
    "model": "BeamBeamEndPlateInput",
    "required": {
      "Bolt.Bolt_Hole_Type": "text",
      "Bolt.Diameter": "intList",
      "Bolt.Grade": "floatList",
      "Bolt.Slip_Factor": "float",
      "Bolt.TensionType": "text",
      "Bolt.Type": "text",
      "Connectivity *": "text",
      "Connector.Material": "text",
      "Connector.Plate.Thickness_List": "intList",
      "Design.Design_Method": "text",
      "Detailing.Corrosive_Influences": "yesNo",
      "Detailing.Edge_type": "text",
      "Detailing.Gap": "int",
      "EndPlateType": "text",
      "Load.Axial": "int",
      "Load.Moment": "int",
      "Load.Shear": "int",
      "Material": "text",
      "Member.Supported_Section.Designation": "text",
      "Member.Supported_Section.Material": "text",
      "Module": "text",
      "Weld.Fab": "text",
      "Weld.Material_Grade_OverWrite": "int",
      "Weld.Type": "text"
    },
    "optional": {}
  },
  "Beam-to-Column End Plate Connection": {
    "model": "BeamColumnEndPlateInput",
    "required": {
      "Bolt.Bolt_Hole_Type": "text",
      "Bolt.Diameter": "intList",
      "Bolt.Grade": "floatList",
      "Bolt.Slip_Factor": "float",
      "Bolt.TensionType": "text",
      "Bolt.Type": "text",
      "Connectivity": "text",
      "Connector.Material": "text",
      "Connector.Plate.Thickness_List": "intList",
      "Design.Design_Method": "text",
      "Detailing.Corrosive_Influences": "yesNo",
      "Detailing.Edge_type": "text",
      "Detailing.Gap": "int",
      "EndPlateType": "text",
      "Load.Axial": "int",
      "Load.Moment": "int",
      "Load.Shear": "int",
      "Material": "text",
      "Member.Supported_Section.Designation": "text",
      "Member.Supported_Section.Material": "text",
      "Member.Supporting_Section.Designation": "text",
      "Member.Supporting_Section.Material": "text",
      "Module": "text",
      "Weld.Fab": "text",
      "Weld.Material_Grade_OverWrite": "int",
      "Weld.Type": "text"
    },
    "optional": {}
  },
  "Butt Joint Bolted Connection": {
    "model": "ButtJointBoltedInput",
    "required": {
      "Bolt.Bolt_Hole_Type": "present",
      "Bolt.Diameter": "intList",
      "Bolt.Grade": "floatList",
      "Bolt.Slip_Factor": "float",
      "Bolt.Type": "present",
      "ButtJoint.CoverPlate": "present",
      "Design.For": "present",
      "Load.Axial": "float",
      "Material": "present",
      "Module": "present",
      "Plate1Thickness": "float",
      "Plate2Thickness": "float",
      "PlateWidth": "float"
    },
    "optional": {
      "Weld.Size": "floatList"
    }
  },
  "Butt Joint Welded Connection": {
    "model": "ButtJointWeldedInput",
    "required": {
      "ButtJoint.CoverPlate": "present",
      "Design.For": "present",
      "Load.Axial": "float",
      "Material": "present",
      "Module": "present",
      "Plate1Thickness": "float",
      "Plate2Thickness": "float",
      "PlateWidth": "float",
      "Weld.Size": "floatList"
    },
    "optional": {
      "Bolt.Diameter": "intList",
      "Bolt.Grade": "floatList",
      "Bolt.Slip_Factor": "float"
    }
  },
  "Cleat Angle Connection": {
    "model": "CleatAngleInput",
    "required": {
      "Bolt.Bolt_Hole_Type": "text",
      "Bolt.Diameter": "intList",
      "Bolt.Grade": "floatList",
      "Bolt.Slip_Factor": "float",
      "Bolt.TensionType": "text",
      "Bolt.Type": "text",
      "Connectivity": "text",
      "Connector.Angle_List": "present",
      "Connector.Material": "text",
      "Design.Design_Method": "text",
      "Detailing.Corrosive_Influences": "yesNo",
      "Detailing.Edge_type": "text",
      "Detailing.Gap": "int",
      "Load.Shear": "int",
      "Material": "text",
      "Member.Supported_Section.Designation": "text",
      "Member.Supported_Section.Material": "text",
      "Member.Supporting_Section.Designation": "text",
      "Member.Supporting_Section.Material": "text",
      "Module": "text"
    },
    "optional": {
      "Weld.Fab": "text",
      "Weld.Material_Grade_OverWrite": "int"
    }
  },
  "Column-to-Column Cover Plate Bolted Connection": {
    "model": "ColumnColumnCoverPlateBoltedInput",
    "required": {
      "Bolt.Bolt_Hole_Type": "text",
      "Bolt.Diameter": "intList",
      "Bolt.Grade": "floatList",
      "Bolt.Slip_Factor": "float",
      "Bolt.TensionType": "text",
      "Bolt.Type": "text",
      "Connector.Flange_Plate.Preferences": "text",
      "Connector.Flange_Plate.Thickness_list": "intList",
      "Connector.Material": "text",
      "Connector.Web_Plate.Thickness_List": "intList",
      "Design.Design_Method": "text",
      "Detailing.Corrosive_Influences": "yesNo",
      "Detailing.Edge_type": "text",
      "Detailing.Gap": "int",
      "Load.Axial": "int",
      "Load.Moment": "int",
      "Load.Shear": "int",
      "Material": "text",
      "Member.Designation": "text",
      "Member.Material": "text",
      "Module": "text"
    },
    "optional": {}
  },
  "Column-to-Column Cover Plate Welded Connection": {
    "model": "ColumnColumnCoverPlateWeldedInput",
    "required": {
      "Connector.Flange_Plate.Preferences": "text",
      "Connector.Flange_Plate.Thickness_list": "floatList",
      "Connector.Material": "text",
      "Connector.Web_Plate.Thickness_List": "floatList",
      "Design.Design_Method": "text",
      "Detailing.Gap": "float",
      "Load.Axial": "float",
      "Load.Moment": "float",
      "Load.Shear": "float",
      "Material": "text",
      "Member.Designation": "text",
      "Member.Material": "text",
      "Module": "text",
      "Weld.Fab": "text",
      "Weld.Material_Grade_OverWrite": "float",
      "Weld.Type": "text"
    },
    "optional": {}
  },
  "Column-to-Column End Plate Connection": {
    "model": "ColumnColumnEndPlateInput",
    "required": {
      "Bolt.Bolt_Hole_Type": "text",
      "Bolt.Diameter": "intList",
      "Bolt.Grade": "floatList",
      "Bolt.Slip_Factor": "float",
      "Bolt.TensionType": "text",
      "Bolt.Type": "text",
      "Connectivity": "text",
      "Connector.Material": "text",
      "Connector.Plate.Thickness_List": "intList",
      "Design.Design_Method": "text",
      "Detailing.Corrosive_Influences": "yesNo",
      "Detailing.Edge_type": "text",
      "Detailing.Gap": "int",
      "Load.Axial": "int",
      "Load.Moment": "int",
      "Load.Shear": "int",
      "Material": "text",
      "Member.Designation": "text",
      "Member.Material": "text",
      "Module": "text",
      "Weld.Type": "text"
    },
    "optional": {
      "Weld.Fab": "text",
      "Weld.Material_Grade_OverWrite": "int"
    }
  },
  "Columns with known support conditions": {
    "model": "AxiallyLoadedColumnInput",
    "required": {
      "Actual.Length_yy": "number",
      "Actual.Length_zz": "number",
      "End_1": "text",
      "End_1_Y": "text",
      "End_2": "text",
      "End_2_Y": "text",
      "Load.Axial": "number",
      "Material": "text",
      "Member.Designation": "textList",
      "Member.Profile": "text",
      "Module": "text"
    },
    "optional": {}
  },
  "Fin Plate Connection": {
    "model": "FinPlateInput",
    "required": {
      "Bolt.Bolt_Hole_Type": "text",
      "Bolt.Diameter": "intList",
      "Bolt.Grade": "floatList",
      "Bolt.Slip_Factor": "float",
      "Bolt.TensionType": "text",
      "Bolt.Type": "text",
      "Connectivity": "text",
      "Connector.Material": "text",
      "Connector.Plate.Thickness_List": "intList",
      "Design.Design_Method": "text",
      "Detailing.Corrosive_Influences": "yesNo",
      "Detailing.Edge_type": "text",
      "Detailing.Gap": "int",
      "Load.Axial": "int",
      "Load.Shear": "int",
      "Material": "text",
      "Member.Supported_Section.Designation": "text",
      "Member.Supported_Section.Material": "text",
      "Member.Supporting_Section.Designation": "text",
      "Member.Supporting_Section.Material": "text",
      "Module": "text",
      "Weld.Fab": "text",
      "Weld.Material_Grade_OverWrite": "int"
    },
    "optional": {}
  },
  "Flexural Members - Cantilever": {
    "model": "OnCantileverInput",
    "required": {
      "Cantilever.Support": "present",
      "Cantilever.Top": "present",
      "Flexure.Type": "present",
      "Load.Moment": "present",
      "Load.Shear": "present",
      "Material": "present",
      "Member.Designation": "present",
      "Member.Length": "present",
      "Member.Material": "present",
      "Member.Profile": "present",
      "Module": "present"
    },
    "optional": {}
  },
  "Flexural Members - Simply Supported": {
    "model": "SimplySupportedBeamInput",
    "required": {
      "Bearing.Length": "present",
      "Design.Design_Method": "present",
      "Effective.Area_Para": "present",
      "Flexure.Type": "present",
      "Length.Overwrite": "present",
      "Load.Moment": "present",
      "Load.Shear": "present",
      "Material": "present",
      "Member.Designation": "present",
      "Member.Length": "present",
      "Member.Material": "present",
      "Member.Profile": "present",
      "Module": "present",
      "Optimum.Class": "present",
      "Torsion.restraint": "present",
      "Warping.restraint": "present"
    },
    "optional": {}
  },
  "Header Plate Connection": {
    "model": "HeaderPlateInput",
    "required": {
      "Bolt.Bolt_Hole_Type": "text",
      "Bolt.Diameter": "intList",
      "Bolt.Grade": "floatList",
      "Bolt.Slip_Factor": "float",
      "Bolt.TensionType": "text",
      "Bolt.Type": "text",
      "Connectivity": "text",
      "Connector.Material": "text",
      "Connector.Plate.Thickness_List": "intList",
      "Design.Design_Method": "text",
      "Detailing.Corrosive_Influences": "yesNo",
      "Detailing.Edge_type": "text",
      "Detailing.Gap": "int",
      "Load.Axial": "int",
      "Load.Shear": "int",
      "Material": "text",
      "Member.Supported_Section.Designation": "text",
      "Member.Supported_Section.Material": "text",
      "Member.Supporting_Section.Designation": "text",
      "Member.Supporting_Section.Material": "text",
      "Module": "text",
      "Weld.Fab": "text",
      "Weld.Material_Grade_OverWrite": "int"
    },
    "optional": {}
  },
  "Lap Joint Bolted Connection": {
    "model": "LapJointBoltedInput",
    "required": {
      "Bolt.Bolt_Hole_Type": "present",
      "Bolt.Diameter": "intList",
      "Bolt.Grade": "floatList",
      "Bolt.Slip_Factor": "float",
      "Bolt.Type": "present",
      "Design.For": "present",
      "Load.Axial": "float",
      "Material": "present",
      "Module": "present",
      "Plate1Thickness": "float",
      "Plate2Thickness": "float",
      "PlateWidth": "float"
    },
    "optional": {
      "Weld.Size": "floatList"
    }
  },
  "Lap Joint Welded Connection": {
    "model": "LapJointWeldedInput",
    "required": {
      "Design.For": "present",
      "Load.Axial": "float",
      "Material": "present",
      "Module": "present",
      "Plate1Thickness": "float",
      "Plate2Thickness": "float",
      "PlateWidth": "float",
      "Weld.Size": "floatList"
    },
    "optional": {
      "Bolt.Diameter": "intList",
      "Bolt.Grade": "floatList",
      "Bolt.Slip_Factor": "float"
    }
  },
  "PLATE GIRDER": {
    "model": "PlateGirderInput",
    "required": {
      "Bendingmoment.shape": "text",
      "BottomFlange.Thickness": "textList",
      "Deflection.Max": "text",
      "Flexure.Type": "text",
      "IntermediateStiffener.Data": "text",
      "IntermediateStiffener.Spacing": "text",
      "IntermediateStiffener.Thickness": "text",
      "Load.Moment": "float",
      "Load.Shear": "float",
      "Loading.Condition": "text",
      "LongitudnalStiffener.Data": "text",
      "LongitudnalStiffner.Thickness": "text",
      "Material": "text",
      "Member.Length": "float",
      "Module": "text",
      "Optimum.Class": "text",
      "Support.Width": "float",
      "TopFlange.Thickness": "textList",
      "Torsion.restraint": "text",
      "Total.Design_Type": "text",
      "Warping.restraint": "text",
      "Web.Philosophy": "text",
      "Web.Thickness": "textList"
    },
    "optional": {
      "Bottomflange.Width": "text",
      "Topflange.Width": "text",
      "Total.Depth": "text"
    }
  },
  "Seated Angle Connection": {
    "model": "SeatedAngleInput",
    "required": {
      "Bolt.Bolt_Hole_Type": "text",
      "Bolt.Diameter": "intList",
      "Bolt.Grade": "floatList",
      "Bolt.Slip_Factor": "float",
      "Bolt.TensionType": "text",
      "Bolt.Type": "text",
      "Connectivity": "text",
      "Connector.Angle_List": "present",
      "Connector.Material": "text",
      "Connector.Top_Angle": "present",
      "Design.Design_Method": "text",
      "Detailing.Corrosive_Influences": "yesNo",
      "Detailing.Edge_type": "text",
      "Detailing.Gap": "int",
      "Load.Shear": "int",
      "Material": "text",
      "Member.Supported_Section.Designation": "text",
      "Member.Supported_Section.Material": "text",
      "Member.Supporting_Section.Designation": "text",
      "Member.Supporting_Section.Material": "text",
      "Module": "text"
    },
    "optional": {
      "Weld.Fab": "text",
      "Weld.Material_Grade_OverWrite": "int"
    }
  },
  "Struts Bolted to End Gusset": {
    "model": "BoltedStrutInput",
    "required": {
      "Bolt.Bolt_Hole_Type": "text",
      "Bolt.Diameter": "intList",
      "Bolt.Grade": "floatList",
      "Bolt.Slip_Factor": "float",
      "Bolt.Type": "text",
      "Conn_Location": "text",
      "Connector.Material": "text",
      "Connector.Plate.Thickness_List": "intList",
      "Design.Design_Method": "text",
      "Detailing.Corrosive_Influences": "yesNo",
      "Detailing.Edge_type": "text",
      "Detailing.Gap": "int",
      "End_1": "text",
      "End_2": "text",
      "Load.Axial": "int",
      "Material": "text",
      "Member.Designation": "textOrList",
      "Member.Length": "text",
      "Member.Material": "present",
      "Member.Profile": "text",
      "Module": "text"
    },
    "optional": {}
  },
  "Struts Welded to End Gusset": {
    "model": "WeldedStrutInput",
    "required": {
      "Conn_Location": "text",
      "Connector.Plate.Thickness_List": "intOrList",
      "Design.Design_Method": "text",
      "End_1": "text",
      "End_2": "text",
      "Load.Axial": "int",
      "Material": "text",
      "Member.Designation": "textOrList",
      "Member.Length": "text",
      "Member.Material": "present",
      "Member.Profile": "text",
      "Module": "text"
    },
    "optional": {
      "Connector.Material": "text"
    }
  },
  "Tension Member Design - Bolted to End Gusset": {
    "model": "BoltedTensionInput",
    "required": {
      "Bolt.Bolt_Hole_Type": "text",
      "Bolt.Diameter": "intList",
      "Bolt.Grade": "floatList",
      "Bolt.Slip_Factor": "float",
      "Bolt.Type": "text",
      "Conn_Location": "text",
      "Connector.Material": "text",
      "Connector.Plate.Thickness_List": "intList",
      "Design.Design_Method": "text",
      "Detailing.Corrosive_Influences": "yesNo",
      "Detailing.Edge_type": "text",
      "Detailing.Gap": "int",
      "Load.Axial": "int",
      "Material": "text",
      "Member.Designation": "textList",
      "Member.Length": "text",
      "Member.Material": "present",
      "Member.Profile": "text",
      "Module": "text"
    },
    "optional": {}
  },
  "Tension Member Design - Welded to End Gusset": {
    "model": "WeldedTensionInput",
    "required": {
      "Conn_Location": "text",
      "Connector.Material": "text",
      "Connector.Plate.Thickness_List": "intList",
      "Design.Design_Method": "text",
      "Load.Axial": "int",
      "Material": "text",
      "Member.Designation": "textList",
      "Member.Length": "text",
      "Member.Material": "present",
      "Member.Profile": "text",
      "Module": "text"
    },
    "optional": {
      "Detailing.Corrosive_Influences": "yesNo",
      "Detailing.Edge_type": "text",
      "Detailing.Gap": "int"
    }
  }
};
