// @vitest-environment jsdom
/**
 * The Additional Inputs tabs that show a section or a material: the Column / Beam Section tabs
 * (`GenericSectionView`), the Connector tab and the Base Plate tab. What each lists, what a change writes
 * back and tells the module context, what a new answer from the server does to what is on screen, and
 * what a guest or a locked dialog may do.
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../utils/apiClient", () => ({ apiClient: vi.fn(), subscribeToTask: vi.fn() }));
vi.mock("../utils/auth", () => ({ isGuestUser: () => true }));
vi.mock("../modules/shared/components/CustomMaterialModal", () => ({
  default: ({ type, showModal }) => (showModal ? <div data-testid="custom-material">custom material for {type}</div> : null),
}));

import { ModuleContext } from "../context/ModuleState";
import { KEY_BASE_PLATE_MATERIAL } from "../constants/generated/coreKeys";
import BasePlateSectionModal from "../modules/shared/components/BasePlateSectionModal";
import ConnectorSectionModal from "../modules/shared/components/ConnectorSectionModal";
import GenericSectionView from "../modules/shared/components/GenericSectionView";
import { BEAM_DISPLAY_CONFIG, COLUMN_DISPLAY_CONFIG } from "../modules/shared/config/sectionDisplayConfig";
import { InPlace, isSelectDisabled, optionsOf, pick, prefsNow, row, shownIn, textInputOf } from "./componentHarness";

const GRADE = "E 165 (Fe 290)";
const OTHER_GRADE = "E 350 (Fe 490)";
const MATERIALS = [
  { id: 1, Grade: GRADE },
  { id: 2, Grade: OTHER_GRADE },
];
const material = (fu, fy) => ({ Ultimate_Tensile_Stress: fu, Yield_Stress_greater_than_40: fy });
const texts = (options) => options.map((option) => option.text);

/** Holds designPrefInputs like the dialog and renders `children(designPrefInputs, setDesignPrefInputs)`. */
function PrefHost({ initial, context, children }) {
  const [designPrefInputs, setDesignPrefInputs] = useState(initial);
  return (
    <InPlace>
      <ModuleContext.Provider value={context}>
        {children(designPrefInputs, setDesignPrefInputs)}
        <output data-testid="prefs">{JSON.stringify(designPrefInputs)}</output>
      </ModuleContext.Provider>
    </InPlace>
  );
}

const contextValue = (extra = {}) => ({
  manageDesignPreferences: vi.fn(),
  conn_material_details: [],
  supporting_material_details: [],
  supported_material_details: [],
  ...extra,
});

