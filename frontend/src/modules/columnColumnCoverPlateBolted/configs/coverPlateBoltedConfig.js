import { makeCoverPlateBoltedConfig } from '../../shared/config/coverPlateConfigFactory';
import { KEY_DISP_COLUMNCOVERPLATE } from "../../../constants/generated/coreKeys";

export const coverPlateBoltedConfig = makeCoverPlateBoltedConfig({
  sessionName: "Column Cover Plate Bolted Connection",
  designType: KEY_DISP_COLUMNCOVERPLATE,
  cadOptions: ["Model", "Column", "CoverPlate"],
  sectionOptionsKey: "columnList",
  defaultLoads: { axial: "100", moment: "70", shear: "50" },
  defaultDesignation: "UC 305 x 305 x 118",
});
