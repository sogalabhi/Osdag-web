/**
 * Saving a project and opening it again must give the same design request.
 *
 * For every module case in `payloadParity.test.js` (default inputs, each connectivity, lists
 * on "All" and on an explicit selection) the form state is saved the two ways the app saves
 * a project, JSON-encoded as the backend stores it, then loaded back the way
 * `useProjectLoader` does (`loadStateFromOsi`), and the module's `buildSubmissionParams` must
 * send the same request as before:
 * - on create (`useProjectCreation`): `{ version, name, module_id, inputs: { dock, pref } }`, with
 *   the "All" lists expanded and the extra state merged into the dock;
 * - on every design run (`useDesignSubmission`): `{ dock, pref }` with the dock inputs as they are.
 */
import { describe, expect, it } from "vitest";

import { MODULES } from "./cases";
import { LISTS, caseState, designRequest, formRecorder, wire } from "./cases/shared";
import { INPUT_KEY_TO_LIST } from "../modules/shared/constants/moduleDataKeys";
import { loadStateFromOsi } from "../modules/shared/utils/osiLoader";
import { expandAllSelectedInputs } from "../modules/shared/utils/osiInputSerializer";

const PREFS = { "Bolt.Bolt_Hole_Type": "Over-sized", "Detailing.Gap": "5" };

// What `useModuleForm` does: an "All" list that is empty is filled from the module's option list.
const fillAllFromLists = (inputs, allSelected) => {
  const next = { ...inputs };
  for (const [inputKey, listKey] of Object.entries(INPUT_KEY_TO_LIST)) {
    if (!allSelected?.[inputKey]) continue;
    const current = next[inputKey];
    if (Array.isArray(current) ? current.length : current) continue;
    const full = LISTS[listKey];
    if (Array.isArray(full) && full.length) next[inputKey] = full.map((v) => (typeof v === "object" && v ? v.value || v.Grade || String(v) : String(v)));
  }
  return next;
};

// The two project shapes the app stores in `inputs_json`.
const SAVES = {
  "on create": ({ config, inputs, allSelected, extraState }, pref) => ({
    version: "1.0",
    name: "Round_trip",
    module_id: config.designType,
    inputs: { dock: expandAllSelectedInputs({ ...inputs, ...extraState }, allSelected, LISTS), pref },
  }),
  "on design": ({ inputs, allSelected }, pref) => ({ dock: fillAllFromLists(inputs, allSelected), pref }),
};

const reopen = (config, savedInputsJson) => {
  const { state, options } = formRecorder(config);
  loadStateFromOsi(wire(savedInputsJson), options);
  return state;
};

// Requests that change on the way through a saved project, and the keys that change. Each is a
// bug to fix, not a behaviour to keep: when one is fixed its entry goes. Unconfirmed in a browser.
// - The section list of a module whose "All" is a dynamic list (the list depends on the profile) is
//   not stored, since the dock holds only what the user picked, and on reopening an empty or default
//   list is read as an explicit selection.
// - The plate girder thickness lists on "All" are sent from the dock inputs, but a project saved on
//   create stores the lists expanded from the option list, which then replace them.
const SECTION_GAP = ["Member.Designation"];
const KNOWN_GAPS = {
  "tension bolted | all, saved on create": SECTION_GAP,
  "tension bolted | all, saved on design": SECTION_GAP,
  "struts bolted | all, saved on create": SECTION_GAP,
  "struts bolted | all, saved on design": SECTION_GAP,
  "struts welded | all, saved on create": SECTION_GAP,
  "struts welded | all, saved on design": SECTION_GAP,
  "simply supported beam | all, saved on create": SECTION_GAP,
  "simply supported beam | all, saved on design": SECTION_GAP,
  "on cantilever | all, saved on create": SECTION_GAP,
  "on cantilever | all, saved on design": SECTION_GAP,
  "plate girder | all, saved on create": ["Web.Thickness", "TopFlange.Thickness", "BottomFlange.Thickness"],
};

describe("project round trip: the design request after save and reopen", () => {
  for (const module of MODULES) {
    describe(module.name, () => {
      const connectivities = module.connectivities || [null];
      const variants = [
        ...connectivities.map((connectivity) => ({ selection: "all", connectivity })),
        { selection: "customized", connectivity: connectivities[0] },
      ];

      for (const { selection, connectivity } of variants) {
        for (const [saveName, save] of Object.entries(SAVES)) {
          const label = `${selection}${connectivity ? ` / ${connectivity}` : ""}, saved ${saveName}`;
          it(label, () => {
            const { config } = module;
            const before = caseState(module, selection, connectivity);
            const original = designRequest(config, { ...before, designPrefOverrides: {} });

            const reopened = reopen(config, save({ config, ...before }, {}));

            const after = designRequest(config, reopened);

            const changed = Object.keys({ ...original, ...after })
              .filter((key) => JSON.stringify(original[key]) !== JSON.stringify(after[key]));
            expect(changed).toEqual(KNOWN_GAPS[`${module.name} | ${label}`] || []);
          });
        }
      }

      it("keeps the Additional Inputs overrides", () => {
        const { config } = module;
        const before = caseState(module, "customized", connectivities[0]);
        for (const save of Object.values(SAVES)) {
          const reopened = reopen(config, save({ config, ...before }, PREFS));
          expect(reopened.designPrefOverrides).toEqual(PREFS);
        }
      });
    });
  }
});
