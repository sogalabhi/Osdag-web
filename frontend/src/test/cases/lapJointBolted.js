import { lapJointBoltedConfig } from "../../modules/SimpleConnection/LapJointBolted/config/lapJointBoltedConfig";
import { PLATE_FILL } from "./shared";

export const lapJointBoltedCase = {
  name: "lap joint bolted",
  config: lapJointBoltedConfig,
  fill: PLATE_FILL,
  custom: { bolt_diameter: ["16", "20"], bolt_grade: ["8.8", "10.9"] },
};
