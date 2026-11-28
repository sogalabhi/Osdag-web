import { beamToColumnEndPlateConfig } from "../../modules/beamToColumnEndPlate/configs/beamToColumnEndPlateConfig";
import { BOLT_CUSTOM } from "./shared";

export const beamColumnEndPlateCase = {
  name: "beam-column end plate",
  config: beamToColumnEndPlateConfig,
  // The golden payload was recorded with this value as the end plate type.
  fill: { endPlateType: "Column Flange-Beam Web" },
  connectivityKey: "endPlateType",
  custom: BOLT_CUSTOM,
};
