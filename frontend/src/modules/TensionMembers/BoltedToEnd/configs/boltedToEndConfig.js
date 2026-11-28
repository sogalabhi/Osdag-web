import ANGLES from "../../../../assets/TensionMember/Angles.png";
import BACK_TO_BACK_ANGLES from "../../../../assets/TensionMember/back_back_angles.png";
import STAR_ANGLES from "../../../../assets/TensionMember/star_angles.png";
import CHANNELS from "../../../../assets/TensionMember/Channels.png";
import BACK_TO_BACK_CHANNELS from "../../../../assets/TensionMember/back_back_channels_bolted.png";
import ErrorImg from "../../../../assets/notSelected.png";
import {
  KEY_AXIAL,
  KEY_D,
  KEY_DISP_TENSION_BOLTED,
  KEY_GRD,
  KEY_LENGTH,
  KEY_LOCATION,
  KEY_MATERIAL,
  KEY_MODULE,
  KEY_PLATETHK,
  KEY_SECSIZE,
  KEY_SEC_MATERIAL,
  KEY_SEC_PROFILE,
  KEY_TYP,
} from "../../../../constants/generated/coreKeys";

import { MATERIAL_CORE_KEYS, PREF_CORE_KEYS } from "../../../shared/config/prefCoreKeys";
import { validateRequiredFields } from '../../../shared/utils/validation';
import { makePayloadBuilder } from "../../../shared/utils/buildPayload";
import { applyFieldLists } from "../../../shared/utils/fieldLists";
export const boltedToEndConfig = {
  sessionName: "Tension Member Bolted Design",
  designType: KEY_DISP_TENSION_BOLTED,
  cameraKey: "TensionMember",
  cadOptions: ["Model", "Member", "Plate"],

  defaultInputs: {
    bolt_diameter: [],
    bolt_grade: [],
    bolt_type: "Bearing Bolt",
    section_profile: "Back to Back Angles",
    location: "Long Leg",
    length: "1250",
    axial_force: "60",
    module: KEY_DISP_TENSION_BOLTED,
    plate_thickness: [],
    section_designation: [],
    material: "E 250 (Fe 410 W)A",
    member_designation: "All",
  },

  // Every form field and the core key(s) it feeds; null for a field that feeds none.
  // The test in src/test/coreKeyMap.test.js checks this against what buildSubmissionParams sends.
  coreKeys: {
    ...PREF_CORE_KEYS,
    ...MATERIAL_CORE_KEYS,
    module: KEY_MODULE,
    bolt_diameter: KEY_D,
    bolt_grade: KEY_GRD,
    bolt_type: KEY_TYP,
    plate_thickness: KEY_PLATETHK,
    // The .osi loader also maps "Section.Profile" and "Section Profile" (the latter is the constant
    // with the odd Plate Girder name) onto this field, so it declares them although the builder sends Member.Profile.
    section_profile: KEY_SEC_PROFILE,
    location: KEY_LOCATION,
    section_designation: KEY_SECSIZE,
    length: KEY_LENGTH,
    axial_force: KEY_AXIAL,
    // The dock material is Material; supported_material is the section tab of Additional Inputs, sent as the member material.
    material: KEY_MATERIAL,
    supported_material: KEY_SEC_MATERIAL,
    // member_designation is a leftover default and profile_image is only a picture.
    member_designation: null,
    profile_image: null,
  },

  // Helper function to get section image based on profile
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

  // Helper function to get location options based on profile
  getLocationOptions: (profile) => {
    if (profile && profile.includes("Angle")) {
      return [
        { value: "Long Leg", label: "Long Leg" },
        { value: "Short Leg", label: "Short Leg" }
      ];
    }
    return [{ value: "Web", label: "Web" }];
  },

  // Helper function to get section list based on profile
  getDynamicSectionList: (profile, angleList, channelList) => {
    if (profile && profile.includes("Angle")) {
      return angleList || [];
    }
    return channelList || [];
  },

  validateInputs: (inputs, extraState, _lists, selectionStates) => {
    const requiredCheck = validateRequiredFields(boltedToEndConfig.inputSections, inputs, extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;

    if (!inputs.section_designation ||
      !inputs.length ||
      
      inputs.section_designation === "Select Section") {
      return { isValid: false, message: "Please input all the required fields" };
    }
    return { isValid: true };
  },


  inputSections: [
    {
      title: "Connecting Members",
      fields: [
        {
          key: "section_profile",
          label: "Section Profile",
          type: "sectionProfileList",
          resets: ["section_designation"],
          onChange: (value, { setInputs, setExtraState }) => {
            const imageSource = boltedToEndConfig.getSectionImage(value);
            setExtraState((extState) => ({
              ...extState,
              selectedProfile: value,
              imageSource: imageSource
            }));
            setInputs((inps) => ({
              ...inps,
              section_profile: value,
              section_designation: [],
              location: boltedToEndConfig.getLocationOptions(value)[0]?.value || "Long Leg"
            }));
          }
        },
        {
          key: "profile_image",
          label: "",
          type: "image",
          conditionalDisplay: () => true,
          imageSource: (extraState) => extraState?.imageSource || BACK_TO_BACK_ANGLES,
          height: "100px",
          width: "100px"
        },
        {
          key: "location",
          label: "Conn_Location",
          type: "dynamicSelect",
          getOptions: (inputs) => {
            return boltedToEndConfig.getLocationOptions(inputs.section_profile);
          }
        },
        {
          key: "section_designation",
          label: "Section Designation",
          type: "customizable",
          selectionKey: "sectionDesignationSelect",
          modalKey: "sectionDesignation",
          getDynamicDataSource: (inputs, contextData) => {
            return boltedToEndConfig.getDynamicSectionList(
              inputs.section_profile,
              contextData.angleList,
              contextData.channelList
            );
          }
        },
        {
          key: "material", customMaterial: "connector",
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
      title: "Factored Loads",
      fields: [
        { key: "axial_force", label: "Axial Force (kN)", type: "number" }
      ]
    },
    {
      title: "Bolt",
      fields: [
        {
          key: "bolt_diameter",
          label: "Diameter (mm)",
          type: "customizable",
          selectionKey: "boltDiameterSelect",
          modalKey: "boltDiameter",
          dataSource: "boltDiameterList"
        },
        {
          key: "bolt_type",
          label: "Type",
          type: "select",
          options: [
            { value: "Bearing Bolt", label: "Bearing Bolt" },
            { value: "Friction Grip Bolt", label: "Friction Grip Bolt" }
          ]
        },
        {
          key: "bolt_grade",
          label: "Property Class",
          type: "customizable",
          selectionKey: "propertyClassSelect",
          modalKey: "propertyClass",
          dataSource: "propertyClassList"
        }
      ]
    },
    {
      title: "Plate",
      fields: [
        {
          key: "plate_thickness",
          label: "Thickness (mm)",
          type: "customizable",
          selectionKey: "thicknessSelect",
          modalKey: "plateThickness",
          dataSource: "thicknessList"
        }
      ]
    }
  ]
}; 

boltedToEndConfig.buildSubmissionParams = makePayloadBuilder(boltedToEndConfig, {
  hook: (params) => ({ ...params, [KEY_MODULE]: KEY_DISP_TENSION_BOLTED }),
});

applyFieldLists(boltedToEndConfig);