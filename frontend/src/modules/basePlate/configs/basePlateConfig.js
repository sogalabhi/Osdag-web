import { UI_STRINGS } from '../../../constants/UIStrings';

import { validateRequiredFields } from '../../shared/utils/validation';
import { MATERIAL_CORE_KEYS, PREF_CORE_KEYS } from '../../shared/config/prefCoreKeys';
import {
  KEY_AXIAL,
  KEY_AXIAL_BP,
  KEY_AXIAL_TENSION_BP,
  KEY_CONN,
  KEY_DIA_ANCHOR_ICF,
  KEY_DIA_ANCHOR_OCF,
  KEY_DISP_BASE_PLATE,
  KEY_END_CONDITION,
  KEY_GRD_ANCHOR_ICF,
  KEY_GRD_ANCHOR_OCF,
  KEY_GRD_FOOTING,
  KEY_MATERIAL,
  KEY_MODULE,
  KEY_MOMENT_MAJOR,
  KEY_MOMENT_MINOR,
  KEY_SECSIZE,
  KEY_SHEAR_MAJOR,
  KEY_SHEAR_MINOR,
  KEY_TYP_ANCHOR,
  KEY_WELD_TYPE,
  KEY_BASE_PLATE_MATERIAL,
  KEY_ST_KEY_MATERIAL,
  KEY_DP_DESIGN_BASE_PLATE,
  KEY_DP_ANCHOR_BOLT_FRICTION,
  KEY_DP_ANCHOR_BOLT_DESIGNATION_OCF,
  KEY_DP_ANCHOR_BOLT_TYPE_OCF,
  KEY_DP_ANCHOR_BOLT_GALVANIZED_OCF,
  KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF,
  KEY_DP_ANCHOR_BOLT_LENGTH_OCF,
  KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_OCF,
  KEY_DP_ANCHOR_BOLT_DESIGNATION_ICF,
  KEY_DP_ANCHOR_BOLT_TYPE_ICF,
  KEY_DP_ANCHOR_BOLT_GALVANIZED_ICF,
  KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF,
  KEY_DP_ANCHOR_BOLT_LENGTH_ICF,
  KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_ICF,
} from "../../../constants/generated/coreKeys";
export const basePlateConfig = {
  sessionName: "Base Plate",
  designType: KEY_DISP_BASE_PLATE,
  cameraKey: "BasePlateConnection",
  cadOptions: ["Model", "Column", "Plate", "Welds", "Bolts", "Concrete", "Grout"],

  // Fields a design dictionary does not fill. The old .osi loader read the inside-flange anchor
  // lists (Anchor Bolt.ICF.*) into the outside-flange fields and the outside ones overwrote them,
  // so a loaded file never set the ICF lists (they stayed on "All"). Kept so opening a file sends
  // the same request as before; remove these two entries to read the ICF lists from the file.
  notLoadedFromDictionary: ["anchor_diameter_icf", "anchor_grade_icf"],

  defaultInputs: {
    module: KEY_DISP_BASE_PLATE,
    member_designation: "",
    material: "E 250 (Fe 410 W)A",
    connectivity: "Welded Column Base",
    end_condition: "Pinned",
    load_axial: "200",
    load_axial_tension: "0",
    load_shear_major: "50",
    load_shear_minor: "30",
    load_moment_major: "0",
    load_moment_minor: "0",
    anchor_diameter_ocf: [],
    anchor_grade_ocf: [],
    anchor_diameter_icf: [],
    anchor_grade_icf: [],
    anchor_type: "End Plate Type",
    footing_grade: "M25",
    weld_type: "Fillet Weld",
  },

  validateInputs: (inputs, _extraState, _lists, selectionStates) => {
    const requiredCheck = validateRequiredFields(basePlateConfig.inputSections, inputs, _extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;

    if (!inputs.connectivity || !inputs.material) {
      return { isValid: false, message: UI_STRINGS.PLEASE_INPUT_ALL_FIELDS };
    }
    const designation = inputs.member_designation;
    if (!designation || designation === "Select Section" || String(designation).trim() === "") {
      return { isValid: false, message: "Please select a column section." };
    }
    const axial = parseFloat(inputs.load_axial);
    if (inputs.load_axial !== "" && isNaN(axial)) {
      return { isValid: false, message: UI_STRINGS.PLEASE_INPUT_ALL_FIELDS };
    }
    if (inputs.load_axial === "") {
      return { isValid: false, message: "Please enter Axial Compression (kN)." };
    }
    const shearMaj = inputs.load_shear_major !== "" ? parseFloat(inputs.load_shear_major) : NaN;
    if (inputs.load_shear_major !== "" && isNaN(shearMaj)) {
      return { isValid: false, message: UI_STRINGS.PLEASE_INPUT_ALL_FIELDS };
    }
    if (selectionStates?.anchorDiameterOcfSelect === "Customized" && (!Array.isArray(inputs.anchor_diameter_ocf) || !inputs.anchor_diameter_ocf.length)) {
      return { isValid: false, message: "Please select at least one anchor diameter (OCF)." };
    }
    if (selectionStates?.anchorGradeOcfSelect === "Customized" && (!Array.isArray(inputs.anchor_grade_ocf) || !inputs.anchor_grade_ocf.length)) {
      return { isValid: false, message: "Please select at least one property class (OCF)." };
    }
    if (selectionStates?.anchorDiameterIcfSelect === "Customized" && (!Array.isArray(inputs.anchor_diameter_icf) || !inputs.anchor_diameter_icf.length)) {
      return { isValid: false, message: "Please select at least one anchor diameter (ICF)." };
    }
    if (selectionStates?.anchorGradeIcfSelect === "Customized" && (!Array.isArray(inputs.anchor_grade_icf) || !inputs.anchor_grade_icf.length)) {
      return { isValid: false, message: "Please select at least one property class (ICF)." };
    }
    return { isValid: true };
  },

  buildSubmissionParams: (inputs, allSelected, lists) => {
    const section = inputs.member_designation;
    const memberDesignation =
      section != null && String(section).trim() !== "" ? String(section).trim() : "";
    const toArr = (v) => (Array.isArray(v) && v.length ? v : []);
    const diameterOcf = allSelected?.anchor_diameter_ocf ? (lists.anchorDiameterList || []) : toArr(inputs.anchor_diameter_ocf);
    const gradeOcf = allSelected?.anchor_grade_ocf ? (lists.anchorGradeList || []) : toArr(inputs.anchor_grade_ocf);
    const diameterIcf = allSelected?.anchor_diameter_icf ? (lists.anchorDiameterList || []) : toArr(inputs.anchor_diameter_icf);
    const gradeIcf = allSelected?.anchor_grade_icf ? (lists.anchorGradeList || []) : toArr(inputs.anchor_grade_icf);
    return {
      [KEY_MODULE]: KEY_DISP_BASE_PLATE,
      [KEY_SECSIZE]: memberDesignation,
      [KEY_MATERIAL]: inputs.material || "E 250 (Fe 410 W)A",
      [KEY_CONN]: inputs.connectivity || "Welded Column Base",
      [KEY_END_CONDITION]: inputs.end_condition || "Pinned",
      [KEY_AXIAL]: inputs.load_axial ?? "",
      [KEY_AXIAL_TENSION_BP]: inputs.load_axial_tension || "0",
      [KEY_SHEAR_MAJOR]: inputs.load_shear_major ?? "",
      [KEY_SHEAR_MINOR]: inputs.load_shear_minor ?? "",
      [KEY_MOMENT_MAJOR]: inputs.load_moment_major || "0",
      [KEY_MOMENT_MINOR]: inputs.load_moment_minor || "0",
      [KEY_TYP_ANCHOR]: inputs.anchor_type || "End Plate Type",
      [KEY_GRD_FOOTING]: (inputs.footing_grade && inputs.footing_grade !== "Select Grade") ? inputs.footing_grade : "M20",
      [KEY_WELD_TYPE]: inputs.weld_type || "Fillet Weld",
      [KEY_DIA_ANCHOR_OCF]: diameterOcf.length ? diameterOcf : ["M20"],
      [KEY_GRD_ANCHOR_OCF]: gradeOcf.length ? gradeOcf : ["8.8"],
      [KEY_DIA_ANCHOR_ICF]: diameterIcf.length ? diameterIcf : diameterOcf.length ? diameterOcf : ["M20"],
      [KEY_GRD_ANCHOR_ICF]: gradeIcf.length ? gradeIcf : gradeOcf.length ? gradeOcf : ["8.8"],
    };
  },

  // Every form field and the core key(s) it feeds; null for a field that feeds none.
  // The test in src/test/coreKeyMap.test.js checks this against what buildSubmissionParams sends.
  coreKeys: {
    ...PREF_CORE_KEYS,
    ...MATERIAL_CORE_KEYS,
    module: KEY_MODULE,
    member_designation: KEY_SECSIZE,
    material: KEY_MATERIAL,
    connectivity: KEY_CONN,
    end_condition: KEY_END_CONDITION,
    // The builder sends the compression load as Load.Axial; the desktop .osi writes Load.Axial_Compression.
    load_axial: [KEY_AXIAL, KEY_AXIAL_BP],
    load_axial_tension: KEY_AXIAL_TENSION_BP,
    load_shear_major: KEY_SHEAR_MAJOR,
    load_shear_minor: KEY_SHEAR_MINOR,
    load_moment_major: KEY_MOMENT_MAJOR,
    load_moment_minor: KEY_MOMENT_MINOR,
    // Outside- and inside-flange anchors share one option list; each field feeds only its own key.
    anchor_diameter_ocf: KEY_DIA_ANCHOR_OCF,
    anchor_grade_ocf: KEY_GRD_ANCHOR_OCF,
    anchor_diameter_icf: KEY_DIA_ANCHOR_ICF,
    anchor_grade_icf: KEY_GRD_ANCHOR_ICF,
    anchor_type: KEY_TYP_ANCHOR,
    footing_grade: KEY_GRD_FOOTING,
    weld_type: KEY_WELD_TYPE,
    // Additional Inputs fields of this module are already keyed by core key.
    [KEY_BASE_PLATE_MATERIAL]: KEY_BASE_PLATE_MATERIAL,
    [KEY_ST_KEY_MATERIAL]: KEY_ST_KEY_MATERIAL,
    [KEY_DP_DESIGN_BASE_PLATE]: KEY_DP_DESIGN_BASE_PLATE,
    [KEY_DP_ANCHOR_BOLT_FRICTION]: KEY_DP_ANCHOR_BOLT_FRICTION,
    [KEY_DP_ANCHOR_BOLT_DESIGNATION_OCF]: KEY_DP_ANCHOR_BOLT_DESIGNATION_OCF,
    [KEY_DP_ANCHOR_BOLT_TYPE_OCF]: KEY_DP_ANCHOR_BOLT_TYPE_OCF,
    [KEY_DP_ANCHOR_BOLT_GALVANIZED_OCF]: KEY_DP_ANCHOR_BOLT_GALVANIZED_OCF,
    [KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF]: KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF,
    [KEY_DP_ANCHOR_BOLT_LENGTH_OCF]: KEY_DP_ANCHOR_BOLT_LENGTH_OCF,
    [KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_OCF]: KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_OCF,
    [KEY_DP_ANCHOR_BOLT_DESIGNATION_ICF]: KEY_DP_ANCHOR_BOLT_DESIGNATION_ICF,
    [KEY_DP_ANCHOR_BOLT_TYPE_ICF]: KEY_DP_ANCHOR_BOLT_TYPE_ICF,
    [KEY_DP_ANCHOR_BOLT_GALVANIZED_ICF]: KEY_DP_ANCHOR_BOLT_GALVANIZED_ICF,
    [KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF]: KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF,
    [KEY_DP_ANCHOR_BOLT_LENGTH_ICF]: KEY_DP_ANCHOR_BOLT_LENGTH_ICF,
    [KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_ICF]: KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_ICF,
  },

  modalConfig: [
    { key: "anchorDiameterOcf", inputKey: "anchor_diameter_ocf", dataSource: "anchorDiameterList" },
    { key: "anchorGradeOcf", inputKey: "anchor_grade_ocf", dataSource: "anchorGradeList" },
    { key: "anchorDiameterIcf", inputKey: "anchor_diameter_icf", dataSource: "anchorDiameterList" },
    { key: "anchorGradeIcf", inputKey: "anchor_grade_icf", dataSource: "anchorGradeList" },
  ],
  selectionConfig: [
    { key: "anchorDiameterOcfSelect", inputKey: "anchor_diameter_ocf", defaultValue: "All" },
    { key: "anchorGradeOcfSelect", inputKey: "anchor_grade_ocf", defaultValue: "All" },
    { key: "anchorDiameterIcfSelect", inputKey: "anchor_diameter_icf", defaultValue: "All" },
    { key: "anchorGradeIcfSelect", inputKey: "anchor_grade_icf", defaultValue: "All" },
  ],

  inputSections: [
    {
      title: "Connecting Members",
      fields: [
        { key: "connectivity", label: "Connectivity", type: "select", options: "connectivityList" },
        { key: "end_condition", label: "End Condition (Major Axis z-z axis)", type: "text", disabled: true },
        {
          key: "member_designation",
          label: "Column Section",
          type: "select",
          // A hollow column base takes only hollow sections.
          getOptions: (inputs, lists) =>
            (inputs.connectivity === "Hollow/Tubular Column Base"
              ? lists.hollowSectionDesignation
              : lists.sectionDesignation) ?? [],
        },
        { key: "material", label: "Material", type: "select", options: "materialList" },
      ],
    },
    {
      title: "Factored Loads",
      fields: [
        { key: "load_axial", label: "Axial Compression (kN)", type: "number" },
        { key: "load_axial_tension", label: "Axial Tension/Uplift (kN)", type: "number", required: false, conditionalDisplay: (extraState, inputs) => inputs?.connectivity === "Moment Base Plate" },
        { key: "load_shear_major", label: "Shear Force (kN) - Along major axis (z-z)", type: "number", required: true },
        { key: "load_shear_minor", label: "Shear Force (kN) - Along minor axis (y-y)", type: "number", required: true },
        { key: "load_moment_major", label: "Bending Moment (kNm) - Major axis (M\u2082-z)", type: "number", conditionalDisplay: (extraState, inputs) => inputs?.connectivity === "Moment Base Plate", required: true },
        { key: "load_moment_minor", label: "Bending Moment (kNm) - Minor axis (My-y)", type: "number", conditionalDisplay: (extraState, inputs) => inputs?.connectivity === "Moment Base Plate", required: true },
      ],
    },
    {
      title: "Anchor Bolt Outside Column Flange",
      fields: [
        { key: "anchor_diameter_ocf", label: "Diameter (mm)", type: "customizable", selectionKey: "anchorDiameterOcfSelect", modalKey: "anchorDiameterOcf", dataSource: "anchorDiameterList" },
        { key: "anchor_grade_ocf", label: "Property Class", type: "customizable", selectionKey: "anchorGradeOcfSelect", modalKey: "anchorGradeOcf", dataSource: "anchorGradeList" },
      ],
    },
    {
      title: "Anchor Bolt Inside Column Flange",
      fields: [
        { key: "anchor_diameter_icf", label: "Diameter (mm)", type: "customizable", selectionKey: "anchorDiameterIcfSelect", modalKey: "anchorDiameterIcf", dataSource: "anchorDiameterList" },
        { key: "anchor_grade_icf", label: "Property Class", type: "customizable", selectionKey: "anchorGradeIcfSelect", modalKey: "anchorGradeIcf", dataSource: "anchorGradeList" },
        { key: "anchor_type", label: "Anchor Type", type: "select", options: "anchorTypeList" },
      ],
    },
    {
      title: "Pedestal/Footing",
      fields: [
        { key: "footing_grade", label: "Grade", type: "select", options: "footingGradeList" },
      ],
    },
    {
      title: "Weld",
      fields: [
        { key: "weld_type", label: "Type", type: "select", options: "weldTypeList" },
      ],
    },
  ],
};
