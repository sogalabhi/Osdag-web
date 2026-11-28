// @vitest-environment jsdom
/**
 * `useProjectLoader` with `formLoadAction`: what a module page does with its form once the auth state and
 * the option lists are known.
 *
 * A URL that names a project loads its saved inputs through the shared loader (`loadStateFromOsi`) and its
 * saved outputs; a page without a project keeps the form it already holds (it holds the defaults, and
 * what the page filled in since, see issue 240); a file the page was opened with is kept; and only a
 * form that came from a project is set back to the defaults when the user leaves the project.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { auth, messages } = vi.hoisted(() => ({
  auth: { user: null, loading: false },
  messages: { warning: vi.fn(), error: vi.fn() },
}));

vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("antd", async (importOriginal) => ({ ...(await importOriginal()), message: messages }));

import { formLoadAction } from "../modules/shared/utils/formLoadAction";
import { useModuleForm } from "../modules/shared/hooks/useModuleForm";
import { useProjectLoader } from "../modules/shared/hooks/useProjectLoader";
import { getModuleRoute } from "../modules/registry";
import { MODULES } from "./cases";
import { LISTS } from "./cases/shared";

const finPlate = MODULES.find((m) => m.name === "fin plate").config;
const LOADED_LISTS = { loadingOptions: false, ...LISTS };
const BASE_PATH = getModuleRoute(finPlate.designType);

const SAVED = {
  Module: finPlate.designType,
  Connectivity: "Column Web-Beam Web",
  Material: "E 300 (Fe 440)",
  "Load.Shear": "222",
  "Bolt.Diameter": ["12", "16"],
};
const OUTPUTS = { "Bolt.Diameter": { label: "Diameter", val: "16" } };

const project = (inputs = SAVED, outputs = OUTPUTS) => ({ success: true, project: { inputs_json: inputs, outputs_json: outputs } });

/** The page's form with the loader on it, and spies for everything the loader calls. */
function mount({ projectId, moduleData = LOADED_LISTS, service, location, user = { id: 1 }, loading = false } = {}) {
  auth.user = user;
  auth.loading = loading;
  const spies = {
    navigate: vi.fn(),
    loadSavedOutputs: vi.fn(),
    resetModuleState: vi.fn(),
    clearDesignResults: vi.fn(),
    resetDocks: vi.fn(),
    setIsDesignComplete: vi.fn(),
    setShowOptionsContainer: vi.fn(),
    setIsInputLocked: vi.fn(),
    resetCalls: vi.fn(),
  };
  const services = { getProject: vi.fn(async () => project()), ...service };
  const where = { pathname: `${BASE_PATH}`, search: "", state: null, ...location };
  const completedRef = { current: true };

  const props = (next = {}) => ({
    projectIdFromUrl: "projectId" in next ? next.projectId : projectId,
    moduleData: next.moduleData ?? moduleData,
  });
  const view = renderHook(
    ({ projectIdFromUrl, moduleData: data }) => {
      const form = useModuleForm(finPlate, data);
      useProjectLoader({
        projectIdFromUrl,
        service: services,
        moduleConfig: finPlate,
        navigate: spies.navigate,
        location: where,
        setInputs: form.setInputs,
        setDesignPrefOverrides: form.setDesignPrefOverrides,
        loadSavedOutputs: spies.loadSavedOutputs,
        resetModuleState: spies.resetModuleState,
        clearDesignResults: spies.clearDesignResults,
        resetDocks: spies.resetDocks,
        setIsDesignComplete: spies.setIsDesignComplete,
        setShowOptionsContainer: spies.setShowOptionsContainer,
        setIsInputLocked: spies.setIsInputLocked,
        designCompletedRef: completedRef,
        resetFormState: () => {
          spies.resetCalls();
          form.resetFormState();
        },
        setExtraState: form.setExtraState,
        setSelectionStates: form.setSelectionStates,
        setAllSelected: form.setAllSelected,
        setSelectedItems: form.setSelectedItems,
        moduleData: data,
      });
      return form;
    },
    { initialProps: props() },
  );
  return { ...view, spies, service: services, completedRef, props, change: (next) => view.rerender(props(next)) };
}

beforeEach(() => {
  auth.user = null;
  auth.loading = false;
  messages.warning.mockClear();
  messages.error.mockClear();
  window.history.pushState({}, "", `${BASE_PATH}`);
  window.history.replaceState({}, "");
  sessionStorage.clear();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
  sessionStorage.clear();
});

