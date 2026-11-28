import { describe, expect, it } from "vitest";
import { FIELD_COMPONENTS, fieldComponentFor } from "../modules/shared/components/fields";
import { MODULES } from "./cases";

const TYPES = [
  "text", "number", "optimized_number", "select", "connectivitySelect", "endPlateSelect",
  "customizable", "sectionProfileList", "dynamicSelect", "image",
];

describe("field component registry", () => {
  it("has one component for each field type", () => {
    expect(Object.keys(FIELD_COMPONENTS).sort()).toEqual([...TYPES].sort());
    for (const type of TYPES) expect(typeof fieldComponentFor(type, "k")).toBe("function");
  });

  it("covers every field type the module configs declare", () => {
    const used = new Set();
    for (const mod of MODULES) {
      for (const section of mod.config?.inputSections || []) {
        for (const field of section.fields || []) used.add(field.type);
      }
    }
    expect(used.size).toBeGreaterThan(5);
    for (const type of used) expect(Object.keys(FIELD_COMPONENTS)).toContain(type);
  });

  it("throws in development on an unknown type, naming the field", () => {
    expect(() => fieldComponentFor("dropdwon", "bolt_grade")).toThrow(/Unknown field type "dropdwon" for input "bolt_grade"/);
    expect(() => fieldComponentFor("toString", "k")).toThrow(/Unknown field type/);
  });
});
