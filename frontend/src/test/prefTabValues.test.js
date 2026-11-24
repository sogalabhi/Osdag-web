/**
 * What the Additional Inputs dialog shows when it opens must be what the design request uses.
 *
 * - A section tab or the Connector tab shows a material row: the state the dialog starts with must
 *   hold it (a tab whose row is missing from the state shows a blank Material).
 * - The Design tab's design method is one of the options the dropdown offers, in the core's wording,
 *   so the value shown, saved and sent are the same text.
 *
 * `fixtures/designPrefOpenDefaults.json` is what the server's "open" sync adds to the default inputs.
 */
import { describe, expect, it } from "vitest";

import { MODULES } from "./cases";
import openDefaults from "./fixtures/designPrefOpenDefaults.json";
import { getDesignPrefConfig, getDesignPrefTabs } from "../modules/shared/config/designPrefModuleConfig";
import { DESIGN_METHOD_OPTIONS } from "../modules/shared/config/prefOptions";

const TAB_MATERIAL = { 0: "supporting_material", 1: "supported_material", 2: "supported_material", 3: "connector_material" };
const DESIGN_TAB = 13;
const ENABLED_METHODS = DESIGN_METHOD_OPTIONS.filter((option) => !option.disabled).map((option) => option.value);

const openedState = ({ config, fill }) => ({ ...config.defaultInputs, ...(fill || {}), ...(openDefaults[config.sessionName] || {}) });

describe("the material row of every section and Connector tab has a value", () => {
  for (const module of MODULES) {
    const { name, config } = module;
    const prefConfig = getDesignPrefConfig(config.sessionName);
    const tabs = getDesignPrefTabs(config.sessionName).map((tab) => tab.id);

    for (const [tab, field] of Object.entries(TAB_MATERIAL)) {
      if (!tabs.includes(Number(tab))) continue;
      // Tab 2 is the angle or channel of the tension and strut modules; tab 0 and 1 are the sections.
      it(`${name}: tab ${tab} shows ${field}`, () => {
        const prefs = prefConfig.getInitialPrefs(openedState(module), config.sessionName);
        expect(typeof prefs[field], `${field} in the opened state`).toBe("string");
        expect(prefs[field]).not.toBe("");
      });
    }
  }
});

describe("the base plate Column Section tab follows the dock material", () => {
  const { config } = MODULES.find((m) => m.name === "base plate");
  const prefConfig = getDesignPrefConfig(config.sessionName);

  it("shows the grade the server resolved for the column", () => {
    const prefs = prefConfig.getInitialPrefs({ ...config.defaultInputs, supporting_material: "E 350 (Fe 490)" }, config.sessionName);
    expect(prefs.supporting_material).toBe("E 350 (Fe 490)");
  });

  it("starts from the dock material when nothing was resolved", () => {
    const prefs = prefConfig.getInitialPrefs({ ...config.defaultInputs, material: "E 350 (Fe 490)" }, config.sessionName);
    expect(prefs.supporting_material).toBe("E 350 (Fe 490)");
    // Defaults are the server's reset answer, which copies the dock material to the column.
    const reset = { supporting_material: "E 350 (Fe 490)" };
    expect(prefConfig.getDefaultPrefs({ material: "E 350 (Fe 490)" }, config.sessionName, reset).supporting_material).toBe("E 350 (Fe 490)");
  });
});

describe("the Design tab shows a design method the dropdown offers and the core knows", () => {
  it("offers the core's wording, with only Limit State Design selectable", () => {
    expect(DESIGN_METHOD_OPTIONS.map((option) => option.value)).toEqual([
      "Limit State Design",
      "Limit State (capacity based) Design",
      "Working Stress Design",
    ]);
    expect(ENABLED_METHODS).toEqual(["Limit State Design"]);
  });

  for (const module of MODULES) {
    const { name, config } = module;
    const prefConfig = getDesignPrefConfig(config.sessionName);
    if (!getDesignPrefTabs(config.sessionName).some((tab) => tab.id === DESIGN_TAB)) continue;

    it(`${name}: the design method is an option, from the server's value and from the fallback`, () => {
      const state = openedState(module);
      // With the value the server resolved (always there), and with none: the fallback some modules show.
      expect(ENABLED_METHODS).toContain(prefConfig.getInitialPrefs(state, config.sessionName).design_method);
      const { design_method: fallback } = prefConfig.getInitialPrefs({ ...state, design_method: undefined }, config.sessionName);
      if (fallback !== undefined) expect(ENABLED_METHODS, `fallback ${fallback}`).toContain(fallback);
      const defaults = prefConfig.getDefaultPrefs(state, config.sessionName, {});
      if (defaults.design_method !== undefined) expect(ENABLED_METHODS).toContain(defaults.design_method);
    });
  }
});
