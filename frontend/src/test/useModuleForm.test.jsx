// @vitest-environment jsdom
/**
 * `useModuleForm`: the form state of a module page. Its start from the config, the setters, the "All"
 * lists filling in once the option lists arrive, the prefill a file open leaves in the session, the
 * reset, and the rule that the user's edit of the dock Material (or the anchor bolt type of the base
 * plate) clears the saved Additional Inputs while a load that moves the same dock does not.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONN_CFBW, KEY_BASE_PLATE_MATERIAL } from "../constants/generated/coreKeys";
import { useModuleForm } from "../modules/shared/hooks/useModuleForm";
import { isAdditionalInput, prefClearingFields } from "../modules/shared/utils/prefSyncKeys";
import { MODULES } from "./cases";
import { LISTS } from "./cases/shared";

const caseOf = (name) => MODULES.find((m) => m.name === name).config;
const finPlate = caseOf("fin plate");
const basePlate = caseOf("base plate");
const lapJoint = caseOf("lap joint bolted");

const result = (view) => view.result.current;
const GRADE = "E 250 (Fe 410 W)A";
const saved = { supporting_material: "E 300 (Fe 440)", supported_material: "E 300 (Fe 440)" };

const setup = (config = finPlate, moduleData = {}) =>
  renderHook(({ cfg, data }) => useModuleForm(cfg, data), { initialProps: { cfg: config, data: moduleData } });

/** A form whose saved Additional Inputs are in place, as after the user saved the dialog. */
const withSavedPrefs = (config = finPlate, prefs = saved) => {
  const view = setup(config);
  act(() => {
    view.result.current.setDesignPrefOverrides(prefs);
    view.result.current.setInputs((prev) => ({ ...prev, ...prefs }));
  });
  return view;
};

beforeEach(() => {
  window.history.pushState({}, "", "/design/fin-plate");
  sessionStorage.clear();
});
afterEach(() => {
  window.history.pushState({}, "", "/");
  sessionStorage.clear();
});

describe("useModuleForm initial state", () => {
  it("starts from the config: its default inputs, every list on All, no modal open", () => {
    const { result } = setup();
    const form = result.current;
    expect(form.inputs).toBe(finPlate.defaultInputs);
    expect(form.allSelected).toEqual({ bolt_diameter: true, bolt_grade: true, plate_thickness: true });
    expect(form.selectionStates).toEqual(Object.fromEntries(finPlate.selectionConfig.map((s) => [s.key, s.defaultValue || "All"])));
    expect(form.selectedItems).toEqual({ bolt_diameter: [], bolt_grade: [], plate_thickness: [] });
    expect(Object.values(form.modalStates)).toHaveLength(finPlate.modalConfig.length);
    expect(Object.values(form.modalStates).every((open) => open === false)).toBe(true);
    expect(form.designPrefOverrides).toEqual({});
    expect(form.designPrefModalStatus).toBe(false);
    expect(form.confirmationModal).toBe(false);
    expect(form.displaySaveInputPopup).toBe(false);
    expect(form.saveInputFileName).toBe("");
  });

  it("keeps a modal with a data source out of the dynamic lists and gives the others an empty one", () => {
    const { result } = setup();
    const withoutSource = finPlate.modalConfig.filter((modal) => !modal?.dataSource).map((modal) => modal.key);
    expect(Object.keys(result.current.modalDynamicSrc).sort()).toEqual([...withoutSource].sort());
    expect(Object.values(result.current.modalDynamicSrc).every((list) => Array.isArray(list) && list.length === 0)).toBe(true);
  });

  it("starts empty, for the project to fill, when the URL names a project", () => {
    window.history.pushState({}, "", "/design/fin-plate?projectId=7");
    expect(setup().result.current.inputs).toEqual({});
    window.history.pushState({}, "", "/design/fin-plate/12");
    expect(setup().result.current.inputs).toEqual({});
  });

  it("starts with an empty extra state and the connectivity in the inputs", () => {
    expect(setup(finPlate).result.current.extraState).toEqual({});
    expect(setup(caseOf("beam-column end plate")).result.current.extraState).toEqual({});
    expect(setup(finPlate).result.current.inputs.connectivity).toBe(CONN_CFBW);
  });

  it("takes the extra state from the config's own getInitialExtraState when it has one", () => {
    const config = { ...finPlate, getInitialExtraState: () => ({ selectedOption: "Welded Column Base", other: 1 }) };
    expect(setup(config).result.current.extraState).toEqual({ selectedOption: "Welded Column Base", other: 1 });
  });
});

