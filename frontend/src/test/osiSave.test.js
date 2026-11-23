/**
 * The content of a saved `.osi` file, from `buildOsiSaveContent`.
 *
 * One function builds it for the save in `EngineeringModule`, `useOsiFileHandlers` and
 * `UnifiedDropdownMenu`. The snapshots pin it for every module (all lists on "All"; and an
 * explicit selection with Additional Inputs overrides), so a change to the request keys or
 * to the `Pref.` prefix shows up as a diff. `useOsiFileHandlers` is run end to end to show
 * it sends exactly this content to the backend.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("antd", () => ({ message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("../datasources/osiDataSource", () => ({ openOsiFile: vi.fn() }));

import { MODULES } from "./cases";
import { LISTS, caseState, wire } from "./cases/shared";
import { buildOsiSaveContent, getOsiSaveIdentity } from "../modules/shared/utils/osiSave";
import { useOsiFileHandlers } from "../modules/shared/hooks/useOsiFileHandlers";

const PREFS = { "Bolt.Bolt_Hole_Type": "Over-sized", "Detailing.Gap": "5" };

describe("buildOsiSaveContent", () => {
  for (const module of MODULES) {
    describe(module.name, () => {
      const connectivity = (module.connectivities || [null])[0];

      it("all", () => {
        const { inputs, allSelected, extraState } = caseState(module, "all", connectivity);
        const content = buildOsiSaveContent({
          moduleConfig: module.config, inputs, allSelected, contextData: LISTS, extraState, designPrefOverrides: {},
        });
        expect(wire(content)).toMatchSnapshot();
      });

      it("customized, with Additional Inputs overrides", () => {
        const { inputs, allSelected, extraState } = caseState(module, "customized", connectivity);
        const content = buildOsiSaveContent({
          moduleConfig: module.config, inputs, allSelected, contextData: LISTS, extraState, designPrefOverrides: PREFS,
        });
        expect(wire(content)).toMatchSnapshot();
        expect(content["Pref.Detailing.Gap"]).toBe("5");
      });
    });
  }

  it("is the design request plus the prefixed overrides", () => {
    const module = MODULES[0];
    const { inputs, allSelected, extraState } = caseState(module, "all", module.connectivities[0]);
    const plain = buildOsiSaveContent({ moduleConfig: module.config, inputs, allSelected, contextData: LISTS, extraState });
    const withPrefs = buildOsiSaveContent({
      moduleConfig: module.config, inputs, allSelected, contextData: LISTS, extraState, designPrefOverrides: PREFS,
    });
    expect(withPrefs).toEqual({ ...plain, "Pref.Bolt.Bolt_Hole_Type": "Over-sized", "Pref.Detailing.Gap": "5" });
  });

  it("falls back to the inputs when the module has no builder, or its builder throws", () => {
    const inputs = { a: "1", bolt_diameter: [] };
    const none = buildOsiSaveContent({ moduleConfig: {}, inputs, allSelected: {}, contextData: {}, extraState: {} });
    expect(none).toEqual(inputs);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken = { buildSubmissionParams: () => { throw new Error("boom"); } };
    const content = buildOsiSaveContent({ moduleConfig: broken, inputs, allSelected: {}, contextData: {}, extraState: {} });
    expect(content).toEqual(inputs);
    warn.mockRestore();
  });
});

describe("getOsiSaveIdentity", () => {
  it("prefers the config's design type and names the project from the inputs", () => {
    expect(getOsiSaveIdentity({ moduleConfig: { designType: "Fin Plate Connection", sessionName: "s" }, inputs: { module: "x", name: "My" } }))
      .toEqual({ moduleId: "Fin Plate Connection", projectName: "My" });
    expect(getOsiSaveIdentity({ moduleConfig: { sessionName: "s" }, inputs: { module: "x" } }))
      .toEqual({ moduleId: "x", projectName: "s" });
    expect(getOsiSaveIdentity({ moduleConfig: null, inputs: {} }).projectName).toBe("project");
  });
});

describe("useOsiFileHandlers save", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the content buildOsiSaveContent builds", async () => {
    const module = MODULES[0];
    const { inputs, allSelected, extraState } = caseState(module, "customized", module.connectivities[0]);
    const saveOSIFromInputs = vi.fn().mockResolvedValue({ success: false, error: "stop here" });
    const { handleSaveInputs } = useOsiFileHandlers({
      form: { inputs, allSelected, extraState, designPrefOverrides: PREFS },
      moduleData: { contextData: LISTS },
      actions: { service: { saveOSIFromInputs } },
    }, module.config);

    await handleSaveInputs();

    const expected = buildOsiSaveContent({
      moduleConfig: module.config, inputs, allSelected, contextData: LISTS, extraState, designPrefOverrides: PREFS,
    });
    expect(saveOSIFromInputs).toHaveBeenCalledWith(module.config.designType, module.config.designType, expected, true);
  });
});
