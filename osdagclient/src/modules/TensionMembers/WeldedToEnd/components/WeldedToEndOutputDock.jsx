import React from "react";
import { BaseOutputDock } from "../../../shared/components/BaseOutputDock";
import { weldedToEndOutputConfig } from "../configs/weldedToEndOutputConfig";

function WeldedToEndOutputDock({ output }) {
  return (
    <div className="OutputDock">
      <BaseOutputDock 
        output={output} 
        outputConfig={weldedToEndOutputConfig}
        title="Output Dock"
      />
    </div>
  );
}

export default WeldedToEndOutputDock; 