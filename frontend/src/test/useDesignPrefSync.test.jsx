// @vitest-environment jsdom
/**
 * `useDesignPrefSync`: keeps the Additional Inputs rows that follow the dock Material in step with it, by
 * asking the backend to sync (`fetchDesignPrefSync`, replaced here by a fake datasource).
 *
 * What the hook promises: one debounced sync when the page opens and after every change of the dock
 * driver; "refresh" (the dock wins) after the user's edit and "open" (rows the file holds stay) after
 * a load, also while the dock stays where the load put it; no sync while the dialog is open, for an
 * empty dock, or for a stale or failed answer; a late answer is merged and not wiped by the form reset
 * of the project loader (issue 240, see the last block).
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { fetchDesignPrefSync, auth } = vi.hoisted(() => ({
  fetchDesignPrefSync: vi.fn(),
  auth: { user: null, loading: false },
}));

vi.mock("../datasources/modulesDataSource", () => ({ fetchDesignPrefSync }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));

import { useDesignPrefSync } from "../modules/shared/hooks/useDesignPrefSync";
import { useModuleForm } from "../modules/shared/hooks/useModuleForm";
import { useProjectLoader } from "../modules/shared/hooks/useProjectLoader";
import { MODULES } from "./cases";
import { LISTS } from "./cases/shared";

const caseOf = (name) => MODULES.find((m) => m.name === name).config;
const finPlate = caseOf("fin plate");
const basePlate = caseOf("base plate");

const DEBOUNCE = 200;
const DOCK = "E 165 (Fe 290)";
const OTHER = "E 300 (Fe 440)";
const THIRD = "E 410W (Fe 540 W)A";

/** The answer of the backend: the dock grade copied to the rows that follow it. */
const answer = (grade, extra = {}) => ({
  success: true,
  data: {
    resolved_inputs: { supporting_material: grade, supported_material: grade, connector_material: grade, ...extra },
    metadata: { copied_from_input_dock_keys: { Material: ["supporting_material", "supported_material", "connector_material"] } },
    material_details: { grade },
  },
});

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};

const operationsSent = () => fetchDesignPrefSync.mock.calls.map(([, request]) => request.operation);
const lastRequest = () => fetchDesignPrefSync.mock.calls.at(-1)[1];

const passTime = (ms = DEBOUNCE) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

const OVERRIDES = {};

/** The hook with spies for everything it writes, and the props it is given; `rerender(props)` changes them. */
const mount = (over = {}) => {
  const spies = {
    setInputs: vi.fn(),
    applyStrictLinkedReseed: vi.fn(),
    setLastKnownGoodDesignPrefSnapshot: vi.fn(),
  };
  const base = {
    moduleConfig: finPlate,
    inputs: { ...finPlate.defaultInputs, material: DOCK },
    designPrefOverrides: OVERRIDES,
    pause: false,
    ...spies,
    ...over,
  };
  const view = renderHook((props) => useDesignPrefSync(props), { initialProps: base });
  const change = (next) => view.rerender({ ...base, ...next });
  return { ...view, spies, base, change };
};

/** What the first setInputs update makes of a form that has not got the rows yet. */
const mergedInto = (setInputs, prev = { material: DOCK }) => setInputs.mock.calls[0][0](prev);

