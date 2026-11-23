
import { validateRequiredFields } from '../../../shared/utils/validation';
import { MATERIAL_CORE_KEYS, PREF_CORE_KEYS } from '../../../shared/config/prefCoreKeys';
import {
  CONN_CFBW,
  CONN_CWBW,
  KEY_AXIAL,
  KEY_CONN,
  KEY_CONNECTOR_MATERIAL,
  KEY_D,
  KEY_DISP_HEADERPLATE,
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
export const endPlateConfig = {
  sessionName: KEY_DISP_HEADERPLATE,
  designType: KEY_DISP_HEADERPLATE,
  cameraKey: KEY_DISP_HEADERPLATE,
  cadOptions: ["Model", "Beam", "Column", "Plate"],

  // IMPROVEMENT: Removed hardcoded defaults for API-driven lists (e.g., beam_section).
  // Defaults should be set dynamically after fetching data to prevent mismatches.
  defaultInputs: {
    connectivity: CONN_CFBW,
    column_section: "", // Set to empty string, to be populated from list
    beam_section: "",   // Set to empty string, to be populated from list
    primary_beam: "",   // Set to empty string, to be populated from list
    secondary_beam: "", // Set to empty string, to be populated from list
    bolt_type: "Bearing Bolt", // Default to a clean value from the new list

    // Default selections for customizable fields
    bolt_diameter: [],
    bolt_grade: [],
    plate_thickness: [],

    // Static defaults
    load_shear: "20",
    load_axial: "10",
    connector_material: "E 250 (Fe 410 W)A",
    supported_material: "E 165 (Fe 290)",
    supporting_material: "E 165 (Fe 290)",
    bolt_hole_type: "Standard",
    bolt_slip_factor: "0.3",
    weld_fab: "Shop Weld",
    weld_material_grade: "410",
    detailing_edge_type: "Rolled, machine-flame cut, sawn and planed",
    detailing_gap: "10",
    detailing_corr_status: "No",
    design_method: "Limit State Design",
    
    bolt_tension_type: "Pre-tensioned",
    module: KEY_DISP_HEADERPLATE,
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
    // The dock material is sent twice, as the connector material and as Material.
    connector_material: [KEY_CONNECTOR_MATERIAL, KEY_MATERIAL],
    // Not a field of this form: Material comes from connector_material.
    material: null,
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

  validateInputs: (inputs, extraState, _lists, selectionStates) => {
    const requiredCheck = validateRequiredFields(endPlateConfig.inputSections, inputs, extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;

    const connectivity = extraState?.selectedOption || inputs.connectivity;
    // IMPROVEMENT: Simplified validation logic for conciseness.
    if (connectivity === CONN_CFBW || connectivity === CONN_CWBW) {
      if (!inputs.beam_section || !inputs.column_section) {
        return { isValid: false, message: "Please select all required sections." };
      }
    } else if (connectivity === "Beam-Beam") {
      if (!inputs.primary_beam || !inputs.secondary_beam) {
        return { isValid: false, message: "Please select both primary and secondary beam sections." };
      }
    }
    return { isValid: true };
  },

  buildSubmissionParams: (inputs, allSelected, lists, extraState) => {
    // Ensure plate thickness list is always List[str]
    const toStrList = (arr = []) => (Array.isArray(arr) ? arr.map((v) => `${v}`) : []);
    const plateList = allSelected.plate_thickness
      ? toStrList(lists.thicknessList)
      : toStrList(inputs.plate_thickness);

    const connectivity = extraState?.selectedOption || inputs.connectivity;
    const params = {
      [KEY_DP_BOLT_HOLE_TYPE]: inputs.bolt_hole_type,
      [KEY_D]: allSelected.bolt_diameter ? lists.boltDiameterList : inputs.bolt_diameter,
      [KEY_GRD]: allSelected.bolt_grade ? lists.propertyClassList : inputs.bolt_grade,
      [KEY_DP_BOLT_SLIP_FACTOR]: inputs.bolt_slip_factor,
      [KEY_DP_BOLT_TYPE]: inputs.bolt_tension_type,
      [KEY_TYP]: inputs.bolt_type, // No need for replaceAll now
      [KEY_CONN]: connectivity,
      [KEY_CONNECTOR_MATERIAL]: inputs.connector_material,
      [KEY_DP_DESIGN_METHOD]: inputs.design_method,
      [KEY_DP_DETAILING_CORROSIVE_INFLUENCES]: inputs.detailing_corr_status,
      [KEY_DP_DETAILING_EDGE_TYPE]: inputs.detailing_edge_type,
      [KEY_DP_DETAILING_GAP]: inputs.detailing_gap,
      [KEY_AXIAL]: inputs.load_axial || "0",
      [KEY_SHEAR]: inputs.load_shear || "",
      [KEY_MATERIAL]: inputs.connector_material,
      [KEY_SUPTDSEC]: connectivity === "Beam-Beam" ? inputs.secondary_beam : inputs.beam_section,
      [KEY_SUPTDSEC_MATERIAL]: inputs.supported_material,
      [KEY_SUPTNGSEC]: connectivity === "Beam-Beam" ? inputs.primary_beam : inputs.column_section,
      [KEY_SUPTNGSEC_MATERIAL]: inputs.supporting_material,
      [KEY_MODULE]: KEY_DISP_HEADERPLATE,
      [KEY_DP_WELD_FAB]: inputs.weld_fab,
      [KEY_DP_WELD_MATERIAL_G_O]: inputs.weld_material_grade,
      [KEY_PLATETHK]: plateList,
    };
    return params;
  },

  inputSections: [
    {
      title: "Connecting Members",
      fields: [
        { key: "connectivity", label: "Connectivity", type: "connectivitySelect", options: "connectivityList" },
        { key: "primary_beam", label: "Primary Beam", type: "select", options: "beamList", conditionalDisplay: (extraState) => extraState?.selectedOption === "Beam-Beam" },
        { key: "secondary_beam", label: "Secondary Beam", type: "select", options: "beamList", conditionalDisplay: (extraState) => extraState?.selectedOption === "Beam-Beam" },
        { key: "column_section", label: "Column Section", type: "select", options: "columnList", conditionalDisplay: (extraState) => [CONN_CFBW, CONN_CWBW].includes(extraState?.selectedOption) },
        { key: "beam_section", label: "Beam Section", type: "select", options: "beamList", conditionalDisplay: (extraState) => [CONN_CFBW, CONN_CWBW].includes(extraState?.selectedOption) },
        {
          key: "connector_material", label: "Material", type: "select", options: "materialList",
          onChange: (value, inputs, setInputs, materialList, setShowModal) => {
            if (value == -1) {
              setShowModal(true);
              return;
            }
            const material = materialList.find((item) => item.id === value);
            if (material) {
              setInputs({ ...inputs, connector_material: material.Grade });
            }
          },
        },
      ],
    },
    {
      title: "Factored Loads",
      fields: [
        { key: "load_shear", label: "Shear Force (kN)", type: "number", required: true },
        { key: "load_axial", label: "Axial Force (kN)", type: "number", required: false },
      ],
    },
    {
      title: "Bolt",
      fields: [
        { key: "bolt_diameter", label: "Diameter (mm)", type: "customizable", selectionKey: "boltDiameterSelect", modalKey: "boltDiameter", dataSource: "boltDiameterList" },
        {
          // Use API data for bolt types
          key: "bolt_type",
          label: "Type",
          type: "select",
          options: "boltTypeList",
        },
        { key: "bolt_grade", label: "Property Class", type: "customizable", selectionKey: "propertyClassSelect", modalKey: "propertyClass", dataSource: "propertyClassList" },
      ],
    },
    {
      title: "Plate",
      fields: [
        { key: "plate_thickness", label: "Thickness (mm)", type: "customizable", selectionKey: "thicknessSelect", modalKey: "plateThickness", dataSource: "thicknessList" },
      ],
    },
  ],
};