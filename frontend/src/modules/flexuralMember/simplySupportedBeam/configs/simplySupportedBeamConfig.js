// Config for Simply Supported Beam (Flexural Member)
// Keys must match backend API (see flexure.py input_values)

import ISECTION from "../../../../assets/ISection.png";
import ErrorImg from "../../../../assets/notSelected.png";
import {
  KEY_ALLOW_CLASS,
  KEY_BEARING_LENGTH,
  KEY_DESIGN_TYPE_FLEXURE,
  KEY_DISP_FLEXURE,
  KEY_DP_DESIGN_METHOD,
  KEY_EFFECTIVE_AREA_PARA,
  KEY_LENGTH,
  KEY_LENGTH_OVERWRITE,
  KEY_LOAD,
  KEY_MATERIAL,
  KEY_MODULE,
  KEY_MOMENT,
  KEY_SECSIZE,
  KEY_SEC_MATERIAL,
  KEY_SEC_PROFILE,
  KEY_SHEAR,
  KEY_SUPPORT,
  KEY_TORSIONAL_RES,
  KEY_WARPING_RES,
} from "../../../../constants/generated/coreKeys";

import { validateRequiredFields } from '../../../shared/utils/validation';
import { MATERIAL_CORE_KEYS, PREF_CORE_KEYS } from "../../../shared/config/prefCoreKeys";
import { prefText } from "../../../shared/utils/prefValue";
export const simplySupportedBeamConfig = {
  sessionName: "Simply Supported Beam Design",
  designType: KEY_DISP_FLEXURE,
  cameraKey: "FlexuralMember", 
  cadOptions: ["Model"],

  defaultInputs: {
    module: KEY_DISP_FLEXURE,
    section_profile: "Beams and Columns",
    section_designation: ["MB 400"],
    material: "E 250 (Fe 410 W)A",
    // KEY_ALLOW_CLASS ('Optimum.Class') is a Yes/No toggle for "allow
    // Semi-Compact sections in the optimization search" (flexure.py:869,
    // `if self.allow_class == "Yes"`) — matches desktop's own default
    // (flexure.py:172, KEY_ALLOW_CLASS: 'Yes'). NOT a section-class name.
    shear_force: "50",
    bending_moment: "100",
    member_length: "6000",
    beam_support_type: "Major Laterally Supported",
    torsional_restraint: "Fully Restrained",
    warping_restraint: "Both flanges fully restrained",
  },

  // Every form field and the core key(s) it feeds; null for a field that feeds none.
  // The test in src/test/coreKeyMap.test.js checks this against what buildSubmissionParams sends.
  coreKeys: {
    ...PREF_CORE_KEYS,
    ...MATERIAL_CORE_KEYS,
    module: KEY_MODULE,
    // The wire carries Member.Profile; the .osi loader also fills this field from the older Section.Profile / "Section Profile" names.
    section_profile: KEY_SEC_PROFILE,
    section_designation: KEY_SECSIZE,
    // The dock material is Material; supporting_material is the section tab of Additional Inputs, sent as the member material.
    material: KEY_MATERIAL,
    supporting_material: KEY_SEC_MATERIAL,
    design_method: KEY_DP_DESIGN_METHOD,
    allowable_class: KEY_ALLOW_CLASS,
    effective_area_parameter: KEY_EFFECTIVE_AREA_PARA,
    length_overwrite: KEY_LENGTH_OVERWRITE,
    bearing_length: KEY_BEARING_LENGTH,
    loading_condition: KEY_LOAD,
    shear_force: KEY_SHEAR,
    bending_moment: KEY_MOMENT,
    member_length: KEY_LENGTH,
    beam_support_type: KEY_DESIGN_TYPE_FLEXURE,
    torsional_restraint: KEY_TORSIONAL_RES,
    warping_restraint: KEY_WARPING_RES,
  },

  modalConfig: [
    { key: "sectionDesignation", inputKey: "section_designation", dataSource: null }, // Dynamic data source
  ],

  selectionConfig: [
    { key: "sectionDesignationSelect", inputKey: "section_designation", defaultValue: "All" },
  ],

  // Helper function to get section image
  getSectionImage: (profile) => {
    switch (profile) {
      case "Beams":
      case "Columns":
      case "Beams and Columns":
        return ISECTION;
      default:
        return ErrorImg;
    }
  },

  // Helper function to get section list based on profile  
  getDynamicSectionList: (profile, beamList, columnList) => {
    if (profile === "Beams") {
      return beamList || [];
    } else if (profile === "Columns") {
      return columnList || [];
    } else if (profile === "Beams and Columns") {
      return [...(beamList || []), ...(columnList || [])];
    }
    return [];
  },

  validateInputs: (inputs, extraState, _lists, selectionStates) => {
    const requiredCheck = validateRequiredFields(simplySupportedBeamConfig.inputSections, inputs, extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;

    if (!inputs.section_designation ||
      !inputs.member_length ||
      !inputs.shear_force ||
      !inputs.bending_moment ||
      inputs.section_designation === "Select Section") {
      return { isValid: false, message: "Please input all the required fields" };
    }
    
    // Validate numeric inputs
    if (isNaN(parseFloat(inputs.member_length)) || parseFloat(inputs.member_length) <= 0) {
      return { isValid: false, message: "Member length must be a positive number" };
    }
    if (isNaN(parseFloat(inputs.shear_force)) || parseFloat(inputs.shear_force) <= 0) {
      return { isValid: false, message: "Shear force must be a positive number" };
    }
    if (isNaN(parseFloat(inputs.bending_moment)) || parseFloat(inputs.bending_moment) <= 0) {
      return { isValid: false, message: "Bending moment must be a positive number" };
    }
    
    return { isValid: true };
  },

  buildSubmissionParams: (inputs, allSelected, lists) => {

    const dynamicSectionList = simplySupportedBeamConfig.getDynamicSectionList(
      inputs.section_profile,
      lists.beamList,
      lists.columnList
    );

    return {
      [KEY_MODULE]: KEY_DISP_FLEXURE,
      [KEY_SEC_PROFILE]: String(inputs.section_profile),
      [KEY_SECSIZE]: allSelected.section_designation
        ? dynamicSectionList
        : (Array.isArray(inputs.section_designation)
          ? inputs.section_designation
          : [inputs.section_designation || ""]),
      [KEY_MATERIAL]: String(inputs.material),
      [KEY_SEC_MATERIAL]: prefText(inputs.supporting_material),
      [KEY_DP_DESIGN_METHOD]: prefText(inputs.design_method),
      [KEY_ALLOW_CLASS]: prefText(inputs.allowable_class),
      [KEY_EFFECTIVE_AREA_PARA]: prefText(inputs.effective_area_parameter),
      [KEY_LENGTH_OVERWRITE]: prefText(inputs.length_overwrite),
      [KEY_BEARING_LENGTH]: prefText(inputs.bearing_length),
      [KEY_SHEAR]: String(inputs.shear_force),
      [KEY_MOMENT]: String(inputs.bending_moment),
      [KEY_LENGTH]: String(inputs.member_length),
      [KEY_DESIGN_TYPE_FLEXURE]: String(inputs.beam_support_type),
      [KEY_SUPPORT]: "Simply Supported", // Fixed value for simply supported beams
      [KEY_TORSIONAL_RES]: String(inputs.torsional_restraint),
      [KEY_WARPING_RES]: String(inputs.warping_restraint),
      [KEY_LOAD]: prefText(inputs.loading_condition),
    };
  },

  inputSections: [
    {
      title: "Connecting Members",
      fields: [
        {
          key: "section_profile",
          label: "Section Profile",
          type: "select",
          options: "sectionProfileList",
          defaultValue: "Beams and Columns", // Default to the only available option
        },
        {
          key: "section_designation",
          label: "Section Designation",
          type: "customizable",
          selectionKey: "sectionDesignationSelect",
          modalKey: "sectionDesignation",
          defaultValue: ["MB 400"],
          getDynamicDataSource: (inputs, contextData) => {
            return simplySupportedBeamConfig.getDynamicSectionList(
              inputs.section_profile,
              contextData.beamList,
              contextData.columnList
            );
          }
        },
        {
          key: "material", customMaterial: "connector",
          label: "Material",
          type: "select",
          options: "materialList",
        }
      ]
    },
    {
      title: "Section Data",
      fields: [
        {
          key: "beam_support_type",
          label: "Support Type",
          type: "select",
          options: [
            // From VALUES_SUPP_TYPE_temp in Common.py
            { value: "Major Laterally Supported", label: "Major Laterally Supported" },
            { value: "Minor Laterally Unsupported", label: "Minor Laterally Unsupported" },
            { value: "Major Laterally Unsupported", label: "Major Laterally Unsupported" }
          ]
        },
        {
          key: "torsional_restraint",
          label: "Torsional Restraint",
          type: "select", 
          options: [
            // From Torsion_Restraint_list in Common.py
            { value: "Fully Restrained", label: "Fully Restrained" },
            { value: "Partially Restrained-support connection", label: "Partially Restrained-support connection" },
            { value: "Partially Restrained-bearing support", label: "Partially Restrained-bearing support" }
          ]
        },
        {
          key: "warping_restraint",
          label: "Warping Restraint",
          type: "select",
          options: [
            // From Warping_Restraint_list in Common.py
            { value: "Both flanges fully restrained", label: "Both flanges fully restrained" },
            { value: "Compression flange fully restrained", label: "Compression flange fully restrained" },
            { value: "Compression flange partially restrained", label: "Compression flange partially restrained" },
            { value: "Warping not restrained in both flanges", label: "Warping not restrained in both flanges" }
          ]
        },
        {
          key: "member_length", 
          label: "Effective Span (m)",
          type: "number",
          validation: "positive_number",
          placeholder: "Enter member length"
        }
      ]
    },
    {
      title: "Factored Loads",
      fields: [
        {
          key: "bending_moment",
          label: "Bending Moment (kNm)", 
          type: "number",
          validation: "positive_number",
          placeholder: "Enter bending moment", required: true },
        {
          key: "shear_force",
          label: "Shear Force (kN)",
          type: "number",
          validation: "positive_number",
          placeholder: "Enter shear force", required: true }
      ]
    },
  ],
}; 