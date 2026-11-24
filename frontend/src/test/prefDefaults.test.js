/**
 * The Defaults button of Additional Inputs shows what the server's /defaults/ answered (the core's
 * values); the form's own fallbacks fill only what the core did not default, and the sections on
 * screen are not blanked by an answer that does not describe them.
 */
import { describe, expect, it } from "vitest";

import { keepShownSections, withFormDefaults } from "../modules/shared/utils/prefDefaults";

describe("withFormDefaults", () => {
  const server = { detailing_edge_type: "Sheared or hand flame cut", supporting_material: "E 250 (Fe 410 W)A", flange_width: "5" };
  const fallbacks = () => ({
    detailing_edge_type: "Rolled, machine-flame cut, sawn and planed",
    supporting_material: "E 165 (Fe 290)",
    optimization_x: "2",
  });

  it("keeps the value the core defaulted or linked over the form's own", () => {
    const merged = withFormDefaults(
      server,
      { defaulted_keys: ["detailing_edge_type"], linked_pref_keys: ["supporting_material"] },
      fallbacks
    );
    expect(merged.detailing_edge_type).toBe("Sheared or hand flame cut");
    expect(merged.supporting_material).toBe("E 250 (Fe 410 W)A");
  });

  it("lets the form's fallback fill what the core did not default", () => {
    const merged = withFormDefaults(server, { defaulted_keys: ["detailing_edge_type"] }, fallbacks);
    expect(merged.optimization_x).toBe("2");
    expect(merged.flange_width).toBe("5");
  });

  it("works without metadata", () => {
    expect(withFormDefaults({ a: "1" }, undefined, () => ({ b: "2" }))).toEqual({ a: "1", b: "2" });
  });
});

describe("keepShownSections", () => {
  const shown = { supporting: {}, supported: { Designation: "20 x 20 x 3", Mass: 0.9 }, connector: {} };

  it("keeps a section on screen when the answer carries none for it", () => {
    const next = keepShownSections({ supporting: {}, supported: {}, connector: {} }, shown);
    expect(next.supported).toEqual(shown.supported);
  });

  it("takes the answer's section when it has one", () => {
    const answered = { supporting: {}, supported: { Designation: "25 x 25 x 3", Mass: 1.1 }, connector: {} };
    expect(keepShownSections(answered, shown).supported).toEqual(answered.supported);
  });

  it("copes with nothing shown yet", () => {
    expect(keepShownSections({ supported: {} }, undefined)).toEqual({ supported: {} });
  });
});
