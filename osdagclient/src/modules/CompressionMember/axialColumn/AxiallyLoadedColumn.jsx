/* eslint-disable no-unused-vars */
import React from "react";
import { EngineeringModule } from "../../shared/components/EngineeringModule";
import AxiallyLoadedColumnOutputDock from "./components/AxiallyLoadedColumnOutputDock";
import { menuItems } from "../../shared/utils/moduleUtils";
import { axialColumnConfig } from "./configs/axialColumnConfig";
import { UI_STRINGS } from '../../../constants/UIStrings';

function AxiallyLoadedColumn() {
  return (
    <EngineeringModule
      moduleConfig={axialColumnConfig}
      OutputDockComponent={AxiallyLoadedColumnOutputDock}
      menuItems={menuItems}
      title={UI_STRINGS.CONNECTING_MEMBERS || "Axially Loaded Column"}
    />
  );
}

export default AxiallyLoadedColumn;
