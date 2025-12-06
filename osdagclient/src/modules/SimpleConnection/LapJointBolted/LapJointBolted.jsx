import React from 'react';
import { EngineeringModule } from '../../shared/components/EngineeringModule';
import { menuItems } from '../../shared/utils/moduleUtils';
import lapJointBoltedOutputDock from './components/LapJointBoltedOutputDock';
import { lapJointBoltedConfig } from './config/lapJointBoltedConfig';


function LapJointBolted() {
    return (
        <EngineeringModule
            moduleConfig={lapJointBoltedConfig}
            OutputDockComponent={lapJointBoltedOutputDock}
            menuItems={menuItems}
            title="Lap Joint Bolted"
        />
    );
}

export default LapJointBolted; 