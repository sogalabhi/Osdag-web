import ANGLES from "../../../assets/CompressionMember/bA.png";
import BACK_TO_BACK_ANGLES from "../../../assets/CompressionMember/back_back_same_side_angles.png";
import STAR_ANGLES from "../../../assets/CompressionMember/bBBA.png";
import CHANNELS from "../../../assets/CompressionMember/bC.png";
import BACK_TO_BACK_CHANNELS from "../../../assets/CompressionMember/bBBC.png";
import ErrorImg from "../../../assets/notSelected.png";
import FIXED_FIXED from "../../../assets/CompressionMember/RRRRstrut.png";
import FIXED_HINGED from "../../../assets/CompressionMember/RFRFstrut.png";
import HINGED_FIXED from "../../../assets/CompressionMember/RRRFstrut.png";

import { MATERIAL_CORE_KEYS, PREF_CORE_KEYS } from "../../shared/config/prefCoreKeys";
import { validateRequiredFields } from '../../shared/utils/validation';
import {
  KEY_ALLOW_LOAD,
  KEY_ALLOW_UR,
  KEY_AXIAL,
  KEY_BOLT_Number,
  KEY_Buckling_In_plane,
  KEY_Buckling_Out_plane,
  KEY_DISP_STRUT_WELDED_END_GUSSET,
  KEY_DP_DESIGN_METHOD,
  KEY_DP_WELD_FAB,
  KEY_DP_WELD_MATERIAL_G_O,
  KEY_EFFECTIVE_AREA_PARA,
  KEY_END1,
  KEY_END2,
  KEY_LENGTH,
  KEY_LOCATION,
  KEY_MATERIAL,
  KEY_MODULE,
  KEY_PLATETHK,
  KEY_SECSIZE,
  KEY_SEC_MATERIAL,
  KEY_SEC_PROFILE,
} from "../../../constants/generated/coreKeys";
import { prefText } from "../../shared/utils/prefValue";
// A saved gusset thickness is text; a file saved by an older form may hold a list.
const firstOf = (value) => (Array.isArray(value) ? value[0] : value);

