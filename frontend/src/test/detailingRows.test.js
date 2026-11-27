/**
 * The Detailing tab of the welded cover plates is the gap alone, and that of the base plate has no gap
 * (`input_dictionary_design_pref` of the core classes). The dialog holds and the request carries only those.
 */
import { describe, expect, it } from "vitest";

import {
  KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
  KEY_DP_DETAILING_EDGE_TYPE,
  KEY_DP_DETAILING_GAP,
} from "../constants/generated/coreKeys";
import { getDesignPrefConfig } from "../modules/shared/config/designPrefModuleConfig";
import { MODULES } from "./cases";
import { caseState, designRequest } from "./cases/shared";

const SAVED = { detailing_gap: "5", detailing_edge_type: "Sheared or hand flame cut", detailing_corr_status: "Yes" };
const request = (module, prefs) => designRequest(module.config, { ...caseState(module, "all"), designPrefOverrides: prefs });
const initialPrefs = (module) =>
  getDesignPrefConfig(module.config.sessionName).getInitialPrefs({ ...module.config.defaultInputs, ...SAVED }, module.config.sessionName);

describe.each(["beam-beam cover plate welded", "column-column cover plate welded"])("%s", (name) => {
  const module = MODULES.find((m) => m.name === name);

  it("sends a saved gap and no edge preparation or corrosive influences", () => {
    const body = request(module, SAVED);
    expect(body[KEY_DP_DETAILING_GAP]).toBe("5");
    expect(body).not.toHaveProperty(KEY_DP_DETAILING_EDGE_TYPE);
    expect(body).not.toHaveProperty(KEY_DP_DETAILING_CORROSIVE_INFLUENCES);
  });

  it("holds the gap alone in the dialog", () => {
    const prefs = initialPrefs(module);
    expect(prefs.detailing_gap).toBe("5");
    expect(prefs).not.toHaveProperty("detailing_edge_type");
    expect(prefs).not.toHaveProperty("detailing_corr_status");
  });
});

describe("base plate", () => {
  const module = MODULES.find((m) => m.name === "base plate");

  it("holds no gap in the dialog and sends none", () => {
    expect(initialPrefs(module)).not.toHaveProperty("detailing_gap");
    expect(request(module, SAVED)).not.toHaveProperty(KEY_DP_DETAILING_GAP);
  });
});
