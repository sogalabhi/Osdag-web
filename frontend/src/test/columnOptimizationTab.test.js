/**
 * The Optimization tab of the axially loaded column holds the three values of the core's
 * `optimization_tab_column_design` (Allowable Utilization Ratio, Optimization Parameter, Effective Area
 * Parameter), under the core's keys, with the core's defaults, and what it holds is what the design request
 * carries (the design reads all three).
 */
import { describe, expect, it } from "vitest";

import { MODULES } from "./cases";
import { caseState, designRequest } from "./cases/shared";
import { getDesignPrefConfig, getDesignPrefTabs } from "../modules/shared/config/designPrefModuleConfig";
import { COLUMN_OPTIMIZATION_DEFAULTS, OPTIMIZATION_PARA_OPTIONS } from "../modules/shared/config/prefOptions";
import { KEY_ALLOW_UR, KEY_EFFECTIVE_AREA_PARA, KEY_OPTIMIZATION_PARA } from "../constants/generated/coreKeys";

const FIELD_KEYS = {
  allow_ur: KEY_ALLOW_UR,
  optimum_para: KEY_OPTIMIZATION_PARA,
  effective_area_parameter: KEY_EFFECTIVE_AREA_PARA,
};
const OPTIMIZATION_TAB = 12;

describe("axially loaded column Optimization tab", () => {
  const module = MODULES.find((m) => m.name === "axially loaded column");
  const { config } = module;
  const prefConfig = getDesignPrefConfig(config.sessionName);
  const state = () => ({ ...caseState(module, "all"), designPrefOverrides: {} });

  it("is offered, and the dock no longer repeats its fields", () => {
    expect(getDesignPrefTabs(config.sessionName).map((tab) => tab.id)).toContain(OPTIMIZATION_TAB);
    const dockFields = config.inputSections.flatMap((section) => section.fields.map((f) => f.key));
    for (const field of Object.keys(FIELD_KEYS)) expect(dockFields).not.toContain(field);
  });

  it("starts with the core's defaults, which are what the request sends", () => {
    const prefs = prefConfig.getInitialPrefs(config.defaultInputs, config.sessionName);
    const request = designRequest(config, state());
    for (const [field, coreKey] of Object.entries(FIELD_KEYS)) {
      expect(prefs[field], field).toBe(COLUMN_OPTIMIZATION_DEFAULTS[field]);
      expect(request[coreKey], coreKey).toBe(COLUMN_OPTIMIZATION_DEFAULTS[field]);
    }
    expect(COLUMN_OPTIMIZATION_DEFAULTS).toEqual({ allow_ur: "1.0", optimum_para: "Utilization Ratio", effective_area_parameter: "1.0" });
    expect(OPTIMIZATION_PARA_OPTIONS).toEqual(["Utilization Ratio"]);
  });

  it("resets to the same defaults", () => {
    expect(prefConfig.getDefaultPrefs({}, config.sessionName, {})).toMatchObject(COLUMN_OPTIMIZATION_DEFAULTS);
  });

  it("sends a saved value under its core key", () => {
    const saved = { allow_ur: "0.8", optimum_para: "Utilization Ratio", effective_area_parameter: "0.9" };
    const request = designRequest(config, { ...state(), designPrefOverrides: saved });
    for (const [field, coreKey] of Object.entries(FIELD_KEYS)) expect(request[coreKey], coreKey).toBe(saved[field]);
  });

  it("shows the value the dialog was last saved with", () => {
    const prefs = prefConfig.getInitialPrefs({ ...config.defaultInputs, allow_ur: "0.8", effective_area_parameter: "0.9" }, config.sessionName);
    expect(prefs.allow_ur).toBe("0.8");
    expect(prefs.effective_area_parameter).toBe("0.9");
  });
});