describe("formLoadAction", () => {
  it("loads the project when the URL names one, whatever the form holds", () => {
    for (const formHoldsDefaults of [true, false]) {
      for (const hasPrefill of [true, false]) {
        expect(formLoadAction({ projectId: "5", formHoldsDefaults, hasPrefill })).toBe("load-project");
      }
    }
  });

  it("keeps a file the page was opened with", () => {
    expect(formLoadAction({ projectId: null, formHoldsDefaults: true, hasPrefill: true })).toBe("keep-prefill");
    expect(formLoadAction({ projectId: null, formHoldsDefaults: false, hasPrefill: true })).toBe("keep-prefill");
  });

  it("keeps the form of a page that holds the defaults and sets back one that came from a project", () => {
    expect(formLoadAction({ projectId: null, formHoldsDefaults: true, hasPrefill: false })).toBe("keep-defaults");
    expect(formLoadAction({ projectId: null, formHoldsDefaults: false, hasPrefill: false })).toBe("reset-defaults");
  });
});

describe("useProjectLoader opening a project", () => {
  it("loads the saved inputs through the shared loader, and the saved outputs", async () => {
    const view = mount({ projectId: "5" });
    await waitFor(() => expect(view.result.current.inputs.material).toBe("E 300 (Fe 440)"));

    expect(view.service.getProject).toHaveBeenCalledTimes(1);
    expect(view.service.getProject).toHaveBeenCalledWith("5", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(view.result.current.inputs).toMatchObject({ load_shear: "222", bolt_diameter: ["12", "16"] });
    expect(view.result.current.inputs.connectivity).toBe("Column Web-Beam Web");
    expect(view.spies.loadSavedOutputs).toHaveBeenCalledWith(OUTPUTS);
    expect(view.spies.resetCalls).not.toHaveBeenCalled();
  });

  it("clears the design before it loads: results, docks, lock and the completed flag", async () => {
    const view = mount({ projectId: "5" });
    await waitFor(() => expect(view.service.getProject).toHaveBeenCalled());
    const { spies } = view;
    expect(spies.resetModuleState).toHaveBeenCalledTimes(1);
    expect(spies.clearDesignResults).toHaveBeenCalledTimes(1);
    expect(spies.setIsDesignComplete).toHaveBeenCalledWith(false);
    expect(spies.resetDocks).toHaveBeenCalledWith("RESET");
    expect(spies.setShowOptionsContainer).toHaveBeenCalledWith(false);
    expect(spies.setIsInputLocked).toHaveBeenCalledWith(false);
    expect(view.completedRef.current).toBe(false);
  });

  it("reads the saved selections against the option lists (All when the file lists them all)", async () => {
    const all = { ...SAVED, "Bolt.Diameter": [...LISTS.boltDiameterList] };
    const view = mount({ projectId: "5", service: { getProject: vi.fn(async () => project(all)) } });
    await waitFor(() => expect(view.result.current.inputs.material).toBe("E 300 (Fe 440)"));
    expect(view.result.current.allSelected.bolt_diameter).toBe(true);
    expect(view.result.current.selectionStates.boltDiameterSelect).toBe("All");
  });

  it("marks a list that is not all of the options as Customized", async () => {
    const view = mount({ projectId: "5" });
    await waitFor(() => expect(view.result.current.inputs.material).toBe("E 300 (Fe 440)"));
    expect(view.result.current.allSelected.bolt_diameter).toBe(false);
    expect(view.result.current.selectionStates.boltDiameterSelect).toBe("Customized");
    expect(view.result.current.selectedItems.bolt_diameter).toEqual(["12", "16"]);
  });

  it("skips the outputs when the project has none", async () => {
    const view = mount({ projectId: "5", service: { getProject: vi.fn(async () => project(SAVED, null)) } });
    await waitFor(() => expect(view.result.current.inputs.material).toBe("E 300 (Fe 440)"));
    expect(view.spies.loadSavedOutputs).not.toHaveBeenCalled();
  });

  it("waits for the auth state and for the option lists before it asks for the project", async () => {
    const view = mount({ projectId: "5", loading: true, moduleData: { loadingOptions: true } });
    await act(async () => {});
    expect(view.service.getProject).not.toHaveBeenCalled();

    auth.loading = false;
    view.change({ moduleData: { loadingOptions: true } });
    await act(async () => {});
    expect(view.service.getProject).not.toHaveBeenCalled();

    view.change({ moduleData: LOADED_LISTS });
    await waitFor(() => expect(view.service.getProject).toHaveBeenCalledTimes(1));
  });

  it("does not ask for the same project twice when the page re-renders", async () => {
    const view = mount({ projectId: "5" });
    await waitFor(() => expect(view.result.current.inputs.material).toBe("E 300 (Fe 440)"));
    view.change({});
    view.change({ moduleData: { ...LOADED_LISTS } });
    await act(async () => {});
    expect(view.service.getProject).toHaveBeenCalledTimes(1);
  });

  it("loads the next project when the URL changes to another", async () => {
    const second = { ...SAVED, Material: "E 410W (Fe 540 W)A", "Load.Shear": "333" };
    const getProject = vi.fn(async (id) => (id === "5" ? project() : project(second)));
    const view = mount({ projectId: "5", service: { getProject } });
    await waitFor(() => expect(view.result.current.inputs.load_shear).toBe("222"));
    view.change({ projectId: "6" });
    await waitFor(() => expect(view.result.current.inputs.load_shear).toBe("333"));
    expect(getProject).toHaveBeenCalledTimes(2);
  });

  it("drops the answer of a project the user has already left", async () => {
    let release;
    const slow = new Promise((resolve) => { release = resolve; });
    const getProject = vi.fn((id) => (id === "5" ? slow : Promise.resolve(project({ ...SAVED, "Load.Shear": "333" }))));
    const view = mount({ projectId: "5", service: { getProject } });
    await act(async () => {});
    view.change({ projectId: "6" });
    await waitFor(() => expect(view.result.current.inputs.load_shear).toBe("333"));
    await act(async () => release(project()));
    expect(view.result.current.inputs.load_shear).toBe("333");
    expect(view.spies.loadSavedOutputs).toHaveBeenCalledTimes(1);
  });

  it("leaves a guest alone: no request, the form stays", async () => {
    const view = mount({ projectId: "5", user: null });
    await act(async () => {});
    expect(view.service.getProject).not.toHaveBeenCalled();
    expect(view.spies.resetModuleState).not.toHaveBeenCalled();
  });

  it("warns when the project does not exist, and tries again when the user comes back to it", async () => {
    const getProject = vi.fn(async () => ({ success: false }));
    const view = mount({ projectId: "5", service: { getProject } });
    await waitFor(() => expect(messages.warning).toHaveBeenCalledWith("Project not found."));
    expect(view.result.current.inputs.material).toBe(finPlate.defaultInputs.material);

    view.change({ projectId: undefined });
    getProject.mockImplementation(async () => project());
    view.change({ projectId: "5" });
    await waitFor(() => expect(view.result.current.inputs.material).toBe("E 300 (Fe 440)"));
  });

  it("sends the user back to the module when the request fails", async () => {
    const getProject = vi.fn(async () => { throw new Error("network"); });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const view = mount({ projectId: "5", service: { getProject } });
    await waitFor(() => expect(view.spies.navigate).toHaveBeenCalledWith(BASE_PATH, { replace: true }));
    expect(messages.warning).toHaveBeenCalled();
  });

  it("loads the outputs of a project whose inputs hold only the module", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = { success: true, project: { inputs_json: { Module: finPlate.designType }, outputs_json: OUTPUTS } };
    const view = mount({ projectId: "5", service: { getProject: vi.fn(async () => bad) } });
    await waitFor(() => expect(view.spies.loadSavedOutputs).toHaveBeenCalledWith(OUTPUTS));
    expect(messages.error).not.toHaveBeenCalled();
  });

  it("puts the project id in the path when the page was opened with ?projectId=", async () => {
    const view = mount({ projectId: "5", location: { pathname: BASE_PATH, search: "?projectId=5", state: null } });
    await waitFor(() => expect(view.spies.navigate).toHaveBeenCalledWith(`${BASE_PATH}/5`, { replace: true }));
  });

  it("does not navigate when the path already ends with the id", async () => {
    const view = mount({ projectId: "5", location: { pathname: `${BASE_PATH}/5`, search: "", state: null } });
    await waitFor(() => expect(view.spies.loadSavedOutputs).toHaveBeenCalled());
    expect(view.spies.navigate).not.toHaveBeenCalled();
  });

  it("keeps the form of a project that was just saved (the page was navigated to it)", async () => {
    const replace = vi.spyOn(window.history, "replaceState");
    const view = mount({ projectId: "5", location: { pathname: `${BASE_PATH}/5`, search: "", state: { justSaved: true } } });
    await act(async () => {});
    expect(view.service.getProject).not.toHaveBeenCalled();
    expect(view.spies.resetCalls).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalled();
  });
});

