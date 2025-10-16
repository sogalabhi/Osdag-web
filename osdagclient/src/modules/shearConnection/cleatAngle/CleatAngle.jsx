// CleatAngle.jsx - Fixed version
import React from "react";
import { EngineeringModule } from "../../shared/components/EngineeringModule";
import { cleatAngleConfig } from "./configs/cleatAngleConfig";
import CleatAngleOutputDock from "./components/CleatAngleOutputDock";
import { menuItems } from "../../shared/utils/moduleUtils";
import { UI_STRINGS } from '../../../constants/UIStrings';
import { ModuleContext } from "../../../context/ModuleState";
import { useContext } from "react";

function CleatAngle() {
  const { angleList } = useContext(ModuleContext);
  
  console.log("CleatAngle - angleList from context:", angleList);

  return (
    <EngineeringModule
      moduleConfig={cleatAngleConfig}
      OutputDockComponent={CleatAngleOutputDock}
      menuItems={menuItems}
      title={UI_STRINGS.CONNECTING_MEMBERS}
    />
  );
}

export default CleatAngle;