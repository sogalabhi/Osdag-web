/**
 * Loading `.osi` files into a module's form state.
 *
 * Every desktop example under `osdag_core/data/ResourceFiles/design_example` is parsed by the
 * backend (`parse_osi`, saved in `fixtures/osiExamples.json`) and loaded into its module with
 * `loadStateFromOsi`. The snapshots pin the resulting form state, so a change to the key
 * mapping (`osiNormalizer`, `osiMapperTracer`, the loader) shows up as a diff. The key map that
 * `getModuleKeyMap` derives for each module is pinned the same way.
 *
 * To refresh the fixtures, run the backend's `parse_osi` (`apps/core/utils/osi_files.py`) over the
 * example files again and write `{ module, payload }` per file. Update the snapshots with
 * `npm test -- -u` and read the diff.
 */
import { describe, expect, it } from "vitest";

import examples from "./fixtures/osiExamples.json";
import { loadStateFromOsi } from "../modules/shared/utils/osiLoader";
import { getModuleKeyMap } from "../modules/shared/utils/osiMapperTracer";

import { basePlateConfig } from "../modules/basePlate/configs/basePlateConfig";
import { beamBeamEndPlateConfig } from "../modules/beamBeamEndPlate/configs/beamBeamEndPlateConfig";
import { beamToColumnEndPlateConfig } from "../modules/beamToColumnEndPlate/configs/beamToColumnEndPlateConfig";
import { coverPlateBoltedConfig as bbCoverBolted } from "../modules/coverPlateBolted/configs/coverPlateBoltedConfig";
import { coverPlateWeldedConfig as bbCoverWelded } from "../modules/coverPlateWelded/configs/coverPlateWeldedConfig";
import { coverPlateBoltedConfig as ccCoverBolted } from "../modules/columnColumnCoverPlateBolted/configs/coverPlateBoltedConfig";
import { coverPlateWeldedConfig as ccCoverWelded } from "../modules/columnColumnCoverPlateWelded/configs/coverPlateWeldedConfig";
import { columnColumnEndPlateConfig } from "../modules/columnColumnEndPlate/configs/columnColumnEndPlateConfig";
import { cleatAngleConfig } from "../modules/shearConnection/cleatAngle/configs/cleatAngleConfig";
import { endPlateConfig } from "../modules/shearConnection/endPlate/configs/endPlateConfig";
import { finPlateConfig } from "../modules/shearConnection/finPlate/configs/finPlateConfig";
import { seatedAngleConfig } from "../modules/shearConnection/seatAngle/configs/seatedAngleConfig";
import { boltedToEndConfig } from "../modules/TensionMembers/BoltedToEnd/configs/boltedToEndConfig";
import { weldedToEndConfig } from "../modules/TensionMembers/WeldedToEnd/configs/weldedToEndConfig";

const CONFIGS = [
  basePlateConfig, beamBeamEndPlateConfig, beamToColumnEndPlateConfig, bbCoverBolted, bbCoverWelded,
  ccCoverBolted, ccCoverWelded, columnColumnEndPlateConfig, cleatAngleConfig, endPlateConfig,
  finPlateConfig, seatedAngleConfig, boltedToEndConfig, weldedToEndConfig,
];
const BY_MODULE = new Map(CONFIGS.map((config) => [config.designType, config]));

// Small fixed option lists, enough for the loader's "is this the whole list" and material lookups.
const MODULE_DATA = {
  materialList: [
    { id: 1, Grade: "E 250 (Fe 410 W)A" },
    { id: 2, Grade: "E 165 (Fe 290)" },
    { id: 3, Grade: "E 300 (Fe 440)" },
  ],
  boltDiameterList: ["12", "16", "20"],
  propertyClassList: ["4.6", "8.8", "10.9"],
  thicknessList: ["8", "10", "12"],
};

// React-like setters that apply updater functions to a plain object.
function recorder(config) {
  const state = {
    inputs: undefined, designPrefOverrides: undefined,
    allSelected: {}, selectionStates: {}, selectedItems: {}, extraState: {},
  };
  const merge = (key) => (next) => { state[key] = typeof next === "function" ? next(state[key]) : next; };
  return {
    state,
    options: {
      setInputs: merge("inputs"),
      setDesignPrefOverrides: merge("designPrefOverrides"),
      setExtraState: merge("extraState"),
      setSelectionStates: merge("selectionStates"),
      setAllSelected: merge("allSelected"),
      setSelectedItems: merge("selectedItems"),
      moduleConfig: config,
      safeModuleData: MODULE_DATA,
    },
  };
}

describe("loading a desktop .osi example into its module", () => {
  for (const [name, { module, payload }] of Object.entries(examples)) {
    const config = BY_MODULE.get(module);
    if (!config) continue; // a module name the web does not open
    it(`${name} (${module})`, () => {
      const { state, options } = recorder(config);
      loadStateFromOsi(payload, options);
      expect(JSON.parse(JSON.stringify(state))).toMatchSnapshot();
    });
  }

  it("covers every module that has desktop examples", () => {
    const modules = new Set(Object.values(examples).map((e) => e.module));
    const opened = [...modules].filter((m) => BY_MODULE.has(m));
    expect(opened.length).toBeGreaterThanOrEqual(13);
  });
});

describe("the key map derived for each module", () => {
  for (const config of CONFIGS) {
    it(config.designType, () => {
      expect(getModuleKeyMap(config)).toMatchSnapshot();
    });
  }
});
