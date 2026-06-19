/* eslint-disable react/prop-types */
import { BaseOutputDock } from '../../shared/components/BaseOutputDock';
import { coverPlateWeldedOutputConfig } from '../configs/coverPlateWeldedOutputConfig';

const CoverPlateWeldedOutputDock = ({ output }) => {
  return (
    <BaseOutputDock 
      output={output}
      outputConfig={coverPlateWeldedOutputConfig}
      title="Output Dock"
    />
  );
};

export default CoverPlateWeldedOutputDock;