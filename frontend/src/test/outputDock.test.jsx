// @vitest-environment jsdom
/**
 * The output dock, drawn from the engine's `output_layout`: `BaseOutputDock` (sections, read-only
 * values, buttons that open a popup or a drawing dialog), `OutputPopup`, `LabelText`, and the two panels
 * that report on a design next to it: `Logs` and `DesignStatusModal` (the safe and the unsafe design).
 *
 * The layouts below have the shape `backend/apps/core/utils/output_layout.py` builds (see
 * `backend/apps/core/tests/test_output_layout.py`): a safe design fills the values and the popups, an
 * unsafe one leaves every value empty and the buttons without popups.
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BaseOutputDock } from "../modules/shared/components/BaseOutputDock";
import { DesignStatusModal } from "../modules/shared/components/DesignStatusModal";
import Logs from "../modules/shared/components/Logs";
import LabelText from "../modules/shared/components/outputDock/LabelText";
import { DIALOGS, FRACTURES, dialogWidth, hasDialog } from "../modules/shared/components/outputDock/dialogDrawings";
import { arrangePopup, widestPopupImage } from "../modules/shared/components/outputDock/popupLayout";
import { DESIGN_STATUS } from "../modules/shared/hooks/useDesignSubmission";
import { DIALOG_VALUES, safeLayout, unsafeLayout } from "./outputLayouts";

const field = (key, label, value, visible = true) => ({ type: "field", key, label, value, visible });
const dockOf = (layout, props = {}) => render(<BaseOutputDock layout={layout} {...props} />);
const sectionOf = (title) => document.querySelector(`[data-output-section="${title}"]`);
const valueOf = (key) => document.querySelector(`[data-output-key="${key}"] [title], [data-output-key="${key}"] .min-h-9`)?.textContent;
const buttonOf = (key) => document.querySelector(`[data-output-key="${key}"] input[type="button"]`);

describe("LabelText", () => {
  const html = (text) => render(<span><LabelText>{text}</LabelText></span>).container.firstChild;

  it("shows plain text as it is", () => {
    expect(html("Bolt diameter").innerHTML).toBe("Bolt diameter");
  });

  it("turns sub, sup, b, i and br markup into real elements", () => {
    const out = html("V<sub>dsb</sub> and M<sup>2</sup> <b>bold</b> <i>it</i><br>next<br/>line");
    expect(out.querySelector("sub").textContent).toBe("dsb");
    expect(out.querySelector("sup").textContent).toBe("2");
    expect(out.querySelector("b").textContent).toBe("bold");
    expect(out.querySelector("i").textContent).toBe("it");
    expect(out.querySelectorAll("br")).toHaveLength(2);
  });

  it("never injects other markup: it stays text", () => {
    const out = html('<img src=x onerror="alert(1)"> and <script>alert(2)</script>');
    expect(out.querySelector("img")).toBeNull();
    expect(out.querySelector("script")).toBeNull();
    expect(out.textContent).toContain("<img src=x");
  });

  it("renders nothing for no text and passes a non-string child through", () => {
    expect(html("").innerHTML).toBe("");
    expect(html(undefined).innerHTML).toBe("");
    expect(render(<LabelText>{42}</LabelText>).container.textContent).toBe("42");
  });
});

describe("popup layout", () => {
  it("puts the notes first, then one block per section", () => {
    const { notes, blocks } = arrangePopup([
      { type: "section", title: "A", image: null },
      { type: "field", key: "a1", label: "a1", value: "1" },
      { type: "note", text: "keep in mind" },
      { type: "section", title: "B", image: { src: "/b.png", width: 100, height: 50 } },
      { type: "label", key: "b1", label: "b1" },
      { type: "image", src: "/c.png", width: 300, height: 90, caption: "" },
    ]);
    expect(notes).toEqual(["keep in mind"]);
    expect(blocks.map((b) => b.title)).toEqual(["A", "B"]);
    expect(blocks[0].fields.map((f) => f.key)).toEqual(["a1"]);
    expect(blocks[1].fields.map((f) => f.key)).toEqual(["b1"]);
    expect(blocks[1].images).toHaveLength(1);
  });

  it("shows the rows before the first section only when there is no section", () => {
    expect(arrangePopup([{ type: "field", key: "x", label: "x", value: "1" }]).blocks).toHaveLength(1);
    const withSection = arrangePopup([
      { type: "field", key: "lost", label: "lost", value: "1" },
      { type: "section", title: "S", image: null },
    ]);
    expect(withSection.blocks).toHaveLength(1);
    expect(withSection.blocks[0].fields).toEqual([]);
  });

  it("has no block for no rows, and sizes a window by its widest image", () => {
    expect(arrangePopup([]).blocks).toEqual([]);
    expect(arrangePopup(undefined).blocks).toEqual([]);
    expect(widestPopupImage([])).toBe(0);
    expect(widestPopupImage(undefined)).toBe(0);
    expect(
      widestPopupImage([
        { type: "section", title: "S", image: { width: 200 } },
        { type: "image", width: 420 },
        { type: "field" },
      ]),
    ).toBe(420);
  });
});

describe("BaseOutputDock of a safe design", () => {
  it("shows every section with its labels and values", () => {
    dockOf(safeLayout());
    expect(screen.getByText("Output Dock")).toBeTruthy();
    expect(within(sectionOf("Bolt")).getByRole("heading", { level: 3 }).textContent).toBe("Bolt");
    expect(sectionOf("Bolt").textContent).toContain("Diameter (mm)");
    expect(valueOf("Bolt.Diameter")).toBe("20");
    expect(valueOf("Bolt.Grade")).toBe("8.8");
    expect(valueOf("Plate.Thickness")).toBe("12");
    expect(valueOf("Weld.Size")).toBe("6");
    expect(sectionOf("Plate")).not.toBeNull();
  });

  it("draws the engine's subscripts in a label", () => {
    dockOf(safeLayout());
    const label = document.querySelector('[data-output-key="Bolt.Capacity"] h4');
    expect(label.querySelector("sub").textContent).toBe("d");
    expect(label.textContent).toBe("Bolt value (kN) V" + "d");
  });

  it("shows a long value whole, with the value as the hover title", () => {
    const long = "Bearing bolt, 4 rows of 2 bolts, pretensioned, with friction grip";
    dockOf([{ title: "S", visible: true, items: [field("k", "Note", long)] }]);
    expect(valueOf("k")).toBe(long);
    expect(document.querySelector('[data-output-key="k"] [title]').getAttribute("title")).toBe(long);
  });

  it("keeps a field with an empty value as an empty box", () => {
    dockOf([{ title: "S", visible: true, items: [field("k", "Gap", ""), field("n", "None", null)] }]);
    expect(document.querySelector('[data-output-key="k"]')).not.toBeNull();
    expect(valueOf("k")?.trim() ?? "").toBe("");
    expect(valueOf("n")?.trim() ?? "").toBe("");
  });

  it("shows the number 0 as 0", () => {
    dockOf([{ title: "S", visible: true, items: [field("k", "Zero", 0)] }]);
    expect(valueOf("k")).toBe("0");
  });

  it("leaves out a hidden field and a hidden section", () => {
    dockOf([
      { title: "Shown", visible: true, items: [field("a", "A", "1"), field("b", "B", "2", false)] },
      { title: "Hidden", visible: false, items: [field("c", "C", "3")] },
    ]);
    expect(document.querySelector('[data-output-key="a"]')).not.toBeNull();
    expect(document.querySelector('[data-output-key="b"]')).toBeNull();
    expect(sectionOf("Hidden")).toBeNull();
  });

  it("shows a group with no fields as a heading for the groups after it", () => {
    dockOf([
      { title: "Detailing", visible: true, items: [] },
      { title: "Spacing", visible: true, items: [field("p", "Pitch", "60")] },
    ]);
    const header = sectionOf("Detailing");
    expect(header.tagName).toBe("H3");
    expect(sectionOf("Spacing").tagName).toBe("DIV");
  });

  it("enables the buttons only when the page says the design is safe", () => {
    const { unmount } = dockOf(safeLayout(), { buttonsEnabled: true });
    expect(buttonOf("Bolt.spacing").disabled).toBe(false);
    expect(buttonOf("Bolt.spacing").value).toBe("Spacing Details");
    unmount();
    dockOf(safeLayout(), { buttonsEnabled: false });
    expect(buttonOf("Bolt.spacing").disabled).toBe(true);
  });

  it("calls the report and the save handlers from its footer, which exists only with them", () => {
    const report = vi.fn();
    const save = vi.fn();
    const { unmount } = dockOf(safeLayout(), { handleCreateDesignReport: report, saveOutput: save });
    fireEvent.click(screen.getByRole("button", { name: /Generate Report/ }));
    fireEvent.click(screen.getByRole("button", { name: /Save Output/ }));
    expect(report).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
    unmount();

    dockOf(safeLayout());
    expect(screen.queryByRole("button", { name: /Generate Report/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Save Output/ })).toBeNull();
  });
});

describe("BaseOutputDock popups", () => {
  const open = (key, props = { buttonsEnabled: true }, layout = safeLayout()) => {
    dockOf(layout, props);
    fireEvent.click(buttonOf(key));
    return screen.getByRole("dialog");
  };

  it("opens the popup of a button with its title, notes, section titles and values", () => {
    const dialog = open("Bolt.spacing");
    expect(within(dialog).getByText("Spacing Details")).toBeTruthy();
    expect(dialog.textContent).toContain("Note: Gauge is measured between bolt lines");
    expect(within(dialog).getByRole("heading", { name: "Bolt Spacing" })).toBeTruthy();
    const pitch = dialog.querySelector('[data-output-key="Bolt.Pitch"]');
    expect(pitch.textContent).toContain("Pitch Distance (mm)");
    expect(pitch.textContent).toContain("60");
    expect(dialog.querySelector("[data-output-popup]")).not.toBeNull();
  });

  it("opens the other popup too (Capacity Details)", () => {
    const dialog = open("Bolt.capacities");
    expect(within(dialog).getByText("Capacity Details")).toBeTruthy();
    expect(dialog.querySelector('[data-output-key="Bolt.Shear"]').textContent).toContain("92.4");
  });

  it("shows a row that is only a label without a value box", () => {
    const dialog = open("Bolt.spacing");
    const row = dialog.querySelector('[data-output-key="Bolt.Header"]');
    expect(row.textContent).toContain("Staggered pattern");
    expect(row.querySelector(".w-28")).toBeNull();
  });

  it("shows an image of the popup, and an empty box when the server cannot provide it", () => {
    const dialog = open("Bolt.spacing");
    const image = dialog.querySelector("img");
    expect(image.getAttribute("src")).toContain("/api/core-images/bolt.png");
    expect(within(dialog).getByText("Bolt layout")).toBeTruthy();
    fireEvent.error(image);
    expect(dialog.querySelector("img")).toBeNull();
    expect(within(dialog).getByText("Bolt layout")).toBeTruthy();
  });

  it("says so when the popup could not be built", () => {
    const layout = safeLayout();
    layout[0].items.find((item) => item.key === "Bolt.capacities").error = true;
    layout[0].items.find((item) => item.key === "Bolt.capacities").popup = [];
    const dialog = open("Bolt.capacities", { buttonsEnabled: true }, layout);
    expect(dialog.textContent).toContain("The details of this design could not be loaded.");
  });

  it("does not open a popup for a disabled button", () => {
    dockOf(safeLayout(), { buttonsEnabled: false });
    fireEvent.click(buttonOf("Bolt.spacing"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens a drawing dialog for a button that has one, with its panel and drawings", () => {
    const dialog = open("Plate.spacing", { buttonsEnabled: true });
    const drawing = dialog.querySelector('[data-output-dialog="bolt_pattern"]');
    expect(drawing).not.toBeNull();
    expect(drawing.textContent).toContain("Note: Representative drawing");
    expect(drawing.textContent).toContain("Plate Size");
    expect(drawing.textContent).toContain("200 x 300");
    expect(drawing.textContent).toContain("(All Dimensions are in mm)");
    expect(drawing.querySelector("svg")).not.toBeNull();
    expect(dialog.querySelector("[data-output-popup]")).toBeNull();
  });

  it("shows the popup rows for a dialog id it has no drawing for", () => {
    const layout = safeLayout();
    layout[1].items.find((item) => item.key === "Plate.spacing").dialog.id = "some_future_dialog";
    const dialog = open("Plate.spacing", { buttonsEnabled: true }, layout);
    expect(dialog.querySelector("[data-output-dialog]")).toBeNull();
    expect(dialog.querySelector("[data-output-popup]")).not.toBeNull();
    expect(dialog.textContent).toContain("Plate Length (mm)");
  });
});

describe("BaseOutputDock of an unsafe design and of no design", () => {
  it("shows an unsafe design's fields without values and its buttons disabled", () => {
    dockOf(unsafeLayout(), { buttonsEnabled: false });
    expect(sectionOf("Bolt").textContent).toContain("Diameter (mm)");
    expect(valueOf("Bolt.Diameter")?.trim() ?? "").toBe("");
    expect(valueOf("Plate.Thickness")?.trim() ?? "").toBe("");
    expect(buttonOf("Bolt.spacing").disabled).toBe(true);
    expect(buttonOf("Plate.spacing").disabled).toBe(true);
  });

  it("opens no popup from an unsafe design's button even when clicked", () => {
    dockOf(unsafeLayout(), { buttonsEnabled: false });
    fireEvent.click(buttonOf("Bolt.spacing"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows only its header for no layout, and for an empty one", () => {
    for (const layout of [null, undefined, []]) {
      const { unmount } = dockOf(layout);
      expect(screen.getByText("Output Dock")).toBeTruthy();
      expect(document.querySelectorAll("[data-output-section]")).toHaveLength(0);
      expect(document.querySelectorAll("[data-output-key]")).toHaveLength(0);
      unmount();
    }
  });
});

describe("drawing dialogs", () => {
  it("lists a drawing for each dialog id the server can send, and a card layout for the fracture dialogs", () => {
    expect(Object.keys(DIALOGS).sort()).toEqual([
      "b2b_end_plate_sketch",
      "b2c_end_plate",
      "base_plate",
      "base_plate_hollow",
      "bolt_pattern",
      "c2c_end_plate",
      "cleat_angle_capacity",
      "cleat_angle_section",
      "cleat_angle_spacing",
      "cover_plate_spacing",
      "cover_plate_weld",
      "end_plate_spacing",
      "fin_plate_capacity",
      "fin_plate_section_capacity",
      "seated_angle_capacity",
      "seated_angle_section",
      "seated_angle_spacing",
    ]);
    expect(Object.keys(FRACTURES).sort()).toEqual(["beam_flange_fracture", "beam_web_fracture", "column_flange_fracture", "column_web_fracture"]);
  });

  it("knows a dialog by its id, and sizes its window", () => {
    expect(hasDialog({ id: "bolt_pattern" })).toBe(true);
    expect(hasDialog({ id: "beam_web_fracture" })).toBe(true);
    expect(hasDialog({ id: "unknown" })).toBe(false);
    expect(hasDialog(null)).toBe(false);
    expect(dialogWidth({ id: "beam_web_fracture", sections: [] })).toBe(760);
    expect(dialogWidth({ id: "fin_plate_capacity", sections: [{}] })).toBe(980);
    expect(dialogWidth({ id: "bolt_pattern", sections: [] })).toBe(900);
  });

  const popupOf = (dialog) => ({
    type: "button",
    key: "b",
    label: "Details",
    button_text: "Details",
    popup_title: "Dialog",
    visible: true,
    popup: [],
    dialog: { note: null, footnote: null, sections: [], values: DIALOG_VALUES, ...dialog },
  });

  const opened = (dialog) => {
    dockOf([{ title: "S", visible: true, items: [popupOf(dialog)] }], { buttonsEnabled: true });
    fireEvent.click(buttonOf("b"));
    return screen.getByRole("dialog");
  };

  it.each(Object.keys(DIALOGS))("renders the %s dialog with a drawing", (id) => {
    const dialog = opened({ id });
    expect(dialog.querySelector(`[data-output-dialog="${id}"]`)).not.toBeNull();
    expect(dialog.querySelectorAll("svg").length).toBeGreaterThan(0);
  });

  it.each(Object.entries(FRACTURES))("renders the %s dialog as one card per failure pattern", (id, { patterns, subject }) => {
    const sections = [{ title: "Capacity", fields: [{ label: "Tdb (kN)", value: "120.5" }] }];
    const dialog = opened({ id, sections });
    const headings = [...dialog.querySelectorAll("h4")].map((h) => h.textContent).filter((t) => t.startsWith("Failure Pattern"));
    expect(headings).toEqual(Array.from({ length: patterns }, (_, i) => `Failure Pattern ${i + 1} – Tension in ${subject}`));
    expect(dialog.textContent).toContain("120.5");
  });

  it("shows the left panel of a dialog: note, sections and footnote", () => {
    const dialog = opened({
      id: "fin_plate_capacity",
      note: "Representative image for Failure Pattern (Half Plate)",
      footnote: "(All Dimensions are in mm)",
      sections: [{ title: "Bolt Capacity", fields: [{ label: "Shear (kN)", value: "88.1" }] }],
    });
    expect(dialog.textContent).toContain("Note: Representative image for Failure Pattern (Half Plate)");
    expect(within(dialog).getByRole("heading", { name: "Bolt Capacity" })).toBeTruthy();
    expect(dialog.textContent).toContain("88.1");
    expect(dialog.textContent).toContain("(All Dimensions are in mm)");
  });
});

describe("Logs", () => {
  it("says there are no logs for none, and for no list", () => {
    for (const logs of [[], null, undefined]) {
      const { unmount } = render(<Logs logs={logs} />);
      expect(screen.getByText("System Logs")).toBeTruthy();
      expect(screen.getByText(/No logs available/)).toBeTruthy();
      unmount();
    }
  });

  it("shows each log with its type, message and timestamp", () => {
    render(
      <Logs
        logs={[
          { type: "warning", message: "Slenderness is high", timestamp: "10:01" },
          { type: "error", msg: "Bolt fails in shear" },
          { type: "success", message: "=== End Of Design ===" },
          { message: "no type given" },
          "a plain string",
          42,
        ]}
      />,
    );
    expect(screen.getByText("[WARNING]").className).toContain("text-yellow-400");
    expect(screen.getByText("Slenderness is high")).toBeTruthy();
    expect(screen.getByText("10:01")).toBeTruthy();
    expect(screen.getByText("[ERROR]").className).toContain("text-red-400");
    expect(screen.getByText("Bolt fails in shear")).toBeTruthy();
    expect(screen.getByText("[SUCCESS]").className).toContain("text-green-400");
    expect(screen.getByText("=== End Of Design ===").className).toContain("text-osdag-green");
    expect(screen.getByText("no type given")).toBeTruthy();
    expect(screen.getByText("a plain string")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getAllByText("[INFO]")).toHaveLength(3);
  });

  it("falls back to the JSON of a log object with no message", () => {
    render(<Logs logs={[{ type: "info", detail: 1 }]} />);
    expect(screen.getByText('{"type":"info","detail":1}')).toBeTruthy();
  });
});

describe("DesignStatusModal", () => {
  const status = (step, message = "", error = null) => ({ step, message, error });

  it("shows nothing while idle", () => {
    render(<DesignStatusModal status={status(DESIGN_STATUS.IDLE)} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the steps of a running design", () => {
    const { rerender } = render(<DesignStatusModal status={status(DESIGN_STATUS.VALIDATING)} />);
    expect(screen.getByText("Validating inputs...")).toBeTruthy();
    rerender(<DesignStatusModal status={status(DESIGN_STATUS.CALCULATING, "Running design calculations...")} />);
    expect(screen.getByText("Running design calculations...")).toBeTruthy();
    rerender(<DesignStatusModal status={status(DESIGN_STATUS.CAD_GENERATING)} />);
    expect(screen.getByText("Building 3D model...")).toBeTruthy();
    expect(screen.getAllByText("OSDAG Design Processing").length).toBeGreaterThan(0);
  });

  it("shows the unsafe design as an error with its message, closable", () => {
    const onClose = vi.fn();
    const message = "Design is unsafe / failed. Please inspect calculation logs for details.";
    render(<DesignStatusModal status={status(DESIGN_STATUS.ERROR, message, new Error(message))} onClose={onClose} />);
    expect(screen.getByText("Error")).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.getByText("Please check your inputs and try again")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the error's own message as the detail when it differs from the status message", () => {
    render(<DesignStatusModal status={status(DESIGN_STATUS.ERROR, "Calculation succeeded, but boom", new Error("boom"))} />);
    expect(screen.getByText("boom")).toBeTruthy();
  });

  it("shows a completed design, and closes itself a second later", () => {
    vi.useFakeTimers();
    try {
      const onClose = vi.fn();
      render(<DesignStatusModal status={status(DESIGN_STATUS.COMPLETE, "Design complete!")} onClose={onClose} />);
      expect(screen.getByText("Design Complete!")).toBeTruthy();
      expect(screen.getByText("Your design results are ready")).toBeTruthy();
      expect(onClose).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
