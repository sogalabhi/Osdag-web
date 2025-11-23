import React from "react";
import { BaseOutputDock } from "../../../shared/components/BaseOutputDock";
import { axialColumnConfigOutput } from "../configs/axialColumnConfigOutput";
import { UI_STRINGS } from '../../../../constants/UIStrings';

const AxiallyLoadedColumnOutputDock = ({ output, extraState }) => {
  return (
    <BaseOutputDock
      output={output}
      outputConfig={axialColumnConfigOutput}
      title={UI_STRINGS.OUTPUT_DOCK || "Axially Loaded Column Results"}
      extraState={extraState}
    />
  );
};

export default AxiallyLoadedColumnOutputDock;
