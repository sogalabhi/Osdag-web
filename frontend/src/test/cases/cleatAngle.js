import { cleatAngleConfig } from "../../modules/shearConnection/cleatAngle/configs/cleatAngleConfig";
import { SHEAR_CONNECTIVITY } from "./shared";

export const cleatAngleCase = {
  name: "cleat angle",
  config: cleatAngleConfig,
  connectivities: SHEAR_CONNECTIVITY,
  custom: { bolt_diameter: ["16", "20"], bolt_grade: ["8.8", "10.9"], cleat_section: ["50 x 50 x 6"] },
};