export const strutsWeldedConfig = {
  sessionName: "Struts Welded to End Gusset",
  designType: KEY_DISP_STRUT_WELDED_END_GUSSET,
  cameraKey: "CompressionMember",
  cadOptions: ["Model", "Member", "Plate"],

  defaultInputs: {
    section_profile: "Angles",
    location: "Long Leg",
    length: "3000",
    axial_force: "100",
    module: KEY_DISP_STRUT_WELDED_END_GUSSET,
    section_designation: [],
    material: "E 250 (Fe 410 W)A",
    member_designation: "All",
    end_condition_1: "Hinged",
    end_condition_2: "Hinged",
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
    location: KEY_LOCATION,
    section_designation: KEY_SECSIZE,
    length: KEY_LENGTH,
    axial_force: KEY_AXIAL,
    end_condition_1: KEY_END1,
    end_condition_2: KEY_END2,
    // The Optimization tab of Additional Inputs (the core's dock has none of these).
    allow_ur: KEY_ALLOW_UR,
    effective_area_parameter: KEY_EFFECTIVE_AREA_PARA,
    buckling_out_of_plane: KEY_Buckling_Out_plane,
    buckling_in_plane: KEY_Buckling_In_plane,
    load_type: KEY_ALLOW_LOAD,
    bolt_number: KEY_BOLT_Number,
    plate_thickness: KEY_PLATETHK,
    // The dock material is Material; supported_material is the section tab of Additional Inputs, sent as the member material.
    material: KEY_MATERIAL,
    supported_material: KEY_SEC_MATERIAL,
    // member_designation is a leftover default; the images are only pictures.
    member_designation: null,
    profile_image: null,
    end_condition_image: null,
  },

  modalConfig: [
    { key: "sectionDesignation", inputKey: "section_designation", dataSource: null },
  ],

  selectionConfig: [
    { key: "sectionDesignationSelect", inputKey: "section_designation", defaultValue: "All" },
  ],

  getSectionImage: (profile) => {
    switch (profile) {
      case "Angles":
        return ANGLES;
      case "Back to Back Angles":
        return BACK_TO_BACK_ANGLES;
      case "Star Angles":
        return STAR_ANGLES;
      case "Channels":
        return CHANNELS;
      case "Back to Back Channels":
        return BACK_TO_BACK_CHANNELS;
      default:
        return ErrorImg;
    }
  },

  getEndConditionImage: (end1, end2) => {
    if (end1 === "Fixed" && end2 === "Fixed") {
      return FIXED_FIXED;
    } else if (end1 === "Fixed" && end2 === "Hinged") {
      return FIXED_HINGED;
    } else if (end1 === "Hinged" && end2 === "Fixed") {
      return HINGED_FIXED;
    } else if (end1 === "Hinged" && end2 === "Hinged") {
      return FIXED_HINGED;
    } else if (end1 === "Fixed" && end2 === "Free") {
      return FIXED_FIXED;
    }
    return FIXED_FIXED;
  },

  validateInputs: (inputs, extraState, _lists, selectionStates) => {
    const requiredCheck = validateRequiredFields(strutsWeldedConfig.inputSections, inputs, extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;

    if (!inputs.section_profile) {
      return { isValid: false, message: "Please select a Section Profile." };
    }
    if (!inputs.length ) {
      return { isValid: false, message: "Please enter valid Length and Axial Force." };
    }
    return { isValid: true };
  },

  buildSubmissionParams: (inputs, allSelected, lists) => {
    const normalizeSectionItem = (item) => {
      if (item == null) return "";
      if (typeof item === "string") return item.trim();
      return String(
        item.designation ?? item.Designation ?? item.value ?? item.Grade ?? item
      ).trim();
    };
    const normalizeSectionList = (list) => {
      if (!Array.isArray(list)) return [];
      return list.map(normalizeSectionItem).filter((s) => s !== "");
    };

    const dynamicSectionList = normalizeSectionList(
      strutsWeldedConfig.getDynamicSectionList(
        inputs.section_profile,
        lists?.angleList,
        lists?.channelList
      )
    );

    const memberDesignation = allSelected?.section_designation
      ? dynamicSectionList
      : normalizeSectionList(
          Array.isArray(inputs.section_designation)
            ? inputs.section_designation
            : inputs.section_designation
              ? [inputs.section_designation]
              : []
        );

    return {
      [KEY_MODULE]: KEY_DISP_STRUT_WELDED_END_GUSSET,
      [KEY_SEC_PROFILE]: inputs.section_profile,
      [KEY_SECSIZE]: memberDesignation,

      [KEY_MATERIAL]: inputs.material,
      [KEY_SEC_MATERIAL]: prefText(inputs.supported_material),

      [KEY_LENGTH]: String(inputs.length),
      [KEY_AXIAL]: String(inputs.axial_force),

      [KEY_LOCATION]: inputs.location,
      [KEY_END1]: inputs.end_condition_1,
      [KEY_END2]: inputs.end_condition_2,

      [KEY_DP_DESIGN_METHOD]: prefText(inputs.design_method),
      [KEY_DP_WELD_FAB]: prefText(inputs.weld_fab),
      [KEY_DP_WELD_MATERIAL_G_O]: prefText(inputs.weld_material_grade),
      // The Optimization tab: what the user did not save the backend fills from the core.
      [KEY_ALLOW_UR]: prefText(inputs.allow_ur),
      [KEY_EFFECTIVE_AREA_PARA]: prefText(inputs.effective_area_parameter),
      [KEY_Buckling_Out_plane]: prefText(inputs.buckling_out_of_plane),
      [KEY_Buckling_In_plane]: prefText(inputs.buckling_in_plane),
      [KEY_ALLOW_LOAD]: prefText(inputs.load_type),
      [KEY_BOLT_Number]: prefText(inputs.bolt_number),
      [KEY_PLATETHK]: prefText(firstOf(inputs.plate_thickness)),
    };
  },

  getLocationOptions: (profile) => {
    if (profile && profile.includes("Angle")) {
      return [
        { value: "Long Leg", label: "Long Leg" },
        { value: "Short Leg", label: "Short Leg" }
      ];
    }
    return [{ value: "Web", label: "Web" }];
  },

  getDynamicSectionList: (profile, angleList, channelList) => {
    if (profile && profile.includes("Angle")) {
      return angleList || [];
    }
    if (profile && profile.includes("Channel")) {
      return channelList || [];
    }
    return [];
  },

  inputSections: [
    {
      title: "Section Data",
      fields: [
        {
          key: "section_profile",
          label: "Section Profile",
          type: "sectionProfileList",
          onChange: (value, setInputs, setExtraState) => {
            const imageSource = strutsWeldedConfig.getSectionImage(value);
            setExtraState((extState) => ({
              ...extState,
              selectedProfile: value,
              imageSource: imageSource
            }));
            setInputs((inps) => ({
              ...inps,
              section_profile: value,
              section_designation: [],
              location: strutsWeldedConfig.getLocationOptions(value)[0]?.value || "Long Leg"
            }));
          }
        },
        {
          key: "profile_image",
          label: "",
          type: "image",
          conditionalDisplay: () => true,
          imageSource: (extraState) => extraState?.imageSource || ANGLES,
          height: "100px",
          width: "100px"
        },
        {
          key: "location",
          label: "Conn_Location",
          type: "dynamicSelect",
          getOptions: (inputs) => {
            return strutsWeldedConfig.getLocationOptions(inputs.section_profile);
          }
        },
        {
          key: "section_designation",
          label: "Section Designation",
          type: "customizable",
          selectionKey: "sectionDesignationSelect",
          modalKey: "sectionDesignation",
          getDynamicDataSource: (inputs, contextData) => {
            return strutsWeldedConfig.getDynamicSectionList(
              inputs.section_profile,
              contextData.angleList,
              contextData.channelList
            );
          }
        },
        {
          key: "material",
          label: "Material",
          type: "select",
          options: "materialList",
        },
        {
          key: "length",
          label: "Length (mm)",
          type: "number"
        }
      ]
    },
    {
      title: "End Conditions",
      fields: [
        {
          key: "end_condition_1",
          label: "End 1 Condition",
          type: "select",
          options: [
            { value: "Fixed", label: "Fixed" },
            { value: "Hinged", label: "Hinged" }
          ],
          onChange: (value, inputs, setInputs, setExtraState) => {
            const endImage = strutsWeldedConfig.getEndConditionImage(value, inputs.end_condition_2);
            setExtraState((extState) => ({
              ...extState,
              endConditionImage: endImage
            }));
            setInputs((inps) => ({
              ...inps,
              end_condition_1: value
            }));
          }
        },
        {
          key: "end_condition_2",
          label: "End 2 Condition",
          type: "select",
          options: [
            { value: "Fixed", label: "Fixed" },
            { value: "Hinged", label: "Hinged" }
          ],
          onChange: (value, inputs, setInputs, setExtraState) => {
            const endImage = strutsWeldedConfig.getEndConditionImage(inputs.end_condition_1, value);
            setExtraState((extState) => ({
              ...extState,
              endConditionImage: endImage
            }));
            setInputs((inps) => ({
              ...inps,
              end_condition_2: value
            }));
          }
        },
        {
          key: "end_condition_image",
          label: "",
          type: "image",
          conditionalDisplay: () => true,
          imageSource: (extraState, inputs) => {
            const end1 = inputs?.end_condition_1 || "Hinged";
            const end2 = inputs?.end_condition_2 || "Hinged";
            return strutsWeldedConfig.getEndConditionImage(end1, end2);
          },
          height: "120px",
          width: "180px"
        }
      ]
    },
    {
      title: "Factored Loads",
      fields: [
        { key: "axial_force", label: "Axial Force (kN)", type: "number" }
      ]
    },
  ]
};
