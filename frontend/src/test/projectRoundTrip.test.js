/**
 * Saving a project and opening it again must give the same design request.
 *
 * For every module case in `payloadParity.test.js` (default inputs, each connectivity, lists
 * on "All" and on an explicit selection) the form state is saved as the app saves a project
 * (`toDesignDictionary`, the one function `useProjectCreation` and the design run use), JSON-encoded
 * as the backend stores it, then loaded back the way `useProjectLoader` does (`loadStateFromOsi`),
 * and the module's `buildSubmissionParams` must send the same request as before, with and
 * without Additional Inputs overrides.
 */
import { describe, expect, it } from "vitest";

import { MODULES } from "./cases";
import { LISTS, caseState, designRequest, formRecorder, wire } from "./cases/shared";
import { loadStateFromOsi } from "../modules/shared/utils/osiLoader";
import { toDesignDictionary } from "../modules/shared/utils/osiSave";
import * as webKeys from "../constants/generated/webKeys";

// Keys the web defines for the wire itself (`is_leg_loaded`); they match a field name on purpose.
const WEB_WIRE_KEYS = new Set(Object.values(webKeys));

// Additional Inputs as the form keeps them, keyed by the web field names (a pref a module lacks is ignored).
const PREFS = { bolt_hole_type: "Over-sized", detailing_gap: "5", weld_fab: "Field Weld" };

const saveProject = ({ config, inputs, allSelected, extraState }, prefs) =>
  wire(toDesignDictionary({
    moduleConfig: config, inputs, allSelected, contextData: LISTS, extraState, designPrefOverrides: prefs,
  }));

const reopen = (config, savedInputsJson) => {
  const { state, options } = formRecorder(config);
  loadStateFromOsi(savedInputsJson, options);
  return state;
};

// Requests that change on the way through a saved project, and the keys that change. Each is a
// bug to fix, not a behaviour to keep: when one is fixed its entry goes. Unconfirmed in a browser.
// - Base plate: `notLoadedFromDictionary` keeps the two inside-flange anchor lists from being filled by
//   a file (the old loader never filled them); their saved values are not read back.
// - Plate girder: with the thickness lists on "All" and the design type "Customized", the builder sends
//   the dock's own value, but the save expands the "All" lists into the dock first, and the expanded
//   list is what comes back. The case state here leaves the "All" lists unfilled, as `defaultInputs`
//   does; the form fills them before Design, which would make the two agree (not checked).
const BASE_PLATE_GAP = ["Anchor Bolt.ICF.Diameter", "Anchor Bolt.ICF.Grade"];
const PLATE_GIRDER_GAP = ["Web.Thickness", "TopFlange.Thickness", "BottomFlange.Thickness"];
const KNOWN_GAPS = {
  "base plate | customized / Welded Column Base, saved": BASE_PLATE_GAP,
  "base plate | customized / Welded Column Base, saved with overrides": BASE_PLATE_GAP,
  "plate girder | all, saved": PLATE_GIRDER_GAP,
  "plate girder | all, saved with overrides": PLATE_GIRDER_GAP,
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
        for (const [withOverrides, prefs] of [["", {}], [" with overrides", PREFS]]) {
          const label = `${selection}${connectivity ? ` / ${connectivity}` : ""}, saved${withOverrides}`;
          it(label, () => {
            const { config } = module;
            const before = caseState(module, selection, connectivity);
            const original = designRequest(config, { ...before, designPrefOverrides: prefs });

            const saved = saveProject({ config, ...before }, prefs);
            const reopened = reopen(config, saved);

            const after = designRequest(config, reopened);

            const changed = Object.keys({ ...original, ...after })
              .filter((key) => JSON.stringify(original[key]) !== JSON.stringify(after[key]));
            expect(changed).toEqual(KNOWN_GAPS[`${module.name} | ${label}`] || []);
          });
        }
      }

      it("saves a flat dictionary of core keys", () => {
        const { config } = module;
        const saved = saveProject({ config, ...caseState(module, "customized", connectivities[0]) }, PREFS);
        for (const [key, value] of Object.entries(saved)) {
          expect(key.startsWith("Pref."), key).toBe(false);
          if (!WEB_WIRE_KEYS.has(key)) expect(Object.keys(config.coreKeys), `${key} is a form field name`).not.toContain(key);
          expect(typeof value === "object" && !Array.isArray(value) && value !== null, key).toBe(false);
        }
        expect(saved).not.toHaveProperty("dock");
        expect(saved).not.toHaveProperty("pref");
      });
    });
  }
});
