import React from 'react';
import { EngineeringModule } from '../shared/components/EngineeringModule';
import { compressionMemberConfig } from './configs/compressionMemberConfig';
import CompressionMemberOutputDock from './components/CompressionMemberOutputDock';
import { menuItems } from '../shared/utils/moduleUtils';

function CompressionMember() {
  return (
    <EngineeringModule
      moduleConfig={compressionMemberConfig}
      OutputDockComponent={CompressionMemberOutputDock}
      menuItems={menuItems}
      title="Compression Member (Struts in Trusses)"
    />
  );
}

export default CompressionMember;


