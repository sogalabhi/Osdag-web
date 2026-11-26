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
import { getDesignPrefConfig } from "../modules/shared/config/designPrefModuleConfig";
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

// Requests that change on the way through a saved project, and the keys that change. Each is a bug to fix,
// not a behaviour to keep: when one is fixed its entry goes. None is known at present.
const KNOWN_GAPS = {};

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

  // The Deflection Criteria are four fields that only meet in Deflection.Max; the structure type has to be
  // saved itself, or a reopened form falls back to "Highway Bridge" and sends another Deflection.Max.
  it("plate girder: a changed structure type and a typed thickness reopen to the same request", () => {
    const module = MODULES.find((m) => m.name === "plate girder");
    const { config } = module;
    for (const selection of ["all", "customized"]) {
      const base = caseState(module, selection);
      const before = {
        ...base,
        inputs: {
          ...base.inputs,
          structure_type: "Other Building",
          member_options: "Floor and roof",
          supporting_options: "Element susceptible to cracking",
          web_thickness: "25",
        },
      };
      const original = designRequest(config, before);
      expect(original["Deflection.Max"]).toBe("Span/360");
      const after = designRequest(config, reopen(config, saveProject({ config, ...before }, {})));
      expect(after).toEqual(original);
    }
  });

  // The girder's Additional Inputs (Girder Properties material, Optimisation values) are saved under their core
  // keys and the dialog shows them again after reopening.
  it("plate girder: the saved dialog values reopen in the dialog", () => {
    const module = MODULES.find((m) => m.name === "plate girder");
    const { config } = module;
    const saved = { girder_material: "E 350 (Fe 490)", allowable_class: "No", effective_area_parameter: "0.8", length_overwrite: "1.1", design_method: "Limit State Design" };
    const before = caseState(module, "customized");
    const file = saveProject({ config, ...before }, saved);
    expect(file).toMatchObject({ "Member.Material": "E 350 (Fe 490)", "Optimum.Class": "No", "Effective.Area_Para": "0.8", "Length.Overwrite": "1.1" });
    const state = reopen(config, file);
    const prefConfig = getDesignPrefConfig(config.sessionName);
    expect(prefConfig.getInitialPrefs({ ...state.inputs, ...state.designPrefOverrides }, config.sessionName)).toEqual(saved);
    expect(designRequest(config, state)).toEqual(designRequest(config, { ...before, designPrefOverrides: saved }));
  });
});
