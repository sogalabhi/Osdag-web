/**
 * The Optimization tab of the simply supported and the cantilever beam holds the five values of the core's
 * `optimization_tab_flexure_design`, under the core's keys, with the core's defaults, and what it holds is
 * what the design request carries (the design reads all five).
 */
import { describe, expect, it } from "vitest";

import { MODULES } from "./cases";
import { caseState, designRequest } from "./cases/shared";
import { getDesignPrefConfig, getDesignPrefTabs } from "../modules/shared/config/designPrefModuleConfig";
import { FLEXURE_OPTIMIZATION_DEFAULTS } from "../modules/shared/config/prefOptions";
import {
  KEY_ALLOW_CLASS,
  KEY_BEARING_LENGTH,
  KEY_EFFECTIVE_AREA_PARA,
  KEY_LENGTH_OVERWRITE,
  KEY_LOAD,
} from "../constants/generated/coreKeys";

const FIELD_KEYS = {
  allowable_class: KEY_ALLOW_CLASS,
  effective_area_parameter: KEY_EFFECTIVE_AREA_PARA,
  loading_condition: KEY_LOAD,
  length_overwrite: KEY_LENGTH_OVERWRITE,
  bearing_length: KEY_BEARING_LENGTH,
};
const OPTIMIZATION_TAB = 12;

describe.each(["simply supported beam", "on cantilever"])("%s Optimization tab", (name) => {
  const module = MODULES.find((m) => m.name === name);
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
      expect(prefs[field], field).toBe(FLEXURE_OPTIMIZATION_DEFAULTS[field]);
      expect(request[coreKey], coreKey).toBe(FLEXURE_OPTIMIZATION_DEFAULTS[field]);
    }
    expect(FLEXURE_OPTIMIZATION_DEFAULTS).toEqual({
      allowable_class: "Yes", effective_area_parameter: "1.0", loading_condition: "Normal", length_overwrite: "NA", bearing_length: "NA",
    });
  });

  it("resets to the same defaults", () => {
    expect(prefConfig.getDefaultPrefs({}, config.sessionName, {})).toMatchObject(FLEXURE_OPTIMIZATION_DEFAULTS);
  });

  it("sends a saved value under its core key", () => {
    const saved = { allowable_class: "No", effective_area_parameter: "0.8", loading_condition: "Destabilizing", length_overwrite: "1.2", bearing_length: "150" };
    const request = designRequest(config, { ...state(), designPrefOverrides: saved });
    for (const [field, coreKey] of Object.entries(FIELD_KEYS)) expect(request[coreKey], coreKey).toBe(saved[field]);
  });

  it("shows the value the dialog was last saved with", () => {
    const prefs = prefConfig.getInitialPrefs({ ...config.defaultInputs, effective_area_parameter: "0.8" }, config.sessionName);
    expect(prefs.effective_area_parameter).toBe("0.8");
  });
});

