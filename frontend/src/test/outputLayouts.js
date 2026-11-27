/**
 * Output docks as the engine sends them (`output_layout` of a design result, see
 * `backend/apps/core/utils/output_layout.py` and its tests), for the output dock tests.
 *
 * A safe design fills the values and the popups of every button; an unsafe one leaves the dock as it
 * was built: every field visible with an empty value, the buttons without popups or dialogs.
 */

/** What every drawing dialog reads (`dialog.values`): the union of the props of the drawings. */
export const DIALOG_VALUES = {
  plateWidth: 200,
  plateHeight: 300,
  plateLength: 300,
  plateThickness: 12,
  rows: 3,
  cols: 2,
  end: 40,
  pitch: 60,
  gauge: 90,
  edge: 40,
  holeDiameter: 22,
  holeDia: 22,
  weldSize: 6,
  weldGap: 10,
  origin: "right",
  showThird: true,
  leg: "supported",
  legLength: 100,
  boltRows: 3,
  boltCols: 2,
  gauge1: 50,
  gauge2: 60,
  angleDesignation: "100 x 100 x 10",
  thicknessBand: "thin",
  connectivity: "Column Flange-Beam Web",
  orientation: "vertical",
  variant: "bolted",
  endplateType: "Flushed - Reversible Moment",
  beamDepth: 300,
  flangeThickness: 12,
  webThickness: 8,
  stiffenerHeight: 80,
  stiffenerThickness: 8,
  stiffenerWidth: 60,
  view: "web",
  pitches: [60, 60],
  webEnd: 40,
  flangeEnd: 40,
  numBoltsWeb: 8,
  nbfTotal: 8,
  columnDepth: 250,
  columnWidth: 250,
  columnTf: 12,
  columnTw: 8,
  memberDesignation: "HB 250",
  noOcfBolts: 4,
  diaOcfBolt: 20,
  edgeOcf: 50,
  endOcf: 50,
  gaugeOcf: 150,
};

const popupRows = {
  spacing: [
    { type: "note", text: "Gauge is measured between bolt lines" },
    { type: "section", title: "Bolt Spacing", image: { src: "/api/core-images/bolt.png", width: 300, height: 200, caption: "Bolt layout" } },
    { type: "field", key: "Bolt.Pitch", label: "Pitch Distance (mm)", value: "60" },
    { type: "field", key: "Bolt.Gauge", label: "Gauge Distance (mm)", value: "90" },
    { type: "label", key: "Bolt.Header", label: "Staggered pattern" },
  ],
  capacities: [
    { type: "section", title: "Bolt Capacity", image: null },
    { type: "field", key: "Bolt.Shear", label: "Shear Capacity (kN)", value: "92.4" },
    { type: "field", key: "Bolt.Bearing", label: "Bearing Capacity (kN)", value: "118.0" },
  ],
  plate: [
    { type: "section", title: "Plate", image: null },
    { type: "field", key: "Plate.Length", label: "Plate Length (mm)", value: "300" },
    { type: "field", key: "Plate.Width", label: "Plate Width (mm)", value: "200" },
  ],
};

const button = (key, text, title, popup, dialog = null) => ({
  type: "button",
  key,
  label: text,
  button_text: text,
  popup_title: title,
  visible: true,
  popup,
  dialog,
});

/** The dock of a safe design: two groups, with fields, a subscript label and three buttons. */
export const safeLayout = () => [
  {
    title: "Bolt",
    visible: true,
    items: [
      { type: "field", key: "Bolt.Diameter", label: "Diameter (mm)", value: "20", visible: true },
      { type: "field", key: "Bolt.Grade", label: "Property Class", value: "8.8", visible: true },
      { type: "field", key: "Bolt.Capacity", label: "Bolt value (kN) V<sub>d</sub>", value: "88.1", visible: true },
      button("Bolt.spacing", "Spacing Details", "Spacing Details", popupRows.spacing),
      button("Bolt.capacities", "Capacity Details", "Capacity Details", popupRows.capacities),
    ],
  },
  {
    title: "Plate",
    visible: true,
    items: [
      { type: "field", key: "Plate.Thickness", label: "Thickness (mm)", value: "12", visible: true },
      { type: "field", key: "Weld.Size", label: "Weld Size (mm)", value: "6", visible: true },
      button("Plate.spacing", "Plate Details", "Plate Details", popupRows.plate, {
        id: "bolt_pattern",
        note: "Representative drawing",
        footnote: "(All Dimensions are in mm)",
        sections: [{ title: "Plate Size", fields: [{ label: "Plate (mm)", value: "200 x 300" }] }],
        values: DIALOG_VALUES,
      }),
    ],
  },
];

/** The dock of an unsafe design: the same groups and fields with empty values, buttons with nothing behind them. */
export const unsafeLayout = () =>
  safeLayout().map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.type === "button" ? { ...item, popup: [], dialog: null } : { ...item, value: "" },
    ),
  }));