describe("useModuleForm setters", () => {
  it("writes the inputs and the other pieces of state it holds", () => {
    const { result } = setup();
    act(() => result.current.setInputs((prev) => ({ ...prev, load_shear: "99" })));
    expect(result.current.inputs.load_shear).toBe("99");
    expect(result.current.inputs.load_axial).toBe(finPlate.defaultInputs.load_axial);

    act(() => result.current.setExtraState({ selectedProfile: "Channels" }));
    expect(result.current.extraState).toEqual({ selectedProfile: "Channels" });

    act(() => result.current.updateSelectionState("boltDiameterSelect", "Customized"));
    expect(result.current.selectionStates.boltDiameterSelect).toBe("Customized");

    act(() => result.current.toggleAllSelected("bolt_diameter", false));
    expect(result.current.allSelected).toMatchObject({ bolt_diameter: false, bolt_grade: true });

    const modalKey = finPlate.modalConfig[0].key;
    act(() => result.current.updateModalState(modalKey, true));
    expect(result.current.modalStates[modalKey]).toBe(true);
    act(() => result.current.updateModalState(modalKey, false));
    expect(result.current.modalStates[modalKey]).toBe(false);
  });

  it("writes a picked list to both the selected items and the input of that key", () => {
    const { result } = setup();
    act(() => result.current.updateSelectedItems("bolt_diameter", ["16", "20"]));
    expect(result.current.selectedItems.bolt_diameter).toEqual(["16", "20"]);
    expect(result.current.inputs.bolt_diameter).toEqual(["16", "20"]);
    expect(result.current.selectedItems.bolt_grade).toEqual([]);
  });

  it("closes the save popup after four seconds", () => {
    const view = setup();
    vi.useFakeTimers();
    try {
      act(() => view.result.current.setDisplaySaveInputPopup(true));
      expect(view.result.current.displaySaveInputPopup).toBe(true);
      act(() => vi.advanceTimersByTime(3900));
      expect(view.result.current.displaySaveInputPopup).toBe(true);
      act(() => vi.advanceTimersByTime(200));
      expect(view.result.current.displaySaveInputPopup).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("useModuleForm lists on All", () => {
  const data = { boltDiameterList: ["12", "16"], propertyClassList: [{ value: "8.8" }, { Grade: "10.9" }], thicknessList: [8, 10] };

  it("fills an empty list that is on All with the whole option list once the lists arrive", () => {
    const view = setup(finPlate, {});
    expect(view.result.current.inputs.bolt_diameter).toEqual([]);
    view.rerender({ cfg: finPlate, data });
    expect(view.result.current.inputs.bolt_diameter).toEqual(["12", "16"]);
    // an object option is read by its value or grade, anything else as text
    expect(view.result.current.inputs.bolt_grade).toEqual(["8.8", "10.9"]);
    expect(view.result.current.inputs.plate_thickness).toEqual(["8", "10"]);
  });

  it("does not fill an empty All of the plate girder stiffener thickness lists", () => {
    const girder = caseOf("plate girder");
    const view = setup(girder, {});
    view.rerender({ cfg: girder, data });
    expect(view.result.current.inputs.intermediate_stiffener_thickness_val).toEqual([]);
    expect(view.result.current.inputs.longitudinal_stiffener_thickness_val).toEqual([]);
  });

  it("leaves a list the user picked alone, and one that is no longer on All", () => {
    const view = setup(finPlate, {});
    act(() => result(view).updateSelectedItems("bolt_diameter", ["20"]));
    act(() => result(view).toggleAllSelected("bolt_grade", false));
    view.rerender({ cfg: finPlate, data });
    expect(view.result.current.inputs.bolt_diameter).toEqual(["20"]);
    expect(view.result.current.inputs.bolt_grade).toEqual([]);
    expect(view.result.current.inputs.plate_thickness).toEqual(["8", "10"]);
  });
});

describe("useModuleForm prefill from a file", () => {
  const dictionary = {
    Module: finPlate.designType,
    Connectivity: "Column Web-Beam Web",
    Material: GRADE,
    "Load.Shear": "123",
    "Bolt.Diameter": ["12"],
  };
  const key = `prefill:${finPlate.designType}`;

  it("reads the file the session holds once the option lists have loaded, and takes it from the session", () => {
    sessionStorage.setItem(key, JSON.stringify(dictionary));
    const view = setup(finPlate, { loadingOptions: false, ...LISTS });
    expect(view.result.current.inputs).toMatchObject({ material: GRADE, load_shear: "123" });
    expect(view.result.current.inputs.bolt_diameter).toEqual(["12"]);
    expect(view.result.current.inputs.connectivity).toBe("Column Web-Beam Web");
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it("waits while the option lists are loading", () => {
    sessionStorage.setItem(key, JSON.stringify(dictionary));
    const view = setup(finPlate, { loadingOptions: true });
    expect(view.result.current.inputs).toBe(finPlate.defaultInputs);
    expect(sessionStorage.getItem(key)).not.toBeNull();

    view.rerender({ cfg: finPlate, data: { loadingOptions: false, ...LISTS } });
    expect(view.result.current.inputs.material).toBe(GRADE);
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it("does nothing when the session holds no file for the module", () => {
    sessionStorage.setItem("prefill:Some Other Module", JSON.stringify(dictionary));
    const view = setup(finPlate, { loadingOptions: false });
    expect(view.result.current.inputs).toBe(finPlate.defaultInputs);
  });

  it("survives a file it cannot parse", () => {
    sessionStorage.setItem(key, "{not json");
    const view = setup(finPlate, { loadingOptions: false });
    expect(view.result.current.inputs).toBe(finPlate.defaultInputs);
  });
});

describe("useModuleForm reset", () => {
  it("sets every piece of state back to the config's, the saved Additional Inputs with it", () => {
    const view = withSavedPrefs();
    const form = () => view.result.current;
    act(() => {
      form().setInputs((prev) => ({ ...prev, load_shear: "5" }));
      form().setExtraState({ selectedProfile: "Channels" });
      form().updateSelectionState("boltDiameterSelect", "Customized");
      form().updateSelectedItems("bolt_diameter", ["20"]);
      form().toggleAllSelected("bolt_diameter", false);
      form().updateModalState(finPlate.modalConfig[0].key, true);
      form().setDesignPrefModalStatus(true);
      form().setConfirmationModal(true);
      form().setDisplaySaveInputPopup(true);
      form().setSaveInputFileName("my design");
    });
    expect(form().designPrefOverrides).toEqual(saved);

    act(() => form().resetFormState());

    expect(form().inputs).toBe(finPlate.defaultInputs);
    expect(form().extraState).toEqual({});
    expect(form().selectionStates.boltDiameterSelect).toBe("All");
    expect(form().selectedItems.bolt_diameter).toEqual([]);
    expect(form().allSelected.bolt_diameter).toBe(true);
    expect(Object.values(form().modalStates).every((open) => !open)).toBe(true);
    expect(form().designPrefModalStatus).toBe(false);
    expect(form().confirmationModal).toBe(false);
    expect(form().displaySaveInputPopup).toBe(false);
    expect(form().saveInputFileName).toBe("");
    expect(form().designPrefOverrides).toEqual({});
  });
});

describe("useModuleForm dock driver change", () => {
  it("knows the Additional Input rows it is going to clear", () => {
    expect(isAdditionalInput(finPlate, "supporting_material")).toBe(true);
    expect(isAdditionalInput(finPlate, "material")).toBe(false);
    expect(prefClearingFields(finPlate)).toEqual(["material"]);
  });

  it("does not clear anything on the first render", () => {
    const view = setup();
    expect(view.result.current.inputs).toBe(finPlate.defaultInputs);
    expect(view.result.current.designPrefOverrides).toEqual({});
  });

  it("clears every saved Additional Input, in the overrides and in the inputs, when the user edits the dock Material", () => {
    const view = withSavedPrefs();
    expect(view.result.current.inputs.supporting_material).toBe(saved.supporting_material);

    act(() => view.result.current.setInputs((prev) => ({ ...prev, material: GRADE })));

    expect(view.result.current.designPrefOverrides).toEqual({});
    expect(view.result.current.inputs.supporting_material).toBeUndefined();
    expect(view.result.current.inputs.supported_material).toBeUndefined();
    // what the user typed in the dock stays
    expect(view.result.current.inputs.material).toBe(GRADE);
    expect(view.result.current.inputs.load_shear).toBe(finPlate.defaultInputs.load_shear);
  });

  it("keeps the overrides that are not Additional Inputs", () => {
    const view = setup();
    act(() => {
      view.result.current.setDesignPrefOverrides({ ...saved, load_axial: "11" });
      view.result.current.setInputs((prev) => ({ ...prev, ...saved }));
    });
    act(() => view.result.current.setInputs((prev) => ({ ...prev, material: GRADE })));
    expect(view.result.current.designPrefOverrides).toEqual({ load_axial: "11" });
  });

  it("does not clear when the user edits a dock field that is not the driver", () => {
    const view = withSavedPrefs();
    act(() => view.result.current.setInputs((prev) => ({ ...prev, load_shear: "300" })));
    expect(view.result.current.designPrefOverrides).toEqual(saved);
    expect(view.result.current.inputs.supporting_material).toBe(saved.supporting_material);
  });

  it("keeps what a load brings when the load also moves the dock Material (one commit, new overrides)", () => {
    const view = withSavedPrefs();
    const loaded = { supporting_material: "E 410W (Fe 540 W)A" };
    act(() => {
      view.result.current.setDesignPrefOverrides(loaded);
      view.result.current.setInputs({ ...finPlate.defaultInputs, material: GRADE, ...loaded });
    });
    expect(view.result.current.designPrefOverrides).toEqual(loaded);
    expect(view.result.current.inputs).toMatchObject({ material: GRADE, ...loaded });
  });

  it("clears again on the user's edit that follows a load", () => {
    const view = withSavedPrefs();
    const loaded = { supporting_material: "E 410W (Fe 540 W)A" };
    act(() => {
      view.result.current.setDesignPrefOverrides(loaded);
      view.result.current.setInputs({ ...finPlate.defaultInputs, material: GRADE, ...loaded });
    });
    act(() => view.result.current.setInputs((prev) => ({ ...prev, material: "E 165 (Fe 290)" })));
    expect(view.result.current.designPrefOverrides).toEqual({});
    expect(view.result.current.inputs.supporting_material).toBeUndefined();
  });

  it("keeps the saved rows of a file read from the session whose Material differs from the form's", () => {
    sessionStorage.setItem(
      `prefill:${finPlate.designType}`,
      JSON.stringify({ Module: finPlate.designType, Material: GRADE, "Connector.Material": "E 410W (Fe 540 W)A", "Detailing.Gap": "12" }),
    );
    const view = setup(finPlate, { loadingOptions: false, ...LISTS });
    expect(view.result.current.inputs.material).toBe(GRADE);
    expect(view.result.current.inputs).toMatchObject({ connector_material: "E 410W (Fe 540 W)A", detailing_gap: "12" });
  });

  describe("a module with two dock drivers (base plate: Material and the anchor bolt type)", () => {
    const rows = { [KEY_BASE_PLATE_MATERIAL]: "E 300 (Fe 440)", supporting_material: "E 300 (Fe 440)" };

    it("names both fields", () => {
      expect(prefClearingFields(basePlate)).toEqual(["material", "anchor_type"]);
    });

    it("clears on an edit of either of them", () => {
      for (const [field, value] of [["material", GRADE], ["anchor_type", "End Plate Type"]]) {
        const view = withSavedPrefs(basePlate, rows);
        expect(view.result.current.designPrefOverrides).toEqual(rows);
        const other = value === basePlate.defaultInputs[field] ? "Another Type" : value;
        act(() => view.result.current.setInputs((prev) => ({ ...prev, [field]: other })));
        expect(view.result.current.designPrefOverrides).toEqual({});
        expect(view.result.current.inputs[KEY_BASE_PLATE_MATERIAL]).toBeUndefined();
      }
    });

    it("keeps the saved rows when a load moves the anchor bolt type", () => {
      const view = withSavedPrefs(basePlate, rows);
      const loaded = { [KEY_BASE_PLATE_MATERIAL]: "E 410W (Fe 540 W)A" };
      act(() => {
        view.result.current.setDesignPrefOverrides(loaded);
        view.result.current.setInputs({ ...basePlate.defaultInputs, anchor_type: "Another Type", ...loaded });
      });
      expect(view.result.current.designPrefOverrides).toEqual(loaded);
    });
  });

  describe("a module whose dock does not feed the Additional Inputs (the butt and lap joints)", () => {
    it("has no clearing field, and an edit of its Material clears nothing", () => {
      expect(prefClearingFields(lapJoint)).toEqual([]);
      const view = withSavedPrefs(lapJoint, { supporting_material: "E 300 (Fe 440)" });
      act(() => view.result.current.setInputs((prev) => ({ ...prev, material: GRADE })));
      expect(view.result.current.designPrefOverrides).toEqual({ supporting_material: "E 300 (Fe 440)" });
      expect(view.result.current.inputs.supporting_material).toBe("E 300 (Fe 440)");
    });
  });
});
