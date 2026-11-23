/**
 * What an Additional Inputs change does, and does not, change in the design request.
 *
 * The Design button sends the dock inputs with the saved Additional Inputs merged over them
 * (`designRequest`). Each test sets the dock to one value, saves a different value in
 * Additional Inputs, and checks which request key follows which. The desktop sends the dock
 * as `Material` and each Additional Inputs material under its own key.
 */
import { describe, expect, it } from "vitest";

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
