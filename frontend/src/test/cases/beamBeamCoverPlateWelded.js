import { coverPlateWeldedConfig } from "../../modules/coverPlateWelded/configs/coverPlateWeldedConfig";

export const beamBeamCoverPlateWeldedCase = {
  name: "beam-beam cover plate welded",
  config: coverPlateWeldedConfig,
  custom: { flange_plate_thickness: ["10", "12"], web_plate_thickness: ["8", "10"] },
};
