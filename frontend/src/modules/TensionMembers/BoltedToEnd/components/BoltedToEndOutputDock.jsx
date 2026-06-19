/* eslint-disable react/prop-types */
import { BaseOutputDock } from "../../../shared/components/BaseOutputDock";
import { boltedToEndOutputConfig } from "../configs/boltedToEndOutputConfig";
import { UI_STRINGS } from '../../../../constants/UIStrings';

function BoltedToEndOutputDock({ output, extraState }) {
  return (
    <BaseOutputDock
      output={output}
      outputConfig={boltedToEndOutputConfig}
      title={UI_STRINGS.OUTPUT_DOCK}
      extraState={extraState}
    />
  );
}

export default BoltedToEndOutputDock; 