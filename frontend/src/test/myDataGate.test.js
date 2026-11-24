/**
 * The saved-data page asks the server for the signed-in user's data only once the sign-in state is
 * known, and never for a guest (the endpoint needs a signed-in user and answers a guest with 401).
 */
import { describe, expect, it } from "vitest";

import { myDataGate } from "../homepage/pages/myDataGate";

describe("saved-data page gate", () => {
  it("waits while the sign-in state is still loading", () => {
    expect(myDataGate({ loading: true, isGuest: false })).toBe("wait");
    expect(myDataGate({ loading: true, isGuest: true })).toBe("wait");
  });

  it("does not fetch for a guest", () => {
    expect(myDataGate({ loading: false, isGuest: true })).toBe("guest");
  });

  it("fetches for a signed-in user", () => {
    expect(myDataGate({ loading: false, isGuest: false })).toBe("fetch");
  });
});
