import { basePlateConfig } from "../../modules/basePlate/configs/basePlateConfig";

export const basePlateCase = {
  name: "base plate",
  config: basePlateConfig,
  connectivities: ["Welded Column Base", "Moment Base Plate", "Hollow/Tubular Column Base"],
  connectivityKey: "connectivity",
  fill: { member_designation: "HB 200", load_axial: "200", load_axial_tension: "50", load_shear_major: "50", load_shear_minor: "30", load_moment_major: "40", load_moment_minor: "20" },
  custom: { anchor_diameter_ocf: ["M20", "M24"], anchor_grade_ocf: ["8.8"], anchor_diameter_icf: ["M20"], anchor_grade_icf: ["8.8"] },
};