describe("useProjectLoader on a page without a project", () => {
  it("keeps the form it holds, which holds the defaults and what the page filled in", async () => {
    const view = mount({});
    act(() => view.result.current.setInputs((prev) => ({ ...prev, supporting_material: "E 165 (Fe 290)", load_shear: "99" })));
    view.change({});
    await act(async () => {});
    expect(view.spies.resetCalls).not.toHaveBeenCalled();
    expect(view.service.getProject).not.toHaveBeenCalled();
    expect(view.result.current.inputs).toMatchObject({ supporting_material: "E 165 (Fe 290)", load_shear: "99" });
  });

  it("keeps it when the auth state and the lists arrive after the page filled the form in", async () => {
    const view = mount({ loading: true, moduleData: { loadingOptions: true } });
    act(() => view.result.current.setInputs((prev) => ({ ...prev, supporting_material: "E 165 (Fe 290)" })));
    auth.loading = false;
    view.change({ moduleData: LOADED_LISTS });
    await act(async () => {});
    expect(view.spies.resetCalls).not.toHaveBeenCalled();
    expect(view.result.current.inputs.supporting_material).toBe("E 165 (Fe 290)");
  });

  it("keeps a file the page was opened with", async () => {
    sessionStorage.setItem(`prefill:${finPlate.designType}`, JSON.stringify(SAVED));
    const view = mount({});
    await act(async () => {});
    expect(view.spies.resetCalls).not.toHaveBeenCalled();
    expect(view.result.current.inputs).toMatchObject({ material: "E 300 (Fe 440)", load_shear: "222" });
  });

  it("does not ask for a project, and does not clear the design", async () => {
    const view = mount({});
    await act(async () => {});
    expect(view.service.getProject).not.toHaveBeenCalled();
    expect(view.spies.clearDesignResults).not.toHaveBeenCalled();
    expect(view.spies.resetDocks).not.toHaveBeenCalled();
  });
});

