/**
 * A dock change that clears every saved Additional Input, as the desktop does
 * (`clear_design_pref_dictionary` on each dock widget that is the source of an 'Input Dock' row):
 * the dock Material in every module the core copies it from, the anchor bolt type too in the base
 * plate, nothing in the butt and lap joints. `useModuleForm` drops the fields `isAdditionalInput`
 * names from the saved overrides and the form.
 */
import { describe, expect, it } from "vitest";

import { KEY_DP_DETAILING_EDGE_TYPE } from "../constants/generated/coreKeys";
import { isAdditionalInput, prefClearingFields } from "../modules/shared/utils/prefSyncKeys";
import { MODULES } from "./cases";

const byName = (name) => MODULES.find((m) => m.name === name).config;

describe("a dock change that clears the saved Additional Inputs", () => {
  it("is the dock Material in the modules the core copies it from", () => {
    for (const name of ["fin plate", "cleat angle", "tension bolted", "simply supported beam", "plate girder"]) {
      expect(prefClearingFields(byName(name)), name).toContain("material");
    }
  });

  it("is also the anchor bolt type in the base plate", () => {
    expect(prefClearingFields(byName("base plate")).sort()).toEqual(["anchor_type", "material"]);
  });

  it("is nothing in the butt and lap joints", () => {
    for (const name of ["lap joint bolted", "lap joint welded", "butt joint bolted", "butt joint welded"]) {
      expect(prefClearingFields(byName(name)), name).toEqual([]);
    }
  });

  it("clears Additional Inputs fields and core keys, never a dock field", () => {
    const fin = byName("fin plate");
    for (const name of ["detailing_edge_type", "weld_material_grade", "connector_material", "supporting_material", KEY_DP_DETAILING_EDGE_TYPE]) {
      expect(isAdditionalInput(fin, name), name).toBe(true);
    }
    for (const name of ["material", "column_section", "load_shear", "bolt_diameter"]) {
      expect(isAdditionalInput(fin, name), name).toBe(false);
    }
    // On the plate girder's main form.
    expect(isAdditionalInput(byName("plate girder"), "loading_condition")).toBe(false);
  });
});
