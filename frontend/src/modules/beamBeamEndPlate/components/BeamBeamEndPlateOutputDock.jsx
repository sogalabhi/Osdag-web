/* eslint-disable react/prop-types */
import { BaseOutputDock } from '../../shared/components/BaseOutputDock';
import { beamBeamEndPlateOutputConfig } from '../configs/beamBeamEndPlateOutputConfig';

const BeamBeamEndPlateOutputDock = ({ output, extraState }) => {
  return (
    <BaseOutputDock 
      output={output}
      outputConfig={beamBeamEndPlateOutputConfig}
      title="Output Dock"
      extraState={extraState}
    />
  );
};

export default BeamBeamEndPlateOutputDock;