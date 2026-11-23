import { buttJointBoltedConfig } from "../../modules/SimpleConnection/ButtJointBolted/config/buttJointBoltedConfig";
import { PLATE_FILL } from "./shared";

export const buttJointBoltedCase = {
  name: "butt joint bolted",
  config: buttJointBoltedConfig,
  fill: PLATE_FILL,
  custom: { bolt_diameter: ["16", "20"], bolt_grade: ["8.8", "10.9"] },
};
