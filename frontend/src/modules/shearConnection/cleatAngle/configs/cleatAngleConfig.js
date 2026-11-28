import { UI_STRINGS } from '../../../../constants/UIStrings';

import { validateRequiredFields } from '../../../shared/utils/validation';
import { MATERIAL_CORE_KEYS, PREF_CORE_KEYS } from '../../../shared/config/prefCoreKeys';
import { connectivityImage } from '../../../shared/config/connectionImages';
import {
  CONN_CFBW,
  CONN_CWBW,
  KEY_ANGLE_LIST,
  KEY_CONN,
  KEY_CONNECTOR_MATERIAL,
  KEY_D,
  KEY_DISP_CLEATANGLE,
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
  KEY_TYP,
} from "../../../../constants/generated/coreKeys";
export const cleatAngleConfig = {
  sessionName: KEY_DISP_CLEATANGLE,
  designType: KEY_DISP_CLEATANGLE,
  cameraKey: "CleatAngle",
  cadOptions: ["Model", "Beam", "Column", "CleatAngle"],

  defaultInputs: {
    // See finPlateConfig.js's identical comment on why this stays hardcoded
    // (required-field validation checks raw inputs.connectivity) alongside
    // the array[0]-derived fallback in buildSubmissionParams below.
    connectivity: CONN_CFBW,
    bolt_diameter: [],
    bolt_grade: [],
    bolt_type: "Bearing Bolt",
    material: "E 250 (Fe 410 W)A",
    load_shear: "20",
    beam_section: "MB 300",
    column_section: "HB 150", 
    primary_beam: "MB 300",
    secondary_beam: "MB 300",
    cleat_section: [],
    module: KEY_DISP_CLEATANGLE,
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
    // The cleat angle list goes out as the angle list.
    cleat_section: KEY_ANGLE_LIST,
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
    { key: "cleatSection", inputKey: "cleat_section", dataSource: "angleList" }, // Was cleatSectionList, now use angleList
  ],

  selectionConfig: [
    {
      key: "boltDiameterSelect",
      inputKey: "bolt_diameter",
      defaultValue: "All",
    },
    { key: "propertyClassSelect", inputKey: "bolt_grade", defaultValue: "All" },
    { key: "cleatSectionSelect", inputKey: "cleat_section", defaultValue: "All" },
  ],

  validateInputs: (inputs, extraState, lists, selectionStates) => {
    const requiredCheck = validateRequiredFields(cleatAngleConfig.inputSections, inputs, extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;

    const allSelected = selectionStates?.cleatSectionSelect === 'All';
    const optionsList = lists?.angleList || [];
    const selectedList = Array.isArray(inputs.cleat_section) ? inputs.cleat_section : [];

    // Accept 'All' if the full options list is present and non-empty. Accept Customized if at least one chosen item.
    if (
      (allSelected && optionsList.length === 0) ||
      (!allSelected && selectedList.length === 0)
    ) {
      return { isValid: false, message: "Please select at least one section from the cleat section list" };
    }
    return { isValid: true };
  },

  buildSubmissionParams: (inputs, allSelected, lists) => {
    // Matches the connectivitySelect widget's own options[0] visual
    // fallback (InputSection.jsx), derived from the live list rather than
    // a hardcoded literal that could drift out of sync with the backend's
    // actual option order.
    const connectivity = inputs.connectivity || lists?.connectivityList?.[0];
    // Common parameters
    const baseParams = {
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
      [KEY_SHEAR]: inputs.load_shear || "",
      [KEY_MATERIAL]: inputs.material,
      [KEY_MODULE]: KEY_DISP_CLEATANGLE,
      [KEY_DP_WELD_FAB]: inputs.weld_fab,
      [KEY_DP_WELD_MATERIAL_G_O]: inputs.weld_material_grade,
      [KEY_ANGLE_LIST]: allSelected.cleat_section ? lists.angleList : inputs.cleat_section,
    };
    // Connectivity-specific member assignments
    if (connectivity === "Beam-Beam") {
      return {
        ...baseParams,
        [KEY_SUPTDSEC]: inputs.secondary_beam,
        [KEY_SUPTNGSEC]: inputs.primary_beam,
        [KEY_SUPTDSEC_MATERIAL]: inputs.supported_material,
        [KEY_SUPTNGSEC_MATERIAL]: inputs.supporting_material,
      };
    } else {
      return {
        ...baseParams,
        [KEY_SUPTDSEC]: inputs.beam_section,
        [KEY_SUPTNGSEC]: inputs.column_section,
        [KEY_SUPTDSEC_MATERIAL]: inputs.supported_material,
        [KEY_SUPTNGSEC_MATERIAL]: inputs.supporting_material,
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
          imageSource: connectivityImage,
          onChange: (value, { inputs, setInputs }) => {
            setInputs({ ...inputs, connectivity: value });
          }
        },
        {
          key: "column_section", 
          label: UI_STRINGS.COLUMN_SECTION,
          type: "select",
          options: "columnList",
          conditionalDisplay: (extraState, inputs) => {
            const connectivity = inputs?.connectivity;
            return connectivity === CONN_CFBW || connectivity === CONN_CWBW;
          }
        },
        {
          key: "beam_section",
          label: UI_STRINGS.BEAM_SECTION, 
          type: "select",
          options: "beamList",
          conditionalDisplay: (extraState, inputs) => {
            const connectivity = inputs?.connectivity;
            return connectivity === CONN_CFBW || connectivity === CONN_CWBW;
          }
        },
        {
          key: "primary_beam",
          label: UI_STRINGS.PRIMARY_BEAM,
          type: "select", 
          options: "beamList",
          conditionalDisplay: (extraState, inputs) => {
            const connectivity = inputs?.connectivity;
            return connectivity === "Beam-Beam";
          }
        },
        {
          key: "secondary_beam",
          label: UI_STRINGS.SECONDARY_BEAM,
          type: "select",
          options: "beamList", 
          conditionalDisplay: (extraState, inputs) => {
            const connectivity = inputs?.connectivity;
            return connectivity === "Beam-Beam";
          }
        },
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
        { key: "load_shear", label: UI_STRINGS.SHEAR_FORCE, type: "number", required: true }
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
          key: "cleat_section",
          label: "Cleat Section",
          type: "customizable",
          selectionKey: "cleatSectionSelect",
          modalKey: "cleatSection",
          dataSource: "angleList" // Use the same as previous angle_list
        }
      ]
    }
  ]
};
