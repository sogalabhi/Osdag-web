import { lapJointWeldedConfig } from "../../modules/SimpleConnection/LapJointWelded/config/lapJointWeldedConfig";
import { PLATE_FILL } from "./shared";

export const lapJointWeldedCase = {
  name: "lap joint welded",
  config: lapJointWeldedConfig,
  fill: PLATE_FILL,
  custom: { weld_size: ["6", "8"] },
};
