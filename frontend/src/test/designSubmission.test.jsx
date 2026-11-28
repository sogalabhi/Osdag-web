// @vitest-environment jsdom
/**
 * `useDesignSubmission`: what the page does with a design result (with a fake design service), and the
 * output dock that shows it. A safe design fills the dock, its logs and the 3D model; an unsafe one still
 * lists the dock (empty, buttons off) and reports the failure; a failed request, a design without a 3D
 * model and a saved project each leave the dock in a state of their own.
 *
 * The last block takes every module (Purlin excluded): its own form is validated and turned into the
 * request, a representative result comes back, and the dock renders it.
 */
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { message } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BaseOutputDock } from "../modules/shared/components/BaseOutputDock";
import { DESIGN_STATUS, useDesignSubmission } from "../modules/shared/hooks/useDesignSubmission";
import { useModuleForm } from "../modules/shared/hooks/useModuleForm";
import { MODULES } from "./cases";
import { LISTS, caseState } from "./cases/shared";
import { safeLayout, unsafeLayout } from "./outputLayouts";

vi.mock("antd", async (importOriginal) => ({ ...(await importOriginal()), message: { error: vi.fn(), warning: vi.fn(), success: vi.fn() } }));

const finPlate = MODULES.find((m) => m.name === "fin plate");

const LOGS = [
  { type: "info", message: "Starting design" },
  { type: "warning", message: "Slenderness is high" },
  { type: "success", message: "=== End Of Design ===" },
];
const DATA = {
  "Bolt.Diameter": { label: "Diameter (mm)", value: 20 },
  "Bolt.Grade": { label: "Property Class", val: "8.8" },
  "Plate.Thickness": 12,
  Empty: null,
};

const safeBody = (over = {}) => ({
  success: true,
  data: DATA,
  logs: LOGS,
  output_layout: safeLayout(),
  design_status: true,
  raw_csv: { rows: 1 },
  files: { beam: "/files/beam.glb", column: "/files/column.glb", other: "/files/other.glb" },
  hover_dict: { beam: "Beam text" },
  ...over,
});

const ok = (body) => ({ status: 200, body });

