/* eslint-disable no-unused-vars */
import React from "react";
import { EngineeringModule } from "../../shared/components/EngineeringModule";
import SeatedPlateOutputDock from "./components/SeatedPlateOutputDock";
import { menuItems } from "../../shared/utils/moduleUtils";
import { seatedPlateConfig } from "./configs/seatedPlateConfig";
import { UI_STRINGS } from '../../../constants/UIStrings';

function SeatedPlate() {
  return (
    <EngineeringModule
      moduleConfig={seatedPlateConfig}
      OutputDockComponent={SeatedPlateOutputDock}
      menuItems={menuItems}
      title={UI_STRINGS.CONNECTING_MEMBERS}
    />  
  );
}

export default SeatedPlate;
