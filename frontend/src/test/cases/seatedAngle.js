import { seatedAngleConfig } from "../../modules/shearConnection/seatAngle/configs/seatedAngleConfig";

export const seatedAngleCase = {
  name: "seated angle",
  config: seatedAngleConfig,
  connectivities: ["Column Flange-Beam Web", "Column Web-Beam Web"],
  custom: { bolt_diameter: ["16", "20"], bolt_grade: ["8.8", "10.9"], angle_list: ["50 x 50 x 6"], topangle_list: ["50 x 50 x 6"] },
};
