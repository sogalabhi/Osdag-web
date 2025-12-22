/* eslint-disable no-unused-vars */
import React from "react";
import { EngineeringModule } from "../../shared/components/EngineeringModule";
import { finPlateConfig } from "./configs/finPlateConfig";
import { finPlateOutputConfig } from "./configs/finPlateOutputConfig";
import { UI_STRINGS } from '../../../constants/UIStrings';

function FinPlate() {
  return (
    <EngineeringModule
      moduleConfig={finPlateConfig}
      outputConfig={finPlateOutputConfig}
      title={UI_STRINGS.CONNECTING_MEMBERS} 
    />
  );
}

export default FinPlate;
