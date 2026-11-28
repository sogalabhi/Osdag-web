// @vitest-environment jsdom
/**
 * Errors shown on the field they belong to.
 *
 * - `createDesign` keeps the status, code and per-field messages of a rejected request;
 * - a core key in an error's `fields` maps back to the form field that feeds it, for every module;
 * - `InputSection` shows a field's error under it (aria-invalid, described by the message) and clears it
 *   when the field is edited;
 * - a core key of an Additional Inputs row names the dialog tab that holds it;
 * - a rejected design request ends with the message under the input, for a few modules.
 */
import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { useCallback, useState } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiClient = vi.hoisted(() => vi.fn());
vi.mock("../utils/apiClient", () => ({ apiClient, subscribeToTask: vi.fn() }));
vi.mock("antd", async (importOriginal) => ({ ...(await importOriginal()), message: { error: vi.fn(), warning: vi.fn(), success: vi.fn() } }));

import { message } from "antd";
import {
  KEY_DP_BOLT_HOLE_TYPE,
  KEY_DP_DESIGN_METHOD,
  KEY_DP_DETAILING_GAP,
  KEY_DP_WELD_FAB,
} from "../constants/generated/coreKeys";
import { DESIGN_PREF_TABLES } from "../constants/generated/designPrefTables";
import { ModuleContext } from "../context/ModuleState";
import { InputSection } from "../modules/shared/components/InputSection";
import { getDesignPrefTabs } from "../modules/shared/config/designPrefModuleConfig";
import { useDesignSubmission } from "../modules/shared/hooks/useDesignSubmission";
import { useEngineeringService } from "../modules/shared/hooks/useEngineeringService";
import { fieldsByCoreKey } from "../modules/shared/utils/designDictionary";
import { mapServerFieldErrors, prefTabIdForCoreKey } from "../modules/shared/utils/fieldErrors";
import { validateFormFields } from "../modules/shared/utils/validation";
import { MODULES } from "./cases";
import { LISTS, caseState } from "./cases/shared";

const asList = (declared) => (declared == null ? [] : Array.isArray(declared) ? declared : [declared]);

/** A rejected request, as `apiClient` throws it. */
const rejection = (fields, status = 400) =>
  Object.assign(new Error("Invalid design inputs"), { status, code: "validation_error", fields });

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  apiClient.mockReset();
  vi.mocked(message.error).mockClear();
});

describe("createDesign", () => {
  it("keeps the status, code and fields of a rejected request", async () => {
    apiClient.mockRejectedValue(rejection({ "Load.Shear": "must be positive" }));
    const { result } = renderHook(() => useEngineeringService());
    const answer = await result.current.createDesign("Fin Plate Connection", {});
    expect(answer.status).toBe(400);
    expect(answer.body).toEqual({
      success: false,
      error: "Invalid design inputs",
      code: "validation_error",
      fields: { "Load.Shear": "must be positive" },
    });
  });

  it("answers 500 for an error that has no status, with no fields", async () => {
    apiClient.mockRejectedValue(new Error("Network down"));
    const { result } = renderHook(() => useEngineeringService());
    const answer = await result.current.createDesign("Fin Plate Connection", {});
    expect(answer).toEqual({ status: 500, body: { success: false, error: "Network down" } });
  });
});

