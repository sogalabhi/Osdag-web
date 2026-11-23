import { strutsBoltedConfig } from "../../modules/compressionMember/configs/strutsBoltedConfig";
import { BOLT_CUSTOM } from "./shared";

export const strutsBoltedCase = {
  name: "struts bolted",
  config: strutsBoltedConfig,
  custom: { ...BOLT_CUSTOM, section_designation: ["50 x 50 x 6"] },
};