beforeEach(() => {
  vi.useFakeTimers();
  fetchDesignPrefSync.mockReset();
  fetchDesignPrefSync.mockImplementation(async () => answer(DOCK));
  auth.user = null;
  auth.loading = false;
  window.history.pushState({}, "", "/");
  sessionStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useDesignPrefSync on open", () => {
  it("syncs once, after the debounce, with the form as it is and the module's config", async () => {
    mount();
    expect(fetchDesignPrefSync).not.toHaveBeenCalled();
    await passTime(DEBOUNCE - 10);
    expect(fetchDesignPrefSync).not.toHaveBeenCalled();
    await passTime(20);
    expect(fetchDesignPrefSync).toHaveBeenCalledTimes(1);
    const [config, request, signal] = fetchDesignPrefSync.mock.calls[0];
    expect(config).toBe(finPlate);
    expect(request.state.material).toBe(DOCK);
    expect(signal.aborted).toBe(false);
  });

  it("asks for a refresh, since the first commit has no file behind it", async () => {
    mount();
    await passTime();
    expect(operationsSent()).toEqual(["refresh"]);
  });

  it("merges the rows the server linked to the dock, and nothing else, into the inputs", async () => {
    const { spies } = mount();
    await passTime();
    expect(spies.setInputs).toHaveBeenCalledTimes(1);
    const next = mergedInto(spies.setInputs, { material: DOCK, load_shear: "70", supporting_material: "old", bolt_hole_type: "Standard" });
    expect(next).toEqual({
      material: DOCK,
      load_shear: "70",
      supporting_material: DOCK,
      supported_material: DOCK,
      connector_material: DOCK,
      bolt_hole_type: "Standard",
    });
  });

  it("does not merge a row the server resolved but did not copy from the dock", async () => {
    fetchDesignPrefSync.mockImplementation(async () => answer(DOCK, { detailing_gap: "99" }));
    const { spies } = mount();
    await passTime();
    expect(mergedInto(spies.setInputs).detailing_gap).toBeUndefined();
  });

  it("hands the answer to the strict reseed and to the last known good snapshot", async () => {
    const { spies } = mount();
    await passTime();
    expect(spies.applyStrictLinkedReseed).toHaveBeenCalledTimes(1);
    const reseed = spies.applyStrictLinkedReseed.mock.calls[0][0];
    expect(reseed.material_details).toEqual({ grade: DOCK });
    expect(reseed.metadata.copied_from_input_dock_keys.Material).toHaveLength(3);
    expect(reseed.snapshot.material_details).toEqual({ grade: DOCK });
    expect(spies.setLastKnownGoodDesignPrefSnapshot).toHaveBeenCalledTimes(1);
    expect(spies.setLastKnownGoodDesignPrefSnapshot.mock.calls[0][0]).toBe(reseed.snapshot);
  });

  it("works without a strict reseed callback", async () => {
    const { spies } = mount({ applyStrictLinkedReseed: undefined });
    await passTime();
    expect(spies.setLastKnownGoodDesignPrefSnapshot).toHaveBeenCalledTimes(1);
  });

  it("does not sync again when something other than the dock driver changes", async () => {
    const { change, base } = mount();
    await passTime();
    change({ inputs: { ...base.inputs, load_shear: "123" } });
    await passTime();
    expect(fetchDesignPrefSync).toHaveBeenCalledTimes(1);
  });
});

describe("useDesignPrefSync after the user edits the dock Material", () => {
  it("refreshes with the new Material", async () => {
    const { change, base } = mount();
    await passTime();
    change({ inputs: { ...base.inputs, material: OTHER } });
    await passTime();
    expect(operationsSent()).toEqual(["refresh", "refresh"]);
    expect(lastRequest().state.material).toBe(OTHER);
  });

  it("sends one request for the latest Material when the dock changes within the debounce", async () => {
    const { change, base } = mount();
    await passTime();
    change({ inputs: { ...base.inputs, material: OTHER } });
    await passTime(DEBOUNCE - 50);
    change({ inputs: { ...base.inputs, material: THIRD } });
    await passTime(DEBOUNCE);
    expect(fetchDesignPrefSync).toHaveBeenCalledTimes(2);
    expect(lastRequest().state.material).toBe(THIRD);
  });

  it("aborts the request in flight when the dock changes again", async () => {
    fetchDesignPrefSync.mockImplementationOnce(() => new Promise(() => {}));
    const { change, base } = mount();
    await passTime();
    const firstSignal = fetchDesignPrefSync.mock.calls[0][2];
    expect(firstSignal.aborted).toBe(false);
    change({ inputs: { ...base.inputs, material: OTHER } });
    expect(firstSignal.aborted).toBe(true);
  });

  it("drops a late answer for a Material the user has since left", async () => {
    const slow = deferred();
    fetchDesignPrefSync.mockImplementationOnce(() => slow.promise);
    fetchDesignPrefSync.mockImplementationOnce(async () => answer(OTHER));
    const { change, base, spies } = mount();
    await passTime();
    change({ inputs: { ...base.inputs, material: OTHER } });
    await passTime();
    expect(spies.setInputs).toHaveBeenCalledTimes(1);
    expect(mergedInto(spies.setInputs).supporting_material).toBe(OTHER);

    await act(async () => slow.resolve(answer(DOCK)));
    expect(spies.setInputs).toHaveBeenCalledTimes(1);
    expect(spies.setLastKnownGoodDesignPrefSnapshot).toHaveBeenCalledTimes(1);
  });

  it("follows the Material of the base plate, not its anchor bolt type", async () => {
    const inputs = { ...basePlate.defaultInputs, material: DOCK };
    const { change } = mount({ moduleConfig: basePlate, inputs });
    await passTime();
    change({ inputs: { ...inputs, anchor_type: "End Plate Type" } });
    await passTime();
    // the base plate's linked rows follow its Material; the anchor bolt type only clears the saved rows (useModuleForm)
    expect(fetchDesignPrefSync).toHaveBeenCalledTimes(1);
    change({ inputs: { ...inputs, anchor_type: "End Plate Type", material: OTHER } });
    await passTime();
    expect(fetchDesignPrefSync).toHaveBeenCalledTimes(2);
  });
});

