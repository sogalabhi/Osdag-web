/**
 * The shared payload builder against the payloads the hand-written builders sent: for every
 * module and variant of the payloadParity cases, the request must be the same JSON text (keys in
 * sorted order) as the one stored in fixtures/payloadBuilderFixtures.json.
 */
import { describe, expect, it } from "vitest";

import fixtures from "./fixtures/payloadBuilderFixtures.json";
import { MODULES, canonicalJson, variantsOf } from "./payloadVariants";

const FAMILIES = {
  tension: ["tension bolted", "tension welded"],
};

const familyOf = (name) => Object.keys(FAMILIES).find((family) => FAMILIES[family].includes(name)) || "other";

describe("payload builder reproduces the stored request of every module", () => {
  it("has a stored request for every module and variant", () => {
    for (const module of MODULES) {
      expect(Object.keys(fixtures[module.name] || {}), module.name).toEqual(variantsOf(module).map((v) => v.label));
    }
  });

  for (const module of MODULES) {
    describe(`${familyOf(module.name)}: ${module.name}`, () => {
      for (const { label, args } of variantsOf(module)) {
        it(label, () => {
          expect(canonicalJson(module.config.buildSubmissionParams(...args))).toBe(canonicalJson(fixtures[module.name][label]));
        });
      }
    });
  }
});
