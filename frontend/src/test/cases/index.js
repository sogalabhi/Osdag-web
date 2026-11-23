/**
 * Every module's test inputs, in one list. Each module keeps its own case file, so a module
 * changing its fields edits only its file and not the shared tests.
 *
 * A case is `{ name, config, connectivities?, connectivityKey?, fill?, custom }`:
 * - `fill` gives values to inputs the user has to enter, which are empty in `defaultInputs`;
 * - `custom` is the explicit selection used when the lists are not on "All".
 */
import { finPlateCase } from "./finPlate";
import { cleatAngleCase } from "./cleatAngle";
import { headerPlateCase } from "./headerPlate";
import { seatedAngleCase } from "./seatedAngle";
import { beamBeamCoverPlateBoltedCase } from "./beamBeamCoverPlateBolted";
import { columnColumnCoverPlateBoltedCase } from "./columnColumnCoverPlateBolted";
import { beamBeamCoverPlateWeldedCase } from "./beamBeamCoverPlateWelded";
import { columnColumnCoverPlateWeldedCase } from "./columnColumnCoverPlateWelded";
import { beamBeamEndPlateCase } from "./beamBeamEndPlate";
import { beamColumnEndPlateCase } from "./beamColumnEndPlate";
import { columnColumnEndPlateCase } from "./columnColumnEndPlate";
import { tensionBoltedCase } from "./tensionBolted";
import { tensionWeldedCase } from "./tensionWelded";
import { basePlateCase } from "./basePlate";
import { lapJointBoltedCase } from "./lapJointBolted";
import { lapJointWeldedCase } from "./lapJointWelded";
import { buttJointBoltedCase } from "./buttJointBolted";
import { buttJointWeldedCase } from "./buttJointWelded";
import { axiallyLoadedColumnCase } from "./axiallyLoadedColumn";
import { strutsBoltedCase } from "./strutsBolted";
import { strutsWeldedCase } from "./strutsWelded";
import { simplySupportedBeamCase } from "./simplySupportedBeam";
import { onCantileverCase } from "./onCantilever";
import { plateGirderCase } from "./plateGirder";

export const MODULES = [
  finPlateCase,
  cleatAngleCase,
  headerPlateCase,
  seatedAngleCase,
  beamBeamCoverPlateBoltedCase,
  columnColumnCoverPlateBoltedCase,
  beamBeamCoverPlateWeldedCase,
  columnColumnCoverPlateWeldedCase,
  beamBeamEndPlateCase,
  beamColumnEndPlateCase,
  columnColumnEndPlateCase,
  tensionBoltedCase,
  tensionWeldedCase,
  basePlateCase,
  lapJointBoltedCase,
  lapJointWeldedCase,
  buttJointBoltedCase,
  buttJointWeldedCase,
  axiallyLoadedColumnCase,
  strutsBoltedCase,
  strutsWeldedCase,
  simplySupportedBeamCase,
  onCantileverCase,
  plateGirderCase,
];
