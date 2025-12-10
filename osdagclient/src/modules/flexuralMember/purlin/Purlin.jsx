import React from 'react';
import { EngineeringModule } from '../../shared/components/EngineeringModule';
import { purlinConfig } from './configs/purlinConfig';
import SimplySupportedBeamOutputDock from '../simplySupportedBeam/components/SimplySupportedBeamOutputDock';
import { menuItems } from '../../shared/utils/moduleUtils';

function Purlin() {
  return (
    <EngineeringModule
      moduleConfig={purlinConfig}
      OutputDockComponent={SimplySupportedBeamOutputDock}
      menuItems={menuItems}
      title="Purlin (Flexural Member)"
    />
  );
}

export default Purlin;
