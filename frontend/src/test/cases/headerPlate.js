import { endPlateConfig } from "../../modules/shearConnection/endPlate/configs/endPlateConfig";
import { SHEAR_CONNECTIVITY, SHEAR_FILL, BOLT_CUSTOM } from "./shared";

export const headerPlateCase = {
  name: "header plate",
  config: endPlateConfig,
  connectivities: SHEAR_CONNECTIVITY,
  fill: SHEAR_FILL,
  custom: BOLT_CUSTOM,
};
