import React from 'react';
import { EngineeringModule } from '../../shared/components/EngineeringModule';
import { onCantileverConfig } from './configs/onCantileverConfig';
import SimplySupportedBeamOutputDock from '../simplySupportedBeam/components/SimplySupportedBeamOutputDock';
import { menuItems } from '../../shared/utils/moduleUtils';

function OnCantilever() {
  return (
    <EngineeringModule
      moduleConfig={onCantileverConfig}
      OutputDockComponent={SimplySupportedBeamOutputDock}
      menuItems={menuItems}
      title="On Cantilever Beam (Flexural Member)"
    />
  );
}

export default OnCantilever;
