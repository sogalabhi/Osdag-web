import { finPlateConfig } from "../../modules/shearConnection/finPlate/configs/finPlateConfig";
import { SHEAR_CONNECTIVITY, BOLT_CUSTOM } from "./shared";

export const finPlateCase = {
  name: "fin plate",
  config: finPlateConfig,
  connectivities: SHEAR_CONNECTIVITY,
  custom: BOLT_CUSTOM,
};
