import React from "react";
import { EngineeringModule } from "../../shared/components/EngineeringModule";
import { endPlateConfig } from "./configs/endPlateConfig";
import { endPlateOutputConfig } from "./configs/endPlateOutputConfig";

function EndPlate() {
  return (
    <EngineeringModule
      moduleConfig={endPlateConfig}
      outputConfig={endPlateOutputConfig}
      title="End Plate"
    />
  );
}

export default EndPlate;
