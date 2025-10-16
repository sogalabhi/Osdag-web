import { UI_STRINGS } from '../../../../constants/UIStrings';
import { MODULE_KEY_CLEAT_ANGLE, MODULE_DISPLAY_CLEAT_ANGLE } from '../../../../constants/DesignKeys';

export const cleatAngleConfig = {
  sessionName: MODULE_DISPLAY_CLEAT_ANGLE,
  routePath: "/design/connections/shear/cleatAngle",
  designType: MODULE_KEY_CLEAT_ANGLE, 
  cameraKey: "CleatAngle",
  cadOptions: ["Model", "Beam", "Column", "CleatAngle"],

  defaultInputs: {
    bolt_diameter: [],
    bolt_grade: [],
    bolt_type: "Bearing Bolt",
    connector_material: "E 250 (Fe 410 W)A",
    load_shear: "20",
    load_axial: "10",
    beam_section: "MB 300",
    column_section: "HB 150", 
    primary_beam: "MB 300",
    secondary_beam: "MB 300",
    supported_material: "E 165 (Fe 290)",
    supporting_material: "E 165 (Fe 290)",
    bolt_hole_type: "Standard",
    bolt_slip_factor: "0.3",
    bolt_tension_type: "Pre-tensioned",
    weld_fab: "Shop Weld",
    weld_material_grade: "410",
    detailing_edge_type: "Rolled, machine-flame cut, sawn and planed",
    detailing_gap: "10",
    detailing_corr_status: "No",
    design_method: "Limit State Design",
    angle_list: [],
    topangle_list: [],
    module: MODULE_KEY_CLEAT_ANGLE,
  },

  modalConfig: [
    { key: "boltDiameter", inputKey: "bolt_diameter", dataSource: "boltDiameterList" },
    { key: "propertyClass", inputKey: "bolt_grade", dataSource: "propertyClassList" },
    { key: "angleList", inputKey: "angle_list", dataSource: "angleList" },
    { key: "topAngle", inputKey: "topangle_list", dataSource: "angleList" },
  ],

  selectionConfig: [
    {
      key: "boltDiameterSelect",
      inputKey: "bolt_diameter",
      defaultValue: "All",
    },
    { key: "propertyClassSelect", inputKey: "bolt_grade", defaultValue: "All" },
    { key: "angleListSelect", inputKey: "angle_list", defaultValue: "All" },
    { key: "topAngleSelect", inputKey: "topangle_list", defaultValue: "All" },
  ],

  validateInputs: (inputs, extraState) => {
    // FIXED: Handle connectivity from extraState properly
    const connectivity = extraState?.selectedOption || inputs.connectivity || "Column Flange-Beam-Web";
    
    if (connectivity === "Column Flange-Beam-Web" || connectivity === "Column Web-Beam-Web") {
      if (!inputs.beam_section || !inputs.column_section || 
          inputs.beam_section === "Select Section" || 
          inputs.column_section === "Select Section") {
        return { isValid: false, message: UI_STRINGS.PLEASE_INPUT_ALL_FIELDS };
      }
    } else if (connectivity === "Beam-Beam") {
      if (!inputs.primary_beam || !inputs.secondary_beam) {
        return { isValid: false, message: UI_STRINGS.PLEASE_INPUT_ALL_FIELDS };
      }
    }
    
    // FIXED: Added validation for angle_list
    if (!inputs.angle_list || (Array.isArray(inputs.angle_list) && inputs.angle_list.length === 0)) {
      return { isValid: false, message: "Please select at least one angle from the angle list" };
    }
    if(!inputs.topangle_list || (Array.isArray(inputs.topangle_list) && inputs.topangle_list.length === 0)) {
      return { isValid: false, message: "Please select at least one angle from the angle list" };
    }
    
    return { isValid: true };
  },

  buildSubmissionParams: (inputs, allSelected, lists, extraState) => {
    const conn_map = {
      "Column Flange-Beam-Web": "Column Flange-Beam Web",
      "Column Web-Beam-Web": "Column Web-Beam Web", 
      "Beam-Beam": "Beam-Beam",
    };

    const connectivity = extraState?.selectedOption || inputs.connectivity || "Column Flange-Beam-Web";
    
    // Common parameters
    const baseParams = {
      "Bolt.Bolt_Hole_Type": inputs.bolt_hole_type,
      "Bolt.Diameter": allSelected.bolt_diameter ? lists.boltDiameterList : inputs.bolt_diameter,
      "Bolt.Grade": allSelected.bolt_grade ? lists.propertyClassList : inputs.bolt_grade,
      "Bolt.Slip_Factor": inputs.bolt_slip_factor,
      "Bolt.TensionType": inputs.bolt_tension_type,
      "Bolt.Type": inputs.bolt_type.replaceAll("_", " "),
      "Connectivity": conn_map[connectivity],
      "Connector.Material": inputs.connector_material,
      "Design.Design_Method": inputs.design_method,
      "Detailing.Corrosive_Influences": inputs.detailing_corr_status,
      "Detailing.Edge_type": inputs.detailing_edge_type,
      "Detailing.Gap": inputs.detailing_gap,
      "Load.Axial": inputs.load_axial || "",
      "Load.Shear": inputs.load_shear || "",
      "Material": inputs.connector_material,
      "Module": MODULE_KEY_CLEAT_ANGLE,
      "Weld.Fab": inputs.weld_fab,
      "Weld.Material_Grade_OverWrite": inputs.weld_material_grade,
      "Connector.Angle_List": allSelected.angle_list ? lists.angleList : inputs.angle_list, // FIXED: Ensure angleList is included
      "Connector.Top_Angle": allSelected.topangle_list ? lists.angleList : inputs.topangle_list, // FIXED: Ensure topAngle is included
    };

    // Connectivity-specific member assignments
    if (connectivity === "Beam-Beam") {
      return {
        ...baseParams,
        "Member.Supported_Section.Designation": inputs.secondary_beam,
        "Member.Supporting_Section.Designation": inputs.primary_beam,
        "Member.Supported_Section.Material": inputs.supported_material,
        "Member.Supporting_Section.Material": inputs.supporting_material,
      };
    } else {
      return {
        ...baseParams,
        "Member.Supported_Section.Designation": inputs.beam_section,
        "Member.Supporting_Section.Designation": inputs.column_section,
        "Member.Supported_Section.Material": inputs.supported_material,
        "Member.Supporting_Section.Material": inputs.supporting_material,
      };
    }
  },

  inputSections: [
    {
      title: UI_STRINGS.CONNECTING_MEMBERS,
      fields: [
        {
          key: "connectivity",
          label: UI_STRINGS.CONNECTIVITY,
          type: "connectivitySelect",
          // FIXED: Added onChange handler to set extraState
          onChange: (value, inputs, setInputs, contextData, extraState, setExtraState) => {
            setExtraState({ ...extraState, selectedOption: value });
            setInputs({ ...inputs, connectivity: value });
          }
        },
        {
          key: "column_section", 
          label: UI_STRINGS.COLUMN_SECTION,
          type: "select",
          options: "columnList",
          conditionalDisplay: (extraState) => {
            const connectivity = extraState?.selectedOption;
            return connectivity === "Column Flange-Beam-Web" || connectivity === "Column Web-Beam-Web";
          }
        },
        {
          key: "beam_section",
          label: UI_STRINGS.BEAM_SECTION, 
          type: "select",
          options: "beamList",
          conditionalDisplay: (extraState) => {
            const connectivity = extraState?.selectedOption;
            return connectivity === "Column Flange-Beam-Web" || connectivity === "Column Web-Beam-Web";
          }
        },
        {
          key: "primary_beam",
          label: UI_STRINGS.PRIMARY_BEAM,
          type: "select", 
          options: "beamList",
          conditionalDisplay: (extraState) => {
            const connectivity = extraState?.selectedOption;
            return connectivity === "Beam-Beam";
          }
        },
        {
          key: "secondary_beam",
          label: UI_STRINGS.SECONDARY_BEAM,
          type: "select",
          options: "beamList", 
          conditionalDisplay: (extraState) => {
            const connectivity = extraState?.selectedOption;
            return connectivity === "Beam-Beam";
          }
        },
        {
          key: "connector_material",
          label: UI_STRINGS.MATERIAL,
          type: "select",
          options: "materialList",
          onChange: (value, inputs, setInputs, materialList) => {
            const material = materialList.find(item => item.id === value);
            setInputs({
              ...inputs,
              connector_material: material.Grade,
            });
          }
        }
      ]
    },
    {
      title: UI_STRINGS.FACTORED_LOADS,
      fields: [
        { key: "load_shear", label: UI_STRINGS.SHEAR_FORCE, type: "number" },
        { key: "load_axial", label: UI_STRINGS.AXIAL_FORCE, type: "number" }
      ]
    },
    {
      title: UI_STRINGS.BOLT,
      fields: [
        {
          key: "bolt_diameter",
          label: UI_STRINGS.DIAMETER,
          type: "customizable",
          selectionKey: "boltDiameterSelect",
          modalKey: "boltDiameter",
          dataSource: "boltDiameterList"
        },
        {
          key: "bolt_type",
          label: UI_STRINGS.TYPE,
          type: "select",
          options: [
            { value: "Bearing_Bolt", label: "Bearing Bolt" },
            { value: "Friction_Grip_Bolt", label: "Friction Grip Bolt" }
          ]
        },
        {
          key: "bolt_grade",
          label: UI_STRINGS.PROPERTY_CLASS,
          type: "customizable",
          selectionKey: "propertyClassSelect",
          modalKey: "propertyClass",
          dataSource: "propertyClassList"
        }
      ]
    },
    {
      title: "Cleat Angle",
      fields: [
        {
          key: "angle_list",
          label: "Angle List",
          type: "customizable",
          selectionKey: "angleListSelect",
          modalKey: "angleList",
          dataSource: "angleList"
        },
        {
          key: "topangle_list",
          label: "Top Angle List",
          type: "customizable",
          selectionKey: "angleListSelect",
          modalKey: "angleList",
          dataSource: "angleList"
        }
      ]
    }
  ]
};
