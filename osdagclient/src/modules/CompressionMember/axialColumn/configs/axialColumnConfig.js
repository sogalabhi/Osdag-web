// src/modules/CompressionMember/axialColumn/configs/axialColumnConfig.js
import { UI_STRINGS } from "../../../../constants/UIStrings";

/*
  Note:
  - Image URLs reference /ResourceFiles/images/<file>.PNG
    Ensure your dev server serves these paths (copy images to client/public/ResourceFiles/images if needed).
  - All select 'options' are arrays of { value, label } to make them non-editable dropdowns.
*/

const IMAGES_BASE = "/ResourceFiles/images/";

const IMAGES = {
  RRRR: IMAGES_BASE + "6.RRRR.PNG",
  RRFF_rot: IMAGES_BASE + "1.RRFF_rotated.PNG",
  RRFF: IMAGES_BASE + "1.RRFF.PNG",
  RRRF_rot: IMAGES_BASE + "5.RRRF_rotated.PNG",
  RRRF: IMAGES_BASE + "5.RRRF.PNG",
  RRFR_rot: IMAGES_BASE + "4.RRFR_rotated.PNG",
  RRFR: IMAGES_BASE + "4.RRFR.PNG",
  FRFR_rot: IMAGES_BASE + "2.FRFR_rotated.PNG",
  FRFR: IMAGES_BASE + "2.FRFR.PNG",
  RFRF: IMAGES_BASE + "3.RFRF.PNG",
  IMG_3D: IMAGES_BASE + "3d.png"
};

/* Output config (name: axialColumnConfigOutput) */
export const axialColumnConfigOutput = {
  sections: {
    "Optimum": [
      { key: "KEY_TITLE_OPTIMUM_DESIGNATION", label: "Optimum Designation" },
      { key: "KEY_OPTIMUM_UR_COMPRESSION", label: "Optimum UR (Compression)" },
      { key: "KEY_OPTIMUM_SC", label: "Section Class" },
      { key: "KEY_EFF_SEC_AREA_ZZ", label: "Effective Section Area (mm²)" }
    ],
    "Z-Z Axis": [
      { key: "KEY_EFF_LEN_ZZ", label: "Effective Length (z-z) (m)" },
      { key: "KEY_EULER_BUCKLING_STRESS_ZZ", label: "Euler Buckling Stress (z-z) (N/mm²)" },
      { key: "KEY_BUCKLING_CURVE_ZZ", label: "Buckling Curve (z-z)" },
      { key: "KEY_IMPERFECTION_FACTOR_ZZ", label: "Imperfection Factor (z-z)" },
      { key: "KEY_SR_FACTOR_ZZ", label: "Stress Reduction Factor (z-z)" },
      { key: "KEY_NON_DIM_ESR_ZZ", label: "Non-dimensional ESR (z-z)" },
      { key: "KEY_COMP_STRESS_ZZ", label: "Compression Stress (z-z) (N/mm²)" }
    ],
    "Y-Y Axis": [
      { key: "KEY_EFF_LEN_YY", label: "Effective Length (y-y) (m)" },
      { key: "KEY_EULER_BUCKLING_STRESS_YY", label: "Euler Buckling Stress (y-y) (N/mm²)" },
      { key: "KEY_BUCKLING_CURVE_YY", label: "Buckling Curve (y-y)" },
      { key: "KEY_IMPERFECTION_FACTOR_YY", label: "Imperfection Factor (y-y)" },
      { key: "KEY_SR_FACTOR_YY", label: "Stress Reduction Factor (y-y)" },
      { key: "KEY_NON_DIM_ESR_YY", label: "Non-dimensional ESR (y-y)" },
      { key: "KEY_COMP_STRESS_YY", label: "Compression Stress (y-y) (N/mm²)" }
    ],
    "Design Compression": [
      { key: "KEY_MIN_DESIGN_COMP_STRESS", label: "Minimum Design Compressive Stress (N/mm²)" },
      { key: "KEY_MAT_STRESS", label: "Material Stress (N/mm²)" },
      { key: "KEY_FCD", label: "Fcd (N/mm²)" },
      { key: "KEY_DESIGN_STRENGTH_COMPRESSION", label: "Design Strength (kN)" }
    ]
  },
  modals: {},
  modalTypes: {},
  modalData: {}
};