/** The hook under a router, optionally at a project's URL; `service` is the fake design service. */
const setup = (service, { module = finPlate, projectId = null } = {}) => {
  const wrapper = ({ children }) => (
    <MemoryRouter initialEntries={[projectId ? `/design/${projectId}` : "/design"]}>
      <Routes>
        <Route path="/design" element={children} />
        <Route path="/design/:projectId" element={children} />
      </Routes>
    </MemoryRouter>
  );
  // The module's form as the page starts it (its extra state), with the case's values and picked lists.
  const form = renderHook(() => useModuleForm(module.config, LISTS));
  const formExtraState = form.result.current.extraState;
  form.unmount();
  const view = renderHook(() => useDesignSubmission(service, module.config), { wrapper });
  const start = (over = {}) => {
    const state = caseState(module, "customized", module.connectivities?.[0]);
    // the end plate modules ask the user to pick the type of the plate; the page's first option stands in
    const plateType = (module.config.inputSections || []).flatMap((section) => section.fields || []).find((f) => f.type === "endPlateSelect");
    const picked = plateType ? { [plateType.key]: plateType.options[0] } : {};
    return view.result.current.submitDesign({
      inputs: { ...state.inputs, ...picked },
      selectionStates: Object.fromEntries((module.config.selectionConfig || []).map((s) => [s.key, "Customized"])),
      allSelected: state.allSelected,
      moduleData: LISTS,
      extraState: { ...state.extraState, ...formExtraState },
      ...over,
    });
  };
  /** Submits and waits for the design to finish. */
  const submit = (over = {}) => act(async () => { await start(over); });
  return { ...view, start, submit };
};

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("a safe design", () => {
  it("sends the module's request to the design service, with the module's design type", async () => {
    const createDesign = vi.fn(async () => ok(safeBody()));
    const view = setup({ createDesign });
    await view.submit();
    expect(createDesign).toHaveBeenCalledTimes(1);
    const [designType, params, options] = createDesign.mock.calls[0];
    expect(designType).toBe(finPlate.config.designType);
    const state = caseState(finPlate, "customized");
    expect(params).toEqual(finPlate.config.buildSubmissionParams(state.inputs, state.allSelected, LISTS, state.extraState));
    expect(typeof options.onDesignReady).toBe("function");
  });

  it("keeps the outputs with their labels, the dock layout, the logs and the raw table", async () => {
    const view = setup({ createDesign: async () => ok(safeBody()) });
    expect(view.result.current.output).toBeNull();
    expect(view.result.current.outputLayout).toBeNull();
    expect(view.result.current.designSafe).toBeNull();
    await view.submit();
    const { output, outputLayout, designSafe, logs, rawCsvData, designData, displayOutput } = view.result.current;
    expect(output).toEqual({
      "Bolt.Diameter": { label: "Diameter (mm)", val: 20 },
      "Bolt.Grade": { label: "Property Class", val: "8.8" },
      "Plate.Thickness": { label: "Plate.Thickness", val: 12 },
      Empty: { label: "Empty", val: "" },
    });
    expect(outputLayout).toEqual(safeLayout());
    expect(designSafe).toBe(true);
    expect(logs).toEqual(LOGS);
    expect(view.result.current.designLogs).toEqual(LOGS);
    expect(rawCsvData).toEqual({ rows: 1 });
    expect(designData).toBe(DATA);
    expect(displayOutput).toBe(true);
  });

  it("names the 3D model's parts and turns the model on", async () => {
    const view = setup({ createDesign: async () => ok(safeBody()) });
    await view.submit();
    expect(view.result.current.cadData.paths).toEqual({ Beam: "/files/beam.glb", Column: "/files/column.glb", other: "/files/other.glb" });
    expect(view.result.current.cadData.hover).toEqual({ beam: "Beam text" });
    expect(view.result.current.cadData.render).toBe(true);
    expect(view.result.current.renderBoolean).toBe(true);
    expect(view.result.current.modelKey).toBe(1);
    expect(view.result.current.loading).toBe(false);
  });

  it("walks the status from the request to complete, then back to idle", async () => {
    vi.useFakeTimers();
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const view = setup({
      createDesign: async () => {
        await gate;
        return ok(safeBody());
      },
    });
    let pending;
    await act(async () => { pending = view.start(); });
    expect(view.result.current.status.step).toBe(DESIGN_STATUS.CALCULATING);
    expect(view.result.current.loading).toBe(true);
    await act(async () => { release(); await pending; });
    expect(view.result.current.status).toMatchObject({ step: DESIGN_STATUS.COMPLETE, message: "Design complete!" });
    act(() => vi.advanceTimersByTime(1000));
    expect(view.result.current.status.step).toBe(DESIGN_STATUS.IDLE);
  });

  it("shows the design as soon as the service reports it ready, before the 3D model is built", async () => {
    let finish;
    const gate = new Promise((resolve) => { finish = resolve; });
    const view = setup({
      createDesign: async (_type, _params, { onDesignReady }) => {
        onDesignReady(safeBody({ files: undefined }));
        await gate;
        return ok(safeBody());
      },
    });
    let pending;
    await act(async () => { pending = view.start(); });
    expect(view.result.current.output).not.toBeNull();
    expect(view.result.current.outputLayout).toEqual(safeLayout());
    expect(view.result.current.designSafe).toBe(true);
    expect(view.result.current.status.step).toBe(DESIGN_STATUS.CAD_GENERATING);
    expect(view.result.current.renderBoolean).toBe(false);
    await act(async () => { finish(); await pending; });
    expect(view.result.current.renderBoolean).toBe(true);
    expect(view.result.current.status.step).toBe(DESIGN_STATUS.COMPLETE);
  });

  it("ignores an early message that holds no data or reports a failure", async () => {
    const view = setup({
      createDesign: async (_type, _params, { onDesignReady }) => {
        onDesignReady({ success: false, data: DATA });
        onDesignReady({ success: true });
        expect(view.result.current.output).toBeNull();
        return ok(safeBody());
      },
    });
    await view.submit();
    expect(view.result.current.output).not.toBeNull();
  });

  it("saves a project's outputs five seconds after a safe design, and only the latest", async () => {
    vi.useFakeTimers();
    const updateProject = vi.fn(async () => ({}));
    const view = setup({ createDesign: async () => ok(safeBody()), updateProject }, { projectId: "5" });
    await view.submit();
    expect(updateProject).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(4900); });
    expect(updateProject).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(updateProject).toHaveBeenCalledTimes(1);
    expect(updateProject.mock.calls[0][0]).toBe(5);
    expect(updateProject.mock.calls[0][1].outputs_json).toBe(DATA);
    expect(updateProject.mock.calls[0][1].inputs_json).toBeTruthy();
  });

  it("saves nothing for an unsafe design, or when there is no project", async () => {
    vi.useFakeTimers();
    const updateProject = vi.fn(async () => ({}));
    const unsafe = setup({ createDesign: async () => ok(safeBody({ design_status: false })), updateProject }, { projectId: "5" });
    await unsafe.submit();
    const noProject = setup({ createDesign: async () => ok(safeBody()), updateProject });
    await noProject.submit();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(updateProject).not.toHaveBeenCalled();
  });
});

