/**
 * A desktop `.osi` example opened and saved again.
 *
 * Each example in `fixtures/osiExamples.json` is loaded into its module's form state (`loadStateFromOsi`)
 * and saved back as a design dictionary (`toDesignDictionary`). The dictionary keeps the file's keys
 * except the ones the web cannot carry, and those are pinned: the snapshot lists, per example, the keys
 * the save drops, the keys it adds (the builder's own: derived keys, defaults) and the keys whose
 * value changes (the web's spelling of an option, a blank load written as "0", ...).
 *
 * Dropped keys fall in two groups, both asserted below:
 * - a key no field of the module declares (`coreKeys`): the desktop's material overwrite keys
 *   (`Bolt.Material_Grade_OverWrite`), output-panel state (`out_titles_status`, `Label_8`), the member
 *   `Fu`/`Fy` rows. The loader does not read them (they are not overrides yet, see designDictionary.js);
 * - base plate Additional Inputs: declared, so they load into the form, but the base plate builder
 *   does not send them (they never reach the design request, nor the file).
 */
import { describe, expect, it } from "vitest";

import examples from "./fixtures/osiExamples.json";
import { MODULES } from "./cases";
import { LISTS, formRecorder } from "./cases/shared";
import { loadStateFromOsi } from "../modules/shared/utils/osiLoader";
import { toDesignDictionary } from "../modules/shared/utils/osiSave";
import { KEY_DISP_BASE_PLATE } from "../constants/generated/coreKeys";

const BY_MODULE = new Map(MODULES.map((m) => [m.config.designType, m.config]));

const declaredKeys = (config) => {
  const declared = new Set();
  for (const value of Object.values(config.coreKeys || {})) {
    if (value != null) [].concat(value).forEach((key) => declared.add(key));
  }
  return declared;
};

const short = (value) => {
  const text = JSON.stringify(value);
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
};

describe("a desktop .osi example opened and saved again", () => {
  for (const [name, { module, payload }] of Object.entries(examples)) {
    const config = BY_MODULE.get(module);
    if (!config) continue; // a module name the web does not open
    it(`${name} (${module})`, () => {
      const { state, options } = formRecorder(config);
      loadStateFromOsi(payload, options);
      const saved = JSON.parse(JSON.stringify(toDesignDictionary({
        moduleConfig: config,
        inputs: state.inputs,
        allSelected: state.allSelected,
        contextData: LISTS,
        extraState: state.extraState,
        designPrefOverrides: state.designPrefOverrides,
      })));

      const dropped = Object.keys(payload).filter((key) => !(key in saved)).sort();
      const added = Object.keys(saved).filter((key) => !(key in payload)).sort();
      const changed = Object.fromEntries(
        Object.keys(payload)
          .filter((key) => key in saved && JSON.stringify(payload[key]) !== JSON.stringify(saved[key]))
          .sort()
          .map((key) => [key, `${short(payload[key])} -> ${short(saved[key])}`]),
      );

      const declared = declaredKeys(config);
      const unexplained = dropped.filter((key) => declared.has(key) && config.designType !== KEY_DISP_BASE_PLATE);
      expect(unexplained, "a declared key was lost on the way through the form").toEqual([]);
      expect(saved).not.toHaveProperty("dock");
      expect(Object.keys(saved).filter((key) => key.startsWith("Pref."))).toEqual([]);

      expect({ dropped, added, changed }).toMatchSnapshot();
    });
  }
});
