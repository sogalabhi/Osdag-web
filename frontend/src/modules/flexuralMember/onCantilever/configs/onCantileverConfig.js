import { validateRequiredFields } from '../../../shared/utils/validation';
import { MATERIAL_CORE_KEYS, PREF_CORE_KEYS } from "../../../shared/config/prefCoreKeys";
import {
  KEY_ALLOW_CLASS,
  KEY_BEARING_LENGTH,
  KEY_DESIGN_TYPE_FLEXURE,
  KEY_DISP_FLEXURE2,
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
  KEY_SUPPORT_TYPE,
  KEY_SUPPORT_TYPE2,
} from "../../../../constants/generated/coreKeys";
import { prefText } from "../../../shared/utils/prefValue";


export const onCantileverConfig = {
  sessionName: "On Cantilever Beam Design",
  designType: KEY_DISP_FLEXURE2,
  cameraKey: "FlexuralMember",

  cadOptions: ["Model"],

  defaultInputs: {
    module: KEY_DISP_FLEXURE2,

    section_profile: "Beams and Columns",
    section_designation: ["MB 400"],
    material: "E 250 (Fe 410 W)A",

    support_type: "Major Laterally Supported",
    support_restraint: "Continuous, with lateral restraint to top flange",
    top_restraint: "Free",

    member_length: "5000",
    shear_force: "50",
    bending_moment: "100",

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
    // The three restraint fields carry the cantilever's own key names.
    support_type: KEY_DESIGN_TYPE_FLEXURE,
    support_restraint: KEY_SUPPORT_TYPE,
    top_restraint: KEY_SUPPORT_TYPE2,
    member_length: KEY_LENGTH,
    shear_force: KEY_SHEAR,
    bending_moment: KEY_MOMENT,
    design_method: KEY_DP_DESIGN_METHOD,
    allowable_class: KEY_ALLOW_CLASS,
    effective_area_parameter: KEY_EFFECTIVE_AREA_PARA,
    length_overwrite: KEY_LENGTH_OVERWRITE,
    bearing_length: KEY_BEARING_LENGTH,
    loading_condition: KEY_LOAD,
  },

  modalConfig: [
    {
      key: "sectionDesignation",
      inputKey: "section_designation",
      dataSource: null,
    },
  ],

  selectionConfig: [
    {
      key: "sectionDesignationSelect",
      inputKey: "section_designation",
      defaultValue: "All",
    },
  ],

  // Helper: get list of sections based on profile (mirrors simply-supported beam)
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
    const requiredCheck = validateRequiredFields(onCantileverConfig.inputSections, inputs, extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;

    if (
      !inputs.section_designation ||
      inputs.section_designation.length === 0 ||
      inputs.member_length === "" ||
      inputs.shear_force === "" ||
      inputs.bending_moment === ""
    ) {
      return { isValid: false, message: "Please input all the fields" };
    }
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
    const dynamicSectionList = onCantileverConfig.getDynamicSectionList(
      inputs.section_profile,
      lists.beamList,
      lists.columnList
    );

    const sectionList = allSelected.section_designation
      ? dynamicSectionList.filter((item) => item !== "All")
      : Array.isArray(inputs.section_designation)
        ? inputs.section_designation.filter((item) => item !== "All")
        : [inputs.section_designation].filter(Boolean);

    return {
      // Module identification
      [KEY_MODULE]: KEY_DISP_FLEXURE2,

      // Section
      [KEY_SEC_PROFILE]: inputs.section_profile || "Beams and Columns",
      [KEY_SECSIZE]: sectionList,

      // Material
      [KEY_MATERIAL]: inputs.material || "",
      [KEY_SEC_MATERIAL]: prefText(inputs.supporting_material),

      // Cantilever-specific restraints
      [KEY_DESIGN_TYPE_FLEXURE]: inputs.support_type || "Major Laterally Supported",
      [KEY_SUPPORT_TYPE]: inputs.support_restraint || "Continuous, with lateral restraint to top flange",
      [KEY_SUPPORT_TYPE2]: inputs.top_restraint || "Free",

      // Geometry
      [KEY_LENGTH]: inputs.member_length,

      // Loads
      [KEY_SHEAR]: inputs.shear_force,
      [KEY_MOMENT]: inputs.bending_moment,

      // Design preferences
      [KEY_DP_DESIGN_METHOD]: prefText(inputs.design_method),
      [KEY_ALLOW_CLASS]: prefText(inputs.allowable_class),
      [KEY_EFFECTIVE_AREA_PARA]: prefText(inputs.effective_area_parameter),
      [KEY_LENGTH_OVERWRITE]: prefText(inputs.length_overwrite),
      [KEY_BEARING_LENGTH]: prefText(inputs.bearing_length),
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
          defaultValue: "Beams and Columns",
          onChange: (value, inputs, setInputs) => {
            setInputs({
              ...inputs,
              section_profile: value,
              section_designation: [],
            });
          },
        },
        {
          key: "section_designation",
          label: "Section Designation",
          type: "customizable",
          selectionKey: "sectionDesignationSelect",
          modalKey: "sectionDesignation",
          defaultValue: ["MB 400"],
          getDynamicDataSource: (inputs, contextData) => {
            return onCantileverConfig.getDynamicSectionList(
              inputs.section_profile,
              contextData.beamList,
              contextData.columnList
            );
          },
        },
        {
          key: "material",
          label: "Material",
          type: "select",
          options: "materialList",
        },
      ],
    },

    {
      title: "Section Data",
      fields: [
        {
          key: "support_type",
          label: "Support Type",
          type: "select",
          options: [
            {
              value: "Major Laterally Supported",
              label: "Major Laterally Supported",
            },
            {
              value: "Minor Laterally Unsupported",
              label: "Minor Laterally Unsupported",
            },
            {
              value: "Major Laterally Unsupported",
              label: "Major Laterally Unsupported",
            },
          ],
        },
        {
          key: "support_restraint",
          label: "Support Restraint",
          type: "select",
          options: [
            {
              value: "Continuous, with lateral restraint to top flange",
              label: "Continuous, with lateral restraint to top flange",
            },
            {
              value: "Continuous, with partial torsional restraint",
              label: "Continuous, with partial torsional restraint",
            },
            {
              value: "Continuous, with lateral and torsional restraint",
              label: "Continuous, with lateral and torsional restraint",
            },
            {
              value: "Restrained laterally, torsionally and against rotation on flange",
              label: "Restrained laterally, torsionally and against rotation on flange",
            },
          ],
        },
        {
          key: "top_restraint",
          label: "Top Restraint",
          type: "select",
          options: [
            { value: "Free", label: "Free" },
            {
              value: "Lateral restraint to top flange",
              label: "Lateral restraint to top flange",
            },
            {
              value: "Torsional restraint",
              label: "Torsional restraint",
            },
            {
              value: "Lateral and Torsional restraint",
              label: "Lateral and Torsional restraint",
            },
          ],
        },
        {
          key: "member_length",
          label: "Effective Span (mm)",
          type: "number",
          validation: "positive_number",
          placeholder: "Enter member length",
        },
      ],
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
          placeholder: "Enter shear force", required: true },
      ],
    },
  ],
};