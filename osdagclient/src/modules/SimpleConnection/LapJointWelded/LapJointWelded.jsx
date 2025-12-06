import React from 'react';
import { EngineeringModule } from '../../shared/components/EngineeringModule';
import { menuItems } from '../../shared/utils/moduleUtils';
import lapJointWeldedOutputDock from './components/LapJointWeldedOutputDock';
import { lapJointWeldedConfig } from './config/lapJointWeldedConfig';


function LapJointWelded() {
    return (
        <EngineeringModule
            moduleConfig={lapJointWeldedConfig}
            OutputDockComponent={lapJointWeldedOutputDock}
            menuItems={menuItems}
            title="Lap Joint Welded"
        />
    );
}

export default LapJointWelded; 