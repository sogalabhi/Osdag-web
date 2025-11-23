export const axialColumnConfigOutput = {
  title: "Axially Loaded Column Results",

  sections: {
    // -----------------------------
    // 1️⃣ OPTIMUM DESIGN SUMMARY
    // -----------------------------
    "Optimum Design Summary": [
      {
        key: "KEY_TITLE_OPTIMUM_DESIGNATION",
        label: "Optimum Designation",
      },
      {
        key: "KEY_OPTIMUM_UR_COMPRESSION",
        label: "Optimum Utilization Ratio (Compression)",
      },
      {
        key: "KEY_OPTIMUM_SC",
        label: "Section Class",
      },
      {
        key: "KEY_EFF_SEC_AREA_ZZ",
        label: "Effective Section Area (mm²)",
      },
    ],

    // -----------------------------
    // 2️⃣ Z–Z AXIS RESULTS
    // -----------------------------
    "Z–Z Axis Results": [
      {
        key: "KEY_EFF_LEN_ZZ",
        label: "Effective Length (z–z) (mm)",
      },
      {
        key: "KEY_EULER_BUCKLING_STRESS_ZZ",
        label: "Euler Buckling Stress (z–z) (N/mm²)",
      },
      {
        key: "KEY_BUCKLING_CURVE_ZZ",
        label: "Buckling Curve (z–z)",
      },
      {
        key: "KEY_IMPERFECTION_FACTOR_ZZ",
        label: "Imperfection Factor (z–z)",
      },
      {
        key: "KEY_SR_FACTOR_ZZ",
        label: "Stress Reduction Factor (z–z)",
      },
      {
        key: "KEY_NON_DIM_ESR_ZZ",
        label: "Non-Dimensional ESR (z–z)",
      },
      {
        key: "KEY_COMP_STRESS_ZZ",
        label: "Compression Stress (z–z) (N/mm²)",
      },
    ],

    // -----------------------------
    // 3️ Y–Y AXIS RESULTS
    // -----------------------------
    "Y–Y Axis Results": [
      {
        key: "KEY_EFF_LEN_YY",
        label: "Effective Length (y–y) (mm)",
      },
      {
        key: "KEY_EULER_BUCKLING_STRESS_YY",
        label: "Euler Buckling Stress (y–y) (N/mm²)",
      },
      {
        key: "KEY_BUCKLING_CURVE_YY",
        label: "Buckling Curve (y–y)",
      },
      {
        key: "KEY_IMPERFECTION_FACTOR_YY",
        label: "Imperfection Factor (y–y)",
      },
      {
        key: "KEY_SR_FACTOR_YY",
        label: "Stress Reduction Factor (y–y)",
      },
      {
        key: "KEY_NON_DIM_ESR_YY",
        label: "Non-Dimensional ESR (y–y)",
      },
      {
        key: "KEY_COMP_STRESS_YY",
        label: "Compression Stress (y–y) (N/mm²)",
      },
    ],

    // -----------------------------
    // 4️ DESIGN COMPRESSION RESULTS
    // -----------------------------
    "Design Compression Results": [
      {
        key: "KEY_MIN_DESIGN_COMP_STRESS",
        label: "Minimum Design Compressive Stress (N/mm²)",
      },
      {
        key: "KEY_MAT_STRESS",
        label: "Material Stress (N/mm²)",
      },
      {
        key: "KEY_FCD",
        label: "Design Compressive Strength Fcd (N/mm²)",
      },
      {
        key: "KEY_DESIGN_STRENGTH_COMPRESSION",
        label: "Design Strength (kN)",
      },
    ],

    // -----------------------------
    // 5️⃣ VISUALS / DIAGRAMS
    // -----------------------------
    "Buckling Visuals": [
      {
        key: "ZZ_IMAGE",
        label: "Z–Z Axis Buckling Mode",
        type: "image",
        src: "/ResourceFiles/images/(Column)flangeblockaxial.svg",
      },
      {
        key: "YY_IMAGE",
        label: "Y–Y Axis Buckling Mode",
        type: "image",
        src: "/ResourceFiles/images/(Column)webblockaxial.svg",
      },
    ],
  },

  // -----------------------------
  // Modal / Complex Data (future)
  // -----------------------------
  modals: {},
  modalTypes: {},
  modalData: {},
};
