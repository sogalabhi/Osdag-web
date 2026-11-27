// @vitest-environment jsdom
/**
 * `InputSection`: one titled box of the input dock, built from a config's `section` (fields with a type, a
 * key and a list). Rendering from a config, what a change writes to the inputs, the "All" / "Customized"
 * lists, dependent fields (`conditionalDisplay`, the first option taking the place of a value the list no
 * longer has), locked and disabled fields, and the dialogs it opens. Then every section of every module
 * renders, and each plain dropdown offers the list its config names.
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useCallback, useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../modules/shared/components/CustomMaterialModal", () => ({
  default: ({ type, showModal }) => (showModal ? <div data-testid="custom-material">custom material for {type}</div> : null),
}));

import { ModuleContext } from "../context/ModuleState";
import { InputSection } from "../modules/shared/components/InputSection";
import { MODULES } from "./cases";
import { LISTS, caseState } from "./cases/shared";

const BOLT_SIZES = ["12", "16", "20"];
const BEAMS = ["MB 300", "JB 200"];
const GRADES = [
  { id: 1, Grade: "E 250 (Fe 410 W)A" },
  { id: 2, Grade: "E 165 (Fe 290)" },
  { id: -1, Grade: "Custom" },
];
const DATA = { boltDiameterList: BOLT_SIZES, beamList: BEAMS, materialList: GRADES, connectivityList: ["Column Flange-Beam Web", "Beam-Beam"] };
const NO_LISTS = {};

const customizable = { key: "bolt_diameter", label: "Diameter", type: "customizable", selectionKey: "diameterSelect", modalKey: "diameterModal", dataSource: "boltDiameterList" };

/** Holds the form state the way the module does and shows it, and records the callbacks the section is given. */
function Host({ section, inputs: initialInputs = {}, contextData = DATA, extra = {}, selection = {}, locked = false, spies, context = {} }) {
  const [inputs, setInputsState] = useState(initialInputs);
  const [extraState, setExtraState] = useState(extra);
  const [selectionStates, setSelectionStates] = useState(selection);
  const setInputs = useCallback((next) => setInputsState((prev) => (typeof next === "function" ? next(prev) : next)), []);
  const setExtra = useCallback((next) => setExtraState((prev) => (typeof next === "function" ? next(prev) : next)), []);
  const updateSelectionState = useCallback(
    (key, value) => {
      spies.updateSelectionState(key, value);
      setSelectionStates((prev) => ({ ...prev, [key]: value }));
    },
    [spies],
  );
  return (
    <ModuleContext.Provider value={{ materialList: [], ...context }}>
      <InputSection
        section={section}
        inputs={inputs}
        setInputs={setInputs}
        isInputLocked={locked}
        selectionStates={selectionStates}
        updateSelectionState={updateSelectionState}
        updateModalState={spies.updateModalState}
        toggleAllSelected={spies.toggleAllSelected}
        contextData={contextData}
        extraState={extraState}
        setExtraState={setExtra}
        updateSelectedItems={spies.updateSelectedItems}
        setModalDynamicSrc={spies.setModalDynamicSrc}
        onRefetchModuleOptions={spies.onRefetchModuleOptions}
      />
      <output data-testid="inputs">{JSON.stringify(inputs)}</output>
      <output data-testid="extra">{JSON.stringify(extraState)}</output>
    </ModuleContext.Provider>
  );
}

const makeSpies = () => ({
  updateSelectionState: vi.fn(),
  updateModalState: vi.fn(),
  toggleAllSelected: vi.fn(),
  updateSelectedItems: vi.fn(),
  setModalDynamicSrc: vi.fn(),
  onRefetchModuleOptions: vi.fn(),
});

function show(fields, props = {}) {
  const spies = makeSpies();
  const section = { title: "Test section", fields };
  const view = render(<Host section={section} spies={spies} {...props} />);
  return { ...view, spies, section };
}

