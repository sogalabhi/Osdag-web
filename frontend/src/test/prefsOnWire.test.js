/**
 * What an Additional Inputs change does, and does not, change in the design request.
 *
 * The Design button sends the dock inputs with the saved Additional Inputs merged over them
 * (`designRequest`). Each test sets the dock to one value, saves a different value in
 * Additional Inputs, and checks which request key follows which. The desktop sends the dock
 * as `Material` and each Additional Inputs material under its own key.
 */
import { describe, expect, it } from "vitest";

import {
  KEY_BASE_PLATE_MATERIAL,
  KEY_DP_ANCHOR_BOLT_FRICTION,
  KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF,
  KEY_DP_ANCHOR_BOLT_LENGTH_ICF,
  KEY_DP_DESIGN_BASE_PLATE,
  KEY_DP_DESIGN_METHOD,
  KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
  KEY_DP_DETAILING_EDGE_TYPE,
  KEY_DP_FAB_FIELD,
  KEY_DP_FAB_SHOP,
  KEY_DP_WELD_FAB,
  KEY_DP_WELD_MATERIAL_G_O,
  KEY_SEC_MATERIAL,
  KEY_ST_KEY_MATERIAL,
} from "../constants/generated/coreKeys";
import { MODULES } from "./cases";
import { caseState, designRequest } from "./cases/shared";

const moduleNamed = (name) => MODULES.find((m) => m.name === name);

const request = (name, dock, prefs) => {
  const module = moduleNamed(name);
  const state = caseState(module, "all", module.connectivities?.[0] ?? null);
  state.inputs = { ...state.inputs, ...dock };
  state.designPrefOverrides = prefs;
  return designRequest(module.config, state);
};

describe("shear modules: Connector tab material", () => {
  for (const name of ["fin plate", "cleat angle", "header plate", "seated angle"]) {
    it(`${name}: Material is the dock material, Connector.Material the Connector tab`, () => {
      const body = request(name, { material: "E 250 (Fe 410 W)A" }, { connector_material: "E 350 (Fe 490)" });
      expect(body.Material).toBe("E 250 (Fe 410 W)A");
      expect(body["Connector.Material"]).toBe("E 350 (Fe 490)");
    });

    it(`${name}: Connector.Material follows the dock until the Connector tab is saved`, () => {
      const body = request(name, { material: "E 350 (Fe 490)", connector_material: "E 350 (Fe 490)" }, {});
      expect(body.Material).toBe("E 350 (Fe 490)");
      expect(body["Connector.Material"]).toBe("E 350 (Fe 490)");
    });
  }
});

describe("tension members and struts: section tab material", () => {
  for (const name of ["tension bolted", "tension welded", "struts bolted", "struts welded"]) {
    it(`${name}: Member.Material is the section tab, Material the dock material`, () => {
      const body = request(name, { material: "E 250 (Fe 410 W)A" }, { supported_material: "E 350 (Fe 490)" });
      expect(body.Material).toBe("E 250 (Fe 410 W)A");
      expect(body["Member.Material"]).toBe("E 350 (Fe 490)");
    });

    it(`${name}: Member.Material follows the dock until the section tab is saved`, () => {
      const body = request(name, { material: "E 350 (Fe 490)", supported_material: "E 350 (Fe 490)" }, {});
      expect(body.Material).toBe("E 350 (Fe 490)");
      expect(body["Member.Material"]).toBe("E 350 (Fe 490)");
    });
  }
});

describe("simply supported beam: section tab material", () => {
  const name = "simply supported beam";

  it("Member.Material is the section tab, Material the dock material", () => {
    const body = request(name, { material: "E 250 (Fe 410 W)A" }, { supporting_material: "E 350 (Fe 490)" });
    expect(body.Material).toBe("E 250 (Fe 410 W)A");
    expect(body["Member.Material"]).toBe("E 350 (Fe 490)");
  });

  it("Member.Material follows the dock until the section tab is saved", () => {
    const body = request(name, { material: "E 350 (Fe 490)", supporting_material: "E 350 (Fe 490)" }, {});
    expect(body.Material).toBe("E 350 (Fe 490)");
    expect(body["Member.Material"]).toBe("E 350 (Fe 490)");
  });
});

