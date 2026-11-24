/**
 * The web does not invent Additional Inputs values: a design request carries an Additional
 * Inputs key only when the user saved it (or loaded it from a file). The backend fills the rest
 * from the core (`design_dictionary.fill_prefs`), as the desktop does when its dialog was never
 * opened.
 *
 * The Additional Inputs keys of a module are the core's: the keys of its pref tabs, its computed
 * keys and the targets of its 'Input Dock' copies (`DESIGN_PREF_TABLES`), without its dock keys.
 * A key a main-form field feeds (the plate girder deflection, design load and supporting
 * options) is a dock value on the web and may be sent.
 */
import { describe, expect, it } from "vitest";

import { DESIGN_PREF_TABLES } from "../constants/generated/designPrefTables";
import { MODULES } from "./cases";
import { caseState, designRequest } from "./cases/shared";

const asList = (declared) => (declared == null ? [] : Array.isArray(declared) ? declared : [declared]);

/** The core's Additional Inputs keys of a module (see `design_dictionary.pref_keys`). */
const prefKeysOf = (moduleId) => {
  const tables = DESIGN_PREF_TABLES[moduleId];
  const keys = new Set([
    ...tables.prefTabs.flatMap(([, , tabKeys]) => tabKeys),
    ...tables.computed,
    ...Object.values(tables.dockCopies).flat(),
  ]);
  for (const key of tables.dockKeys) keys.delete(key);
  return keys;
};

/** The core keys the main form (dock) fields of a module feed. */
const mainFormKeysOf = (config) => {
  const fields = (config.inputSections || []).flatMap((section) => (section.fields || []).map((field) => field.key));
  return new Set(fields.flatMap((field) => asList(config.coreKeys?.[field])));
};

describe("the default design request carries no Additional Inputs the user did not save", () => {
  for (const module of MODULES) {
    const { config } = module;
    const connectivities = module.connectivities || [null];
    for (const selection of ["all", "customized"]) {
      for (const connectivity of selection === "all" ? connectivities : connectivities.slice(0, 1)) {
        it(`${module.name}: ${selection}${connectivity ? ` / ${connectivity}` : ""}`, () => {
          const prefKeys = prefKeysOf(config.designType);
          const mainForm = mainFormKeysOf(config);
          const body = designRequest(config, caseState(module, selection, connectivity));
          // Each key sent without being saved, with the form fields that feed it.
          const invented = Object.keys(body)
            .filter((key) => prefKeys.has(key) && !mainForm.has(key))
            .map((key) => `${key} <- ${Object.entries(config.coreKeys || {}).filter(([, keys]) => asList(keys).includes(key)).map(([field]) => field).join(", ")}`);
          expect(invented).toEqual([]);
        });
      }
    }
  }
});

describe("a saved Additional Input is sent as saved", () => {
  for (const module of MODULES) {
    const { config } = module;
    it(module.name, () => {
      const state = caseState(module, "all", module.connectivities?.[0] ?? null);
      const prefKeys = prefKeysOf(config.designType);
      // Every field the module declares for a pref key, saved with a recognisable value.
      const saved = Object.fromEntries(
        Object.entries(config.coreKeys || {})
          .filter(([, keys]) => asList(keys).some((key) => prefKeys.has(key)))
          .map(([field]) => [field, `saved ${field}`]),
      );
      const body = designRequest(config, { ...state, designPrefOverrides: saved });
      const sent = Object.values(body).filter((value) => typeof value === "string" && value.startsWith("saved "));
      expect(sent.length).toBeGreaterThan(0);
    });
  }
});