const inputsNow = () => JSON.parse(screen.getByTestId("inputs").textContent);
const extraNow = () => JSON.parse(screen.getByTestId("extra").textContent);

const label = (text) => screen.getAllByRole("heading", { level: 4 }).find((h) => h.textContent.replace(/\s*\*$/, "") === text);
const rowOf = (text) => {
  const heading = label(text);
  if (!heading) throw new Error(`no field labelled "${text}"`);
  return heading.parentElement;
};
const controlOf = (text) => rowOf(text).querySelector(".react-select__control");
const shown = (text) => {
  const row = rowOf(text);
  const single = row.querySelector(".react-select__single-value");
  if (single) return single.textContent;
  return [...row.querySelectorAll(".react-select__multi-value__label")].map((element) => element.textContent);
};
const isDisabled = (text) => controlOf(text).classList.contains("react-select__control--is-disabled");
const menuOptions = () => [...document.body.querySelectorAll(".react-select__option")].map((option) => option.textContent);

/** Opens a dropdown and lists its options; the menu is closed again so the next one can be read alone. */
function optionsOf(text) {
  fireEvent.mouseDown(controlOf(text).querySelector("input") ?? controlOf(text));
  const options = menuOptions();
  fireEvent.keyDown(controlOf(text), { key: "Escape" });
  return options;
}

function pick(text, option) {
  fireEvent.mouseDown(controlOf(text).querySelector("input") ?? controlOf(text));
  const element = [...document.body.querySelectorAll(".react-select__option")].find((candidate) => candidate.textContent === option);
  if (!element) throw new Error(`"${text}" has no option "${option}": ${JSON.stringify(menuOptions())}`);
  fireEvent.click(element);
}

