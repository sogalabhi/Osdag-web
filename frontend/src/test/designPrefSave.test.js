/**
 * Additional Inputs: opening the dialog and pressing Save without a change must work in every
 * module, so the dialog's starting state must hold every field the Save check requires. A
 * module that lists a field the dialog never shows, with no value for it, blocks Save.
 *
 * `fixtures/designPrefOpenDefaults.json` holds, per module, what the server's "open" sync adds
 * on top of the module's default inputs (the values its core design class supplies).
 */
import { describe, expect, it } from "vitest";

import { MODULES } from "./cases";
import openDefaults from "./fixtures/designPrefOpenDefaults.json";
import { getDesignPrefConfig } from "../modules/shared/config/designPrefModuleConfig";
import { buildPrefDraft, findEmptyPrefField } from "../modules/shared/utils/designPrefValidation";

describe("Additional Inputs: Save works straight after opening", () => {
  for (const { name, config, fill } of MODULES) {
    const module = config.sessionName;
    const resolved = { ...config.defaultInputs, ...(fill || {}), ...(openDefaults[module] || {}) };

    it(`${name}: the opened state has no empty field`, () => {
      expect(openDefaults).toHaveProperty([module]);
      const prefs = getDesignPrefConfig(module).getInitialPrefs(resolved, module);
      expect(findEmptyPrefField(buildPrefDraft(prefs, module))).toBeNull();
    });

    it(`${name}: the state after Defaults has no empty field`, () => {
      const prefConfig = getDesignPrefConfig(module);
      const merged = { ...resolved, ...prefConfig.getDefaultPrefs(resolved, module, resolved) };
      const prefs = prefConfig.getInitialPrefs(merged, module);
      expect(findEmptyPrefField(buildPrefDraft(prefs, module))).toBeNull();
    });
  }
});