describe("Column Section tab", () => {
  const baseProps = {
    sectionType: "supporting",
    sectionTableName: "Columns",
    displayConfig: COLUMN_DISPLAY_CONFIG,
    inputs: { column_section: "HB 150" },
    materialList: MATERIALS,
    moduleLists: { columnList: ["HB 150", "UC 305 x 305 x 118"], beamList: [] },
    isGuest: false,
    isInputLocked: false,
    onClearSection: vi.fn(),
    onDesignationChange: vi.fn(),
    onRefetchModuleOptions: vi.fn(),
    suppressInitialMaterialDispatch: true,
  };

  function show(props = {}, { prefs = { supporting_material: GRADE }, context = contextValue() } = {}) {
    const merged = { ...baseProps, onClearSection: vi.fn(), onDesignationChange: vi.fn(), ...props };
    const tree = (next) => (
      <PrefHost initial={prefs} context={context}>
        {(designPrefInputs, setDesignPrefInputs) => (
          <GenericSectionView {...merged} {...next} designPrefInputs={designPrefInputs} setDesignPrefInputs={setDesignPrefInputs} />
        )}
      </PrefHost>
    );
    const view = render(tree({}));
    return { ...view, props: merged, context, update: (next) => view.rerender(tree(next)) };
  }

  it("shows the designation the form holds, and offers the module's column list", () => {
    show();
    expect(shownIn("Designation")).toBe("HB 150");
    expect(texts(optionsOf("Designation"))).toEqual(["HB 150", "UC 305 x 305 x 118"]);
  });

  it("tells the dialog when another designation is picked", () => {
    const { props } = show();
    pick("Designation", "UC 305 x 305 x 118");
    expect(props.onDesignationChange).toHaveBeenCalledWith("UC 305 x 305 x 118");
    expect(shownIn("Designation")).toBe("UC 305 x 305 x 118");
  });

  it("shows the dimensions and properties of the section the server answered with", () => {
    show({ sectionData: { D: 150, B: 150, Mass: 30.6 } });
    expect(textInputOf("Depth, D").value).toBe("150");
    expect(textInputOf("Flange Width, B").value).toBe("150");
    expect(textInputOf("Mass, M").value).toBe("30.6");
  });

  it("replaces the values when the server answers with another section", () => {
    const { update } = show({ sectionData: { D: 150, B: 150, Mass: 30.6 } });
    update({ sectionData: { D: 305, B: 305, Mass: 118.4 } });
    expect(textInputOf("Depth, D").value).toBe("305");
    expect(textInputOf("Mass, M").value).toBe("118.4");
    update({ sectionData: {} });
    expect(textInputOf("Depth, D").value).toBe("");
  });

  it("lists the grades it is given and shows the one the dialog holds", () => {
    show();
    expect(shownIn("Material")).toBe(GRADE);
    expect(texts(optionsOf("Material"))).toEqual([GRADE, OTHER_GRADE]);
  });

  it("writes another grade to its own material row and tells the context which grade it is", () => {
    const { context } = show();
    pick("Material", OTHER_GRADE);
    expect(prefsNow()).toEqual({ supporting_material: OTHER_GRADE });
    expect(context.manageDesignPreferences).toHaveBeenCalledWith("material_update", {
      materialType: "supporting",
      materialData: MATERIALS[1],
    });
  });

  it("shows the strengths the context holds for the grade, not a value of its own", () => {
    const context = contextValue({ supporting_material_details: [material(490, 330)] });
    show({}, { context });
    expect(textInputOf("Ultimate Strength").value).toBe("490");
    expect(textInputOf("Yield Strength").value).toBe("330");
  });

  it("keeps the supported tab's own material row apart", () => {
    show(
      { sectionType: "supported", displayConfig: BEAM_DISPLAY_CONFIG, sectionTableName: "Beams", inputs: { beam_section: "MB 300" }, moduleLists: { beamList: ["MB 300"] } },
      { prefs: { supported_material: GRADE, supporting_material: GRADE }, context: contextValue({ supported_material_details: [material(410, 250)] }) },
    );
    pick("Material", OTHER_GRADE);
    expect(prefsNow()).toEqual({ supported_material: OTHER_GRADE, supporting_material: GRADE });
    expect(textInputOf("Ultimate Strength").value).toBe("410");
  });

  it("tells the context about the grade it starts with, unless the dialog has not synced yet", () => {
    const { context, unmount } = show({ suppressInitialMaterialDispatch: false });
    expect(context.manageDesignPreferences).toHaveBeenCalledWith("material_update", { materialType: "supporting", materialData: MATERIALS[0] });
    unmount();
    const quiet = show({ suppressInitialMaterialDispatch: true });
    expect(quiet.context.manageDesignPreferences).not.toHaveBeenCalled();
  });

  it("shows a default designation without choosing it, and only after the first sync", () => {
    const { props, update } = show({ inputs: {}, syncReady: false });
    expect(props.onDesignationChange).not.toHaveBeenCalled();
    update({ syncReady: true });
    expect(props.onDesignationChange).toHaveBeenCalledTimes(1);
    expect(props.onDesignationChange).toHaveBeenCalledWith("HB 150", { preview: true });
    expect(shownIn("Designation")).toBe("HB 150");
  });

  it("Clear empties the tab and takes the grade of the dock back", () => {
    const { props } = show({ inputs: { column_section: "HB 150", supporting_material: OTHER_GRADE } });
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(props.onClearSection).toHaveBeenCalledTimes(1);
    expect(prefsNow().supporting_material).toBe(OTHER_GRADE);
  });

  it("lets a signed-in user add a designation, and not a guest", () => {
    const { unmount } = show({ isGuest: false });
    expect(screen.getByRole("button", { name: "Add" }).disabled).toBe(false);
    expect(screen.queryByText(/Sign in to add new designations/)).toBeNull();
    unmount();
    show({ isGuest: true });
    expect(screen.getByRole("button", { name: "Add" }).disabled).toBe(true);
    expect(screen.getByText(/Sign in to add new designations/)).toBeTruthy();
    expect(screen.getByPlaceholderText("Sign in to add a new designation").disabled).toBe(true);
  });

  it("is read-only when the dialog is locked", () => {
    show({ isInputLocked: true });
    expect(row("Designation").querySelector("input").disabled).toBe(true);
    expect(isSelectDisabled("Material")).toBe(true);
    expect(screen.getByRole("button", { name: "Add" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Clear" }).disabled).toBe(true);
    expect(within(row("Designation")).queryByRole("combobox")).toBeNull();
  });
});

describe("Connector tab", () => {
  function show({ prefs = { connector_material: GRADE }, locked = false, context = contextValue(), suppress = true, list = MATERIALS } = {}) {
    const view = render(
      <PrefHost initial={prefs} context={context}>
        {(designPrefInputs, setDesignPrefInputs) => (
          <ConnectorSectionModal
            designPrefInputs={designPrefInputs}
            setDesignPrefInputs={setDesignPrefInputs}
            isInputLocked={locked}
            materialList={list}
            suppressInitialMaterialDispatch={suppress}
          />
        )}
      </PrefHost>,
    );
    return { ...view, context };
  }

  it("lists the grades and shows the connector's", () => {
    show();
    expect(shownIn("Material")).toBe(GRADE);
    expect(texts(optionsOf("Material"))).toEqual([GRADE, OTHER_GRADE]);
  });

  it("writes the grade to the connector row and tells the context", () => {
    const { context } = show();
    pick("Material", OTHER_GRADE);
    expect(prefsNow()).toEqual({ connector_material: OTHER_GRADE });
    expect(context.manageDesignPreferences).toHaveBeenCalledWith("material_update", {
      materialType: "connector",
      materialData: MATERIALS[1],
    });
  });

  it("shows the strengths of the grade from the context, and zeros while it has none", () => {
    const { unmount } = show();
    expect(textInputOf("Ultimate Strength").value).toBe("0");
    unmount();
    show({
      context: contextValue({
        conn_material_details: [{ Ultimate_Tensile_Stress: 490, Yield_Stress_less_than_20: 350, Yield_Stress_between_20_and_neg40: 340, Yield_Stress_greater_than_40: 330 }],
      }),
    });
    expect(textInputOf("Ultimate Strength").value).toBe("490");
    expect(textInputOf("Yield Strength, Fy (Mpa) (0-20mm)").value).toBe("350");
    expect(textInputOf("Yield Strength, Fy (Mpa) (20-40mm)").value).toBe("340");
    expect(textInputOf("Yield Strength, Fy (Mpa) (>40mm)").value).toBe("330");
  });

  it("tells the context about its grade when it opens, unless told not to", () => {
    expect(show({ suppress: false }).context.manageDesignPreferences).toHaveBeenCalledWith("material_update", {
      materialType: "connector",
      materialData: MATERIALS[0],
    });
    expect(show({ suppress: true }).context.manageDesignPreferences).not.toHaveBeenCalled();
  });

  it("cannot be changed when locked", () => {
    show({ locked: true });
    expect(isSelectDisabled("Material")).toBe(true);
    expect(optionsOf("Material")).toEqual([]);
  });
});

describe("Base Plate tab", () => {
  function show({ prefs = {}, locked = false, context = contextValue() } = {}) {
    render(
      <PrefHost initial={prefs} context={context}>
        {(designPrefInputs, setDesignPrefInputs) => (
          <BasePlateSectionModal
            designPrefInputs={designPrefInputs}
            setDesignPrefInputs={setDesignPrefInputs}
            isInputLocked={locked}
            materialList={MATERIALS}
            suppressInitialMaterialDispatch
          />
        )}
      </PrefHost>,
    );
    return context;
  }

  it("shows the base plate's own grade, else the supporting section's", () => {
    show({ prefs: { supporting_material: GRADE, [KEY_BASE_PLATE_MATERIAL]: OTHER_GRADE } });
    expect(shownIn("Material")).toBe(OTHER_GRADE);
  });

  it("falls back to the supporting grade", () => {
    show({ prefs: { supporting_material: GRADE } });
    expect(shownIn("Material")).toBe(GRADE);
  });

  it("writes the grade under the base plate's key and keeps the section's", () => {
    show({ prefs: { supporting_material: GRADE } });
    pick("Material", OTHER_GRADE);
    expect(prefsNow()).toEqual({ supporting_material: GRADE, [KEY_BASE_PLATE_MATERIAL]: OTHER_GRADE });
  });

  it("cannot be changed when locked", () => {
    show({ prefs: { supporting_material: GRADE }, locked: true });
    expect(isSelectDisabled("Material")).toBe(true);
  });
});
