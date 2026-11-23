import { boltedToEndConfig } from "../../modules/TensionMembers/BoltedToEnd/configs/boltedToEndConfig";
import { BOLT_CUSTOM } from "./shared";

export const tensionBoltedCase = {
  name: "tension bolted",
  config: boltedToEndConfig,
  custom: { ...BOLT_CUSTOM, section_designation: ["50 x 50 x 6"] },
};
