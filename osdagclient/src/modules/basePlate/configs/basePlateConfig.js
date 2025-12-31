import { UI_STRINGS } from '../../../../constants/UIStrings';
import { MODULE_NAME_TO_KEY } from '../../../../constants/modules';

export const basePlateConfig = {
  sessionName: "Base Plate",
  routePath: "/design/connections/base_plate",
  designType: "BasePlateConnection",
  cameraKey: "BasePlateConnection",

  defaultInputs: {
    module: "BasePlateConnection",
    member_profile: "Columns",
    member_designation: [],
    material: "E 250 (Fe 410 W)A",
    member_material: "E 250 (Fe 410 W)A",
    load_axial: "100",
    load_shear: "50",
    load_moment: "20",
    design_method: "Limit State Design",
    detailing_corr_status: "No",
    bolt_diameter: [],
    bolt_grade: [],
    anchor_diameter: [],
    anchor_grade: [],
  },

  validateInputs: (inputs) => {
    if (inputs.load_axial === "" || inputs.load_shear === "") {
      return { isValid: false, message: UI_STRINGS.PLEASE_INPUT_ALL_FIELDS };
    }
    return { isValid: true };
  },

  buildSubmissionParams: (inputs, allSelected, lists) => {
    return {
      Module: "BasePlateConnection",
      "Member.Profile": inputs.member_profile || "Columns",
      "Member.Designation": allSelected?.member_designation ? lists.designationList : inputs.member_designation,
      Material: inputs.material || "E 250 (Fe 410 W)A",
      "Member.Material": inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      "Load.Axial": inputs.load_axial || "",
      "Load.Shear": inputs.load_shear || "",
      "Load.Moment": inputs.load_moment || "",
      "Design.Design_Method": inputs.design_method || "Limit State Design",
      "Detailing.Corrosive_Influences": inputs.detailing_corr_status || "No",
      "Bolt.Diameter": allSelected?.bolt_diameter ? lists.boltDiameterList : inputs.bolt_diameter,
      "Bolt.Grade": allSelected?.bolt_grade ? lists.propertyClassList : inputs.bolt_grade,
      "Anchor.Diameter": allSelected?.anchor_diameter ? lists.anchorDiameterList : inputs.anchor_diameter,
      "Anchor.Grade": allSelected?.anchor_grade ? lists.anchorGradeList : inputs.anchor_grade,
    };
  },

  inputSections: [
    {
      title: UI_STRINGS.CONNECTING_MEMBERS,
      fields: [
        { key: "member_profile", label: UI_STRINGS.PROFILE, type: "select", options: "profileList" },
        { key: "member_designation", label: UI_STRINGS.SECTION, type: "customizable", modalKey: "designation", dataSource: "designationList" },
        { key: "material", label: UI_STRINGS.MATERIAL, type: "select", options: "materialList" },
      ],
    },
    {
      title: UI_STRINGS.FACTORED_LOADS,
      fields: [
        { key: "load_shear", label: UI_STRINGS.SHEAR_FORCE, type: "number" },
        { key: "load_axial", label: UI_STRINGS.AXIAL_FORCE, type: "number" },
        { key: "load_moment", label: UI_STRINGS.MOMENT, type: "number" },
      ],
    },
    {
      title: UI_STRINGS.BOLT,
      fields: [
        { key: "bolt_diameter", label: UI_STRINGS.DIAMETER, type: "customizable", modalKey: "boltDiameter", dataSource: "boltDiameterList" },
        { key: "bolt_grade", label: UI_STRINGS.PROPERTY_CLASS, type: "customizable", modalKey: "propertyClass", dataSource: "propertyClassList" },
      ],
    },
  ],
};
