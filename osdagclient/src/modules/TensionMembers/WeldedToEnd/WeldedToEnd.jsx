import React from 'react';
import { EngineeringModule } from '../../shared/components/EngineeringModule';
import { weldedToEndConfig } from './configs/weldedToEndConfig';
import WeldedToEndOutputDock from './components/WeldedToEndOutputDock';
import { menuItems } from '../../shared/utils/moduleUtils';

function WeldedToEnd() {
  return (
    <EngineeringModule
      moduleConfig={weldedToEndConfig}
      OutputDockComponent={WeldedToEndOutputDock}
      menuItems={menuItems}
      title="Tension Member Bolted Design"
    />
  );
}

export default WeldedToEnd; 