describe("useProjectLoader leaving a project", () => {
  it("sets back to the defaults a form that came from a project", async () => {
    const view = mount({ projectId: "5" });
    await waitFor(() => expect(view.result.current.inputs.material).toBe("E 300 (Fe 440)"));

    view.change({ projectId: undefined });
    await waitFor(() => expect(view.spies.resetCalls).toHaveBeenCalledTimes(1));
    expect(view.result.current.inputs).toMatchObject({ material: finPlate.defaultInputs.material, load_shear: finPlate.defaultInputs.load_shear });
    expect(view.result.current.inputs.connectivity).toBe("Column Flange-Beam Web");
  });

  it("then keeps the form again: the next change of auth or lists does not reset it", async () => {
    const view = mount({ projectId: "5" });
    await waitFor(() => expect(view.result.current.inputs.material).toBe("E 300 (Fe 440)"));
    view.change({ projectId: undefined });
    await waitFor(() => expect(view.spies.resetCalls).toHaveBeenCalledTimes(1));

    act(() => view.result.current.setInputs((prev) => ({ ...prev, load_shear: "5" })));
    view.change({ projectId: undefined, moduleData: { ...LOADED_LISTS } });
    view.change({ projectId: undefined, moduleData: { loadingOptions: true } });
    view.change({ projectId: undefined, moduleData: LOADED_LISTS });
    await act(async () => {});
    expect(view.spies.resetCalls).toHaveBeenCalledTimes(1);
    expect(view.result.current.inputs.load_shear).toBe("5");
  });

  it("drops the Additional Inputs the project held", async () => {
    const saved = { ...SAVED, "Detailing.Gap": "12", "Connector.Material": "E 410W (Fe 540 W)A" };
    const view = mount({ projectId: "5", service: { getProject: vi.fn(async () => project(saved)) } });
    await waitFor(() => expect(view.result.current.inputs.detailing_gap).toBe("12"));
    view.change({ projectId: undefined });
    await waitFor(() => expect(view.spies.resetCalls).toHaveBeenCalledTimes(1));
    expect(view.result.current.inputs.detailing_gap).toBeUndefined();
    expect(view.result.current.inputs.connector_material).toBeUndefined();
    expect(view.result.current.designPrefOverrides).toEqual({});
  });
});
