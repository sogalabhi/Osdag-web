import { UI_STRINGS } from '../../../../constants/UIStrings';

import { validateRequiredFields } from '../../../shared/utils/validation';
import { MATERIAL_CORE_KEYS, PREF_CORE_KEYS } from '../../../shared/config/prefCoreKeys';
import { connectivityImage } from '../../../shared/config/connectionImages';
import {
  CONN_CFBW,
  CONN_CWBW,
  KEY_ANGLE_LIST,
  KEY_AXIAL,
  KEY_CONN,
  KEY_CONNECTOR_MATERIAL,
  KEY_D,
  KEY_DISP_SEATED_ANGLE,
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
  KEY_SHEAR,
  KEY_SUPTDSEC,
  KEY_SUPTDSEC_MATERIAL,
  KEY_SUPTNGSEC,
  KEY_SUPTNGSEC_MATERIAL,
  KEY_TOPANGLE,
  KEY_TYP,
} from "../../../../constants/generated/coreKeys";
export const seatedAngleConfig = {
  sessionName: KEY_DISP_SEATED_ANGLE,
  designType: KEY_DISP_SEATED_ANGLE,
  cameraKey: "SeatedAngle",
  cadOptions: ["Model", "Beam", "Column", "SeatedAngle"],
  
  defaultInputs: {
    // See finPlateConfig.js's identical comment on why this stays hardcoded
    // (required-field validation checks raw inputs.connectivity) alongside
    // the array[0]-derived fallback in validateInputs/buildSubmissionParams
    // below.
    connectivity: CONN_CFBW,
    bolt_diameter: [],
    bolt_grade: [],
    bolt_type: "Bearing_Bolt",
    material: "E 250 (Fe 410 W)A",
    load_shear: "70",
    load_axial: "0",
    module: KEY_DISP_SEATED_ANGLE,
    beam_section: "MB 300",
    column_section: "HB 150",
    primary_beam: "JB 200",
    secondary_beam: "JB 150",
    angle_list: [],
    topangle_list: [],
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
    load_shear: KEY_SHEAR,
    load_axial: KEY_AXIAL,
    // Each field really feeds its own key (angle_list -> Angle_List, topangle_list -> Top_Angle),
    // but both fields share one option list (angleList), so with "All" selected the test sees
    // that list reach both keys from either field. Both are declared on both to match.
    angle_list: KEY_ANGLE_LIST,
    topangle_list: KEY_TOPANGLE,
    // One section field per connectivity: the beam-to-column pair and the beam-to-beam pair
    // (the Beam-Beam fields are commented out of the form but the builder still reads them).
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
    { key: "angleList", inputKey: "angle_list", dataSource: "angleList" },
    { key: "topAngle", inputKey: "topangle_list", dataSource: "angleList" },
  ],

  selectionConfig: [
    { key: "boltDiameterSelect", inputKey: "bolt_diameter", defaultValue: "All" },
    { key: "propertyClassSelect", inputKey: "bolt_grade", defaultValue: "All" },
    { key: "angleListSelect", inputKey: "angle_list", defaultValue: "All" },
    { key: "topAngleSelect", inputKey: "topangle_list", defaultValue: "All" },
    { key: "secondaryBeamSelect", inputKey: "secondary_beam", defaultValue: "All" },
  ],

  validateInputs: (inputs, extraState, lists, selectionStates) => {
    const requiredCheck = validateRequiredFields(seatedAngleConfig.inputSections, inputs, extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;

    // Matches the connectivitySelect widget's own options[0] visual
    // fallback (InputSection.jsx) — a user who never touches the
    // Connectivity dropdown still sees/submits a real value, derived from
    // the live list rather than a hardcoded literal.
    const connectivity = extraState?.selectedOption || inputs.connectivity || lists?.connectivityList?.[0];
    
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

    // See validateInputs's identical comment on this fallback chain.
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
        [KEY_AXIAL]: inputs.load_axial || "",
        [KEY_SHEAR]: inputs.load_shear || "",
        [KEY_MATERIAL]: inputs.material,
        [KEY_SUPTDSEC]: inputs.beam_section,
        [KEY_SUPTDSEC_MATERIAL]: inputs.supported_material,
        [KEY_SUPTNGSEC]: inputs.column_section,
        [KEY_SUPTNGSEC_MATERIAL]: inputs.supporting_material,
        [KEY_MODULE]: KEY_DISP_SEATED_ANGLE,
        [KEY_DP_WELD_FAB]: inputs.weld_fab,
        [KEY_DP_WELD_MATERIAL_G_O]: inputs.weld_material_grade,
        [KEY_ANGLE_LIST]: allSelected.angle_list ? lists.angleList : inputs.angle_list,
        [KEY_TOPANGLE]: allSelected.topangle_list ? lists.angleList : inputs.topangle_list,
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
        [KEY_AXIAL]: inputs.load_axial || "",
        [KEY_SHEAR]: inputs.load_shear || "",
        [KEY_MATERIAL]: inputs.material,
        [KEY_SUPTDSEC]: inputs.secondary_beam,
        [KEY_SUPTDSEC_MATERIAL]: inputs.supported_material,
        [KEY_SUPTNGSEC]: inputs.primary_beam,
        [KEY_SUPTNGSEC_MATERIAL]: inputs.supporting_material,
        [KEY_MODULE]: KEY_DISP_SEATED_ANGLE,
        [KEY_DP_WELD_FAB]: inputs.weld_fab,
        [KEY_DP_WELD_MATERIAL_G_O]: inputs.weld_material_grade,
        [KEY_ANGLE_LIST]: allSelected.angle_list ? lists.angleList : inputs.angle_list,
        [KEY_TOPANGLE]: allSelected.topangle_list ? lists.angleList : inputs.topangle_list,
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
          imageSource: connectivityImage
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
        // {
        //   key: "primary_beam",
        //   label: UI_STRINGS.PRIMARY_BEAM,
        //   type: "select", 
        //   options: "beamList",
        //   conditionalDisplay: (extraState) => {
        //     const connectivity = extraState?.selectedOption;
        //     return connectivity === "Beam-Beam";
        //   }
        // },
        // {
        //   key: "secondary_beam",
        //   label: UI_STRINGS.SECONDARY_BEAM,
        //   type: "select",
        //   options: "beamList", 
        //   conditionalDisplay: (extraState) => {
        //     const connectivity = extraState?.selectedOption;
        //     return connectivity === "Beam-Beam";
        //   }
        // },
        {
          key: "material", customMaterial: "connector",
          label: UI_STRINGS.MATERIAL,
          type: "select",
          options: "materialList",
        }
      ]
    },
    {
      title: UI_STRINGS.FACTORED_LOADS,
      fields: [
        { key: "load_shear", label: UI_STRINGS.SHEAR_FORCE, type: "number", required: true },
        // { key: "load_axial", label: UI_STRINGS.AXIAL_FORCE, type: "number" }
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
            { value: "Bearing_Bolt", label: UI_STRINGS.TYPE + " (Bearing Bolt)" },
            { value: "Friction_Grip_Bolt", label: UI_STRINGS.TYPE + " (Friction Grip Bolt)" }
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
      title: UI_STRINGS.ANGLE_SECTION,
      fields: [
        {
          key: "angle_list",
          label: UI_STRINGS.SEATEDANGLE,
          type: "customizable",
          selectionKey: "angleListSelect",
          modalKey: "angleList",
          dataSource: "angleList"
        },
        {
          key: "topangle_list",
          label: UI_STRINGS.TOPANGLE,
          type: "customizable",
          selectionKey: "topAngleSelect",
          modalKey: "topAngle",
          dataSource: "angleList"
        }
      ]
    }
  ]
};