/* Main config (axialColumnConfig) */
export const axialColumnConfig = {
  sessionName: "Axially-Loaded-Column",
  routePath: "/design/compression_member/axial_column",
  designType: "Axially-Loaded-Column",
  cameraKey: "AxiallyLoadedColumn",
  cadOptions: ["Model"],

  defaultInputs: {
    Member_Profile: "Beams and Columns",
    Member_Designation: ["All"],
    Material: "E 250 (Fe 410 W)A",
    Actual_Length_zz: "",
    Actual_Length_yy: "",
    End_1: "Fixed",
    End_2: "Fixed",
    End_1_Y: "Fixed",
    End_2_Y: "Fixed",
    Load_Axial: "",
    
  },

  modalConfig: [
    { key: "sectionSize", inputKey: "Member_Designation", dataSource: "sectionList" }
  ],

  selectionConfig: [
    { key: "sectionSelect", inputKey: "Member_Designation", defaultValue: "All" }
  ],

  validateInputs: (inputs) => {
    if (!inputs.Load_Axial || !inputs.Actual_Length_zz || !inputs.Actual_Length_yy) {
      return { isValid: false, message: UI_STRINGS.PLEASE_INPUT_ALL_FIELDS || "Please input all required fields" };
    }
    return { isValid: true };
  },

  buildSubmissionParams: (inputs, allSelected, lists) => {
    return {
      "Module": "Axially_Loaded_Column",
      "Member.Profile": inputs.Member_Profile,
      "Member.Designation": allSelected && allSelected.sectionSelect ? lists.sectionList : inputs.Member_Designation,
      "Material": inputs.Material,
      "Actual.Length_zz": inputs.Actual_Length_zz,
      "Actual.Length_yy": inputs.Actual_Length_yy,
      "End_1": inputs.End_1,
      "End_2": inputs.End_2,
      "End_1_Y": inputs.End_1_Y,
      "End_2_Y": inputs.End_2_Y,
      "Load.Axial": inputs.Load_Axial,
    };
  },

  /* replicate fn_end2_image mapping from column.py */
  getEndConditionImage(end1, end2) {
    // defensive
    if (!end1 && !end2) return IMAGES.RRRR;

    // Match column.py mapping:
    if (end1 === "Fixed") {
      const map = {
        Fixed: IMAGES.RRRR,
        Free: IMAGES.RRFF_rot,   // rotated free image for some combos (mimics column.py choices)
        Hinged: IMAGES.RRRF_rot,
        Roller: IMAGES.RRFR_rot
      };
      return map[end2] || IMAGES.RRRR;
    }

    if (end1 === "Free") return IMAGES.RRFF; // standalone free

    if (end1 === "Hinged") {
      const map = {
        Fixed: IMAGES.RRRF,
        Hinged: IMAGES.RFRF,
        Roller: IMAGES.FRFR_rot
      };
      return map[end2] || IMAGES.RRRF;
    }

    if (end1 === "Roller") {
      const map = {
        Fixed: IMAGES.RRFR,
        Hinged: IMAGES.FRFR
      };
      return map[end2] || IMAGES.RRFR;
    }

    return IMAGES.RRRR;
  },

  inputSections: [
    {
      title: "Section Properties",
      fields: [
        {
          key: "Member_Profile",
          label: "Member Profile",
          type: "select",
          options: [
            { value: "Beams and Columns", label: "Beams and Columns" },
            { value: "RHS and SHS", label: "RHS and SHS" },
            { value: "CHS", label: "CHS" },
            { value: "Angles", label: "Angles" },
            { value: "Channels", label: "Channels" },
            { value: "Back to Back Angles", label: "Back to Back Angles" },
            { value: "Back to Back Channels", label: "Back to Back Channels" },
            { value: "Star Angles", label: "Star Angles" }
          ]
        },
        {
          key: "Member_Designation",
          label: "Section Designation",
          type: "customizable", // handled by your input dock modal
          selectionKey: "sectionSelect",
          modalKey: "sectionSize",
          dataSource: "sectionList"
        },
        {
          key: "Material",
          label: "Material",
          type: "select",
          options: [
            { value: "E 165 (Fe 290)", label: "E 165 (Fe 290)" },
            { value: "E 250 (Fe 410 W)A", label: "E 250 (Fe 410 W)A" },
            { value: "E 250 (Fe 410 W)B", label: "E 250 (Fe 410 W)B" },
            { value: "E 250 (Fe 410 W)C", label: "E 250 (Fe 410 W)C" },
            { value: "E 300 (Fe 440)", label: "E 300 (Fe 440)" },
            { value: "E 350 (Fe 490)", label: "E 350 (Fe 490)" },
            { value: "E 410 (Fe 540)", label: "E 410 (Fe 540)" },
            { value: "E 450 (Fe 570)D", label: "E 450 (Fe 570)D" },
            { value: "E 450 (Fe 590)E", label: "E 450 (Fe 590)E" },
            { value: "Cus_400_500_600_1400", label: "Cus_400_500_600_1400" },
            { value: "Custom", label: "Custom" }
          ]
        }
      ]
    },
    {
      title: "Effective Lengths",
      fields: [
        {
          key: "Actual_Length_zz",
          label: "Actual Length (z-z), mm",
          type: "number"
        },
        {
          key: "Actual_Length_yy",
          label: "Actual Length (y-y), mm",
          type: "number"
        }
      ]
    },
    {
      title: "End Condition (z–z Axis)",
      fields: [
        {
          key: "End_1",
          label: "End 1",
          type: "select",
          options: [
            { value: "Fixed", label: "Fixed" },
            { value: "Free", label: "Free" },
            { value: "Hinged", label: "Hinged" },
            { value: "Roller", label: "Roller" }
          ]
        },
        {
          key: "End_2",
          label: "End 2",
          type: "select",
          options: [
            { value: "Fixed", label: "Fixed" },
            { value: "Free", label: "Free" },
            { value: "Hinged", label: "Hinged" },
            { value: "Roller", label: "Roller" }
          ]
        },
        {
          key: "EndConditionImageZZ",
          label: "End Condition Diagram (z–z)",
          type: "image",
          dynamicImage: (inputs) =>
            axialColumnConfig.getEndConditionImage(inputs.End_1, inputs.End_2)
        }
      ]
    },
    {
      title: "End Condition (y–y Axis)",
      fields: [
        {
          key: "End_1_Y",
          label: "End 1 (y)",
          type: "select",
          options: [
            { value: "Fixed", label: "Fixed" },
            { value: "Free", label: "Free" },
            { value: "Hinged", label: "Hinged" },
            { value: "Roller", label: "Roller" }
          ]
        },
        {
          key: "End_2_Y",
          label: "End 2 (y)",
          type: "select",
          options: [
            { value: "Fixed", label: "Fixed" },
            { value: "Free", label: "Free" },
            { value: "Hinged", label: "Hinged" },
            { value: "Roller", label: "Roller" }
          ]
        },
        {
          key: "EndConditionImageYY",
          label: "End Condition Diagram (y–y)",
          type: "image",
          dynamicImage: (inputs) =>
            axialColumnConfig.getEndConditionImage(inputs.End_1_Y, inputs.End_2_Y)
        }
      ]
    },
    {
      title: "Factored Load",
      fields: [
        {
          key: "Load_Axial",
          label: "Axial Force (kN)",
          type: "number"
        }
      ]
    }
  ],

  /* helper image references for UI rendering */
  helperImages: {
    ...IMAGES
  }
};

export default axialColumnConfig;
