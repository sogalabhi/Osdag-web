import { buttJointWeldedConfig } from "../../modules/SimpleConnection/ButtJointWelded/config/buttJointWeldedConfig";
import { PLATE_FILL } from "./shared";

export const buttJointWeldedCase = {
  name: "butt joint welded",
  config: buttJointWeldedConfig,
  fill: PLATE_FILL,
  custom: { weld_size: ["6", "8"] },
};
