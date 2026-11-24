/**
 * Cleat angle's validateInputs is called like every other module's: (inputs, extraState, lists,
 * selectionStates). It used to read the lists as the selection states, so "All" was never seen.
 */
import { describe, expect, it } from "vitest";

import { MODULES } from "./cases";
import { caseState } from "./cases/shared";

const module = MODULES.find((m) => m.name === "cleat angle");
const config = module.config;

describe("cleat angle validateInputs", () => {
  const state = caseState(module, "all", (module.connectivities || [null])[0]);
  const { inputs, extraState } = state;

  it("accepts All when the angle list is available", () => {
    const result = config.validateInputs(inputs, extraState, { angleList: ["ISA 100x100x8"] }, { cleatSectionSelect: "All" });
    expect(result).toEqual({ isValid: true });
  });

  it("rejects All when the angle list is empty", () => {
    const result = config.validateInputs(inputs, extraState, { angleList: [] }, { cleatSectionSelect: "All" });
    expect(result.isValid).toBe(false);
  });

  it("accepts Customized with a chosen section", () => {
    const withChoice = { ...inputs, cleat_section: ["ISA 100x100x8"] };
    const result = config.validateInputs(withChoice, extraState, { angleList: ["ISA 100x100x8"] }, { cleatSectionSelect: "Customized" });
    expect(result).toEqual({ isValid: true });
  });

  it("rejects Customized with nothing chosen", () => {
    const withoutChoice = { ...inputs, cleat_section: [] };
    const result = config.validateInputs(withoutChoice, extraState, { angleList: ["ISA 100x100x8"] }, { cleatSectionSelect: "Customized" });
    expect(result.isValid).toBe(false);
  });
});