describe("useDesignPrefSync after a load", () => {
  const loaded = (inputs, overrides = { fresh: true }) => ({ inputs, designPrefOverrides: overrides });

  it("only opens, so the rows the file holds stay, when a load moves the dock Material", async () => {
    const { change, base } = mount();
    await passTime();
    change(loaded({ ...base.inputs, material: OTHER }));
    await passTime();
    expect(operationsSent()).toEqual(["refresh", "open"]);
  });

  it("keeps opening, not refreshing, while the dock stays where the load put it", async () => {
    const { change, base, spies } = mount();
    await passTime();
    const afterLoad = loaded({ ...base.inputs, material: OTHER });
    change(afterLoad);
    await passTime();
    // something else the effect depends on changes (its callbacks are new): the dock is still the file's
    change({ ...afterLoad, applyStrictLinkedReseed: vi.fn(), setLastKnownGoodDesignPrefSnapshot: spies.setLastKnownGoodDesignPrefSnapshot });
    await passTime();
    expect(operationsSent()).toEqual(["refresh", "open", "open"]);
  });

  it("refreshes again on the user's edit that follows a load", async () => {
    const { change, base } = mount();
    await passTime();
    const afterLoad = loaded({ ...base.inputs, material: OTHER });
    change(afterLoad);
    await passTime();
    change({ ...afterLoad, inputs: { ...afterLoad.inputs, material: THIRD } });
    await passTime();
    expect(operationsSent()).toEqual(["refresh", "open", "refresh"]);
  });

  it("opens, and does not refresh, when a load leaves the dock where it was", async () => {
    const { change, base } = mount();
    await passTime();
    // same Material, new overrides: the dock driver did not move, so there is nothing to sync
    change(loaded({ ...base.inputs, load_shear: "5" }));
    await passTime();
    expect(fetchDesignPrefSync).toHaveBeenCalledTimes(1);
  });
});

describe("useDesignPrefSync while the Additional Inputs dialog is open", () => {
  it("does not sync, and aborts a sync in flight", async () => {
    const slow = deferred();
    fetchDesignPrefSync.mockImplementationOnce(() => slow.promise);
    const { change, base } = mount();
    await passTime();
    const signal = fetchDesignPrefSync.mock.calls[0][2];
    change({ pause: true });
    expect(signal.aborted).toBe(true);
    await passTime(DEBOUNCE * 3);
    expect(fetchDesignPrefSync).toHaveBeenCalledTimes(1);
    expect(base.pause).toBe(false);
  });

  it("does not sync when the dialog closes and the dock is where it was", async () => {
    const { change } = mount();
    await passTime();
    change({ pause: true });
    await passTime();
    change({ pause: false });
    await passTime();
    expect(fetchDesignPrefSync).toHaveBeenCalledTimes(1);
  });

  it("does not sync on a dock edit made while the dialog was open (the dialog's own sync handled it)", async () => {
    const { change, base } = mount();
    await passTime();
    change({ pause: true });
    change({ pause: true, inputs: { ...base.inputs, material: OTHER } });
    await passTime();
    change({ pause: false, inputs: { ...base.inputs, material: OTHER } });
    await passTime();
    expect(fetchDesignPrefSync).toHaveBeenCalledTimes(1);
  });

  it("syncs on a dock edit that follows the close", async () => {
    const { change, base } = mount();
    await passTime();
    change({ pause: true });
    change({ pause: false });
    await passTime();
    change({ inputs: { ...base.inputs, material: THIRD } });
    await passTime();
    expect(fetchDesignPrefSync).toHaveBeenCalledTimes(2);
    expect(lastRequest().state.material).toBe(THIRD);
  });
});

