/**
 * A page that opens without a project must keep what it has filled in by the time the auth state and
 * the option lists arrive (the dock Material copied to the Additional Inputs materials, the first
 * option of a list). The form was set back to the defaults then, and when that came after the first
 * sync the Design request carried the old materials.
 */
import { describe, expect, it } from "vitest";

import { formLoadAction } from "../modules/shared/utils/formLoadAction";

describe("formLoadAction", () => {
  it("keeps the form of a page opened without a project, however late the lists and the auth state arrive", () => {
    expect(formLoadAction({ projectId: null, formHoldsDefaults: true, hasPrefill: false })).toBe("keep-defaults");
  });

  it("keeps a form filled from a file", () => {
    expect(formLoadAction({ projectId: null, formHoldsDefaults: false, hasPrefill: true })).toBe("keep-prefill");
    expect(formLoadAction({ projectId: null, formHoldsDefaults: true, hasPrefill: true })).toBe("keep-prefill");
  });

  it("sets a form that was filled from a project back to the defaults when the project is left", () => {
    expect(formLoadAction({ projectId: null, formHoldsDefaults: false, hasPrefill: false })).toBe("reset-defaults");
  });

  it("loads the project the URL names", () => {
    expect(formLoadAction({ projectId: 12, formHoldsDefaults: true, hasPrefill: false })).toBe("load-project");
  });
});
