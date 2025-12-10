import React from 'react';
import { EngineeringModule } from '../../shared/components/EngineeringModule';
import { menuItems } from '../../shared/utils/moduleUtils';
import buttJointWeldedOutputDock from './components/ButtJointWeldedOutputDock';
import { buttJointWeldedConfig } from './config/buttJointWeldedConfig';


function ButtJointWelded() {
    return (
        <EngineeringModule
            moduleConfig={buttJointWeldedConfig}
            OutputDockComponent={buttJointWeldedOutputDock}
            menuItems={menuItems}
            title="Butt Joint Welded"
        />
    );
}

export default ButtJointWelded; 