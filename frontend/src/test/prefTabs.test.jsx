// @vitest-environment jsdom
/**
 * The Additional Inputs tabs that hold plain dropdowns and text boxes (Bolt, Weld, Detailing, Design and
 * the Optimization tabs): what each lists, which options cannot be picked, what a change writes back to
 * the dialog state, which rows a module gets, and that a locked dialog changes nothing. The option lists
 * are the core's constants (`prefOptions.js`, `coreKeys.js`), so a tab that stops using them fails here.
 *
 * The values used are made up for the test and never compared with a module's defaults.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  KEY_DISP_DP_DESIGN_BASE_PLATE,
  KEY_DISP_DP_DETAILING_PACKING_PLATE,
  KEY_DP_DESIGN_BASE_PLATE,
} from "../constants/generated/coreKeys";
import BoltSectionModal from "../modules/shared/components/BoltSectionModal";
import ColumnOptimizationSectionModal from "../modules/shared/components/ColumnOptimizationSectionModal";
import DesignSectionModal from "../modules/shared/components/DesignSectionModal";
import DetailingSectionModal from "../modules/shared/components/DetailingSectionModal";
import FlexureOptimizationSectionModal from "../modules/shared/components/FlexureOptimizationSectionModal";
import WeldSectionModal from "../modules/shared/components/WeldSectionModal";
import {
  ALLOW_CLASS_OPTIONS,
  BASE_PLATE_ANALYSIS_OPTIONS,
  BOLT_TENSION_TYPE_OPTIONS,
  COLUMN_OPTIMIZATION_DEFAULTS,
  DESIGN_METHOD_OPTIONS,
  FLEXURE_OPTIMIZATION_DEFAULTS,
  LOADING_CONDITION_OPTIONS,
  OPTIMIZATION_PARA_OPTIONS,
  WELD_FAB_OPTIONS,
  WELD_TYPE_OPTIONS,
} from "../modules/shared/config/prefOptions";
import {
  PrefTabHost,
  isSelectDisabled,
  optionsOf,
  pick,
  prefsNow,
  rowLabels,
  shownIn,
  textInputOf,
} from "./componentHarness";

const texts = (options) => options.map((option) => option.text);
const SIMPLE_JOINTS = ["Butt Joint Bolted", "Butt Joint Welded", "Lap Joint Bolted", "Lap Joint Welded"];

describe("Bolt tab", () => {
  const initial = { bolt_tension_type: "Non pre-tensioned", bolt_hole_type: "Over-sized", bolt_slip_factor: "0.33" };
  const show = (props = {}) => render(<PrefTabHost Tab={BoltSectionModal} initial={initial} isInputLocked={false} {...props} />);

  it("shows the values it holds", () => {
    show();
    expect(shownIn("Type")).toBe("Non pre-tensioned");
    expect(shownIn("Hole Type")).toBe("Over-sized");
    expect(shownIn("Slip Factor")).toBe("0.33");
  });

  it("offers the core's tension types, hole types and slip factors", () => {
    show();
    expect(texts(optionsOf("Type"))).toEqual(BOLT_TENSION_TYPE_OPTIONS);
    expect(texts(optionsOf("Hole Type"))).toEqual(["Standard", "Over-sized"]);
    const slip = texts(optionsOf("Slip Factor"));
    expect(slip).toContain("0.3");
    expect(new Set(slip).size).toBe(slip.length);
  });

  it("writes a choice back and keeps the other values", () => {
    show();
    pick("Type", "Pre-tensioned");
    expect(prefsNow()).toEqual({ ...initial, bolt_tension_type: "Pre-tensioned" });
    pick("Hole Type", "Standard");
    pick("Slip Factor", "0.5");
    expect(prefsNow()).toEqual({ bolt_tension_type: "Pre-tensioned", bolt_hole_type: "Standard", bolt_slip_factor: "0.5" });
  });

  it("changes nothing when the dialog is locked", () => {
    show({ isInputLocked: true });
    for (const label of ["Type", "Hole Type", "Slip Factor"]) {
      expect(isSelectDisabled(label)).toBe(true);
      expect(optionsOf(label)).toEqual([]);
    }
    expect(prefsNow()).toEqual(initial);
  });
});

describe("Weld tab", () => {
  const initial = { weld_fab: "Field weld", weld_material_grade: "410" };
  const show = (module, props = {}) =>
    render(<PrefTabHost Tab={WeldSectionModal} module={module} initial={initial} isInputLocked={false} {...props} />);

  it("offers Weld.Fab spellings to the modules with a fabrication tab", () => {
    show("Fin Plate Connection");
    expect(rowLabels()).toEqual(["Type of Weld Fabrication", "Material Grade Overwrite, Fu (MPa)"]);
    expect(texts(optionsOf("Type of Weld Fabrication"))).toEqual(WELD_FAB_OPTIONS);
    expect(shownIn("Type of Weld Fabrication")).toBe("Field weld");
  });

  it.each(["Butt Joint Welded", "Lap Joint Welded"])("%s offers Weld.Type spellings and no description", (module) => {
    show(module);
    expect(rowLabels()[0]).toBe("Type");
    expect(texts(optionsOf("Type"))).toEqual(WELD_TYPE_OPTIONS);
    expect(screen.queryByText(/material safety factor/)).toBeNull();
  });

  it("describes the safety factors for the other modules", () => {
    show("Fin Plate Connection");
    expect(screen.getByDisplayValue(/Shop weld takes a material safety factor of 1.25/)).toBeTruthy();
  });

  it("writes the fabrication back", () => {
    show("Fin Plate Connection");
    pick("Type of Weld Fabrication", WELD_FAB_OPTIONS[0]);
    expect(prefsNow()).toEqual({ weld_fab: WELD_FAB_OPTIONS[0], weld_material_grade: "410" });
  });

  it("keeps digits, one decimal point and a leading minus in the grade", () => {
    show("Fin Plate Connection");
    const input = textInputOf("Material Grade Overwrite");
    fireEvent.change(input, { target: { value: "4a1.0.5" } });
    expect(prefsNow().weld_material_grade).toBe("41.05");
    fireEvent.change(input, { target: { value: "-4-1" } });
    expect(prefsNow().weld_material_grade).toBe("-41");
    fireEvent.change(input, { target: { value: "41-" } });
    expect(prefsNow().weld_material_grade).toBe("41");
  });

  it("blocks letters and spaces at the key, and lets digits and editing keys through", () => {
    show("Fin Plate Connection");
    const input = textInputOf("Material Grade Overwrite");
    expect(fireEvent.keyDown(input, { key: "a" })).toBe(false);
    expect(fireEvent.keyDown(input, { key: " " })).toBe(false);
    expect(fireEvent.keyDown(input, { key: "7" })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "Backspace" })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "v", ctrlKey: true })).toBe(true);
  });

  it("changes nothing when the dialog is locked", () => {
    show("Fin Plate Connection", { isInputLocked: true });
    expect(isSelectDisabled("Type of Weld Fabrication")).toBe(true);
    expect(textInputOf("Material Grade Overwrite").disabled).toBe(true);
  });
});

describe("Detailing tab", () => {
  const initial = {
    detailing_edge_type: "Sheared or hand flame cut",
    detailing_packing_plate: "No",
    detailing_gap: "12",
    detailing_corr_status: "Yes",
  };
  const show = (module, props = {}) =>
    render(<PrefTabHost Tab={DetailingSectionModal} module={module} initial={initial} isInputLocked={false} {...props} />);

  it("gives a connection with a support the edge, gap and corrosion rows", () => {
    show("Fin Plate Connection");
    expect(rowLabels()).toEqual([
      "Edge Preparation Method",
      "Gap Between Beam And Support (mm)",
      "Are the Member Exposed to Corrosive influences?",
    ]);
    expect(shownIn("Are the Member")).toBe("Yes");
    expect(textInputOf("Gap Between").value).toBe("12");
  });

  it("gives the butt and lap joints the edge row, and the packing plate to the welded butt joint only", () => {
    const labels = {};
    for (const module of SIMPLE_JOINTS) {
      const { unmount } = show(module);
      labels[module] = rowLabels();
      unmount();
    }
    expect(labels).toEqual({
      "Butt Joint Bolted": ["Edge Preparation Method"],
      "Butt Joint Welded": ["Edge Preparation Method", KEY_DISP_DP_DETAILING_PACKING_PLATE],
      "Lap Joint Bolted": ["Edge Preparation Method"],
      "Lap Joint Welded": ["Edge Preparation Method"],
    });
  });

  it("offers the two edge preparation methods and Yes and No", () => {
    show("Butt Joint Welded");
    expect(texts(optionsOf("Edge Preparation Method"))).toEqual([
      "Sheared or hand flame cut",
      "Rolled, machine-flame cut, sawn and planed",
    ]);
    expect(texts(optionsOf(KEY_DISP_DP_DETAILING_PACKING_PLATE))).toEqual(["Yes", "No"]);
  });

  it("writes each row back and keeps the rest", () => {
    show("Fin Plate Connection");
    pick("Edge Preparation Method", "Rolled, machine-flame cut, sawn and planed");
    pick("Are the Member", "No");
    fireEvent.change(textInputOf("Gap Between"), { target: { value: "3.5x" } });
    expect(prefsNow()).toEqual({
      ...initial,
      detailing_edge_type: "Rolled, machine-flame cut, sawn and planed",
      detailing_corr_status: "No",
      detailing_gap: "3.5",
    });
  });

  it("writes the packing plate of the welded butt joint", () => {
    show("Butt Joint Welded");
    pick(KEY_DISP_DP_DETAILING_PACKING_PLATE, "Yes");
    expect(prefsNow().detailing_packing_plate).toBe("Yes");
  });

  it("changes nothing when the dialog is locked", () => {
    show("Fin Plate Connection", { isInputLocked: true });
    expect(isSelectDisabled("Edge Preparation Method")).toBe(true);
    expect(isSelectDisabled("Are the Member")).toBe(true);
    expect(textInputOf("Gap Between").disabled).toBe(true);
  });
});

describe("Design tab", () => {
  const initial = { design_method: "Limit State Design", [KEY_DP_DESIGN_BASE_PLATE]: BASE_PLATE_ANALYSIS_OPTIONS[0] };
  const show = (module, props = {}) =>
    render(<PrefTabHost Tab={DesignSectionModal} module={module} initial={initial} isInputLocked={false} {...props} />);

  it("lists the core's three design methods and only lets the implemented one be picked", () => {
    show("Fin Plate Connection");
    expect(optionsOf("Design Method")).toEqual(DESIGN_METHOD_OPTIONS.map(({ value, disabled }) => ({ text: value, disabled })));
    expect(DESIGN_METHOD_OPTIONS.filter((option) => !option.disabled)).toHaveLength(1);
  });

  it("ignores a click on a disabled method", () => {
    show("Fin Plate Connection");
    const disabled = DESIGN_METHOD_OPTIONS.find((option) => option.disabled).value;
    pick("Design Method", disabled);
    expect(prefsNow().design_method).toBe("Limit State Design");
  });

  it("writes the pickable method back", () => {
    show("Fin Plate Connection", {});
    pick("Design Method", DESIGN_METHOD_OPTIONS[0].value);
    expect(prefsNow().design_method).toBe(DESIGN_METHOD_OPTIONS[0].value);
  });

  it("has no design method for the butt and lap joints", () => {
    for (const module of SIMPLE_JOINTS) {
      const { unmount } = show(module);
      expect(rowLabels()).toEqual([]);
      unmount();
    }
  });

  it("gives the base plate a Base Plate Analysis row next to the design method", () => {
    show("Base Plate");
    expect(rowLabels()).toEqual(["Design Method", KEY_DISP_DP_DESIGN_BASE_PLATE]);
    expect(texts(optionsOf(KEY_DISP_DP_DESIGN_BASE_PLATE))).toEqual(BASE_PLATE_ANALYSIS_OPTIONS);
    pick(KEY_DISP_DP_DESIGN_BASE_PLATE, BASE_PLATE_ANALYSIS_OPTIONS[0]);
    expect(prefsNow()[KEY_DP_DESIGN_BASE_PLATE]).toBe(BASE_PLATE_ANALYSIS_OPTIONS[0]);
  });

  it("does not give any other module that row", () => {
    show("Fin Plate Connection");
    expect(rowLabels()).toEqual(["Design Method"]);
  });

  it("changes nothing when the dialog is locked", () => {
    show("Base Plate", { isInputLocked: true });
    expect(isSelectDisabled("Design Method")).toBe(true);
    expect(isSelectDisabled(KEY_DISP_DP_DESIGN_BASE_PLATE)).toBe(true);
  });
});

describe("Optimization tab of the beams", () => {
  const show = (props = {}, initial = {}) =>
    render(<PrefTabHost Tab={FlexureOptimizationSectionModal} initial={initial} isInputLocked={false} {...props} />);

  it("shows the core's defaults for what the dialog does not hold yet", () => {
    show();
    expect(rowLabels()).toEqual([
      "Effective Area Parameter",
      "Semi-compact sections",
      "Loading Condition",
      "Effective Length Parameter",
      "Bearing Length (mm)",
    ]);
    expect(textInputOf("Effective Area Parameter").value).toBe(FLEXURE_OPTIMIZATION_DEFAULTS.effective_area_parameter);
    expect(shownIn("Semi-compact sections")).toBe(FLEXURE_OPTIMIZATION_DEFAULTS.allowable_class);
    expect(shownIn("Loading Condition")).toBe(FLEXURE_OPTIMIZATION_DEFAULTS.loading_condition);
    expect(textInputOf("Effective Length Parameter").value).toBe(FLEXURE_OPTIMIZATION_DEFAULTS.length_overwrite);
    expect(textInputOf("Bearing Length").value).toBe(FLEXURE_OPTIMIZATION_DEFAULTS.bearing_length);
  });

  it("shows what the dialog holds in place of the defaults", () => {
    show({}, { effective_area_parameter: "0.8", allowable_class: "No", loading_condition: "Destabilizing", length_overwrite: "1.2", bearing_length: "150" });
    expect(textInputOf("Effective Area Parameter").value).toBe("0.8");
    expect(shownIn("Semi-compact sections")).toBe("No");
    expect(shownIn("Loading Condition")).toBe("Destabilizing");
    expect(textInputOf("Effective Length Parameter").value).toBe("1.2");
    expect(textInputOf("Bearing Length").value).toBe("150");
  });

  it("offers the core's choices", () => {
    show();
    expect(texts(optionsOf("Semi-compact sections"))).toEqual(ALLOW_CLASS_OPTIONS);
    expect(texts(optionsOf("Loading Condition"))).toEqual(LOADING_CONDITION_OPTIONS);
  });

  it("writes a change back under the field's name and keeps the rest", () => {
    show();
    pick("Loading Condition", "Destabilizing");
    fireEvent.change(textInputOf("Bearing Length"), { target: { value: "200" } });
    expect(prefsNow()).toEqual({ loading_condition: "Destabilizing", bearing_length: "200" });
  });

  it("shows the effective length table of the beam it is for", () => {
    const { unmount } = show({ cantilever: false });
    expect(screen.getByText("Effective Length for Simply Supported Beams")).toBeTruthy();
    unmount();
    show({ cantilever: true });
    expect(screen.getByText("Effective Length for Cantilever Beams")).toBeTruthy();
  });

  it("changes nothing when the dialog is locked", () => {
    show({ isInputLocked: true });
    expect(isSelectDisabled("Loading Condition")).toBe(true);
    expect(textInputOf("Bearing Length").disabled).toBe(true);
  });
});

describe("Optimization tab of the axially loaded column", () => {
  const show = (props = {}, initial = {}) =>
    render(<PrefTabHost Tab={ColumnOptimizationSectionModal} initial={initial} isInputLocked={false} {...props} />);

  it("shows the core's defaults, then what the dialog holds", () => {
    const { unmount } = show();
    expect(rowLabels()).toEqual(["Allowable Utilization Ratio (UR)", "Optimization Parameter", "Effective Area Parameter"]);
    expect(textInputOf("Allowable Utilization Ratio").value).toBe(COLUMN_OPTIMIZATION_DEFAULTS.allow_ur);
    expect(shownIn("Optimization Parameter")).toBe(COLUMN_OPTIMIZATION_DEFAULTS.optimum_para);
    expect(textInputOf("Effective Area Parameter").value).toBe(COLUMN_OPTIMIZATION_DEFAULTS.effective_area_parameter);
    unmount();
    show({}, { allow_ur: "0.9", effective_area_parameter: "0.7" });
    expect(textInputOf("Allowable Utilization Ratio").value).toBe("0.9");
    expect(textInputOf("Effective Area Parameter").value).toBe("0.7");
  });

  it("offers the one optimization parameter the core lists, and writes a change back", () => {
    show();
    expect(texts(optionsOf("Optimization Parameter"))).toEqual(OPTIMIZATION_PARA_OPTIONS);
    fireEvent.change(textInputOf("Allowable Utilization Ratio"), { target: { value: "0.8" } });
    expect(prefsNow()).toEqual({ allow_ur: "0.8" });
  });

  it("changes nothing when the dialog is locked", () => {
    show({ isInputLocked: true });
    expect(isSelectDisabled("Optimization Parameter")).toBe(true);
    expect(textInputOf("Allowable Utilization Ratio").disabled).toBe(true);
  });
});
