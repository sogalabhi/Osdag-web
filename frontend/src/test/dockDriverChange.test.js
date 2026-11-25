/**
 * A file, project or example that is loaded must not count as the user changing the dock Material.
 *
 * On the desktop `loadDesign_inputs` sets `ui_loaded` to False around `setDictToUserInputs`, and
 * `clear_design_pref_dictionary` clears the saved Additional Inputs only `if self.ui_loaded`: the
 * rows of a file (Base Plate, Stiffener, Connector, member materials) survive a load whose dock
 * Material differs from the one before, and go only when the user changes the dock afterwards.
 *
 * On the web a load replaces the inputs and the saved overrides in one commit. `dockDriverChange`
 * tells that commit ("load") from a user's edit ("user"): a load only moves the "last seen" dock
 * value, it neither clears the saved Additional Inputs (`useModuleForm`) nor makes the dock refresh
 * the linked rows (`useDesignPrefSync`).
 */
import { describe, expect, it } from "vitest";

import examples from "./fixtures/osiExamples.json";
import { loadStateFromOsi } from "../modules/shared/utils/osiLoader";
import { dockDriverChange, dockSyncOperation } from "../modules/shared/utils/dockDriverChange";
import { dockDriverFields, prefClearingFields } from "../modules/shared/utils/prefSyncKeys";
import { MODULES } from "./cases";
import { LISTS, formRecorder } from "./cases/shared";

const OVERRIDES = {};
const snapshotOf = (fields, inputs) => JSON.stringify(fields.map((field) => inputs?.[field]));

describe("dockDriverChange", () => {
  const same = '["E 250"]';
  const other = '["E 300"]';

  it("has no change before the first commit or while the dock driver is where it was", () => {
    expect(dockDriverChange({ previousSnapshot: null, snapshot: same, previousOverrides: OVERRIDES, overrides: OVERRIDES })).toBe("none");
    expect(dockDriverChange({ previousSnapshot: same, snapshot: same, previousOverrides: OVERRIDES, overrides: OVERRIDES })).toBe("none");
    expect(dockDriverChange({ previousSnapshot: same, snapshot: same, previousOverrides: OVERRIDES, overrides: {} })).toBe("none");
  });

  it("is a load when the saved overrides were replaced in the commit that moved the dock driver", () => {
    expect(dockDriverChange({ previousSnapshot: same, snapshot: other, previousOverrides: OVERRIDES, overrides: {} })).toBe("load");
  });

  it("is the user's edit when the dock driver moved and the overrides stayed", () => {
    expect(dockDriverChange({ previousSnapshot: same, snapshot: other, previousOverrides: OVERRIDES, overrides: OVERRIDES })).toBe("user");
  });
});

describe("the sync a dock driver commit starts", () => {
  it("refreshes the linked rows from the dock for the user's edit and for the first commit", () => {
    expect(dockSyncOperation("user")).toBe("refresh");
    expect(dockSyncOperation("none")).toBe("refresh");
  });

  it("only opens, filling the rows a file lacks and keeping the rows it holds, after a load", () => {
    expect(dockSyncOperation("load")).toBe("open");
  });
});

describe("loading a desktop example", () => {
  for (const [name, { module, payload }] of Object.entries(examples)) {
    const entry = MODULES.find((m) => m.config.designType === module);
    if (!entry) continue;
    const { config } = entry;

    it(`${name} (${module}) moves the last seen dock driver without counting as a user's change`, () => {
      const { state, options } = formRecorder(config, LISTS);
      const before = { inputs: state.inputs, overrides: state.designPrefOverrides };
      loadStateFromOsi(payload, options);

      for (const fields of [prefClearingFields(config), dockDriverFields(config)]) {
        const previousSnapshot = snapshotOf(fields, before.inputs);
        const snapshot = snapshotOf(fields, state.inputs);
        const kind = dockDriverChange({ previousSnapshot, snapshot, previousOverrides: before.overrides, overrides: state.designPrefOverrides });
        expect(kind).toBe(previousSnapshot === snapshot ? "none" : "load");
      }
    });

    it(`${name} (${module}): the user's next edit of the dock driver counts again`, () => {
      const { state, options } = formRecorder(config, LISTS);
      loadStateFromOsi(payload, options);
      const loadedOverrides = state.designPrefOverrides;
      for (const fields of [prefClearingFields(config), dockDriverFields(config)]) {
        if (!fields.length) continue;
        const loaded = snapshotOf(fields, state.inputs);
        const edited = snapshotOf(fields, { ...state.inputs, [fields[0]]: "another grade" });
        expect(dockDriverChange({ previousSnapshot: loaded, snapshot: edited, previousOverrides: loadedOverrides, overrides: loadedOverrides })).toBe("user");
      }
    });
  }

  it("hands over a new overrides object even when the file carries no Additional Inputs", () => {
    const { config } = MODULES.find((m) => m.name === "fin plate");
    const { state, options } = formRecorder(config, LISTS);
    const before = state.designPrefOverrides;
    loadStateFromOsi({ Module: config.designType }, options);
    expect(state.designPrefOverrides).not.toBe(before);
  });
});
