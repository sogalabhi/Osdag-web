/**
 * Payload parity: what each module's `buildSubmissionParams` sends for its default inputs.
 *
 * The request body is the contract with the backend. These snapshots pin it down, so a
 * refactor of a module config (keys, factories, derived payloads) can't change what is
 * sent without the diff showing in `__snapshots__/payloadParity.test.js.snap`.
 *
 * Every module is run on its `defaultInputs`, once per connectivity choice it has, with
 * every customizable list on "All" (the builder sends the whole option list) and with
 * explicit selections. The option lists are small fixed samples, so the tests need no
 * backend and no catalog. If a snapshot changes on purpose, review the diff and update
 * it with `npm test -- -u`.
 */
import { describe, expect, it } from "vitest";

import { MODULES } from "./cases";
import { LISTS, allSelectedFor, initialExtraState, wire } from "./cases/shared";

describe("payload parity: buildSubmissionParams on the default inputs", () => {
  for (const module of MODULES) {
    describe(module.name, () => {
      const connectivities = module.connectivities || [null];
      const variants = [
        ...connectivities.map((connectivity) => ({ selection: "all", connectivity })),
        { selection: "customized", connectivity: connectivities[0] },
      ];

      for (const { selection, connectivity } of variants) {
        const label = `${selection}${connectivity ? ` / ${connectivity}` : ""}`;
        it(label, () => {
          const { config } = module;
          const allSelected = allSelectedFor(config, selection === "all");
          let inputs = { ...config.defaultInputs, ...(module.fill || {}) };
          if (connectivity) inputs[module.connectivityKey || "connectivity"] = connectivity;
          if (selection === "customized") inputs = { ...inputs, ...(module.custom || {}) };
          const payload = config.buildSubmissionParams(inputs, allSelected, LISTS, initialExtraState(config));
          expect(wire(payload)).toMatchSnapshot();
        });
      }
    });
  }
});