describe("useDesignPrefSync errors and cases with nothing to sync", () => {
  it("leaves the form alone when the server refuses", async () => {
    fetchDesignPrefSync.mockImplementation(async () => ({ success: false, error: "Preference sync failed" }));
    const { spies } = mount();
    await passTime();
    expect(fetchDesignPrefSync).toHaveBeenCalledTimes(1);
    expect(spies.setInputs).not.toHaveBeenCalled();
    expect(spies.applyStrictLinkedReseed).not.toHaveBeenCalled();
    expect(spies.setLastKnownGoodDesignPrefSnapshot).not.toHaveBeenCalled();
  });

  it("leaves the form alone for an aborted request", async () => {
    fetchDesignPrefSync.mockImplementation(async () => ({ success: false, error: "aborted", aborted: true }));
    const { spies } = mount();
    await passTime();
    expect(spies.setInputs).not.toHaveBeenCalled();
  });

  it("syncs again on the next dock change after a failure", async () => {
    fetchDesignPrefSync.mockImplementationOnce(async () => ({ success: false, error: "boom" }));
    const { change, base, spies } = mount();
    await passTime();
    change({ inputs: { ...base.inputs, material: OTHER } });
    await passTime();
    expect(spies.setInputs).toHaveBeenCalledTimes(1);
    expect(mergedInto(spies.setInputs).supporting_material).toBe(DOCK);
  });

  it("does not sync an empty dock", async () => {
    mount({ inputs: { ...finPlate.defaultInputs, material: "" } });
    await passTime();
    expect(fetchDesignPrefSync).not.toHaveBeenCalled();
  });

  it("syncs once the dock gets a value", async () => {
    const { change, base } = mount({ inputs: { ...finPlate.defaultInputs, material: "" } });
    await passTime();
    change({ inputs: { ...base.inputs, material: DOCK } });
    await passTime();
    expect(fetchDesignPrefSync).toHaveBeenCalledTimes(1);
  });

  it("does not sync a module without a design type (no rules to sync)", async () => {
    mount({ moduleConfig: { ...finPlate, designType: undefined } });
    await passTime();
    expect(fetchDesignPrefSync).not.toHaveBeenCalled();
  });

  it("does not sync without a way to write the inputs", async () => {
    mount({ setInputs: undefined });
    await passTime();
    expect(fetchDesignPrefSync).not.toHaveBeenCalled();
  });

  it("cancels the pending sync when the page goes away", async () => {
    const { unmount } = mount();
    unmount();
    await passTime(DEBOUNCE * 2);
    expect(fetchDesignPrefSync).not.toHaveBeenCalled();
  });

  it("aborts the request in flight when the page goes away", async () => {
    fetchDesignPrefSync.mockImplementationOnce(() => new Promise(() => {}));
    const { unmount } = mount();
    await passTime();
    const signal = fetchDesignPrefSync.mock.calls[0][2];
    unmount();
    expect(signal.aborted).toBe(true);
  });
});

