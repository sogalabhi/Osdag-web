import img_1_RRFF from "../../../assets/CompressionMember/1.RRFF.PNG";
import img_1_RRFF_rotated from "../../../assets/CompressionMember/1.RRFF_rotated.PNG";
import img_2_FRFR from "../../../assets/CompressionMember/2.FRFR.PNG";
import img_2_FRFR_rotated from "../../../assets/CompressionMember/2.FRFR_rotated.PNG";
import img_3_RFRF from "../../../assets/CompressionMember/3.RFRF.PNG";
import img_4_RRFR from "../../../assets/CompressionMember/4.RRFR.PNG";
import img_4_RRFR_rotated from "../../../assets/CompressionMember/4.RRFR_rotated.PNG";
import img_5_RRRF from "../../../assets/CompressionMember/5.RRRF.PNG";
import img_5_RRRF_rotated from "../../../assets/CompressionMember/5.RRRF_rotated.PNG";
import img_6_RRRR from "../../../assets/CompressionMember/6.RRRR.PNG";

import { validateRequiredFields } from '../../shared/utils/validation';
import { MATERIAL_CORE_KEYS, PREF_CORE_KEYS } from "../../shared/config/prefCoreKeys";
import {
  KEY_ACTUAL_LEN_YY,
  KEY_ACTUAL_LEN_ZZ,
  KEY_ALLOW_UR,
  KEY_AXIAL,
  KEY_DISP_COMPRESSION_COLUMN,
  KEY_DP_DESIGN_METHOD,
  KEY_EFFECTIVE_AREA_PARA,
  KEY_END1,
  KEY_END1_Y,
  KEY_END2,
  KEY_END2_Y,
  KEY_MATERIAL,
  KEY_MODULE,
  KEY_OPTIMIZATION_PARA,
  KEY_SECSIZE,
  KEY_SEC_PROFILE,
} from "../../../constants/generated/coreKeys";
import { prefText } from "../../shared/utils/prefValue";
import { applyFieldLists } from "../../shared/utils/fieldLists";
export const axiallyLoadedColumnConfig = {
  sessionName: "Axially Loaded Column",
  designType: KEY_DISP_COMPRESSION_COLUMN,
  cameraKey: "AxiallyLoadedColumn",
  cadOptions: ["Model"],

  defaultInputs: {
    module: KEY_DISP_COMPRESSION_COLUMN,
    section_profile: "Beams and Columns",
    section_designation: [],
    material: "E 250 (Fe 410 W)A",
    actual_length_zz: "3000",
    actual_length_yy: "3000",
    end_condition_1: "Fixed",
    end_condition_2: "Fixed",
    end_condition_1_y: "Fixed",
    end_condition_2_y: "Fixed",
    axial_load: "100",
    optimum_para: "Utilization Ratio",
  },

  // Every form field and the core key(s) it feeds; null for a field that feeds none.
  // The test in src/test/coreKeyMap.test.js checks this against what buildSubmissionParams sends.
  coreKeys: {
    ...PREF_CORE_KEYS,
    ...MATERIAL_CORE_KEYS,
    module: KEY_MODULE,
    // The .osi loader also maps "Section.Profile" and "Section Profile" (the latter is the constant
    // with the odd Plate Girder name) onto this field, so it declares them although the builder sends Member.Profile.
    section_profile: KEY_SEC_PROFILE,
    section_designation: KEY_SECSIZE,
    material: KEY_MATERIAL,
    actual_length_zz: KEY_ACTUAL_LEN_ZZ,
    actual_length_yy: KEY_ACTUAL_LEN_YY,
    end_condition_1: KEY_END1,
    end_condition_2: KEY_END2,
    end_condition_1_y: KEY_END1_Y,
    end_condition_2_y: KEY_END2_Y,
    axial_load: KEY_AXIAL,
    allow_ur: KEY_ALLOW_UR,
    effective_area_parameter: KEY_EFFECTIVE_AREA_PARA,
    optimum_para: KEY_OPTIMIZATION_PARA,
    // The two end condition pictures are only pictures.
    end_condition_image_zz: null,
    end_condition_image_yy: null,
  },

  getEnd2Values: (end1) => {
    if (end1 === "Fixed") {
      return ["Fixed", "Free", "Hinged", "Roller"];
    }
    if (end1 === "Free") {
      return ["Fixed"];
    }
    if (end1 === "Hinged") {
      return ["Fixed", "Hinged", "Roller"];
    }
    if (end1 === "Roller") {
      return ["Fixed", "Hinged"];
    }
    return ["Fixed", "Free", "Hinged", "Roller"];
  },

  getEnd2Options: (end1) => {
    const values = axiallyLoadedColumnConfig.getEnd2Values(end1);
    return values.map((v) => ({ value: v, label: v }));
  },

  getEndConditionImageZZ: (end1, end2) => {
    if (end1 === "Fixed") {
      if (end2 === "Fixed") return img_6_RRRR;
      if (end2 === "Free") return img_1_RRFF_rotated;
      if (end2 === "Hinged") return img_5_RRRF_rotated;
      if (end2 === "Roller") return img_4_RRFR_rotated;
    } else if (end1 === "Free") {
      return img_1_RRFF;
    } else if (end1 === "Hinged") {
      if (end2 === "Fixed") return img_5_RRRF;
      if (end2 === "Hinged") return img_3_RFRF;
      if (end2 === "Roller") return img_2_FRFR_rotated;
    } else if (end1 === "Roller") {
      if (end2 === "Fixed") return img_4_RRFR;
      if (end2 === "Hinged") return img_2_FRFR;
    }
    return img_6_RRRR;
  },

  getEndConditionImageYY: (end1, end2) => {
    return axiallyLoadedColumnConfig.getEndConditionImageZZ(end1, end2);
  },

  buildSubmissionParams: (inputs, allSelected, lists) => {
    const {
      beamList = [],
      columnList = [],
      rhsList = [],
      shsList = [],
      angleList = [],
      channelList = [],
    } = lists || {};

    const getSectionDesignations = () => {
      const profile = inputs.section_profile;
      const uiSelection = inputs.section_designation;

      const makeArray = (value) => {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
      };

      let baseList = [];
      if (profile === "Beams and Columns") {
        baseList = [...beamList, ...columnList];
      } else if (profile === "RHS and SHS") {
        baseList = [...rhsList, ...shsList];
      } else if (profile === "CHS") {
        baseList = [];
      } else if (profile === "Angles" || profile === "Back to Back Angles") {
        baseList = angleList || [];
      } else if (profile === "Channels" || profile === "Back to Back Channels") {
        baseList = channelList || [];
      }

      if (allSelected?.section_designation) {
        return baseList;
      }

      const selected = makeArray(uiSelection).filter((x) => x && x !== "All");
      // Desktop default is effectively "All" until the user customizes.
      return selected.length > 0 ? selected : baseList;
    };

    return {
      [KEY_MODULE]: KEY_DISP_COMPRESSION_COLUMN,
      [KEY_SEC_PROFILE]: String(inputs.section_profile),
      [KEY_SECSIZE]: getSectionDesignations(),
      [KEY_MATERIAL]: String(inputs.material),
      [KEY_ACTUAL_LEN_ZZ]: String(inputs.actual_length_zz),
      [KEY_ACTUAL_LEN_YY]: String(inputs.actual_length_yy),
      [KEY_END1]: String(inputs.end_condition_1),
      [KEY_END2]: String(inputs.end_condition_2),
      [KEY_END1_Y]: String(inputs.end_condition_1_y),
      [KEY_END2_Y]: String(inputs.end_condition_2_y),
      [KEY_AXIAL]: String(inputs.axial_load),
      [KEY_DP_DESIGN_METHOD]: prefText(inputs.design_method),
      [KEY_ALLOW_UR]: prefText(inputs.allow_ur),
      [KEY_EFFECTIVE_AREA_PARA]: prefText(inputs.effective_area_parameter),
      [KEY_OPTIMIZATION_PARA]: String(inputs.optimum_para || "Utilization Ratio"),
    };
  },

  validateInputs: (inputs, extraState, _lists, selectionStates) => {
    const requiredCheck = validateRequiredFields(axiallyLoadedColumnConfig.inputSections, inputs, extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;

    if (
      !inputs.section_profile ||
      !inputs.section_designation ||
      !inputs.material ||
      !inputs.actual_length_zz ||
      !inputs.actual_length_yy ||
      !inputs.end_condition_1 ||
      !inputs.end_condition_2 ||
      !inputs.end_condition_1_y ||
      !inputs.end_condition_2_y 
    ) {
      return {
        isValid: false,
        message: "Please input all the required fields",
      };
    }

    const toNumber = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : NaN;
    };

    if (toNumber(inputs.actual_length_zz) <= 0 || toNumber(inputs.actual_length_yy) <= 0) {
      return { isValid: false, message: "Actual lengths must be positive numbers" };
    }

    if (toNumber(inputs.axial_load) <= 0) {
      return { isValid: false, message: "Axial load must be a positive number" };
    }

    return { isValid: true };
  },

  inputSections: [
    {
      title: "Section Property",
      fields: [
        {
          key: "section_profile",
          label: "Section Profile",
          type: "select",
          options: "sectionProfileList",
        },
        {
          key: "section_designation",
          label: "Section Designation",
          type: "customizable",
          selectionKey: "sectionDesignationSelect",
          modalKey: "sectionDesignation",
          getDynamicDataSource: (inputs, contextData) => {
            const profile = inputs.section_profile;
            if (!profile || !contextData) return [];

            if (profile === "Beams and Columns") {
              return [
                ...(contextData.beamList || []),
                ...(contextData.columnList || []),
              ];
            }
            if (profile === "RHS and SHS") {
              return [
                ...(contextData.rhsList || []),
                ...(contextData.shsList || []),
              ];
            }
            if (profile === "CHS") {
              return contextData.chsList || [];
            }
            if (profile === "Angles" || profile === "Back to Back Angles") {
              return contextData.angleList || [];
            }
            if (profile === "Channels" || profile === "Back to Back Channels") {
              return contextData.channelList || [];
            }
            return [];
          },
        },
        {
          key: "material", customMaterial: "connector",
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
          key: "actual_length_zz",
          label: "Actual Length (z-z), mm",
          type: "number",
          validation: "positive_number",
        },
        {
          key: "actual_length_yy",
          label: "Actual Length (y-y), mm",
          type: "number",
          validation: "positive_number",
        },
      ],
    },
    {
      title: "End Condition",
      fields: [
        {
          key: "end_condition_1",
          label: "End 1",
          type: "select",
          options: "endConditionList",
        },
        {
          key: "end_condition_2",
          label: "End 2",
          type: "dynamicSelect",
          resetsWith: "end_condition_1",
          getOptions: (inputs) =>
            axiallyLoadedColumnConfig.getEnd2Options(inputs.end_condition_1),
        },
        {
          key: "end_condition_image_zz",
          label: "",
          type: "image",
          conditionalDisplay: () => true,
          imageSource: (extraState, inputs) =>
            axiallyLoadedColumnConfig.getEndConditionImageZZ(
              inputs?.end_condition_1 || "Fixed",
              inputs?.end_condition_2 || "Fixed"
            ),
          height: "120px",
          width: "180px",
        },
      ],
    },
    {
      title: "End Condition 2",
      fields: [
        {
          key: "end_condition_1_y",
          label: "End 1 (y-y)",
          type: "select",
          options: "endConditionList",
        },
        {
          key: "end_condition_2_y",
          label: "End 2 (y-y)",
          type: "dynamicSelect",
          resetsWith: "end_condition_1_y",
          getOptions: (inputs) =>
            axiallyLoadedColumnConfig.getEnd2Options(inputs.end_condition_1_y),
        },
        {
          key: "end_condition_image_yy",
          label: "",
          type: "image",
          conditionalDisplay: () => true,
          imageSource: (extraState, inputs) =>
            axiallyLoadedColumnConfig.getEndConditionImageYY(
              inputs?.end_condition_1_y || "Fixed",
              inputs?.end_condition_2_y || "Fixed"
            ),
          height: "120px",
          width: "180px",
        },
      ],
    },
    {
      title: "Factored Loads",
      fields: [
        {
          key: "axial_load",
          label: "Axial Force (kN)",
          type: "number",
          validation: "positive_number",
        },
      ],
    },
  ],
};

applyFieldLists(axiallyLoadedColumnConfig);

