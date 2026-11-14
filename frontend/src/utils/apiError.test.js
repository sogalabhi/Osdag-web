import { describe, expect, it } from "vitest";

import { getErrorMessage, parseApiError } from "./apiError";

describe("parseApiError", () => {
  it("reads the standard error body", () => {
    expect(
      parseApiError({ error: { code: "invalid_type", message: "Load.Shear must be a number", fields: { "Load.Shear": "must be a number" } } }),
    ).toEqual({ message: "Load.Shear must be a number", code: "invalid_type", fields: { "Load.Shear": "must be a number" } });
  });

  it("reads a body without fields", () => {
    expect(parseApiError({ error: { code: "not_found", message: "Not found." } })).toEqual({
      message: "Not found.",
      code: "not_found",
      fields: null,
    });
  });

  it("does not read the old shapes", () => {
    for (const body of [{ error: "text" }, { message: "text" }, { detail: "text" }, { field: ["bad"] }]) {
      expect(parseApiError(body)).toEqual({ message: null, code: null, fields: null });
    }
  });

  it("copes with a body that is not an object", () => {
    for (const body of [null, undefined, "text", 5]) {
      expect(parseApiError(body)).toEqual({ message: null, code: null, fields: null });
    }
  });

  it("ignores wrongly typed parts", () => {
    expect(parseApiError({ error: { code: 3, message: ["x"], fields: "no" } })).toEqual({
      message: null,
      code: null,
      fields: null,
    });
  });
});

describe("getErrorMessage", () => {
  it("returns the message, or the fallback", () => {
    expect(getErrorMessage({ error: { code: "x", message: "Bad" } })).toBe("Bad");
    expect(getErrorMessage({ detail: "old" }, "Request failed")).toBe("Request failed");
    expect(getErrorMessage(null)).toBe("Request failed");
  });
});
