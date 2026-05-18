import React from 'react';
import { EngineeringModule } from '../shared/components/EngineeringModule';
import { strutsWeldedConfig } from './configs/strutsWeldedConfig';
import { strutsWeldedOutputConfig } from './configs/strutsWeldedOutputConfig';

function StrutsWelded() {
    return (
        <EngineeringModule
            moduleConfig={strutsWeldedConfig}
            outputConfig={strutsWeldedOutputConfig}
            title="Struts Welded to End Gusset"
        />
    );
}

export default StrutsWelded;