describe("rendering from a config", () => {
  it("shows the title, one row per field, and a star on the required ones", () => {
    show(
      [
        { key: "load_shear", label: "Shear Force", type: "number" },
        { key: "load_axial", label: "Axial Force", type: "number", required: false },
        { key: "column_section", label: "Column Section", type: "select", options: "beamList" },
      ],
      { inputs: { column_section: "MB 300" } },
    );
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Test section");
    expect(screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual([
      "Shear Force *",
      "Axial Force",
      "Column Section *",
    ]);
  });

  it("does not star a label that already has the mark", () => {
    show([{ key: "load_shear", label: "Shear Force *", type: "number" }]);
    expect(screen.getByRole("heading", { level: 4 }).textContent).toBe("Shear Force *");
  });

  it("hides the row of a field whose conditionalDisplay says no, and shows it when the state changes", () => {
    const fields = [
      { key: "primary_beam", label: "Primary Beam", type: "number", conditionalDisplay: (extra) => extra?.selectedOption === "Beam-Beam" },
      { key: "load_shear", label: "Shear Force", type: "number" },
    ];
    const { unmount } = show(fields, { extra: { selectedOption: "Column Flange-Beam Web" } });
    expect(label("Primary Beam")).toBeUndefined();
    expect(label("Shear Force")).toBeTruthy();
    unmount();
    show(fields, { extra: { selectedOption: "Beam-Beam" } });
    expect(label("Primary Beam")).toBeTruthy();
  });

  it("shows an image field only when its conditionalDisplay allows", () => {
    const image = (visible) => ({ key: "pic", label: "Picture", type: "image", conditionalDisplay: () => visible, imageSource: () => "pic.png" });
    const { unmount } = show([image(true)]);
    expect(screen.getByAltText("Connection type").getAttribute("src")).toBe("pic.png");
    unmount();
    show([image(false)]);
    expect(screen.queryByAltText("Connection type")).toBeNull();
  });
});

describe("a dropdown", () => {
  const field = { key: "column_section", label: "Column Section", type: "select", options: "beamList" };

  it("offers the list its config names, and shows the value it holds", () => {
    show([field], { inputs: { column_section: "JB 200" } });
    expect(shown("Column Section")).toBe("JB 200");
    expect(optionsOf("Column Section")).toEqual(BEAMS);
  });

  it("offers a fixed list of { value, label } as it is", () => {
    show([{ key: "bolt_type", label: "Type", type: "select", options: [{ value: "Bearing_Bolt", label: "Bearing Bolt" }, { value: "Friction_Grip_Bolt", label: "Friction Grip Bolt" }] }], {
      inputs: { bolt_type: "Friction_Grip_Bolt" },
    });
    expect(shown("Type")).toBe("Friction Grip Bolt");
    expect(optionsOf("Type")).toEqual(["Bearing Bolt", "Friction Grip Bolt"]);
  });

  it("takes its list from a function of the form state", () => {
    const getOptions = (inputs) => (inputs.profile === "Channels" ? ["MC 100"] : ["ISA 50"]);
    show([{ key: "section", label: "Section", type: "select", getOptions }], { inputs: { section: "MC 100", profile: "Channels" } });
    expect(optionsOf("Section")).toEqual(["MC 100"]);
  });

  it("lists the grades of the material list by their name", () => {
    show([{ key: "material", label: "Material", type: "select", options: "materialList" }], { inputs: { material: "E 165 (Fe 290)" } });
    expect(optionsOf("Material")).toEqual(GRADES.map((grade) => grade.Grade));
  });

  it("writes the choice to the inputs and keeps the other values", () => {
    show([field], { inputs: { column_section: "MB 300", load_shear: "70" } });
    pick("Column Section", "JB 200");
    expect(inputsNow()).toEqual({ column_section: "JB 200", load_shear: "70" });
    expect(shown("Column Section")).toBe("JB 200");
  });

  it("shows a value that differs from an option only in case and spacing, without changing it", () => {
    show([field], { inputs: { column_section: "mb300" } });
    expect(shown("Column Section")).toBe("MB 300");
    expect(inputsNow()).toEqual({ column_section: "mb300" });
  });

  it("puts the first option in place of a value the list does not have", () => {
    show([field], { inputs: { column_section: "XX 999" } });
    expect(inputsNow().column_section).toBe("MB 300");
    expect(shown("Column Section")).toBe("MB 300");
  });

  it("fills an empty field with the first option", () => {
    show([field], { inputs: {} });
    expect(inputsNow().column_section).toBe("MB 300");
  });

  it("follows a list that arrives later", () => {
    const spies = makeSpies();
    const section = { title: "S", fields: [field] };
    const view = render(<Host section={section} spies={spies} contextData={NO_LISTS} inputs={{ column_section: "" }} />);
    expect(inputsNow().column_section).toBe("");
    expect(screen.getByText("No data available")).toBeTruthy();
    view.rerender(<Host section={section} spies={spies} contextData={DATA} inputs={{ column_section: "" }} />);
    expect(inputsNow().column_section).toBe("MB 300");
  });

  it("says there is no data, and leaves the value alone, when the list is empty", () => {
    show([field], { contextData: NO_LISTS, inputs: { column_section: "MB 300" } });
    expect(screen.getByText("No data available")).toBeTruthy();
    expect(isDisabled("Column Section")).toBe(true);
    expect(inputsNow()).toEqual({ column_section: "MB 300" });
  });

  it("cannot be changed when the form is locked", () => {
    show([field], { locked: true, inputs: { column_section: "MB 300" } });
    expect(isDisabled("Column Section")).toBe(true);
    fireEvent.mouseDown(controlOf("Column Section"));
    expect(menuOptions()).toEqual([]);
  });

  it("opens the custom material dialog for the Custom grade instead of choosing it", () => {
    show([{ key: "supported_material", label: "Supported Material", type: "select", options: "materialList" }], { inputs: { supported_material: "E 165 (Fe 290)" } });
    pick("Supported Material", "Custom");
    expect(screen.getByTestId("custom-material").textContent).toBe("custom material for supported");
    expect(inputsNow().supported_material).toBe("E 165 (Fe 290)");
  });

  it.each([
    ["material", "connector"],
    ["supporting_material", "supporting"],
    ["supported_material", "supported"],
  ])("opens the custom material dialog of %s for the %s material", (key, type) => {
    show([{ key, label: "Grade", type: "select", options: "materialList" }], { inputs: { [key]: "E 165 (Fe 290)" } });
    pick("Grade", "Custom");
    expect(screen.getByTestId("custom-material").textContent).toBe(`custom material for ${type}`);
  });

  it("prefers the material list of the module context to the one in the data", () => {
    const fromContext = [{ id: 7, Grade: "E 410 (Fe 540)" }, { id: -1, Grade: "Custom" }];
    show([{ key: "material", label: "Material", type: "select", options: "materialList" }], {
      inputs: { material: "E 410 (Fe 540)" },
      context: { materialList: fromContext },
    });
    expect(optionsOf("Material")).toEqual(["E 410 (Fe 540)", "Custom"]);
  });
});

describe("a number field", () => {
  const field = { key: "load_shear", label: "Shear Force", type: "number" };
  const input = () => within(rowOf("Shear Force")).getByRole("textbox");

  it("shows the value and suggests the label", () => {
    show([field], { inputs: { load_shear: "70" } });
    expect(input().value).toBe("70");
    const empty = show([field]);
    expect(within(rowOf("Shear Force")).getAllByRole("textbox")[0].placeholder).toBe("ex. Shear Force");
    empty.unmount();
  });

  it("keeps digits, one decimal point and a leading minus, and writes the result", () => {
    show([field], { inputs: { load_shear: "" } });
    fireEvent.change(input(), { target: { value: "1a2.3.4" } });
    expect(inputsNow().load_shear).toBe("12.34");
    fireEvent.change(input(), { target: { value: "-5-5" } });
    expect(inputsNow().load_shear).toBe("-55");
    fireEvent.change(input(), { target: { value: "55-" } });
    expect(inputsNow().load_shear).toBe("55");
  });

  it("blocks letters and spaces at the key, and lets digits, editing keys and shortcuts through", () => {
    show([field]);
    expect(fireEvent.keyDown(input(), { key: "e" })).toBe(false);
    expect(fireEvent.keyDown(input(), { key: " " })).toBe(false);
    expect(fireEvent.keyDown(input(), { key: "5" })).toBe(true);
    expect(fireEvent.keyDown(input(), { key: "Backspace" })).toBe(true);
    expect(fireEvent.keyDown(input(), { key: "c", ctrlKey: true })).toBe(true);
  });

  it("is disabled when the form is locked or the field says so", () => {
    const { unmount } = show([field], { locked: true });
    expect(input().disabled).toBe(true);
    unmount();
    show([{ ...field, disabled: true }]);
    expect(input().disabled).toBe(true);
  });

  it("takes letters in a plain text field", () => {
    show([{ key: "name", label: "Name", type: "text" }]);
    fireEvent.change(within(rowOf("Name")).getByRole("textbox"), { target: { value: "beam 1" } });
    expect(inputsNow().name).toBe("beam 1");
  });
});

describe("an All / Customized list", () => {
  it("starts on All", () => {
    show([customizable]);
    expect(shown("Diameter")).toBe("All");
    expect(optionsOf("Diameter")).toEqual(["All", "Customized"]);
  });

  it("Customized opens the list dialog with every value picked, and the inputs hold them all", () => {
    const { spies } = show([customizable], { inputs: { bolt_diameter: [] } });
    pick("Diameter", "Customized");
    expect(spies.updateSelectedItems).toHaveBeenCalledWith("bolt_diameter", BOLT_SIZES);
    expect(inputsNow().bolt_diameter).toEqual(BOLT_SIZES);
    expect(spies.updateSelectionState).toHaveBeenCalledWith("diameterSelect", "Customized");
    expect(spies.updateModalState).toHaveBeenCalledWith("diameterModal", true);
    expect(spies.toggleAllSelected).toHaveBeenCalledWith("bolt_diameter", false);
  });

  it("All puts every value in the inputs and closes the dialog", () => {
    const { spies } = show([customizable], { inputs: { bolt_diameter: ["16"] }, selection: { diameterSelect: "Customized" } });
    expect(shown("Diameter")).toBe("Customized");
    pick("Diameter", "All");
    expect(inputsNow().bolt_diameter).toEqual(BOLT_SIZES);
    expect(spies.updateSelectedItems).toHaveBeenCalledWith("bolt_diameter", []);
    expect(spies.updateSelectionState).toHaveBeenCalledWith("diameterSelect", "All");
    expect(spies.updateModalState).toHaveBeenCalledWith("diameterModal", false);
    expect(spies.toggleAllSelected).toHaveBeenCalledWith("bolt_diameter", true);
  });

  it("Customized on an already customized list keeps the user's picks", () => {
    const { spies } = show([customizable], { inputs: { bolt_diameter: ["16"] }, selection: { diameterSelect: "Customized" } });
    pick("Diameter", "Customized");
    expect(inputsNow().bolt_diameter).toEqual(["16"]);
    expect(spies.updateSelectedItems).not.toHaveBeenCalled();
    expect(spies.updateModalState).toHaveBeenCalledWith("diameterModal", true);
  });

  it("uses the list of a field's own data source, and a dynamic one when the field has it", () => {
    const dynamic = { ...customizable, getDynamicDataSource: () => ["8", "10"] };
    const { spies } = show([dynamic], { inputs: { bolt_diameter: [] } });
    pick("Diameter", "Customized");
    expect(inputsNow().bolt_diameter).toEqual(["8", "10"]);
    expect(spies.setModalDynamicSrc).toHaveBeenCalled();
  });

  it("is locked with the form", () => {
    show([customizable], { locked: true });
    expect(isDisabled("Diameter")).toBe(true);
  });

  it("shows a plain dropdown with a selection key as a locked All until it is customized", () => {
    const field = { key: "bolt_diameter", label: "Bolt", type: "select", options: "boltDiameterList", selectionKey: "diameterSelect" };
    const { unmount } = show([field], { inputs: { bolt_diameter: BOLT_SIZES } });
    expect(shown("Bolt")).toBe("All");
    expect(isDisabled("Bolt")).toBe(true);
    unmount();
    show([field], { inputs: { bolt_diameter: ["16"] }, selection: { diameterSelect: "Customized" } });
    expect(shown("Bolt")).toEqual(["16"]);
    pick("Bolt", "20");
    expect(inputsNow().bolt_diameter).toEqual(["16", "20"]);
  });
});

describe("a connectivity dropdown", () => {
  const field = { key: "connectivity", label: "Connectivity", type: "connectivitySelect" };

  it("starts on the first connectivity of the list and says so in the shared state", () => {
    show([field], { inputs: {} });
    expect(extraNow().selectedOption).toBe("Column Flange-Beam Web");
    expect(optionsOf("Connectivity")).toEqual(DATA.connectivityList);
  });

  it("keeps the connectivity the state already has", () => {
    show([field], { inputs: { connectivity: "Beam-Beam" }, extra: { selectedOption: "Beam-Beam" } });
    expect(extraNow().selectedOption).toBe("Beam-Beam");
    expect(shown("Connectivity")).toBe("Beam-Beam");
  });

  it("writes a choice to the inputs and the shared state, clears the output and calls the field's handler", () => {
    const onChange = vi.fn();
    show([{ ...field, onChange }], { inputs: { connectivity: "Column Flange-Beam Web", output: { done: true } }, extra: { selectedOption: "Column Flange-Beam Web" } });
    pick("Connectivity", "Beam-Beam");
    expect(inputsNow()).toEqual({ connectivity: "Beam-Beam", output: null });
    expect(extraNow().selectedOption).toBe("Beam-Beam");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toBe("Beam-Beam");
  });

  it("shows the picture of the connectivity", () => {
    show([field], { inputs: {}, extra: { selectedOption: "Beam-Beam" } });
    expect(screen.getByAltText("Connection type").getAttribute("src")).toBeTruthy();
  });
});

describe("an optimised dimension", () => {
  const field = { key: "total_depth", label: "Total Depth", type: "optimized_number" };

  it("is a plain number box for a customised design", () => {
    show([field], { inputs: { design_type: "Customized", total_depth: "800" } });
    expect(within(rowOf("Total Depth")).getByRole("textbox").value).toBe("800");
  });

  it("asks for bounds for an optimised design, and shows them once set", () => {
    show([field], { inputs: { design_type: "Optimized" } });
    const open = within(rowOf("Total Depth")).getByRole("button", { name: "Set Bounds" });
    fireEvent.click(open);
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByPlaceholderText("Lower Bound (mm)"), { target: { value: "300x" } });
    fireEvent.change(dialog.getByPlaceholderText("Upper Bound (mm)"), { target: { value: "900" } });
    fireEvent.change(dialog.getByPlaceholderText("Increment (mm)"), { target: { value: "50" } });
    expect(inputsNow()).toMatchObject({ total_depth_lb: "300", total_depth_ub: "900", total_depth_inc: "50" });
    fireEvent.click(dialog.getByRole("button", { name: "Done" }));
    expect(within(rowOf("Total Depth")).getByRole("button").textContent).toBe("Bounds: 300 - 900");
  });

  it("cannot be opened when the form is locked", () => {
    show([field], { inputs: { design_type: "Optimized" }, locked: true });
    expect(within(rowOf("Total Depth")).getByRole("button", { name: "Set Bounds" }).disabled).toBe(true);
  });
});

