/* eslint-disable no-unused-vars */
import React from "react";
import { EngineeringModule } from "../../shared/components/EngineeringModule";
import SeatedAngleOutputDock from "./components/SeatedAngleOutputDock";
import { menuItems } from "../../shared/utils/moduleUtils";
import { seatedAngleConfig } from "./configs/seatedAngleConfig";
import { UI_STRINGS } from '../../../constants/UIStrings';

function SeatedAngle() {
  return (
    <EngineeringModule
      moduleConfig={seatedAngleConfig}
      OutputDockComponent={SeatedAngleOutputDock}
      menuItems={menuItems}
      title={UI_STRINGS.CONNECTING_MEMBERS}
    />  
  );
}

export default SeatedAngle;