describe("core keys to form fields", () => {
  it.each(MODULES.map((m) => [m.name, m]))("%s: every declared core key names its field", (_name, module) => {
    const { config } = module;
    const owners = fieldsByCoreKey(config);
    const state = caseState(module, "customized", module.connectivities?.[0]);
    const skipped = new Set([...(config.computedCoreKeys || [])]);
    let checked = 0;
    for (const [field, declared] of Object.entries(config.coreKeys || {})) {
      if (declared == null || (config.notLoadedFromDictionary || []).includes(field)) continue;
      for (const coreKey of asList(declared)) {
        if (skipped.has(coreKey)) continue;
        expect(owners.get(coreKey), `${field} -> ${coreKey}`).toContain(field);
        // the key ends up on a field, on an Additional Inputs tab, or among the keys the toast reports
        const mapped = mapServerFieldErrors(config, { [coreKey]: "bad" }, state);
        const placed =
          Object.keys(mapped.fieldErrors).length + mapped.prefErrors.length + Object.keys(mapped.unmapped).length;
        expect(placed, coreKey).toBeGreaterThan(0);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it.each(MODULES.map((m) => [m.name, m]))("%s: a dock field's core key puts the error on that field", (_name, module) => {
    const { config } = module;
    const state = caseState(module, "customized", module.connectivities?.[0]);
    const dockFields = (config.inputSections || [])
      .flatMap((section) => section.fields || [])
      .filter((field) => field.key && field.type !== "image" && asList(config.coreKeys?.[field.key]).length > 0)
      .filter((field) => !field.conditionalDisplay || field.conditionalDisplay(state.extraState, state.inputs));
    expect(dockFields.length).toBeGreaterThan(0);
    for (const field of dockFields) {
      for (const coreKey of asList(config.coreKeys[field.key])) {
        if ((config.computedCoreKeys || []).includes(coreKey)) continue;
        if ((config.notLoadedFromDictionary || []).includes(field.key)) continue;
        const mapped = mapServerFieldErrors(config, { [coreKey]: `bad ${coreKey}` }, state);
        expect(mapped.fieldErrors[field.key], `${field.key} <- ${coreKey}`).toBe(`bad ${coreKey}`);
        expect(mapped.prefErrors).toEqual([]);
      }
    }
  });

  it("reports a key that no field and no tab holds as unmapped", () => {
    const { config } = MODULES[0];
    const mapped = mapServerFieldErrors(config, { "No.Such.Key": "bad" });
    expect(mapped).toEqual({ fieldErrors: {}, prefErrors: [], unmapped: { "No.Such.Key": "bad" } });
  });

  it("leaves a field that is not shown to the toast", () => {
    const config = {
      designType: "none",
      coreKeys: { hidden_field: "Some.Key" },
      inputSections: [{ fields: [{ key: "hidden_field", type: "number", conditionalDisplay: () => false }] }],
    };
    expect(mapServerFieldErrors(config, { "Some.Key": "bad" }).unmapped).toEqual({ "Some.Key": "bad" });
  });
});

describe("Additional Inputs keys name their tab", () => {
  const finPlate = MODULES.find((m) => m.name === "fin plate").config;
  const tabName = (config, key) => getDesignPrefTabs(config.sessionName).find((tab) => tab.id === prefTabIdForCoreKey(config, key))?.name;

  it("finds the tab of a row by the core's tab names", () => {
    expect(tabName(finPlate, KEY_DP_BOLT_HOLE_TYPE)).toBe("Bolt");
    expect(tabName(finPlate, KEY_DP_WELD_FAB)).toBe("Weld");
    expect(tabName(finPlate, KEY_DP_DETAILING_GAP)).toBe("Detailing");
    expect(tabName(finPlate, KEY_DP_DESIGN_METHOD)).toBe("Design");
  });

  it.each(MODULES.map((m) => [m.name, m.config]))("%s: every row the core lists is on one of the module's tabs", (_name, config) => {
    const shown = new Set(getDesignPrefTabs(config.sessionName).map((tab) => tab.id));
    for (const [tabTitle, , keys] of DESIGN_PREF_TABLES[config.designType].prefTabs) {
      for (const key of keys) {
        const id = prefTabIdForCoreKey(config, key);
        expect(shown.has(id), `${tabTitle}: ${key}`).toBe(true);
      }
    }
  });

  it("sorts a pref key out of the dock's fields", () => {
    const state = caseState(MODULES.find((m) => m.name === "fin plate"), "customized", "Column Flange-Beam Web");
    const mapped = mapServerFieldErrors(finPlate, { [KEY_DP_BOLT_HOLE_TYPE]: "Not allowed" }, state);
    expect(mapped.fieldErrors).toEqual({});
    expect(mapped.prefErrors).toEqual([
      { coreKey: KEY_DP_BOLT_HOLE_TYPE, field: "bolt_hole_type", message: "Not allowed", tabId: prefTabIdForCoreKey(finPlate, KEY_DP_BOLT_HOLE_TYPE) },
    ]);
  });
});

describe("validateFormFields", () => {
  const module = MODULES.find((m) => m.name === "fin plate");
  const selection = Object.fromEntries((module.config.selectionConfig || []).map((s) => [s.key, "Customized"]));

  it("passes the module's own case", () => {
    const state = caseState(module, "customized", "Column Flange-Beam Web");
    expect(validateFormFields(module.config, state.inputs, state.extraState, selection)).toEqual([]);
  });

  it("returns every problem, one per field", () => {
    const state = caseState(module, "customized", "Column Flange-Beam Web");
    const inputs = { ...state.inputs, load_shear: "", load_axial: "abc", bolt_diameter: [] };
    const errors = validateFormFields(module.config, inputs, state.extraState, selection);
    expect(errors.map((e) => e.field)).toEqual(expect.arrayContaining(["load_shear", "load_axial", "bolt_diameter"]));
    expect(new Set(errors.map((e) => e.field)).size).toBe(errors.length);
    expect(errors.find((e) => e.field === "load_axial").message).toMatch(/valid number/);
  });
});

/** An `InputSection` that holds its inputs and its errors, as the page does. */
function SectionHost({ section, initialErrors, initialInputs = {} }) {
  const [inputs, setInputsState] = useState(initialInputs);
  const [errors, setErrors] = useState(initialErrors);
  const setInputs = useCallback((next) => setInputsState((prev) => (typeof next === "function" ? next(prev) : next)), []);
  const clear = useCallback((key) => setErrors((prev) => {
    const next = { ...prev };
    delete next[key];
    return next;
  }), []);
  return (
    <ModuleContext.Provider value={{ materialList: [] }}>
      <InputSection
        section={section}
        inputs={inputs}
        setInputs={setInputs}
        isInputLocked={false}
        selectionStates={{}}
        updateSelectionState={() => {}}
        updateModalState={() => {}}
        toggleAllSelected={() => {}}
        contextData={{ beamList: ["MB 300", "JB 200"] }}
        extraState={{}}
        setExtraState={() => {}}
        updateSelectedItems={() => {}}
        setModalDynamicSrc={() => {}}
        fieldErrors={errors}
        onClearFieldError={clear}
      />
    </ModuleContext.Provider>
  );
}

describe("InputSection errors", () => {
  const section = {
    title: "Load",
    fields: [
      { key: "load_shear", label: "Shear Force (kN) *", type: "number" },
      { key: "beam_section", label: "Beam", type: "select", dataSource: "beamList" },
    ],
  };

  it("shows the message under the field and flags the input", () => {
    render(<SectionHost section={section} initialErrors={{ load_shear: "must be positive" }} initialInputs={{ load_shear: "-5" }} />);
    const text = screen.getByText("must be positive");
    const input = screen.getByDisplayValue("-5");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(text.id);
    expect(text.className).toMatch(/text-red/);
  });

  it("flags nothing for a field without an error", () => {
    render(<SectionHost section={section} initialErrors={{}} initialInputs={{ load_shear: "5" }} />);
    expect(screen.getByDisplayValue("5").getAttribute("aria-invalid")).toBeNull();
    expect(document.querySelector("[id^='field-error-']")).toBeNull();
  });

  it("clears the message when the field is edited, and keeps the other errors", () => {
    render(<SectionHost section={section} initialErrors={{ load_shear: "must be positive", beam_section: "unknown" }} initialInputs={{ load_shear: "-5" }} />);
    fireEvent.change(screen.getByDisplayValue("-5"), { target: { value: "5" } });
    expect(screen.queryByText("must be positive")).toBeNull();
    expect(screen.getByDisplayValue("5").getAttribute("aria-invalid")).toBeNull();
    expect(screen.getByText("unknown")).toBeTruthy();
  });

  it("flags a dropdown through aria-errormessage", () => {
    render(<SectionHost section={section} initialErrors={{ beam_section: "unknown" }} initialInputs={{ beam_section: "MB 300" }} />);
    const text = screen.getByText("unknown");
    expect(document.querySelector(`[aria-errormessage="${text.id}"]`)).toBeTruthy();
  });
});

/** The dock of a module and the design request, wired the way the page does. */
function Page({ module }) {
  const service = useEngineeringService();
  const submission = useDesignSubmission(service, module.config);
  const state = caseState(module, "customized", module.connectivities?.[0]);
  const [inputs, setInputsState] = useState(state.inputs);
  const setInputs = useCallback((next) => setInputsState((prev) => (typeof next === "function" ? next(prev) : next)), []);
  const selectionStates = Object.fromEntries((module.config.selectionConfig || []).map((s) => [s.key, "Customized"]));
  return (
    <ModuleContext.Provider value={{ materialList: LISTS.materialList }}>
      {module.config.inputSections.map((section, index) => (
        <InputSection
          key={index}
          section={section}
          inputs={inputs}
          setInputs={setInputs}
          isInputLocked={false}
          selectionStates={selectionStates}
          updateSelectionState={() => {}}
          updateModalState={() => {}}
          toggleAllSelected={() => {}}
          contextData={LISTS}
          extraState={state.extraState}
          setExtraState={() => {}}
          updateSelectedItems={() => {}}
          setModalDynamicSrc={() => {}}
          fieldErrors={submission.fieldErrors}
          onClearFieldError={submission.clearFieldError}
        />
      ))}
      <button
        type="button"
        onClick={() =>
          submission.submitDesign({
            inputs,
            selectionStates,
            allSelected: state.allSelected,
            moduleData: LISTS,
            extraState: state.extraState,
          })
        }
      >
        Design
      </button>
      <output data-testid="pref-errors">{JSON.stringify(submission.prefErrors)}</output>
    </ModuleContext.Provider>
  );
}

describe("a rejected design request", () => {
  const modules = ["fin plate", "tension bolted", "base plate", "axially loaded column"];

  it.each(modules)("%s: the message appears under the input the core key belongs to", async (name) => {
    const module = MODULES.find((m) => m.name === name);
    const field = module.config.inputSections
      .flatMap((section) => section.fields)
      .find((f) => f.type === "number" && asList(module.config.coreKeys[f.key]).length > 0 && !f.conditionalDisplay);
    const coreKey = asList(module.config.coreKeys[field.key])[0];
    apiClient.mockRejectedValue(rejection({ [coreKey]: `${field.key} is out of range` }));

    render(<MemoryRouter><Page module={module} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Design" }));

    const text = await screen.findByText(`${field.key} is out of range`);
    expect(document.querySelector(`[aria-describedby="${text.id}"]`)).toBeTruthy();
    expect(message.error).toHaveBeenCalledWith("Invalid design inputs");

    // editing the field clears its message
    const input = document.querySelector(`[aria-describedby="${text.id}"]`);
    fireEvent.change(input, { target: { value: "1" } });
    await waitFor(() => expect(screen.queryByText(`${field.key} is out of range`)).toBeNull());
  });

  it("an Additional Inputs key gives the dialog its tab and the toast", async () => {
    const module = MODULES.find((m) => m.name === "fin plate");
    apiClient.mockRejectedValue(rejection({ [KEY_DP_BOLT_HOLE_TYPE]: "Hole type is not allowed" }));
    render(<MemoryRouter><Page module={module} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Design" }));
    await waitFor(() => expect(JSON.parse(screen.getByTestId("pref-errors").textContent)).toHaveLength(1));
    const [row] = JSON.parse(screen.getByTestId("pref-errors").textContent);
    expect(row).toMatchObject({ coreKey: KEY_DP_BOLT_HOLE_TYPE, message: "Hole type is not allowed" });
    expect(row.tabId).toBe(prefTabIdForCoreKey(module.config, KEY_DP_BOLT_HOLE_TYPE));
    expect(message.error).toHaveBeenCalledWith("Invalid design inputs");
  });

  it("a key with no field and no tab stays a toast and a status", async () => {
    const module = MODULES.find((m) => m.name === "fin plate");
    apiClient.mockRejectedValue(rejection({ "No.Such.Key": "bad" }));
    render(<MemoryRouter><Page module={module} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Design" }));
    await waitFor(() => expect(message.error).toHaveBeenCalledWith("Invalid design inputs"));
    expect(document.querySelector("[id^='field-error-']")).toBeNull();
  });
});