describe("the page with its form hooks (issue 240: a late sync answer must survive the form reset)", () => {
  const PROJECT = { inputs_json: { Module: finPlate.designType, Material: OTHER, "Load.Shear": "222" }, outputs_json: null };

  /** The module page's hooks, wired as `useEngineeringModule` and `EngineeringModule` do. */
  const usePage = ({ projectIdFromUrl, moduleData, service, extra }) => {
    const form = useModuleForm(finPlate, moduleData);
    useDesignPrefSync({
      moduleConfig: finPlate,
      inputs: form.inputs,
      designPrefOverrides: form.designPrefOverrides,
      setInputs: form.setInputs,
      applyStrictLinkedReseed: undefined,
      setLastKnownGoodDesignPrefSnapshot: extra.setSnapshot,
      pause: form.designPrefModalStatus,
    });
    useProjectLoader({
      projectIdFromUrl,
      service,
      moduleConfig: finPlate,
      navigate: vi.fn(),
      location: { pathname: "/design/fin-plate", search: "", state: null },
      setInputs: form.setInputs,
      setDesignPrefOverrides: form.setDesignPrefOverrides,
      loadSavedOutputs: vi.fn(),
      resetModuleState: vi.fn(),
      clearDesignResults: vi.fn(),
      resetDocks: vi.fn(),
      setIsDesignComplete: vi.fn(),
      setShowOptionsContainer: vi.fn(),
      setIsInputLocked: vi.fn(),
      designCompletedRef: extra.completedRef,
      resetFormState: extra.resetSpy(form.resetFormState),
      setExtraState: form.setExtraState,
      setSelectionStates: form.setSelectionStates,
      setAllSelected: form.setAllSelected,
      setSelectedItems: form.setSelectedItems,
      moduleData,
    });
    return form;
  };

  const page = (props = {}) => {
    const extra = {
      setSnapshot: vi.fn(),
      completedRef: { current: false },
      resets: vi.fn(),
      resetSpy(reset) {
        return (...args) => {
          extra.resets();
          return reset(...args);
        };
      },
    };
    const service = { getProject: vi.fn(async () => ({ success: true, project: PROJECT })) };
    const initial = { projectIdFromUrl: undefined, moduleData: { loadingOptions: false, ...LISTS }, service, extra, ...props };
    const view = renderHook((hookProps) => usePage(hookProps), { initialProps: initial });
    return { ...view, extra, service, props: initial, change: (next) => view.rerender({ ...initial, ...next }) };
  };

  it("keeps the rows the sync filled in when the auth state arrives after the sync", async () => {
    auth.loading = true;
    const view = page();
    await passTime();
    expect(view.result.current.inputs.supporting_material).toBe(DOCK);

    auth.loading = false;
    view.change({});
    await passTime();

    expect(view.extra.resets).not.toHaveBeenCalled();
    expect(view.result.current.inputs.supporting_material).toBe(DOCK);
    expect(view.result.current.inputs.connector_material).toBe(DOCK);
  });

  it("keeps the rows of a sync answer that comes in after the loader has run", async () => {
    const late = deferred();
    fetchDesignPrefSync.mockImplementationOnce(() => late.promise);
    auth.loading = true;
    const view = page();
    await passTime();

    auth.loading = false;
    view.change({});
    await passTime();
    expect(view.result.current.inputs.supporting_material).toBeUndefined();

    await act(async () => late.resolve(answer(DOCK)));
    expect(view.extra.resets).not.toHaveBeenCalled();
    expect(view.result.current.inputs).toMatchObject({ supporting_material: DOCK, supported_material: DOCK });
  });

  it("keeps the rows when the option lists arrive after the sync", async () => {
    const view = page({ moduleData: { loadingOptions: true } });
    await passTime();
    expect(view.result.current.inputs.supporting_material).toBe(DOCK);

    view.change({ moduleData: { loadingOptions: false, ...LISTS } });
    await passTime();
    expect(view.extra.resets).not.toHaveBeenCalled();
    expect(view.result.current.inputs.supporting_material).toBe(DOCK);
    expect(view.result.current.inputs.bolt_diameter).toEqual(LISTS.boltDiameterList);
  });

  it("opens a project with its own Material and rows, and does not refresh them from the dock", async () => {
    auth.user = { id: 1 };
    const view = page({ projectIdFromUrl: "5" });
    await passTime();
    await passTime();
    expect(view.service.getProject).toHaveBeenCalledWith("5", expect.anything());
    expect(view.result.current.inputs).toMatchObject({ material: OTHER, load_shear: "222" });
    // the project's dock Material was reached by a load: only an "open" sync may have asked for it
    const afterLoad = operationsSent().slice(1);
    expect(afterLoad.every((operation) => operation === "open")).toBe(true);
  });

  it("goes back to the defaults, and syncs the rows again, when the user leaves a project", async () => {
    auth.user = { id: 1 };
    const view = page({ projectIdFromUrl: "5" });
    await passTime();
    await passTime();
    expect(view.result.current.inputs.material).toBe(OTHER);

    view.change({ projectIdFromUrl: undefined });
    await passTime();
    await passTime();
    expect(view.extra.resets).toHaveBeenCalledTimes(1);
    expect(view.result.current.inputs.material).toBe(finPlate.defaultInputs.material);
    expect(view.result.current.inputs.load_shear).toBe(finPlate.defaultInputs.load_shear);
  });
});