describe("an unsafe design", () => {
  it("lists the dock with no values, reports the failure and builds no 3D model", async () => {
    const body = safeBody({ design_status: false, output_layout: unsafeLayout(), files: {} });
    const view = setup({ createDesign: async () => ok(body) });
    await view.submit();
    expect(view.result.current.designSafe).toBe(false);
    expect(view.result.current.outputLayout).toEqual(unsafeLayout());
    expect(view.result.current.logs).toEqual(LOGS);
    expect(view.result.current.status).toMatchObject({ step: DESIGN_STATUS.ERROR });
    expect(view.result.current.status.message).toMatch(/unsafe \/ failed.*inspect calculation logs/);
    expect(view.result.current.renderBoolean).toBe(false);
    expect(view.result.current.loading).toBe(false);
  });

  it("is what the dock shows: values empty and every button disabled", async () => {
    const body = safeBody({ design_status: false, output_layout: unsafeLayout() });
    const view = setup({ createDesign: async () => ok(body) });
    await view.submit();
    const { outputLayout, designSafe } = view.result.current;
    render(<BaseOutputDock layout={outputLayout} buttonsEnabled={!!outputLayout && designSafe === true} />);
    expect(screen.getAllByRole("button").every((button) => button.disabled)).toBe(true);
    expect(document.querySelectorAll("input[type=button]")).toHaveLength(3);
  });
});

