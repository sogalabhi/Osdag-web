/**
 * CSV cells: text that a spreadsheet would read as a formula is neutralised, numbers are not touched,
 * and the quoting of commas, quotes and line breaks still applies.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("antd", () => ({ message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("../datasources/sectionsDataSource", () => ({ triggerBrowserDownload: vi.fn() }));
vi.mock("../utils/auth", () => ({ isGuestUser: () => false }));

import { convertToCSV, escapeCsvCell, neutraliseCsvText } from "../utils/csvUtils";
import { triggerBrowserDownload } from "../datasources/sectionsDataSource";
import {
  downloadGroupedInputsCsv,
  downloadGroupedOutputsCsv,
  downloadRawOutputsCsv,
} from "../modules/shared/utils/groupedCsvExport";

const lastCsv = async () => {
  const [blob] = triggerBrowserDownload.mock.calls.at(-1);
  return (await blob.text()).replace(/^\uFEFF/, "");
};

describe("neutraliseCsvText", () => {
  it.each(["=SUM(A1)", "+1+2", "-1+2", "@cmd", "\tx", "\rx", "-abc", "=1"])("prefixes %j", (text) => {
    expect(neutraliseCsvText(text)).toBe(`'${text}`);
  });

  it("leaves numbers, numeric literals and ordinary text alone", () => {
    for (const v of [-12.5, 0, 42, "-12.5", "+3", "1e-3", "-.5", "12", "Beam 1", "ISMB 300", "-", "", "a=b", null, undefined]) {
      expect(neutraliseCsvText(v)).toBe(v);
    }
  });
});

describe("escapeCsvCell", () => {
  it("keeps a negative number a number", () => {
    expect(escapeCsvCell(-12.5)).toBe("-12.5");
  });
  it("still quotes commas, quotes and line breaks", () => {
    expect(escapeCsvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
  });
  it("neutralises first, then quotes", () => {
    expect(escapeCsvCell('=HYPERLINK("x","y")')).toBe(`"'=HYPERLINK(""x"",""y"")"`);
  });
  it("gives an empty cell for null and undefined", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });
});

describe("convertToCSV", () => {
  it("neutralises text values and keys, not numbers", () => {
    const csv = convertToCSV({ name: "=A1", load: -12.5, "@k": "plain" });
    expect(csv).toBe("name,load,'@k\n'=A1,-12.5,plain");
  });
});

describe("grouped CSV downloads", () => {
  it("inputs CSV neutralises a custom label and an override value, keeps negative numbers", async () => {
    downloadGroupedInputsCsv({
      moduleConfig: { inputSections: [{ title: "Section", fields: [{ key: "a", label: "=Label" }, { key: "b", label: "Moment" }] }] },
      inputs: { a: "+cmd", b: -12.5 },
      effectiveInputs: { a: "+cmd", b: -12.5 },
      designPrefOverrides: { "@name": "-x", n: "-7" },
      extraState: {},
    });
    const csv = await lastCsv();
    expect(csv).toContain("Section,'=Label,'+cmd");
    expect(csv).toContain("Section,Moment,-12.5");
    expect(csv).toContain("'@name,'-x");
    expect(csv).toContain("n,-7");
  });

  it("outputs CSV neutralises labels, values and log lines", async () => {
    downloadGroupedOutputsCsv({
      output: {},
      outputLayout: [{ title: "Design", items: [
        { type: "field", key: "k1", label: "Moment", value: "-12.5" },
        { type: "field", key: "k2", label: "=Name", value: "@x" },
        { type: "field", key: "k3", label: "Note", value: 'a, "b"' },
      ] }],
      logs: ["=1+1", "fine"],
    });
    const csv = await lastCsv();
    expect(csv).toContain("Design,Moment,-12.5");
    expect(csv).toContain("Design,'=Name,'@x");
    expect(csv).toContain('Design,Note,"a, ""b"""');
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("\r\nfine");
  });

  it("raw outputs CSV neutralises keys and text values", async () => {
    downloadRawOutputsCsv({
      inputsDict: { "=k": "-x", load: -3 },
      rawCsvData: { "+o": "@y", out: "-4.5" },
    });
    const csv = await lastCsv();
    expect(csv).toBe("'=k,'-x,'+o,'@y\r\nload,-3,out,-4.5");
  });
});
