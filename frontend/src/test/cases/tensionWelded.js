import { weldedToEndConfig } from "../../modules/TensionMembers/WeldedToEnd/configs/weldedToEndConfig";

export const tensionWeldedCase = {
  name: "tension welded",
  config: weldedToEndConfig,
  custom: { plate_thickness: ["10", "12"], section_designation: ["50 x 50 x 6"] },
};