describe("a design that does not complete", () => {
  it("reports the server's error for a failed request, and shows nothing", async () => {
    const view = setup({ createDesign: async () => ({ status: 500, body: { success: false, error: "The core raised" } }) });
    await view.submit();
    expect(view.result.current.output).toBeNull();
    expect(view.result.current.outputLayout).toBeNull();
    expect(view.result.current.status).toMatchObject({ step: DESIGN_STATUS.ERROR, message: "The core raised" });
    expect(view.result.current.loading).toBe(false);
  });

  it("gives a general message when the failed request says nothing", async () => {
    const view = setup({ createDesign: async () => ({ status: 400, body: {} }) });
    await view.submit();
    expect(view.result.current.status.message).toBe("Design failed. Please check inputs.");
  });

  it("keeps the dock and the logs of a design whose 3D model could not be built", async () => {
    const body = safeBody({ files: {}, cad_error: "CAD kernel crashed" });
    const view = setup({ createDesign: async () => ok(body) });
    await view.submit();
    expect(view.result.current.output).not.toBeNull();
    expect(view.result.current.outputLayout).toEqual(safeLayout());
    expect(view.result.current.designSafe).toBe(true);
    expect(view.result.current.status).toMatchObject({ step: DESIGN_STATUS.ERROR });
    expect(view.result.current.status.message).toBe("Calculation succeeded, but cad kernel crashed");
    expect(view.result.current.renderBoolean).toBe(false);
  });

  it("says the module has no 3D model when the design has none and gives no reason", async () => {
    const view = setup({ createDesign: async () => ok(safeBody({ files: undefined })) });
    await view.submit();
    expect(view.result.current.status.message).toBe("Calculation succeeded, but failed to generate 3d model");
  });

  it("keeps the shown design when the service fails after it reported it ready", async () => {
    const view = setup({
      createDesign: async (_type, _params, { onDesignReady }) => {
        onDesignReady(safeBody({ files: undefined }));
        throw new Error("Connection lost");
      },
    });
    await view.submit();
    expect(view.result.current.output).not.toBeNull();
    expect(view.result.current.status).toMatchObject({ step: DESIGN_STATUS.ERROR, message: "Calculation succeeded, but connection lost" });
  });

  it("reports an error of the service before any design as that error", async () => {
    const view = setup({ createDesign: async () => { throw new Error("Network down"); } });
    await view.submit();
    expect(view.result.current.output).toBeNull();
    expect(view.result.current.status).toMatchObject({ step: DESIGN_STATUS.ERROR, message: "Network down" });
  });

  it("does not call the service for a form that is missing a field", async () => {
    const createDesign = vi.fn(async () => ok(safeBody()));
    const view = setup({ createDesign });
    const state = caseState(finPlate, "customized");
    await view.submit({ inputs: { ...state.inputs, load_shear: "" } });
    expect(createDesign).not.toHaveBeenCalled();
    expect(view.result.current.status.step).toBe(DESIGN_STATUS.IDLE);
    expect(view.result.current.fieldErrors.load_shear).toMatch(/^Please fill in the .* field\.$/);
    expect(message.error).toHaveBeenCalledWith(view.result.current.fieldErrors.load_shear);
  });

  it("does not call the service for a customized list with nothing picked", async () => {
    const createDesign = vi.fn(async () => ok(safeBody()));
    const view = setup({ createDesign });
    const state = caseState(finPlate, "customized");
    await view.submit({ inputs: { ...state.inputs, bolt_diameter: [] } });
    expect(createDesign).not.toHaveBeenCalled();
    expect(view.result.current.fieldErrors.bolt_diameter).toMatch(/^Please select at least one value for/);
  });
});

describe("results that do not come from a design", () => {
  const designed = async () => {
    const view = setup({ createDesign: async () => ok(safeBody()) });
    await view.submit();
    return view;
  };

  it("clearDesignResults empties the dock, the logs and the status, and reloads the 3D viewer", async () => {
    const view = await designed();
    const key = view.result.current.modelKey;
    act(() => view.result.current.clearDesignResults());
    expect(view.result.current).toMatchObject({ output: null, outputLayout: null, designSafe: null, logs: null, displayOutput: false, renderBoolean: false });
    expect(view.result.current.rawCsvData).toEqual({});
    expect(view.result.current.status.step).toBe(DESIGN_STATUS.IDLE);
    expect(view.result.current.modelKey).toBe(key + 1);
  });

  it("resetDesignState also clears the model and the design data", async () => {
    const view = await designed();
    act(() => view.result.current.resetDesignState());
    expect(view.result.current).toMatchObject({ output: null, outputLayout: null, designSafe: null, logs: null, designData: {}, designLogs: [], modelKey: 0 });
    expect(view.result.current.cadData).toEqual({ paths: {}, hover: {}, render: false });
  });

  it("loadSavedOutputs shows a saved project's flat outputs with no dock layout, so its buttons stay off", () => {
    const view = setup({ createDesign: vi.fn() });
    act(() => view.result.current.loadSavedOutputs({ "Bolt.Diameter": { label: "Diameter (mm)", val: 16 }, B: 3 }));
    expect(view.result.current.output).toEqual({ "Bolt.Diameter": { label: "Diameter (mm)", val: 16 }, B: { label: "B", val: 3 } });
    expect(view.result.current.outputLayout).toBeNull();
    expect(view.result.current.designSafe).toBeNull();
    expect(view.result.current.displayOutput).toBe(true);
    const { outputLayout, designSafe } = view.result.current;
    expect(!!outputLayout && designSafe === true).toBe(false);
  });

  it("loadSavedOutputs does nothing for no outputs", () => {
    const view = setup({ createDesign: vi.fn() });
    act(() => view.result.current.loadSavedOutputs({}));
    act(() => view.result.current.loadSavedOutputs(null));
    expect(view.result.current.output).toBeNull();
  });

  it("loadOutputs shows a finished design with the engine's layout as safe", () => {
    const view = setup({ createDesign: vi.fn() });
    act(() => view.result.current.loadOutputs(DATA, safeLayout()));
    expect(view.result.current.outputLayout).toEqual(safeLayout());
    expect(view.result.current.designSafe).toBe(true);
    expect(view.result.current.designData).toBe(DATA);
    act(() => view.result.current.loadOutputs(DATA, "not a list"));
    expect(view.result.current.outputLayout).toBeNull();
  });

  it("loadCadModel puts a ready model on, and ignores no files", () => {
    const view = setup({ createDesign: vi.fn() });
    act(() => view.result.current.loadCadModel({}, {}));
    expect(view.result.current.renderBoolean).toBe(false);
    act(() => view.result.current.loadCadModel({ plate: " /p.glb" }, { plate: "Plate" }));
    expect(view.result.current.cadData.paths).toEqual({ Plate: " /p.glb" });
    expect(view.result.current.renderBoolean).toBe(true);
  });
});