describe("a field whose type depends on the form", () => {
  it("is a number box or a list depending on the design type", () => {
    const field = {
      key: "total_depth",
      label: "Total Depth",
      type: "number",
      conditionalType: (inputs) => (inputs.design_type === "Customized" ? "customizable" : "number"),
      selectionKey: "depthSelect",
      modalKey: "depthModal",
      dataSource: "boltDiameterList",
    };
    const { unmount } = show([field], { inputs: { design_type: "Optimized" } });
    expect(within(rowOf("Total Depth")).getByRole("textbox")).toBeTruthy();
    unmount();
    show([field], { inputs: { design_type: "Customized" } });
    expect(shown("Total Depth")).toBe("All");
  });
});

describe("every section of every module", () => {
  const sections = MODULES.flatMap(({ name, config }) =>
    config.inputSections.map((section, index) => [`${name} / ${index} ${section.title}`, name, section]),
  );

  it("covers every module", () => {
    expect(new Set(sections.map(([, name]) => name)).size).toBe(MODULES.length);
  });

  it.each(sections)("%s renders with its fields, and its plain dropdowns offer the list they name", async (_title, name, section) => {
    const module = MODULES.find((candidate) => candidate.name === name);
    const { inputs, extraState } = caseState(module, "all", module.connectivities?.[0] ?? null);
    const spies = makeSpies();
    render(<Host section={section} spies={spies} contextData={LISTS} inputs={inputs} extra={extraState} />);
    await act(async () => {});
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe(section.title);

    for (const field of section.fields) {
      if (field.conditionalDisplay && field.type !== "image" && !field.conditionalDisplay(extraNow(), inputsNow())) {
        expect(label(field.label.replace(/\s*\*$/, "")), field.key).toBeUndefined();
        continue;
      }
      if (field.type === "image") continue;
      const text = field.label.replace(/\s*\*$/, "");
      expect(label(text), field.key).toBeTruthy();
      const list = typeof field.options === "string" ? LISTS[field.options] : undefined;
      if (field.type === "select" && !field.selectionKey && list?.length) {
        const wanted = list.map((item) => (typeof item === "object" ? item.Grade : item));
        expect(optionsOf(text), `${name}: ${field.key}`).toEqual(wanted);
      }
    }
  });
});