describe("base plate: saved Additional Inputs", () => {
  const name = "base plate";
  const PREF_KEYS = [
    KEY_SEC_MATERIAL,
    KEY_BASE_PLATE_MATERIAL,
    KEY_ST_KEY_MATERIAL,
    KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF,
    KEY_DP_ANCHOR_BOLT_LENGTH_ICF,
    KEY_DP_ANCHOR_BOLT_FRICTION,
    KEY_DP_WELD_FAB,
    KEY_DP_WELD_MATERIAL_G_O,
    KEY_DP_DETAILING_EDGE_TYPE,
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DESIGN_METHOD,
    KEY_DP_DESIGN_BASE_PLATE,
  ];

  it("sends none of them when nothing was saved, so the backend keeps its defaults", () => {
    const body = request(name, {}, {});
    for (const key of PREF_KEYS) expect(body, key).not.toHaveProperty(key);
  });

  it("sends what was saved, under the core keys", () => {
    const body = request(name, {}, {
      supporting_material: "E 350 (Fe 490)",
      [KEY_BASE_PLATE_MATERIAL]: "E 300 (Fe 440)",
      [KEY_ST_KEY_MATERIAL]: "E 410 (Fe 540)",
      [KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF]: "Standard",
      [KEY_DP_ANCHOR_BOLT_LENGTH_ICF]: "450",
      [KEY_DP_ANCHOR_BOLT_FRICTION]: "0.45",
      weld_fab: "Field weld",
      weld_material_grade: "490",
      detailing_edge_type: "b - Machine flame cut",
      detailing_corr_status: "No",
      design_method: "Limit State Design",
      [KEY_DP_DESIGN_BASE_PLATE]: "Effective Area Method",
    });
    expect(body[KEY_SEC_MATERIAL]).toBe("E 350 (Fe 490)");
    expect(body[KEY_BASE_PLATE_MATERIAL]).toBe("E 300 (Fe 440)");
    expect(body[KEY_ST_KEY_MATERIAL]).toBe("E 410 (Fe 540)");
    expect(body[KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF]).toBe("Standard");
    expect(body[KEY_DP_ANCHOR_BOLT_LENGTH_ICF]).toBe("450");
    expect(body[KEY_DP_ANCHOR_BOLT_FRICTION]).toBe("0.45");
    expect(body[KEY_DP_WELD_FAB]).toBe(KEY_DP_FAB_FIELD);
    expect(body[KEY_DP_WELD_MATERIAL_G_O]).toBe("490");
    expect(body[KEY_DP_DETAILING_EDGE_TYPE]).toBe("b - Machine flame cut");
    expect(body[KEY_DP_DETAILING_CORROSIVE_INFLUENCES]).toBe("No");
    expect(body[KEY_DP_DESIGN_METHOD]).toBe("Limit State Design");
    expect(body[KEY_DP_DESIGN_BASE_PLATE]).toBe("Effective Area Method");
    // The dock material stays Material.
    expect(body.Material).toBe(request(name, {}, {}).Material);
  });

  it("takes the core-keyed copy a save writes before the field-named one", () => {
    const body = request(name, {}, { weld_fab: "Shop weld", [KEY_DP_WELD_FAB]: "Field weld" });
    expect(body[KEY_DP_WELD_FAB]).toBe(KEY_DP_FAB_FIELD);
  });

  it("sends the weld fabrication in the spelling the core knows", () => {
    // The weld tab offers "Shop weld"; the core only has "Shop Weld" and "Field weld".
    expect(request(name, {}, { weld_fab: "Shop weld" })[KEY_DP_WELD_FAB]).toBe(KEY_DP_FAB_SHOP);
    expect(request(name, {}, { weld_fab: "Field weld" })[KEY_DP_WELD_FAB]).toBe(KEY_DP_FAB_FIELD);
  });
});
