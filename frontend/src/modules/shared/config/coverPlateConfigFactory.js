import { validateRequiredFields } from '../utils/validation';
import {
  KEY_AXIAL,
  KEY_CONNECTOR_MATERIAL,
  KEY_D,
  KEY_DP_BOLT_HOLE_TYPE,
  KEY_DP_BOLT_SLIP_FACTOR,
  KEY_DP_BOLT_TYPE,
  KEY_DP_DESIGN_METHOD,
  KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
  KEY_DP_DETAILING_EDGE_TYPE,
  KEY_DP_DETAILING_GAP,
  KEY_DP_WELD_FAB,
  KEY_DP_WELD_MATERIAL_G_O,
  KEY_FLANGEPLATE_PREFERENCES,
  KEY_FLANGEPLATE_THICKNESS,
  KEY_GRD,
  KEY_MATERIAL,
  KEY_MODULE,
  KEY_MOMENT,
  KEY_SECSIZE,
  KEY_SEC_MATERIAL,
  KEY_SHEAR,
  KEY_TYP,
  KEY_WEBPLATE_THICKNESS,
  KEY_WELD_TYPE,
} from "../../../constants/generated/coreKeys";

// Shared shape for coverPlateBolted / columnColumnCoverPlateBolted, which were
// identical except for ~8 values (session/designType strings, cadOptions'
// member label, default loads, and the section-options list key).
export function makeCoverPlateBoltedConfig({
  sessionName,
  designType,
  cadOptions,
  sectionOptionsKey,
  defaultLoads,
  defaultDesignation = "MB 300",
}) {
  const config = {
    sessionName,
    designType,
    cameraKey: "CoverPlateBolted",
    cadOptions,

    defaultInputs: {
      bolt_hole_type: "Standard",
      bolt_diameter: [],
      bolt_grade: [],
      bolt_slip_factor: "0.3",
      bolt_tension_type: "Pre-tensioned",
      bolt_type: "Bearing Bolt",
      flange_plate_preferences: "Outside",
      flange_plate_thickness: [],
      connector_material: "E 250 (Fe 410 W)A",
      web_plate_thickness: [],
      design_method: "Limit State Design",
      detailing_corr_status: "No",
      detailing_edge_type: "Sheared or hand flame cut",
      detailing_gap: "3",
      load_axial: defaultLoads.axial,
      load_moment: defaultLoads.moment,
      load_shear: defaultLoads.shear,
      material: "E 250 (Fe 410 W)A",
      member_designation: defaultDesignation,
      member_material: "E 250 (Fe 410 W)A",
      module: designType,
    },

    modalConfig: [
      { key: "boltDiameter", inputKey: "bolt_diameter", dataSource: "boltDiameterList" },
      { key: "propertyClass", inputKey: "bolt_grade", dataSource: "propertyClassList" },
      { key: "flangePlateThickness", inputKey: "flange_plate_thickness", dataSource: "thicknessList" },
      { key: "webPlateThickness", inputKey: "web_plate_thickness", dataSource: "thicknessList" },
    ],

    selectionConfig: [
      { key: "boltDiameterSelect", inputKey: "bolt_diameter", defaultValue: "All" },
      { key: "propertyClassSelect", inputKey: "bolt_grade", defaultValue: "All" },
      { key: "flangeThicknessSelect", inputKey: "flange_plate_thickness", defaultValue: "All" },
      { key: "webThicknessSelect", inputKey: "web_plate_thickness", defaultValue: "All" },
    ],

    buildSubmissionParams: (inputs, allSelected, lists) => ({
      [KEY_DP_BOLT_HOLE_TYPE]: inputs.bolt_hole_type,
      [KEY_D]: allSelected.bolt_diameter ? lists.boltDiameterList : inputs.bolt_diameter,
      [KEY_GRD]: allSelected.bolt_grade ? lists.propertyClassList : inputs.bolt_grade,
      [KEY_DP_BOLT_SLIP_FACTOR]: inputs.bolt_slip_factor,
      [KEY_DP_BOLT_TYPE]: inputs.bolt_tension_type,
      [KEY_TYP]: inputs.bolt_type.replaceAll("_", " "),
      [KEY_FLANGEPLATE_PREFERENCES]: inputs.flange_plate_preferences,
      [KEY_FLANGEPLATE_THICKNESS]: allSelected.flange_plate_thickness
        ? lists.thicknessList
        : inputs.flange_plate_thickness,
      [KEY_CONNECTOR_MATERIAL]: inputs.connector_material,
      [KEY_WEBPLATE_THICKNESS]: allSelected.web_plate_thickness
        ? lists.thicknessList
        : inputs.web_plate_thickness,
      [KEY_DP_DESIGN_METHOD]: inputs.design_method,
      [KEY_DP_DETAILING_CORROSIVE_INFLUENCES]: inputs.detailing_corr_status,
      [KEY_DP_DETAILING_EDGE_TYPE]: inputs.detailing_edge_type,
      [KEY_DP_DETAILING_GAP]: inputs.detailing_gap,
      [KEY_AXIAL]: inputs.load_axial || "0",
      [KEY_MOMENT]: inputs.load_moment || "",
      [KEY_SHEAR]: inputs.load_shear || "",
      [KEY_MATERIAL]: inputs.material,
      [KEY_SECSIZE]: inputs.member_designation,
      [KEY_SEC_MATERIAL]: inputs.member_material,
      [KEY_MODULE]: designType,
    }),

    inputSections: [
      {
        title: "Connecting Members",
        fields: [
          {
            key: "member_designation",
            label: "Section Designation",
            type: "select",
            options: sectionOptionsKey,
            required: true,
          },
          {
            key: "material",
            label: "Material",
            type: "select",
            options: "materialList",
            onChange: (value, inputs, setInputs, materialList) => {
              const material = materialList.find((item) => item.id === value);
              setInputs({
                ...inputs,
                material: material.Grade,
                connector_material: material.Grade,
                member_material: material.Grade,
              });
            },
          },
        ],
      },
      {
        title: "Factored Loads",
        fields: [
          { key: "load_shear", label: "Shear Force(kN)", type: "number", required: true },
          { key: "load_moment", label: "Moment Force(kN)", type: "number", required: true },
          { key: "load_axial", label: "Axial Force(kN)", type: "number", required: false },
        ],
      },
      {
        title: "Bolt",
        fields: [
          {
            key: "bolt_diameter",
            label: "Diameter(mm)",
            type: "customizable",
            selectionKey: "boltDiameterSelect",
            modalKey: "boltDiameter",
            dataSource: "boltDiameterList",
          },
          {
            key: "bolt_type",
            label: "Type",
            type: "select",
            options: [
              { value: "Bearing_Bolt", label: "Bearing Bolt" },
              { value: "Friction_Grip_Bolt", label: "Friction Grip Bolt" },
            ],
          },
          {
            key: "bolt_grade",
            label: "Property Class",
            type: "customizable",
            selectionKey: "propertyClassSelect",
            modalKey: "propertyClass",
            dataSource: "propertyClassList",
          },
        ],
      },
      {
        title: "Flange Splice Plate",
        fields: [
          {
            key: "flange_plate_preferences",
            label: "Type",
            type: "select",
            options: [
              { value: "Outside", label: "Outside" },
              { value: "Outside + Inside", label: "Outside + Inside" },
            ],
          },
          {
            key: "flange_plate_thickness",
            label: "Thickness(mm)",
            type: "customizable",
            selectionKey: "flangeThicknessSelect",
            modalKey: "flangePlateThickness",
            dataSource: "thicknessList",
          },
        ],
      },
      {
        title: "Web Splice Plate",
        fields: [
          {
            key: "web_plate_thickness",
            label: "Thickness(mm)",
            type: "customizable",
            selectionKey: "webThicknessSelect",
            modalKey: "webPlateThickness",
            dataSource: "thicknessList",
          },
        ],
      },
    ],
  };

  config.validateInputs = (inputs, extraState, _lists, selectionStates) => {
    const requiredCheck = validateRequiredFields(config.inputSections, inputs, extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;

    if (
      !inputs.member_designation ||
      inputs.member_designation === "Select Section" ||
      inputs.load_shear === ""
    ) {
      return { isValid: false, message: "Please input all the fields" };
    }
    return { isValid: true };
  };

  return config;
}

// Shared shape for coverPlateWelded / columnColumnCoverPlateWelded. These two
// diverge slightly more than the bolted pair: the column variant sources
// "Member.Material" from a different input field and sends 2 extra submission
// params (flangespace/type) that the beam variant doesn't — both preserved
// exactly via memberMaterialField / extraSubmissionParams rather than unified,
// since this refactor is a pure dedup, not a behavior fix.
export function makeCoverPlateWeldedConfig({
  sessionName,
  designType,
  cadOptions,
  sectionOptionsKey,
  defaultLoads,
  defaultDesignation = "MB 600",
  memberMaterialField,
  extraSubmissionParams = {},
}) {
  const config = {
    sessionName,
    designType,
    cameraKey: "CoverPlateWelded",
    cadOptions,

    defaultInputs: {
      flange_plate_preferences: "Outside",
      flange_plate_thickness: [],
      connector_material: "E 165 (Fe 290)",
      web_plate_thickness: [],
      design_method: "Limit State Design",
      detailing_gap: "3",
      detailing_edge_type: "Sheared or hand flame cut",
      detailing_corr_status: "No",
      load_axial: defaultLoads.axial,
      load_moment: defaultLoads.moment,
      load_shear: defaultLoads.shear,
      material: "E 165 (Fe 290)",
      member_designation: defaultDesignation,
      member_material: "E 165 (Fe 290)",
      module: designType,
      weld_fab: "Shop Weld",
      weld_material_grade: "290",
      weld_type: "Fillet Weld",
    },

    modalConfig: [
      { key: "flangePlateThickness", inputKey: "flange_plate_thickness", dataSource: "thicknessList" },
      { key: "webPlateThickness", inputKey: "web_plate_thickness", dataSource: "thicknessList" },
    ],

    selectionConfig: [
      { key: "flangeThicknessSelect", inputKey: "flange_plate_thickness", defaultValue: "All" },
      { key: "webThicknessSelect", inputKey: "web_plate_thickness", defaultValue: "All" },
    ],

    buildSubmissionParams: (inputs, allSelected, lists) => ({
      [KEY_FLANGEPLATE_PREFERENCES]: inputs.flange_plate_preferences,
      [KEY_FLANGEPLATE_THICKNESS]: allSelected.flange_plate_thickness
        ? lists.thicknessList : inputs.flange_plate_thickness,
      [KEY_CONNECTOR_MATERIAL]: inputs.connector_material,
      [KEY_WEBPLATE_THICKNESS]: allSelected.web_plate_thickness
        ? lists.thicknessList : inputs.web_plate_thickness,
      [KEY_DP_DESIGN_METHOD]: inputs.design_method,
      [KEY_DP_DETAILING_CORROSIVE_INFLUENCES]: inputs.detailing_corr_status,
      [KEY_DP_DETAILING_EDGE_TYPE]: inputs.detailing_edge_type,
      [KEY_DP_DETAILING_GAP]: inputs.detailing_gap,
      [KEY_AXIAL]: inputs.load_axial || "0",
      [KEY_MOMENT]: inputs.load_moment || "0",
      [KEY_SHEAR]: inputs.load_shear || "0",
      [KEY_MATERIAL]: inputs.material,
      [KEY_SECSIZE]: inputs.member_designation,
      [KEY_SEC_MATERIAL]: inputs[memberMaterialField],
      [KEY_MODULE]: designType,
      [KEY_DP_WELD_FAB]: inputs.weld_fab,
      [KEY_DP_WELD_MATERIAL_G_O]: inputs.weld_material_grade || "290",
      [KEY_WELD_TYPE]: inputs.weld_type,
      "out_titles_status": [1, 1, 1, 1, 0],
      ...extraSubmissionParams,
    }),

    inputSections: [
      {
        title: "Connecting Members",
        fields: [
          {
            key: "member_designation",
            label: "Section Designation",
            type: "select",
            options: sectionOptionsKey,
            required: true,
          },
          {
            key: "material",
            label: "Material",
            type: "select",
            options: "materialList",
            onChange: (value, inputs, setInputs, materialList) => {
              const material = materialList.find(item => item.id === value);
              setInputs({
                ...inputs,
                material: material.Grade,
                connector_material: material.Grade,
                member_material: material.Grade,
              });
            }
          }
        ]
      },
      {
        title: "Factored Loads",
        fields: [
          { key: "load_shear", label: "Shear Force(kN)", type: "number", required: true },
          { key: "load_moment", label: "Moment Force(kN)", type: "number", required: true },
          { key: "load_axial", label: "Axial Force(kN)", type: "number", required: false }
        ]
      },
      {
        title: "Flange Splice Plate",
        fields: [
          {
            key: "flange_plate_preferences",
            label: "Type",
            type: "select",
            options: [
              { value: "Outside", label: "Outside" },
              { value: "Outside + Inside", label: "Outside + Inside" }
            ]
          },
          {
            key: "flange_plate_thickness",
            label: "Thickness(mm)",
            type: "customizable",
            selectionKey: "flangeThicknessSelect",
            modalKey: "flangePlateThickness",
            dataSource: "thicknessList"
          }
        ]
      },
      {
        title: "Web Splice Plate",
        fields: [
          {
            key: "web_plate_thickness",
            label: "Thickness(mm)",
            type: "customizable",
            selectionKey: "webThicknessSelect",
            modalKey: "webPlateThickness",
            dataSource: "thicknessList"
          }
        ]
      },
      {
        title: "Weld",
        fields: [
          {
            key: "weld_type",
            label: "Type",
            type: "select",
            options: [
              { value: "Fillet Weld", label: "Fillet Weld" }
            ]
          }
        ]
      }
    ],
  };

  config.validateInputs = (inputs, extraState, _lists, selectionStates) => {
    const requiredCheck = validateRequiredFields(config.inputSections, inputs, extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;

    if (!inputs.member_designation ||
        inputs.member_designation === "Select Section" ||
        inputs.load_shear === "") {
      return { isValid: false, message: "Please input all the fields" };
    }
    return { isValid: true };
  };

  return config;
}
