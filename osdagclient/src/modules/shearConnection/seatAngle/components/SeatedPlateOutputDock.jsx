import React from "react";
import { BaseOutputDock } from "../../../shared/components/BaseOutputDock";
import { seatedAngleOutputConfig } from "../configs/seatedPlateOutputConfig";
import { UI_STRINGS } from '../../../../constants/UIStrings';

const SeatedPlateOutputDock = ({ output, extraState }) => {
  console.log("SeatedPlateOutputDock received:", { output, extraState });
  return (
    <BaseOutputDock
      output={output}
      outputConfig={seatedAngleOutputConfig}
      title={UI_STRINGS.OUTPUT_DOCK}
      extraState={extraState}
    />
  );
};

export default SeatedPlateOutputDock;
