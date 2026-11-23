import { beamToColumnEndPlateConfig } from "../../modules/beamToColumnEndPlate/configs/beamToColumnEndPlateConfig";
import { BOLT_CUSTOM } from "./shared";

export const beamColumnEndPlateCase = {
  name: "beam-column end plate",
  config: beamToColumnEndPlateConfig,
  // extraState.selectedOption is the end plate type here (it feeds EndPlateType), not the connectivity.
  connectivityKey: "endPlateType",
  custom: BOLT_CUSTOM,
};
