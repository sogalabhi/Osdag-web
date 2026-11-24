/**
 * The weld tab of Additional Inputs offers only spellings the core accepts, and what it shows
 * is what the design request sends.
 *
 * The core looks the fabrication up by exact spelling (`cl_5_4_1_Table_5['gamma_mw'][fab]`), and
 * knows 'Shop Weld' and 'Field weld' (`KEY_DP_WELD_FAB_VALUES`, generated into coreKeys.js). The butt
 * and lap joint welded modules have their own weld dropdown, Weld.Type, with 'Shop weld' and
 * 'Field weld' (checked against the core in backend/apps/core/tests/test_weld_values.py).
 */
import { describe, expect, it } from "vitest";

import examples from "./fixtures/osiExamples.json";
import { KEY_DP_FAB_FIELD, KEY_DP_FAB_SHOP, KEY_DP_WELD_FAB, KEY_DP_WELD_TYPE } from "../constants/generated/coreKeys";
import { getDesignPrefConfig, getDesignPrefTabs } from "../modules/shared/config/designPrefModuleConfig";
import { WELD_FAB_OPTIONS, WELD_TYPE_OPTIONS, weldOptionsFor } from "../modules/shared/config/prefOptions";
import { loadStateFromOsi } from "../modules/shared/utils/osiLoader";
import { MODULES } from "./cases";
import { LISTS, formRecorder } from "./cases/shared";

const WELD_TAB = 10;
const asList = (declared) => (declared == null ? [] : Array.isArray(declared) ? declared : [declared]);

/** The spellings the core accepts for the weld field of a module. */
const acceptedFor = (config) =>
  asList(config.coreKeys?.weld_fab).includes(KEY_DP_WELD_TYPE) ? ["Shop weld", "Field weld"] : [KEY_DP_FAB_SHOP, KEY_DP_FAB_FIELD];

const hasWeldTab = (module) => getDesignPrefTabs(module).some((tab) => tab.id === WELD_TAB);

describe("weld options are the core's spellings", () => {
  it("the Weld.Fab options are the core's own constants", () => {
    expect(WELD_FAB_OPTIONS).toEqual(["Shop Weld", "Field weld"]);
    expect(WELD_FAB_OPTIONS).toEqual([KEY_DP_FAB_SHOP, KEY_DP_FAB_FIELD]);
    expect(WELD_TYPE_OPTIONS).toEqual(["Shop weld", "Field weld"]);
  });

  for (const { name, config } of MODULES) {
    const module = config.sessionName;
    const accepted = acceptedFor(config);

    if (hasWeldTab(module)) {
      it(`${name}: every option the weld tab offers is accepted`, () => {
        expect(weldOptionsFor(module).length).toBeGreaterThan(0);
        for (const option of weldOptionsFor(module)) expect(accepted, option).toContain(option);
      });
    }

    it(`${name}: the weld value the dialog starts with, opens with and falls back to is accepted`, () => {
      const prefConfig = getDesignPrefConfig(module);
      const inputs = { ...config.defaultInputs };
      for (const prefs of [prefConfig.getInitialPrefs(inputs, module), prefConfig.getDefaultPrefs(inputs, module, {})]) {
        if ("weld_fab" in prefs && prefs.weld_fab !== undefined) expect(accepted, prefs.weld_fab).toContain(prefs.weld_fab);
      }
      if ("weld_fab" in inputs) expect(accepted, inputs.weld_fab).toContain(inputs.weld_fab);
    });
  }
});

describe("a desktop .osi shows its weld fabrication as selected", () => {
  for (const [file, { module, payload }] of Object.entries(examples)) {
    const entry = MODULES.find((m) => m.config.designType === module);
    if (!entry) continue;
    const key = [KEY_DP_WELD_FAB, KEY_DP_WELD_TYPE].find((k) => typeof payload[k] === "string" && ["Shop Weld", "Field weld", "Shop weld"].includes(payload[k]));
    if (!key || !hasWeldTab(entry.config.sessionName)) continue;
    it(`${file} (${module}): ${key} "${payload[key]}" is one of the options`, () => {
      const { state, options } = formRecorder(entry.config, LISTS);
      loadStateFromOsi(payload, { ...options, moduleConfig: entry.config, safeModuleData: LISTS });
      const shown = { ...state.inputs, ...state.designPrefOverrides }.weld_fab;
      expect(weldOptionsFor(entry.config.sessionName)).toContain(shown);
      expect(shown).toBe(payload[key]);
    });
  }
});