describe("every module's design flow ends in the dock", () => {
  it("covers the 24 modules, none twice", () => {
    expect(MODULES).toHaveLength(24);
    expect(new Set(MODULES.map((m) => m.config.designType)).size).toBe(MODULES.length);
  });

  it.each(MODULES.map((m) => [m.name, m]))("%s: its form becomes its request, and the result fills the dock", async (_name, module) => {
    const createDesign = vi.fn(async () => ok(safeBody()));
    const view = setup({ createDesign }, { module });
    await view.submit();

    expect(view.result.current.status.step, view.result.current.status.message).toBe(DESIGN_STATUS.COMPLETE);
    expect(createDesign).toHaveBeenCalledTimes(1);
    const [designType, params] = createDesign.mock.calls[0];
    expect(designType).toBe(module.config.designType);
    expect(Object.keys(params).length).toBeGreaterThan(3);
    expect(JSON.parse(JSON.stringify(params))).toBeTruthy();

    const { outputLayout, designSafe, output } = view.result.current;
    expect(designSafe).toBe(true);
    expect(Object.keys(output)).toContain("Bolt.Diameter");
    const { unmount } = render(<BaseOutputDock layout={outputLayout} buttonsEnabled />);
    expect(document.querySelectorAll("[data-output-section]")).toHaveLength(2);
    expect(document.querySelector('[data-output-key="Bolt.Diameter"]').textContent).toContain("20");
    expect(document.querySelectorAll("input[type=button]:not(:disabled)")).toHaveLength(3);
    fireEvent.click(document.querySelector('[data-output-key="Bolt.spacing"] input[type=button]'));
    expect(screen.getByRole("dialog").textContent).toContain("Pitch Distance (mm)");
    unmount();
  });

  it.each(MODULES.map((m) => [m.name, m]))("%s: an unsafe result leaves the dock listed and disabled", async (_name, module) => {
    const body = safeBody({ design_status: false, output_layout: unsafeLayout() });
    const view = setup({ createDesign: async () => ok(body) }, { module });
    await view.submit();
    expect(view.result.current.designSafe).toBe(false);
    expect(view.result.current.status.step).toBe(DESIGN_STATUS.ERROR);
    const { unmount } = render(<BaseOutputDock layout={view.result.current.outputLayout} buttonsEnabled={false} />);
    expect(document.querySelectorAll("input[type=button]:disabled")).toHaveLength(3);
    unmount();
  });
});
