/**
 * From a desktop `.osi` example to the design request.
 *
 * Each example in `fixtures/osiExamples.json` (the parsed file, see `osiLoad.test.js`) is
 * loaded into its module's form state with `loadStateFromOsi`, then run through the
 * module's `buildSubmissionParams` the way the Design button does (dock inputs with the
 * Additional Inputs merged in). The snapshot is the request body, the one thing the backend
 * sees, so a rename of form fields or keys can't change what an opened `.osi` sends
 * without the diff showing in `__snapshots__/osiToWire.test.js.snap`.
 *
 * The option lists are the small fixed ones from `cases/shared.js`, so the snapshots need
 * no backend. Update with `npm test -- -u` only for an intended change, and read the diff.
 */
import { describe, expect, it } from "vitest";

import examples from "./fixtures/osiExamples.json";
import { MODULES } from "./cases";
import { designRequest, formRecorder } from "./cases/shared";
import { loadStateFromOsi } from "../modules/shared/utils/osiLoader";

const BY_MODULE = new Map(MODULES.map((m) => [m.config.designType, m.config]));

describe("a desktop .osi example sends this design request", () => {
  let opened = 0;
  for (const [name, { module, payload }] of Object.entries(examples)) {
    const config = BY_MODULE.get(module);
    if (!config) continue; // a module name the web does not open
    opened += 1;
    it(`${name} (${module})`, () => {
      const { state, options } = formRecorder(config);
      loadStateFromOsi(payload, options);
      expect(designRequest(config, state)).toMatchSnapshot();
    });
  }

  it("covers every example the web can open", () => {
    expect(opened).toBeGreaterThanOrEqual(64);
  });
});
