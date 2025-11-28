import React from 'react';
import { EngineeringModule } from '../../shared/components/EngineeringModule';
import { menuItems } from '../../shared/utils/moduleUtils';
import buttJointBoltedOutputDock from './components/ButtJointBoltedOutputDock';
import { buttJointBoltedConfig } from './config/buttJointBoltedConfig';


function ButtJointBolted() {
    return (
        <EngineeringModule
            moduleConfig={buttJointBoltedConfig}
            OutputDockComponent={buttJointBoltedOutputDock}
            menuItems={menuItems}
            title="Butt Joint Bolted"
        />
    );
}

export default ButtJointBolted; 