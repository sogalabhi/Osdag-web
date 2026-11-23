/**
 * The design dictionary: the content of a saved `.osi` file and the `inputs_json` of a project,
 * from `toDesignDictionary`.
 *
 * One function builds it for the save in `EngineeringModule`, `useOsiFileHandlers`,
 * `UnifiedDropdownMenu` and the project save. The snapshots pin it for every module (all lists on
 * "All"; and an explicit selection with Additional Inputs overrides), so a change to the request
 * keys shows up as a diff. `useOsiFileHandlers` is run end to end to show it sends exactly this
 * content to the backend.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("antd", () => ({ message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("../datasources/osiDataSource", () => ({ openOsiFile: vi.fn() }));

import { MODULES } from "./cases";
import { LISTS, caseState, designRequest, wire } from "./cases/shared";
import { toDesignDictionary, getOsiSaveIdentity } from "../modules/shared/utils/osiSave";
import { useOsiFileHandlers } from "../modules/shared/hooks/useOsiFileHandlers";

// Additional Inputs as the form keeps them (web field names), and one name no field declares.
const PREFS = { bolt_hole_type: "Over-sized", detailing_gap: "5", leftover_state: "x" };

describe("toDesignDictionary", () => {
  for (const module of MODULES) {
    describe(module.name, () => {
      const connectivity = (module.connectivities || [null])[0];

      it("all", () => {
        const { inputs, allSelected, extraState } = caseState(module, "all", connectivity);
        const content = toDesignDictionary({
          moduleConfig: module.config, inputs, allSelected, contextData: LISTS, extraState, designPrefOverrides: {},
        });
        expect(wire(content)).toMatchSnapshot();
      });

      it("customized, with Additional Inputs overrides", () => {
        const { inputs, allSelected, extraState } = caseState(module, "customized", connectivity);
        const content = toDesignDictionary({
          moduleConfig: module.config, inputs, allSelected, contextData: LISTS, extraState, designPrefOverrides: PREFS,
        });
        expect(wire(content)).toMatchSnapshot();
        expect(content["Detailing.Gap"]).toBe("5");
      });
    });
  }

  it("is the design request with the overrides merged in, plus the overrides the request does not carry", () => {
    const module = MODULES[0];
    const { inputs, allSelected, extraState } = caseState(module, "all", module.connectivities[0]);
    const withPrefs = toDesignDictionary({
      moduleConfig: module.config, inputs, allSelected, contextData: LISTS, extraState, designPrefOverrides: PREFS,
    });
    const request = designRequest(module.config, { inputs, allSelected, extraState, designPrefOverrides: PREFS });
    // Everything the Design button sends is in the dictionary, with the same value.
    expect(wire(withPrefs)).toMatchObject(request);
    expect(withPrefs["Bolt.Bolt_Hole_Type"]).toBe("Over-sized");
    expect(withPrefs["Detailing.Gap"]).toBe("5");
    // A web name no field declares is not saved.
    expect(Object.keys(withPrefs)).not.toContain("leftover_state");
  });

  it("has no prefix, no {dock, pref} shape and no web field names", () => {
    for (const module of MODULES) {
      const { inputs, allSelected, extraState } = caseState(module, "customized", (module.connectivities || [null])[0]);
      const dictionary = toDesignDictionary({
        moduleConfig: module.config, inputs, allSelected, contextData: LISTS, extraState, designPrefOverrides: PREFS,
      });
      expect(Object.keys(dictionary).filter((key) => key.startsWith("Pref.") || key === "dock" || key === "pref"), module.name).toEqual([]);
    }
  });

  it("saves an override the request does not carry under the core key its field declares", () => {
    const config = { buildSubmissionParams: () => ({ Material: "E 250" }), coreKeys: { anchor_pref: "Anchor Bolt.Pref", ui_only: null, material: "Material" } };
    const dictionary = toDesignDictionary({
      moduleConfig: config, inputs: {}, allSelected: {}, contextData: {}, extraState: {},
      designPrefOverrides: { anchor_pref: "12", ui_only: "x", material: "ignored: the request already carries Material" },
    });
    expect(dictionary).toEqual({ Material: "E 250", "Anchor Bolt.Pref": "12" });
  });

  it("falls back to the inputs when the module has no builder, or its builder throws", () => {
    const inputs = { a: "1", bolt_diameter: [] };
    const none = toDesignDictionary({ moduleConfig: {}, inputs, allSelected: {}, contextData: {}, extraState: {} });
    expect(none).toEqual(inputs);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken = { buildSubmissionParams: () => { throw new Error("boom"); } };
    const content = toDesignDictionary({ moduleConfig: broken, inputs, allSelected: {}, contextData: {}, extraState: {} });
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

  it("sends the content toDesignDictionary builds", async () => {
    const module = MODULES[0];
    const { inputs, allSelected, extraState } = caseState(module, "customized", module.connectivities[0]);
    const saveOSIFromInputs = vi.fn().mockResolvedValue({ success: false, error: "stop here" });
    const { handleSaveInputs } = useOsiFileHandlers({
      form: { inputs, allSelected, extraState, designPrefOverrides: PREFS },
      moduleData: { contextData: LISTS },
      actions: { service: { saveOSIFromInputs } },
    }, module.config);

    await handleSaveInputs();

    const expected = toDesignDictionary({
      moduleConfig: module.config, inputs, allSelected, contextData: LISTS, extraState, designPrefOverrides: PREFS,
    });
    expect(saveOSIFromInputs).toHaveBeenCalledWith(module.config.designType, module.config.designType, expected, true);
  });
});
