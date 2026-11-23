// Generated from the core classes (osdag_core/design_type) by scripts/gen_core_keys.py, through
// backend/apps/core/design_dictionary.py `pref_tables`. Static data per module id (the desktop
// KEY_DISP_* name): dockKeys, prefTabs, dockCopies, computed, sectionSources.
// Do not edit by hand; run `python scripts/gen_core_keys.py` to regenerate.

export const DESIGN_PREF_TABLES = {
  "Base Plate Connection": {
    "dockKeys": [
      "Module",
      "Connectivity",
      "End Condition",
      "Member.Designation",
      "Material",
      "Load.Axial_Compression",
      "Load.Axial_Tension",
      "Load.Shear.Major",
      "Load.Shear.Minor",
      "Load.Moment.Major",
      "Load.Moment.Minor",
      "Anchor Bolt.OCF.Diameter",
      "Anchor Bolt.OCF.Grade",
      "Anchor Bolt.ICF.Diameter",
      "Anchor Bolt.ICF.Grade",
      "Anchor Bolt.Type",
      "Footing.Grade",
      "Weld.Type"
    ],
    "prefTabs": [
      [
        "Column Section *",
        "ComboBox",
        [
          "Label_8",
          "Member.Material"
        ]
      ],
      [
        "Column Section *",
        "TextBox",
        [
          "Member.Fu",
          "Member.Fy",
          "Label_21"
        ]
      ],
      [
        "Base Plate",
        "ComboBox",
        [
          "Base_Plate.Material"
        ]
      ],
      [
        "Stiffener/Shear Key",
        "ComboBox",
        [
          "Stiffener_Key.Material"
        ]
      ],
      [
        "Anchor Bolt",
        "TextBox",
        [
          "DesignPreferences.Anchor_Bolt.OCF.Length",
          "DesignPreferences.Anchor_Bolt.ICF.Length",
          "DesignPreferences.Anchor_Bolt.OCF.Designation",
          "DesignPreferences.Anchor_Bolt.ICF.Designation",
          "DesignPreferences.Anchor_Bolt.OCF.Material_Grade_OverWrite",
          "DesignPreferences.Anchor_Bolt.ICF.Material_Grade_OverWrite",
          "DesignPreferences.Anchor_Bolt.Friction_coefficient",
          "DesignPreferences.Anchor_Bolt.OCF.Type",
          "DesignPreferences.Anchor_Bolt.ICF.Type"
        ]
      ],
      [
        "Anchor Bolt",
        "ComboBox",
        [
          "DesignPreferences.Anchor_Bolt.OCF.Bolt_Hole_Type",
          "DesignPreferences.Anchor_Bolt.ICF.Bolt_Hole_Type",
          "DesignPreferences.Anchor_Bolt.OCF.Galvanized",
          "DesignPreferences.Anchor_Bolt.ICF.Galvanized"
        ]
      ],
      [
        "Weld",
        "ComboBox",
        [
          "Weld.Fab"
        ]
      ],
      [
        "Weld",
        "TextBox",
        [
          "Weld.Material_Grade_OverWrite"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Edge_type",
          "Detailing.Corrosive_Influences"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method",
          "DesignPreferences.Design.Base_Plate"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Material",
        "Base_Plate.Material",
        "Stiffener_Key.Material"
      ],
      "Anchor Bolt.Type": [
        "DesignPreferences.Anchor_Bolt.OCF.Type",
        "DesignPreferences.Anchor_Bolt.ICF.Type"
      ]
    },
    "computed": [
      "Base_Plate.Fu",
      "DesignPreferences.Anchor_Bolt.OCF.Material_Grade_OverWrite",
      "DesignPreferences.Anchor_Bolt.ICF.Material_Grade_OverWrite",
      "Base_Plate.Fy",
      "Stiffener_Key.Fu",
      "Stiffener_Key.Fy",
      "DesignPreferences.Anchor_Bolt.OCF.Designation",
      "DesignPreferences.Anchor_Bolt.ICF.Designation",
      "DesignPreferences.Anchor_Bolt.OCF.Length",
      "DesignPreferences.Anchor_Bolt.ICF.Length",
      "DesignPreferences.Anchor_Bolt.OCF.Bolt_Hole_Type",
      "DesignPreferences.Anchor_Bolt.ICF.Bolt_Hole_Type",
      "DesignPreferences.Anchor_Bolt.Friction_coefficient",
      "Weld.Fab",
      "Weld.Material_Grade_OverWrite",
      "Detailing.Edge_type",
      "Detailing.Corrosive_Influences",
      "Design.Design_Method",
      "DesignPreferences.Design.Base_Plate",
      "DesignPreferences.Anchor_Bolt.OCF.Galvanized",
      "DesignPreferences.Anchor_Bolt.ICF.Galvanized"
    ],
    "sectionSources": [
      {
        "tab": "Column Section *",
        "dockKey": "Member.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Designation",
        "masterKey": null,
        "values": null,
        "table": "Columns"
      }
    ]
  },
  "Beam-to-Beam Cover Plate Bolted Connection": {
    "dockKeys": [
      "Module",
      "Member.Designation",
      "Material",
      "Load.Moment",
      "Load.Shear",
      "Load.Axial",
      "Bolt.Diameter",
      "Bolt.Type",
      "Bolt.Grade",
      "Connector.Flange_Plate.Preferences",
      "Connector.Flange_Plate.Thickness_list",
      "Connector.Web_Plate.Thickness_List"
    ],
    "prefTabs": [
      [
        "Beam Section *",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Bolt",
        "ComboBox",
        [
          "Bolt.TensionType",
          "Bolt.Bolt_Hole_Type",
          "Bolt.Slip_Factor"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Edge_type",
          "Detailing.Corrosive_Influences"
        ]
      ],
      [
        "Detailing",
        "TextBox",
        [
          "Detailing.Gap"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ],
      [
        "Connector",
        "ComboBox",
        [
          "Connector.Material"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Material"
      ]
    },
    "computed": [
      "Bolt.TensionType",
      "Bolt.Bolt_Hole_Type",
      "Bolt.Slip_Factor",
      "Detailing.Edge_type",
      "Detailing.Gap",
      "Detailing.Corrosive_Influences",
      "Design.Design_Method",
      "Connector.Material"
    ],
    "sectionSources": [
      {
        "tab": "Beam Section *",
        "dockKey": "Member.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Designation",
        "masterKey": null,
        "values": null,
        "table": "Beams"
      }
    ]
  },
  "Beam-to-Beam Cover Plate Welded Connection": {
    "dockKeys": [
      "Module",
      "Member.Designation",
      "Material",
      "Weld.Type",
      "Load.Moment",
      "Load.Shear",
      "Load.Axial",
      "Connector.Flange_Plate.Preferences",
      "Connector.Flange_Plate.Thickness_list",
      "Connector.Web_Plate.Thickness_List"
    ],
    "prefTabs": [
      [
        "Beam Section *",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Weld",
        "ComboBox",
        [
          "Weld.Fab"
        ]
      ],
      [
        "Weld",
        "TextBox",
        [
          "Weld.Material_Grade_OverWrite"
        ]
      ],
      [
        "Detailing",
        "TextBox",
        [
          "Detailing.Gap"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ],
      [
        "Connector",
        "ComboBox",
        [
          "Connector.Material"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Material"
      ]
    },
    "computed": [
      "Weld.Fab",
      "Weld.Material_Grade_OverWrite",
      "Detailing.Gap",
      "Design.Design_Method",
      "Connector.Material"
    ],
    "sectionSources": [
      {
        "tab": "Beam Section *",
        "dockKey": "Member.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Designation",
        "masterKey": null,
        "values": null,
        "table": "Beams"
      }
    ]
  },
  "Beam-to-Beam End Plate Connection": {
    "dockKeys": [
      "Module",
      "Connectivity",
      "EndPlateType",
      "Member.Supported_Section.Designation",
      "Material",
      "Load.Moment",
      "Load.Shear",
      "Load.Axial",
      "Bolt.Diameter",
      "Bolt.Type",
      "Bolt.Grade",
      "Connector.Plate.Thickness_List",
      "Weld.Type"
    ],
    "prefTabs": [
      [
        "Beam Section *",
        "ComboBox",
        [
          "Member.Supported_Section.Material"
        ]
      ],
      [
        "Bolt",
        "ComboBox",
        [
          "Bolt.TensionType",
          "Bolt.Bolt_Hole_Type",
          "Bolt.Slip_Factor"
        ]
      ],
      [
        "Weld",
        "ComboBox",
        [
          "Weld.Fab"
        ]
      ],
      [
        "Weld",
        "TextBox",
        [
          "Weld.Material_Grade_OverWrite"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Edge_type",
          "Detailing.Corrosive_Influences"
        ]
      ],
      [
        "Detailing",
        "TextBox",
        [
          "Detailing.Gap"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ],
      [
        "Connector",
        "ComboBox",
        [
          "Connector.Material"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Supported_Section.Material"
      ]
    },
    "computed": [
      "Bolt.TensionType",
      "Bolt.Bolt_Hole_Type",
      "Bolt.Slip_Factor",
      "Weld.Fab",
      "Weld.Material_Grade_OverWrite",
      "Detailing.Edge_type",
      "Detailing.Gap",
      "Detailing.Corrosive_Influences",
      "Design.Design_Method",
      "Connector.Material"
    ],
    "sectionSources": [
      {
        "tab": "Beam Section *",
        "dockKey": "Member.Supported_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supported_Section.Designation",
        "masterKey": null,
        "values": null,
        "table": "Beams"
      }
    ]
  },
  "Beam-to-Column End Plate Connection": {
    "dockKeys": [
      "Module",
      "Connectivity",
      "EndPlateType",
      "Member.Supporting_Section.Designation",
      "Member.Supported_Section.Designation",
      "Material",
      "Load.Moment",
      "Load.Shear",
      "Load.Axial",
      "Bolt.Diameter",
      "Bolt.Type",
      "Bolt.Grade",
      "Connector.Plate.Thickness_List",
      "Weld.Type"
    ],
    "prefTabs": [
      [
        "Column Section *",
        "ComboBox",
        [
          "Member.Supporting_Section.Material"
        ]
      ],
      [
        "Beam Section *",
        "ComboBox",
        [
          "Member.Supported_Section.Material"
        ]
      ],
      [
        "Bolt",
        "ComboBox",
        [
          "Bolt.TensionType",
          "Bolt.Bolt_Hole_Type",
          "Bolt.Slip_Factor"
        ]
      ],
      [
        "Weld",
        "ComboBox",
        [
          "Weld.Fab"
        ]
      ],
      [
        "Weld",
        "TextBox",
        [
          "Weld.Material_Grade_OverWrite"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Edge_type",
          "Detailing.Corrosive_Influences"
        ]
      ],
      [
        "Detailing",
        "TextBox",
        [
          "Detailing.Gap"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ],
      [
        "Connector",
        "ComboBox",
        [
          "Connector.Material"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Supporting_Section.Material",
        "Member.Supported_Section.Material"
      ]
    },
    "computed": [
      "Bolt.TensionType",
      "Bolt.Bolt_Hole_Type",
      "Bolt.Slip_Factor",
      "Weld.Fab",
      "Weld.Material_Grade_OverWrite",
      "Detailing.Edge_type",
      "Detailing.Gap",
      "Detailing.Corrosive_Influences",
      "Design.Design_Method",
      "Connector.Material"
    ],
    "sectionSources": [
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": null,
        "values": null,
        "table": "Columns"
      },
      {
        "tab": "Beam Section *",
        "dockKey": "Member.Supported_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supported_Section.Designation",
        "masterKey": null,
        "values": null,
        "table": "Beams"
      }
    ]
  },
  "Butt Joint Bolted Connection": {
    "dockKeys": [
      "Module",
      "Material",
      "Plate1Thickness",
      "Plate2Thickness",
      "PlateWidth",
      "ButtJoint.CoverPlate",
      "Load.Axial.Force",
      "Bolt.Diameter",
      "Bolt.Grade",
      "Bolt.Type"
    ],
    "prefTabs": [
      [
        "Bolt",
        "ComboBox",
        [
          "Bolt.TensionType",
          "Bolt.Bolt_Hole_Type",
          "Bolt.Slip_Factor"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Edge_type"
        ]
      ]
    ],
    "dockCopies": {},
    "computed": [
      "Bolt.TensionType",
      "Bolt.Bolt_Hole_Type",
      "Bolt.Slip_Factor",
      "Detailing.Edge_type",
      "Detailing.Packing_Plate"
    ],
    "sectionSources": [
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Column Flange-Beam Web",
          "Column Web-Beam Web"
        ],
        "table": "Columns"
      },
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Beam-Beam"
        ],
        "table": "Beams"
      },
      {
        "tab": "Beam Section *",
        "dockKey": "Member.Supported_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supported_Section.Designation",
        "masterKey": null,
        "values": null,
        "table": "Beams"
      }
    ]
  },
  "Butt Joint Welded Connection": {
    "dockKeys": [
      "Module",
      "Plate1Thickness",
      "Plate2Thickness",
      "PlateWidth",
      "Material",
      "ButtJoint.CoverPlate",
      "Weld.Size",
      "Load.Axial.Force"
    ],
    "prefTabs": [
      [
        "Weld",
        "ComboBox",
        [
          "Weld.Type",
          "Weld.Material_Grade_OverWrite"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Edge_type",
          "Detailing.Packing_Plate"
        ]
      ]
    ],
    "dockCopies": {},
    "computed": [
      "Weld.Type",
      "Weld.Material_Grade_OverWrite",
      "Detailing.Edge_type",
      "Detailing.Packing_Plate"
    ],
    "sectionSources": [
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Column Flange-Beam Web",
          "Column Web-Beam Web"
        ],
        "table": "Columns"
      },
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Beam-Beam"
        ],
        "table": "Beams"
      },
      {
        "tab": "Beam Section *",
        "dockKey": "Member.Supported_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supported_Section.Designation",
        "masterKey": null,
        "values": null,
        "table": "Beams"
      }
    ]
  },
  "Cleat Angle Connection": {
    "dockKeys": [
      "Connectivity",
      "Member.Supporting_Section.Designation",
      "Member.Supported_Section.Designation",
      "Material",
      "Load.Shear",
      "Bolt.Diameter",
      "Bolt.Type",
      "Bolt.Grade",
      "Connector.Angle_List",
      "Module"
    ],
    "prefTabs": [
      [
        "Column Section *",
        "ComboBox",
        [
          "Member.Supporting_Section.Material"
        ]
      ],
      [
        "Beam Section *",
        "ComboBox",
        [
          "Member.Supported_Section.Material"
        ]
      ],
      [
        "Cleat Angle",
        "ComboBox",
        [
          "Connector.Material"
        ]
      ],
      [
        "Bolt",
        "ComboBox",
        [
          "Bolt.TensionType",
          "Bolt.Bolt_Hole_Type",
          "Bolt.Slip_Factor"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Edge_type",
          "Detailing.Corrosive_Influences"
        ]
      ],
      [
        "Detailing",
        "TextBox",
        [
          "Detailing.Gap"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Supporting_Section.Material",
        "Member.Supported_Section.Material"
      ]
    },
    "computed": [
      "Bolt.TensionType",
      "Bolt.Bolt_Hole_Type",
      "Bolt.Slip_Factor",
      "Detailing.Edge_type",
      "Detailing.Gap",
      "Detailing.Corrosive_Influences",
      "Design.Design_Method",
      "Connector.Material"
    ],
    "sectionSources": [
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Column Flange-Beam Web",
          "Column Web-Beam Web"
        ],
        "table": "Columns"
      },
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Beam-Beam"
        ],
        "table": "Beams"
      },
      {
        "tab": "Beam Section *",
        "dockKey": "Member.Supported_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supported_Section.Designation",
        "masterKey": null,
        "values": null,
        "table": "Beams"
      },
      {
        "tab": "Cleat Angle",
        "dockKey": "Connector.Angle_List",
        "dockType": "ComboBox_Customized",
        "prefKey": "Connector.Angle_Selected",
        "masterKey": null,
        "values": null,
        "table": "Angles"
      }
    ]
  },
  "Column-to-Column Cover Plate Bolted Connection": {
    "dockKeys": [
      "Module",
      "Member.Designation",
      "Material",
      "Load.Moment",
      "Load.Shear",
      "Load.Axial",
      "Bolt.Diameter",
      "Bolt.Type",
      "Bolt.Grade",
      "Connector.Flange_Plate.Preferences",
      "Connector.Flange_Plate.Thickness_list",
      "Connector.Web_Plate.Thickness_List"
    ],
    "prefTabs": [
      [
        "Column Section *",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Bolt",
        "ComboBox",
        [
          "Bolt.TensionType",
          "Bolt.Bolt_Hole_Type",
          "Bolt.Slip_Factor"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Edge_type",
          "Detailing.Corrosive_Influences"
        ]
      ],
      [
        "Detailing",
        "TextBox",
        [
          "Detailing.Gap"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ],
      [
        "Connector",
        "ComboBox",
        [
          "Connector.Material"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Material"
      ]
    },
    "computed": [
      "Bolt.TensionType",
      "Bolt.Bolt_Hole_Type",
      "Bolt.Slip_Factor",
      "Detailing.Edge_type",
      "Detailing.Gap",
      "Detailing.Corrosive_Influences",
      "Design.Design_Method",
      "Connector.Material"
    ],
    "sectionSources": [
      {
        "tab": "Column Section *",
        "dockKey": "Member.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Designation",
        "masterKey": null,
        "values": null,
        "table": "Columns"
      }
    ]
  },
  "Column-to-Column Cover Plate Welded Connection": {
    "dockKeys": [
      "Module",
      "Member.Designation",
      "Material",
      "Weld.Type",
      "Load.Moment",
      "Load.Shear",
      "Load.Axial",
      "Connector.Flange_Plate.Preferences",
      "Connector.Flange_Plate.Thickness_list",
      "Connector.Web_Plate.Thickness_List"
    ],
    "prefTabs": [
      [
        "Column Section *",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Weld",
        "ComboBox",
        [
          "Weld.Fab"
        ]
      ],
      [
        "Weld",
        "TextBox",
        [
          "Weld.Material_Grade_OverWrite"
        ]
      ],
      [
        "Detailing",
        "TextBox",
        [
          "Detailing.Gap"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ],
      [
        "Connector",
        "ComboBox",
        [
          "Connector.Material"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Material"
      ]
    },
    "computed": [
      "Weld.Fab",
      "Weld.Material_Grade_OverWrite",
      "Detailing.Gap",
      "Design.Design_Method",
      "Connector.Material"
    ],
    "sectionSources": [
      {
        "tab": "Column Section *",
        "dockKey": "Member.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Designation",
        "masterKey": null,
        "values": null,
        "table": "Columns"
      }
    ]
  },
  "Column-to-Column End Plate Connection": {
    "dockKeys": [
      "Module",
      "Member.Designation",
      "Connectivity",
      "Material",
      "Load.Moment",
      "Load.Shear",
      "Load.Axial",
      "Bolt.Diameter",
      "Bolt.Type",
      "Bolt.Grade",
      "Connector.Plate.Thickness_List"
    ],
    "prefTabs": [
      [
        "Column Section *",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Bolt",
        "ComboBox",
        [
          "Bolt.TensionType",
          "Bolt.Bolt_Hole_Type",
          "Bolt.Slip_Factor"
        ]
      ],
      [
        "Weld",
        "ComboBox",
        [
          "Weld.Fab"
        ]
      ],
      [
        "Weld",
        "TextBox",
        [
          "Weld.Material_Grade_OverWrite"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Edge_type",
          "Detailing.Corrosive_Influences"
        ]
      ],
      [
        "Detailing",
        "TextBox",
        [
          "Detailing.Gap"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ],
      [
        "Connector",
        "ComboBox",
        [
          "Connector.Material"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Material"
      ]
    },
    "computed": [
      "Bolt.TensionType",
      "Bolt.Bolt_Hole_Type",
      "Bolt.Slip_Factor",
      "Detailing.Edge_type",
      "Detailing.Gap",
      "Detailing.Corrosive_Influences",
      "Design.Design_Method",
      "Connector.Material"
    ],
    "sectionSources": [
      {
        "tab": "Column Section *",
        "dockKey": "Member.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Designation",
        "masterKey": null,
        "values": null,
        "table": "Columns"
      }
    ]
  },
  "Columns with known support conditions": {
    "dockKeys": [
      "Module",
      "Member.Profile",
      "Member.Designation",
      "Material",
      "Unsupported.Length_zz",
      "Unsupported.Length_yy",
      "End_1",
      "End_2",
      "End_1_Y",
      "End_2_Y",
      "Load.Axial"
    ],
    "prefTabs": [
      [
        "Column Section *",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Column Section *",
        "TextBox",
        [
          "Member.Fu",
          "Member.Fy"
        ]
      ],
      [
        "Optimization",
        "TextBox",
        [
          "Optimum.AllowUR",
          "Effective.Area_Para"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Material"
      ]
    },
    "computed": [
      "Optimum.AllowUR",
      "Effective.Area_Para",
      "Design.Design_Method"
    ],
    "sectionSources": [
      {
        "tab": "Column Section *",
        "dockKey": "Member.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Designation",
        "masterKey": null,
        "values": null,
        "table": "Columns"
      }
    ]
  },
  "Fin Plate Connection": {
    "dockKeys": [
      "Module",
      "Connectivity",
      "Member.Supporting_Section.Designation",
      "Member.Supported_Section.Designation",
      "Material",
      "Load.Shear",
      "Load.Axial",
      "Bolt.Diameter",
      "Bolt.Type",
      "Bolt.Grade",
      "Connector.Plate.Thickness_List"
    ],
    "prefTabs": [
      [
        "Column Section *",
        "ComboBox",
        [
          "Member.Supporting_Section.Material"
        ]
      ],
      [
        "Beam Section *",
        "ComboBox",
        [
          "Member.Supported_Section.Material"
        ]
      ],
      [
        "Bolt",
        "ComboBox",
        [
          "Bolt.TensionType",
          "Bolt.Bolt_Hole_Type",
          "Bolt.Slip_Factor"
        ]
      ],
      [
        "Weld",
        "ComboBox",
        [
          "Weld.Fab"
        ]
      ],
      [
        "Weld",
        "TextBox",
        [
          "Weld.Material_Grade_OverWrite"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Edge_type",
          "Detailing.Corrosive_Influences"
        ]
      ],
      [
        "Detailing",
        "TextBox",
        [
          "Detailing.Gap"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ],
      [
        "Connector",
        "ComboBox",
        [
          "Connector.Material"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Supporting_Section.Material",
        "Member.Supported_Section.Material"
      ]
    },
    "computed": [
      "Bolt.TensionType",
      "Bolt.Bolt_Hole_Type",
      "Bolt.Slip_Factor",
      "Weld.Fab",
      "Weld.Material_Grade_OverWrite",
      "Detailing.Edge_type",
      "Detailing.Gap",
      "Detailing.Corrosive_Influences",
      "Design.Design_Method",
      "Connector.Material"
    ],
    "sectionSources": [
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Column Flange-Beam Web",
          "Column Web-Beam Web"
        ],
        "table": "Columns"
      },
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Beam-Beam"
        ],
        "table": "Beams"
      },
      {
        "tab": "Beam Section *",
        "dockKey": "Member.Supported_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supported_Section.Designation",
        "masterKey": null,
        "values": null,
        "table": "Beams"
      }
    ]
  },
  "Flexural Members - Cantilever": {
    "dockKeys": [
      "Module",
      "Member.Profile",
      "Member.Designation",
      "Material",
      "Flexure.Type",
      "Cantilever.Support",
      "Cantilever.Top",
      "Member.Length",
      "Load.Moment",
      "Load.Shear"
    ],
    "prefTabs": [
      [
        "Column Section *",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Column Section *",
        "TextBox",
        [
          "Member.Fu",
          "Member.Fy"
        ]
      ],
      [
        "Optimization",
        "TextBox",
        [
          "Effective.Area_Para",
          "Length.Overwrite",
          "Bearing.Length"
        ]
      ],
      [
        "Optimization",
        "ComboBox",
        [
          "Optimum.Class",
          "Loading.Condition"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Material"
      ]
    },
    "computed": [
      "Optimum.Class",
      "Effective.Area_Para",
      "Length.Overwrite",
      "Bearing.Length",
      "Loading.Condition",
      "Design.Design_Method"
    ],
    "sectionSources": []
  },
  "Flexural Members - Simply Supported": {
    "dockKeys": [
      "Module",
      "Member.Profile",
      "Member.Designation",
      "Material",
      "Flexure.Type",
      "Torsion.restraint",
      "Warping.restraint",
      "Member.Length",
      "Load.Moment",
      "Load.Shear"
    ],
    "prefTabs": [
      [
        "Column Section *",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Column Section *",
        "TextBox",
        [
          "Member.Fu",
          "Member.Fy"
        ]
      ],
      [
        "Optimization",
        "TextBox",
        [
          "Effective.Area_Para",
          "Length.Overwrite",
          "Bearing.Length"
        ]
      ],
      [
        "Optimization",
        "ComboBox",
        [
          "Optimum.Class",
          "Loading.Condition"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Material"
      ]
    },
    "computed": [
      "Optimum.Class",
      "Effective.Area_Para",
      "Length.Overwrite",
      "Bearing.Length",
      "Loading.Condition",
      "Design.Design_Method"
    ],
    "sectionSources": []
  },
  "Header Plate Connection": {
    "dockKeys": [
      "Module",
      "Connectivity",
      "Member.Supporting_Section.Designation",
      "Member.Supported_Section.Designation",
      "Material",
      "Load.Shear",
      "Load.Axial",
      "Bolt.Diameter",
      "Bolt.Type",
      "Bolt.Grade",
      "Connector.Plate.Thickness_List"
    ],
    "prefTabs": [
      [
        "Column Section *",
        "ComboBox",
        [
          "Member.Supporting_Section.Material"
        ]
      ],
      [
        "Beam Section *",
        "ComboBox",
        [
          "Member.Supported_Section.Material"
        ]
      ],
      [
        "Bolt",
        "ComboBox",
        [
          "Bolt.TensionType",
          "Bolt.Bolt_Hole_Type",
          "Bolt.Slip_Factor"
        ]
      ],
      [
        "Weld",
        "ComboBox",
        [
          "Weld.Fab"
        ]
      ],
      [
        "Weld",
        "TextBox",
        [
          "Weld.Material_Grade_OverWrite"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Edge_type",
          "Detailing.Corrosive_Influences"
        ]
      ],
      [
        "Detailing",
        "TextBox",
        [
          "Detailing.Gap"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ],
      [
        "Connector",
        "ComboBox",
        [
          "Connector.Material"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Supporting_Section.Material",
        "Member.Supported_Section.Material"
      ]
    },
    "computed": [
      "Bolt.TensionType",
      "Bolt.Bolt_Hole_Type",
      "Bolt.Slip_Factor",
      "Weld.Fab",
      "Weld.Material_Grade_OverWrite",
      "Detailing.Edge_type",
      "Detailing.Gap",
      "Detailing.Corrosive_Influences",
      "Design.Design_Method",
      "Connector.Material"
    ],
    "sectionSources": [
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Column Flange-Beam Web",
          "Column Web-Beam Web"
        ],
        "table": "Columns"
      },
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Beam-Beam"
        ],
        "table": "Beams"
      },
      {
        "tab": "Beam Section *",
        "dockKey": "Member.Supported_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supported_Section.Designation",
        "masterKey": null,
        "values": null,
        "table": "Beams"
      }
    ]
  },
  "Lap Joint Bolted Connection": {
    "dockKeys": [
      "Module",
      "Material",
      "Plate1Thickness",
      "Plate2Thickness",
      "PlateWidth",
      "Load.Axial.Force",
      "Bolt.Diameter",
      "Bolt.Grade",
      "Bolt.Type"
    ],
    "prefTabs": [
      [
        "Bolt",
        "ComboBox",
        [
          "Bolt.TensionType",
          "Bolt.Bolt_Hole_Type",
          "Bolt.Slip_Factor"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Edge_type"
        ]
      ]
    ],
    "dockCopies": {},
    "computed": [
      "Bolt.TensionType",
      "Bolt.Bolt_Hole_Type",
      "Bolt.Slip_Factor",
      "Detailing.Edge_type"
    ],
    "sectionSources": [
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Column Flange-Beam Web",
          "Column Web-Beam Web"
        ],
        "table": "Columns"
      },
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Beam-Beam"
        ],
        "table": "Beams"
      },
      {
        "tab": "Beam Section *",
        "dockKey": "Member.Supported_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supported_Section.Designation",
        "masterKey": null,
        "values": null,
        "table": "Beams"
      }
    ]
  },
  "Lap Joint Welded Connection": {
    "dockKeys": [
      "Module",
      "Plate1Thickness",
      "Plate2Thickness",
      "PlateWidth",
      "Material",
      "Weld.Size",
      "Load.Axial.Force"
    ],
    "prefTabs": [
      [
        "Weld",
        "ComboBox",
        [
          "Weld.Type",
          "Weld.Material_Grade_OverWrite"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Edge_type"
        ]
      ]
    ],
    "dockCopies": {},
    "computed": [
      "Weld.Type",
      "Weld.Material_Grade_OverWrite",
      "Detailing.Edge_type"
    ],
    "sectionSources": [
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Column Flange-Beam Web",
          "Column Web-Beam Web"
        ],
        "table": "Columns"
      },
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Beam-Beam"
        ],
        "table": "Beams"
      },
      {
        "tab": "Beam Section *",
        "dockKey": "Member.Supported_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supported_Section.Designation",
        "masterKey": null,
        "values": null,
        "table": "Beams"
      }
    ]
  },
  "PLATE GIRDER": {
    "dockKeys": [
      "Module",
      "Material",
      "Total.Design_Type",
      "Total.Depth",
      "Web.Thickness",
      "Topflange.Width",
      "TopFlange.Thickness",
      "Bottomflange.Width",
      "BottomFlange.Thickness",
      "Member.Length",
      "Flexure.Type",
      "Support.Width",
      "Web.Philosophy",
      "Torsion.restraint",
      "Warping.restraint",
      "Load.Moment",
      "Load.Shear",
      "Bendingmoment.shape"
    ],
    "prefTabs": [
      [
        "Girder Properties",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Girder Properties",
        "TextBox",
        [
          "Member.Fu",
          "Member.Fy"
        ]
      ],
      [
        "Optimisation",
        "TextBox",
        [
          "Effective.Area_Para",
          "Length.Overwrite"
        ]
      ],
      [
        "Optimisation",
        "ComboBox",
        [
          "Optimum.Class",
          "Loading.Condition"
        ]
      ],
      [
        "Stiffeners",
        "ComboBox",
        [
          "IntermediateStiffener.Data",
          "LongitudnalStiffener.Data",
          "IntermediateStiffener.Thickness",
          "LongitudnalStiffner.Thickness"
        ]
      ],
      [
        "Stiffeners",
        "TextBox",
        [
          "IntermediateStiffener.Spacing"
        ]
      ],
      [
        "Stiffeners",
        "ComboBox",
        [
          "S.B.Methods",
          "IntermediateStiffener.Thickness.val",
          "LongitudnalStiffner.Thickness.val"
        ]
      ],
      [
        "Additional Girder Data",
        "ComboBox",
        [
          "Girder.Symmetry"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ],
      [
        "Deflection",
        "ComboBox",
        [
          "Structure.Type",
          "Design.Load",
          "Member.Options",
          "Supporting.Options"
        ]
      ],
      [
        "Deflection",
        "TextBox",
        [
          "Deflection.Max"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Material"
      ]
    },
    "computed": [
      "Member.Fu",
      "Member.Fy",
      "Optimum.Class",
      "Effective.Area_Para",
      "Length.Overwrite",
      "Loading.Condition",
      "IntermediateStiffener.Data",
      "LongitudnalStiffener.Data",
      "IntermediateStiffener.Thickness",
      "LongitudnalStiffner.Thickness",
      "IntermediateStiffener.Spacing",
      "S.B.Methods",
      "IntermediateStiffener.Thickness.val",
      "LongitudnalStiffner.Thickness.val",
      "Girder.Symmetry",
      "Design.Design_Method",
      "Structure.Type",
      "Design.Load",
      "Member.Options",
      "Supporting.Options",
      "Deflection.Max"
    ],
    "sectionSources": []
  },
  "Seated Angle Connection": {
    "dockKeys": [
      "Module",
      "Connectivity",
      "Member.Supporting_Section.Designation",
      "Member.Supported_Section.Designation",
      "Material",
      "Load.Shear",
      "Bolt.Diameter",
      "Bolt.Type",
      "Bolt.Grade",
      "Connector.Angle_List",
      "Connector.Top_Angle"
    ],
    "prefTabs": [
      [
        "Column Section *",
        "ComboBox",
        [
          "Member.Supporting_Section.Material"
        ]
      ],
      [
        "Beam Section *",
        "ComboBox",
        [
          "Member.Supported_Section.Material"
        ]
      ],
      [
        "Seated Angle Connection",
        "ComboBox",
        [
          "Connector.Material"
        ]
      ],
      [
        "Bolt",
        "ComboBox",
        [
          "Bolt.TensionType",
          "Bolt.Bolt_Hole_Type",
          "Bolt.Slip_Factor"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Edge_type",
          "Detailing.Corrosive_Influences"
        ]
      ],
      [
        "Detailing",
        "TextBox",
        [
          "Detailing.Gap"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Supporting_Section.Material",
        "Member.Supported_Section.Material"
      ]
    },
    "computed": [
      "Bolt.TensionType",
      "Bolt.Bolt_Hole_Type",
      "Bolt.Slip_Factor",
      "Detailing.Edge_type",
      "Detailing.Gap",
      "Detailing.Corrosive_Influences",
      "Design.Design_Method",
      "Connector.Material"
    ],
    "sectionSources": [
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Column Flange-Beam Web",
          "Column Web-Beam Web"
        ],
        "table": "Columns"
      },
      {
        "tab": "Column Section *",
        "dockKey": "Member.Supporting_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supporting_Section.Designation",
        "masterKey": "Connectivity",
        "values": [
          "Beam-Beam"
        ],
        "table": "Beams"
      },
      {
        "tab": "Beam Section *",
        "dockKey": "Member.Supported_Section.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Supported_Section.Designation",
        "masterKey": null,
        "values": null,
        "table": "Beams"
      },
      {
        "tab": "Seated Angle Connection",
        "dockKey": "Connector.Angle_List",
        "dockType": "ComboBox_Customized",
        "prefKey": "Connector.Angle_Selected",
        "masterKey": null,
        "values": null,
        "table": "Angles"
      }
    ]
  },
  "Struts Bolted to End Gusset": {
    "dockKeys": [
      "Module",
      "Member.Profile",
      "Conn_Location",
      "is_leg_loaded",
      "Member.Designation",
      "Material",
      "Member.Length",
      "End_1",
      "End_2",
      "Load.Axial",
      "Bolt.Diameter",
      "Bolt.Type",
      "Bolt.Grade",
      "Connector.Plate.Thickness_List"
    ],
    "prefTabs": [
      [
        "Angle Section",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Channel Section",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Bolt",
        "ComboBox",
        [
          "Bolt.TensionType",
          "Bolt.Bolt_Hole_Type",
          "Bolt.Slip_Factor"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Edge_type",
          "Detailing.Corrosive_Influences"
        ]
      ],
      [
        "Detailing",
        "TextBox",
        [
          "Detailing.Gap"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ],
      [
        "Connector",
        "ComboBox",
        [
          "Connector.Material"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Material"
      ]
    },
    "computed": [
      "Bolt.TensionType",
      "Bolt.Bolt_Hole_Type",
      "Bolt.Slip_Factor",
      "Detailing.Edge_type",
      "Detailing.Corrosive_Influences",
      "Detailing.Gap",
      "Design.Design_Method",
      "Connector.Material"
    ],
    "sectionSources": [
      {
        "tab": "Angle Section",
        "dockKey": "Member.Designation",
        "dockType": "ComboBox_Customized",
        "prefKey": "Member.Designation_Selected",
        "masterKey": "Member.Profile",
        "values": [
          "Angles",
          "Back to Back Angles",
          "Star Angles",
          "Channels",
          "Back to Back Channels"
        ],
        "table": "Angles"
      }
    ]
  },
  "Struts Welded to End Gusset": {
    "dockKeys": [
      "Module",
      "Member.Profile",
      "Conn_Location",
      "Member.Designation",
      "Material",
      "Member.Length",
      "End_1",
      "End_2",
      "Load.Axial"
    ],
    "prefTabs": [
      [
        "Angle Section",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Optimization",
        "TextBox",
        [
          "Optimum.AllowUR",
          "Effective.Area_Para",
          " Out_of_Plane",
          " In_Plane",
          "Bolt.Number"
        ]
      ],
      [
        "Optimization",
        "ComboBox",
        [
          "Load.Type",
          "Leg Load",
          "Concentric Load",
          "Connector.Plate.Thickness_List"
        ]
      ],
      [
        "Weld",
        "ComboBox",
        [
          "Weld.Fab"
        ]
      ],
      [
        "Weld",
        "TextBox",
        [
          "Weld.Material_Grade_OverWrite"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Material"
      ]
    },
    "computed": [
      "Optimum.AllowUR",
      "Effective.Area_Para",
      " Out_of_Plane",
      " In_Plane",
      "Design.Design_Method",
      "Load.Type",
      "Bolt.Number",
      "Connector.Plate.Thickness_List",
      "Weld.Fab",
      "Weld.Material_Grade_OverWrite"
    ],
    "sectionSources": [
      {
        "tab": "Angle Section",
        "dockKey": "Member.Designation",
        "dockType": "ComboBox_Customized",
        "prefKey": "Member.Designation_Selected",
        "masterKey": "Member.Profile",
        "values": [
          "Angles",
          "Back to Back Angles - Same side of gusset",
          "Back to Back Angles - Opposite side of gusset"
        ],
        "table": "Angles"
      }
    ]
  },
  "Tension Member Design - Bolted to End Gusset": {
    "dockKeys": [
      "Module",
      "Member.Profile",
      "Conn_Location",
      "Member.Designation",
      "Material",
      "Member.Length",
      "Load.Axial",
      "Bolt.Diameter",
      "Bolt.Type",
      "Bolt.Grade",
      "Connector.Plate.Thickness_List"
    ],
    "prefTabs": [
      [
        "Angle Section",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Channel Section",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Bolt",
        "ComboBox",
        [
          "Bolt.TensionType",
          "Bolt.Bolt_Hole_Type",
          "Bolt.Slip_Factor"
        ]
      ],
      [
        "Detailing",
        "TextBox",
        [
          "Detailing.Gap"
        ]
      ],
      [
        "Detailing",
        "ComboBox",
        [
          "Detailing.Corrosive_Influences",
          "Detailing.Edge_type"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ],
      [
        "Connector",
        "ComboBox",
        [
          "Connector.Material"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Material"
      ]
    },
    "computed": [
      "Bolt.TensionType",
      "Bolt.Bolt_Hole_Type",
      "Bolt.Slip_Factor",
      "Detailing.Edge_type",
      "Detailing.Gap",
      "Detailing.Corrosive_Influences",
      "Design.Design_Method",
      "Connector.Material"
    ],
    "sectionSources": [
      {
        "tab": "Angle Section",
        "dockKey": "Member.Designation",
        "dockType": "ComboBox_Customized",
        "prefKey": "Member.Designation_Selected",
        "masterKey": "Member.Profile",
        "values": [
          "Angles",
          "Back to Back Angles",
          "Star Angles"
        ],
        "table": "Angles"
      },
      {
        "tab": "Channel Section",
        "dockKey": "Member.Designation",
        "dockType": "ComboBox_Customized",
        "prefKey": "Member.Designation_Selected",
        "masterKey": "Member.Profile",
        "values": [
          "Channels",
          "Back to Back Channels"
        ],
        "table": "Channels"
      }
    ]
  },
  "Tension Member Design - Welded to End Gusset": {
    "dockKeys": [
      "Module",
      "Member.Profile",
      "Conn_Location",
      "Member.Designation",
      "Material",
      "Member.Length",
      "Load.Axial",
      "Connector.Plate.Thickness_List"
    ],
    "prefTabs": [
      [
        "Angle Section",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Channel Section",
        "ComboBox",
        [
          "Member.Material"
        ]
      ],
      [
        "Weld",
        "ComboBox",
        [
          "Weld.Fab"
        ]
      ],
      [
        "Weld",
        "TextBox",
        [
          "Weld.Material_Grade_OverWrite"
        ]
      ],
      [
        "Design",
        "ComboBox",
        [
          "Design.Design_Method"
        ]
      ],
      [
        "Connector",
        "ComboBox",
        [
          "Connector.Material"
        ]
      ]
    ],
    "dockCopies": {
      "Material": [
        "Member.Material"
      ]
    },
    "computed": [
      "Weld.Fab",
      "Weld.Material_Grade_OverWrite",
      "Design.Design_Method",
      "Connector.Material"
    ],
    "sectionSources": [
      {
        "tab": "Angle Section",
        "dockKey": "Member.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Designation_Selected",
        "masterKey": null,
        "values": null,
        "table": "Angles"
      },
      {
        "tab": "Channel Section",
        "dockKey": "Member.Designation",
        "dockType": "ComboBox",
        "prefKey": "Member.Designation_Selected",
        "masterKey": null,
        "values": null,
        "table": "Channels"
      }
    ]
  }
};
