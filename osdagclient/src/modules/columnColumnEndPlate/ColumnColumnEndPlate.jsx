import React from 'react';
import { EngineeringModule } from '../shared/components/EngineeringModule';
import { columnColumnEndPlateConfig } from './configs/columnColumnEndPlateConfig';
import ColumnColumnEndPlateOutputDock from './components/ColumnColumnEndPlateOutputDock';
import { menuItems } from '../shared/utils/moduleUtils';

function ColumnColumnEndPlate() {
  return (
    <EngineeringModule
      moduleConfig={columnColumnEndPlateConfig}
      OutputDockComponent={ColumnColumnEndPlateOutputDock}
      menuItems={menuItems}
      title="Column Column End Plate Connection"
    />
  );
}

export default ColumnColumnEndPlate;