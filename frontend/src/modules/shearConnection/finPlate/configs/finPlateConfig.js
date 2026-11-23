import { UI_STRINGS } from '../../../../constants/UIStrings';

import { validateRequiredFields } from '../../../shared/utils/validation';
import { MATERIAL_CORE_KEYS, PREF_CORE_KEYS } from '../../../shared/config/prefCoreKeys';
import {
  CONN_CFBW,
  CONN_CWBW,
  KEY_AXIAL,
  KEY_CONN,
  KEY_CONNECTOR_MATERIAL,
  KEY_D,
  KEY_DISP_FINPLATE,
  KEY_DP_BOLT_HOLE_TYPE,
  KEY_DP_BOLT_SLIP_FACTOR,
  KEY_DP_BOLT_TYPE,
  KEY_DP_DESIGN_METHOD,
  KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
  KEY_DP_DETAILING_EDGE_TYPE,
  KEY_DP_DETAILING_GAP,
  KEY_DP_WELD_FAB,
  KEY_DP_WELD_MATERIAL_G_O,
  KEY_GRD,
  KEY_MATERIAL,
  KEY_MODULE,
  KEY_PLATETHK,
  KEY_SHEAR,
  KEY_SUPTDSEC,
  KEY_SUPTDSEC_MATERIAL,
  KEY_SUPTNGSEC,
  KEY_SUPTNGSEC_MATERIAL,
  KEY_TYP,
} from "../../../../constants/generated/coreKeys";
export const finPlateConfig = {
  sessionName: KEY_DISP_FINPLATE,
  designType: KEY_DISP_FINPLATE,
  cameraKey: KEY_DISP_FINPLATE,
  cadOptions: ["Model", "Beam", "Column", "Plate"],

  defaultInputs: {
   connectivity: CONN_CFBW,
    bolt_diameter: [],
    bolt_grade: [],
    bolt_type: "Bearing_Bolt",
    // connector_material: "E 250 (Fe 410 W)A",
    connector_material: "E 165 (Fe 290)",
    material: "E 165 (Fe 290)",
    load_shear: "70",
    load_axial: "30",
    module: KEY_DISP_FINPLATE,
    plate_thickness: [],
    beam_section: "MB 300",
    column_section: "HB 150",
    primary_beam: "JB 200",
    secondary_beam: "JB 150",
    supported_material: "E 165 (Fe 290)",
    supporting_material: "E 165 (Fe 290)",
    // Hardcoded defaults for undefined fields:
    bolt_hole_type: "Standard",
    bolt_slip_factor: "0.3",
    bolt_tension_type: "Pre-tensioned",
    weld_fab: "Shop Weld",
    weld_material_grade: "410",
    detailing_edge_type: "Rolled, machine-flame cut, sawn and planed",
    detailing_gap: "10",
    detailing_corr_status: "No",
    design_method: "Limit State Design",
  },

  // Every form field and the core key(s) it feeds; null for a field that feeds none.
  // The test in src/test/coreKeyMap.test.js checks this against what buildSubmissionParams sends.
  coreKeys: {
    ...PREF_CORE_KEYS,
    ...MATERIAL_CORE_KEYS,
    connectivity: KEY_CONN,
    module: KEY_MODULE,
    bolt_diameter: KEY_D,
    bolt_grade: KEY_GRD,
    bolt_type: KEY_TYP,
    plate_thickness: KEY_PLATETHK,
    load_shear: KEY_SHEAR,
    load_axial: KEY_AXIAL,
    // One section field per connectivity: the beam-to-column pair and the beam-to-beam pair.
    beam_section: KEY_SUPTDSEC,
    secondary_beam: KEY_SUPTDSEC,
    column_section: KEY_SUPTNGSEC,
    primary_beam: KEY_SUPTNGSEC,
    // The dock material is Material; connector_material is the Connector tab of Additional Inputs.
    material: KEY_MATERIAL,
    connector_material: KEY_CONNECTOR_MATERIAL,
  },

  modalConfig: [
    { key: "boltDiameter", inputKey: "bolt_diameter", dataSource: "boltDiameterList" },
    { key: "propertyClass", inputKey: "bolt_grade", dataSource: "propertyClassList" },
    { key: "plateThickness", inputKey: "plate_thickness", dataSource: "thicknessList" },
  ],

  selectionConfig: [
    { key: "boltDiameterSelect", inputKey: "bolt_diameter", defaultValue: "All" },
    { key: "propertyClassSelect", inputKey: "bolt_grade", defaultValue: "All" },
    { key: "thicknessSelect", inputKey: "plate_thickness", defaultValue: "All" },
  ],

  validateInputs: (inputs, extraState, lists, selectionStates) => {
    const requiredCheck = validateRequiredFields(finPlateConfig.inputSections, inputs, extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;
    const connectivity = extraState?.selectedOption || inputs.connectivity || lists?.connectivityList?.[0];

    // Basic numeric loads must not be empty
    if (inputs.load_shear === "") {
      return { isValid: false, message: UI_STRINGS.PLEASE_INPUT_ALL_FIELDS };
    }

    if (connectivity === CONN_CFBW || connectivity === CONN_CWBW) {
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

    return { isValid: true };
  },

  buildSubmissionParams: (inputs, allSelected, lists, extraState) => {

    const connectivity = extraState?.selectedOption || inputs.connectivity || lists?.connectivityList?.[0];

    if (connectivity === CONN_CFBW || connectivity === CONN_CWBW) {
      return {
        [KEY_DP_BOLT_HOLE_TYPE]: inputs.bolt_hole_type,
        [KEY_D]: allSelected.bolt_diameter ? lists.boltDiameterList : inputs.bolt_diameter,
        [KEY_GRD]: allSelected.bolt_grade ? lists.propertyClassList : inputs.bolt_grade,
        [KEY_DP_BOLT_SLIP_FACTOR]: inputs.bolt_slip_factor,
        [KEY_DP_BOLT_TYPE]: inputs.bolt_tension_type,
        [KEY_TYP]: inputs.bolt_type.replaceAll("_", " "),
        [KEY_CONN]: connectivity,
        [KEY_CONNECTOR_MATERIAL]: inputs.connector_material,
        [KEY_DP_DESIGN_METHOD]: inputs.design_method,
        [KEY_DP_DETAILING_CORROSIVE_INFLUENCES]: inputs.detailing_corr_status,
        [KEY_DP_DETAILING_EDGE_TYPE]: inputs.detailing_edge_type,
        [KEY_DP_DETAILING_GAP]: inputs.detailing_gap,
        [KEY_AXIAL]: inputs.load_axial || "0",
        [KEY_SHEAR]: inputs.load_shear || "",
        [KEY_MATERIAL]: inputs.material,
        [KEY_SUPTDSEC]: inputs.beam_section,
        [KEY_SUPTDSEC_MATERIAL]: inputs.supported_material,
        [KEY_SUPTNGSEC]: inputs.column_section,
        [KEY_SUPTNGSEC_MATERIAL]: inputs.supporting_material,
        [KEY_MODULE]: KEY_DISP_FINPLATE,
        [KEY_DP_WELD_FAB]: inputs.weld_fab,
        [KEY_DP_WELD_MATERIAL_G_O]: inputs.weld_material_grade,
        [KEY_PLATETHK]: allSelected.plate_thickness ? lists.thicknessList : inputs.plate_thickness,
      };
    } else {
      return {
        [KEY_DP_BOLT_HOLE_TYPE]: inputs.bolt_hole_type,
        [KEY_D]: allSelected.bolt_diameter ? lists.boltDiameterList : inputs.bolt_diameter,
        [KEY_GRD]: allSelected.bolt_grade ? lists.propertyClassList : inputs.bolt_grade,
        [KEY_DP_BOLT_SLIP_FACTOR]: inputs.bolt_slip_factor,
        [KEY_DP_BOLT_TYPE]: inputs.bolt_tension_type,
        [KEY_TYP]: inputs.bolt_type.replaceAll("_", " "),
        [KEY_CONN]: connectivity,
        [KEY_CONNECTOR_MATERIAL]: inputs.connector_material,
        [KEY_DP_DESIGN_METHOD]: inputs.design_method,
        [KEY_DP_DETAILING_CORROSIVE_INFLUENCES]: inputs.detailing_corr_status,
        [KEY_DP_DETAILING_EDGE_TYPE]: inputs.detailing_edge_type,
        [KEY_DP_DETAILING_GAP]: inputs.detailing_gap,
        [KEY_AXIAL]: inputs.load_axial || "0",
        [KEY_SHEAR]: inputs.load_shear || "",
        [KEY_MATERIAL]: inputs.material,
        [KEY_SUPTDSEC]: inputs.secondary_beam,
        [KEY_SUPTDSEC_MATERIAL]: inputs.supported_material,
        [KEY_SUPTNGSEC]: inputs.primary_beam,
        [KEY_SUPTNGSEC_MATERIAL]: inputs.supporting_material,
        [KEY_MODULE]: KEY_DISP_FINPLATE,
        [KEY_DP_WELD_FAB]: inputs.weld_fab,
        [KEY_DP_WELD_MATERIAL_G_O]: inputs.weld_material_grade,
        [KEY_PLATETHK]: allSelected.plate_thickness ? lists.thicknessList : inputs.plate_thickness,
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
          type: "connectivitySelect"
        },
        {
          key: "column_section",
          label: UI_STRINGS.COLUMN_SECTION,
          type: "select",
          options: "columnList",
          conditionalDisplay: (extraState) => {
            const connectivity = extraState?.selectedOption;
            return connectivity === CONN_CFBW || connectivity === CONN_CWBW;
          }
        },
        {
          key: "beam_section",
          label: UI_STRINGS.BEAM_SECTION,
          type: "select",
          options: "beamList",
          conditionalDisplay: (extraState) => {
            const connectivity = extraState?.selectedOption;
            return connectivity === CONN_CFBW || connectivity === CONN_CWBW;
          }
        },
        {
          key: "primary_beam",
          label: "Primary Beam Section",
          type: "select",
          options: "beamList",
          conditionalDisplay: (extraState) => extraState?.selectedOption === "Beam-Beam"
        },
        {
          key: "secondary_beam",
          label: "Secondary Beam Section",
          type: "select",
          options: "beamList",
          conditionalDisplay: (extraState) => extraState?.selectedOption === "Beam-Beam"
        },
        {
          key: "material",
          label: UI_STRINGS.MATERIAL,
          type: "select",
          options: "materialList",
          onChange: (value, inputs, setInputs, materialList) => {
            const material = materialList.find(item => item.id === value);
            setInputs({
              ...inputs,
              material: material.Grade,
              connector_material: material.Grade,
            });
          }
        }
      ]
    },
    {
      title: UI_STRINGS.FACTORED_LOADS,
      fields: [
        { key: "load_shear", label: UI_STRINGS.SHEAR_FORCE, type: "number", required: true },
        { key: "load_axial", label: UI_STRINGS.AXIAL_FORCE, type: "number", required: false }
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
      title: UI_STRINGS.PLATE,
      fields: [
        {
          key: "plate_thickness",
          label: UI_STRINGS.THICKNESS,
          type: "customizable",
          selectionKey: "thicknessSelect",
          modalKey: "plateThickness",
          dataSource: "thicknessList"
        }
      ]
    }
  ]
};