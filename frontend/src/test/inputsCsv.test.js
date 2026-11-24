/**
 * The "Download Inputs CSV" rows. Every dock field the design request carries shows the value the
 * request carries (the same builder the Design button and the `.osi` save use).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("antd", () => ({ message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("../datasources/sectionsDataSource", () => ({ triggerBrowserDownload: vi.fn() }));
vi.mock("../utils/auth", () => ({ isGuestUser: () => false }));

import { MODULES } from "./cases";
import { LISTS, caseState, designRequest, wire } from "./cases/shared";
import { groupedInputsRows, inputsAsRequested } from "../modules/shared/utils/groupedCsvExport";
import { toDesignDictionary } from "../modules/shared/utils/osiSave";
import { KEY_WEB_THICKNESS_PG } from "../constants/generated/coreKeys";
import { plateGirderConfig } from "../modules/flexuralMember/plateGirder/configs/plateGirderConfig";

const csvRows = (module, state) => {
  const effectiveInputs = inputsAsRequested({
    moduleConfig: module.config, ...state, contextData: LISTS,
  });
  return groupedInputsRows({
    moduleConfig: module.config, inputs: state.inputs, effectiveInputs,
    designPrefOverrides: state.designPrefOverrides, extraState: state.extraState,
  });
};

const asCell = (value) => (Array.isArray(value) ? value.join(", ") : value);

describe("inputs CSV", () => {
  it("shows the typed thickness, not the whole list, in the plate girder 'Customized' design type", () => {
    const module = MODULES.find((m) => m.config === plateGirderConfig);
    const { inputs, extraState } = caseState(module, "customized");
    // The form leaves the "All" flag set underneath the typed values.
    const state = {
      inputs: { ...inputs, design_type: "Customized", web_thickness: "20", top_flange_thickness: "40", bottom_flange_thickness: "36" },
      allSelected: { web_thickness: true, top_flange_thickness: true, bottom_flange_thickness: true },
      extraState,
      designPrefOverrides: {},
    };
    const request = designRequest(module.config, state);
    expect(request[KEY_WEB_THICKNESS_PG]).toEqual(["20"]);

    const rows = csvRows(module, state);
    const cell = (label) => rows.find((r) => r[1] === label)?.[2];
    const labels = module.config.inputSections.flatMap((s) => s.fields).filter((f) => ["web_thickness", "top_flange_thickness", "bottom_flange_thickness"].includes(f.key));
    expect(labels.length).toBe(3);
    expect(labels.map((f) => cell(f.label))).toEqual(["20", "40", "36"]);
  });

  it("lists the fields that depend on other inputs when they are shown (base plate loads of a moment base plate)", () => {
    const module = MODULES.find((m) => m.name === "base plate");
    const state = { ...caseState(module, "all", "Moment Base Plate"), designPrefOverrides: {} };
    state.inputs = { ...state.inputs, connectivity: "Moment Base Plate", load_moment_major: "180", load_moment_minor: "45", load_axial_tension: "12" };
    const rows = csvRows(module, state);
    const cell = (label) => rows.find((r) => r[1] === label)?.[2];
    expect(cell("Bending Moment (kNm) - Major axis (M\u2082-z)")).toBe("180");
    expect(cell("Bending Moment (kNm) - Minor axis (My-y)")).toBe("45");
    expect(cell("Axial Tension/Uplift (kN)")).toBe("12");

    const welded = csvRows(module, { ...state, inputs: { ...state.inputs, connectivity: "Welded Column Base" } });
    expect(welded.some((r) => String(r[1]).startsWith("Bending Moment"))).toBe(false);
  });

  for (const module of MODULES) {
    for (const selection of ["all", "customized"]) {
      it(`${module.name}, ${selection}: each field the request carries shows the request's value`, () => {
        const connectivity = (module.connectivities || [null])[0];
        const state = { ...caseState(module, selection, connectivity), designPrefOverrides: {} };
        const request = designRequest(module.config, state);
        const dictionary = wire(toDesignDictionary({ moduleConfig: module.config, ...state, contextData: LISTS }));
        const rows = csvRows(module, state);
        let checked = 0;
        for (const section of module.config.inputSections || []) {
          for (const field of section.fields || []) {
            const declared = module.config.coreKeys?.[field.key];
            if (declared == null) continue;
            if (typeof field.conditionalDisplay === "function" && !field.conditionalDisplay(state.extraState, state.inputs)) continue;
            const coreKey = [].concat(declared).find((k) => dictionary[k] !== undefined && dictionary[k] !== null);
            if (coreKey === undefined) continue;
            const row = rows.find((r) => r[0] === (section.title || "Section") && r[1] === (field.label || field.key));
            expect(row, `${field.key} has a row`).toBeDefined();
            expect(row[2], `${field.key} (${coreKey})`).toEqual(asCell(request[coreKey]));
            checked += 1;
          }
        }
        expect(checked).toBeGreaterThan(0);
      });
    }
  }
});
