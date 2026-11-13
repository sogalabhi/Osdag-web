import SpacingDiagram from "../diagrams/SpacingDiagram";
import CapacityDiagram from "../diagrams/CapacityDiagram";
import WeldDiagram from "../diagrams/WeldDiagram";
import BasePlateSketch from "../diagrams/BasePlateSketch";
import CleatBoltCapacityDiagram from "../diagrams/CleatBoltCapacityDiagram";
import CleatSectionCapacityDiagram from "../diagrams/CleatSectionCapacityDiagram";
import SeatedAngleCapacitySketch from "../diagrams/SeatedAngleCapacitySketch";
import SeatedSectionCapacityDiagram from "../diagrams/SeatedSectionCapacityDiagram";
import B2BEndPlateDetailingDiagram from "../diagrams/B2BEndPlateDetailingDiagram";
import BeamColumnEndPlateBoltDiagram from "../diagrams/BeamColumnEndPlateBoltDiagram";
import ColumnEndPlateBoltDiagram from "../diagrams/ColumnEndPlateBoltDiagram";

/**
 * The drawing dialogs of the output dock. The server decides which dialog a button opens and sends
 * its numbers (`dialog.values`, named after the props of the drawings) and its left panel
 * (`dialog.note`, `dialog.sections`, `dialog.footnote`); see `backend/apps/core/utils/output_dialogs.py`.
 *
 * Each entry below turns a dialog's values into its drawings, in the order and with the titles the
 * desktop dialog shows. An id that is not listed has no drawing, and the popup rows are shown.
 */

const SHEAR_IN_PLATE = "Failure Pattern due to Shear in Plate:";
const TENSION_IN_PLATE = "Failure Pattern due to Tension in Plate:";
const SECTION_FAILURE = "Failure Pattern in Section:";

const draw = (title, node) => ({ title, node });

// A plate with its bolts and the failure lines of one pattern; `origin` is the side of the weld.
const plateCapacity = (values, origin, fracturePattern) => (
  <CapacityDiagram
    plateWidth={values.plateWidth}
    plateHeight={values.plateHeight}
    rows={values.rows}
    cols={values.cols}
    end={values.end}
    pitch={values.pitch}
    gauge={values.gauge}
    edge={values.edge}
    holeDiameter={values.holeDiameter}
    weldSize={values.weldSize}
    origin={origin}
    fracturePattern={fracturePattern}
    className="w-full max-w-[420px]"
  />
);

const finPlateCapacity = (values) => [
  draw(SHEAR_IN_PLATE, plateCapacity(values, "left", "shear")),
  draw(TENSION_IN_PLATE, plateCapacity(values, "left", "tension")),
];

const finPlateSectionCapacity = (values) => [
  draw(SHEAR_IN_PLATE, plateCapacity(values, "right", "section-shear")),
  draw(TENSION_IN_PLATE, plateCapacity(values, "right", "section-tension")),
  ...(values.showThird
    ? [draw("Failure Pattern due to Block Shear in Plate:", plateCapacity(values, "right", "section-block-shear"))]
    : []),
];

// The angle's leg shown by a cleat angle dialog, with the bolts of that leg.
const cleatLeg = (values, mode) => (
  <CleatBoltCapacityDiagram
    leg={values.leg}
    plateHeight={values.plateHeight}
    boltCols={values.boltCols}
    end={values.end}
    pitch={values.pitch}
    edge={values.edge}
    gauge1={values.gauge1}
    angleDesignation={values.angleDesignation}
    mode={mode}
  />
);

const cleatSection = (values) => (
  <CleatSectionCapacityDiagram
    connectivity={values.connectivity}
    pitch={values.pitch}
    end={values.end}
    edge={values.edge}
    className="w-full"
  />
);

// A hole pattern drawn on a plate of the given size.
const spacing = (values, extra = {}) => (
  <SpacingDiagram
    plateWidth={values.plateWidth}
    plateHeight={values.plateHeight}
    rows={values.rows}
    cols={values.cols}
    end={values.end}
    pitch={values.pitch}
    gauge={values.gauge}
    edge={values.edge}
    holeDiameter={values.holeDiameter}
    weldSize={values.weldSize}
    className="w-full max-w-[420px]"
    {...extra}
  />
);

export const DIALOGS = {
  bolt_pattern: (values) => [draw(null, spacing(values, { origin: values.origin }))],

  fin_plate_capacity: finPlateCapacity,
  fin_plate_section_capacity: finPlateSectionCapacity,

  end_plate_spacing: (values) => [
    draw(null, spacing(values, { origin: "right", weldPattern: "center-gap", weldGap: values.weldGap })),
  ],

  cleat_angle_spacing: (values) => [
    draw(
      null,
      spacing(
        { ...values, plateWidth: values.legLength, rows: values.boltRows, cols: values.boltCols, gauge: [values.gauge1, values.gauge2] },
        { origin: "right", angleDesignation: values.angleDesignation, drawAngleThickness: "left" }
      )
    ),
  ],
  cleat_angle_capacity: (values) => [
    draw("Failure Pattern due to Shear:", cleatLeg(values, "shear")),
    draw("Failure Pattern due to Tension:", cleatLeg(values, "tension")),
  ],
  // The drawing carries its own headings.
  cleat_angle_section: (values) => [draw(null, cleatSection(values))],

  seated_angle_spacing: (values) => [
    draw(null, spacing(values, { origin: "left", angleDesignation: values.angleDesignation, thicknessBand: values.thicknessBand })),
  ],
  seated_angle_capacity: (values) =>
    ["shear", "moment"].map((mode) =>
      draw(
        mode === "shear" ? SHEAR_IN_PLATE : "Failure Pattern due to Moment in Plate:",
        <SeatedAngleCapacitySketch
          plateWidth={values.plateWidth}
          plateHeight={values.plateHeight}
          holeDia={values.holeDiameter}
          end={values.end}
          edge={values.edge}
          gauge={values.gauge}
          cols={values.cols}
          mode={mode}
          className="w-full max-w-[400px]"
        />
      )
    ),
  seated_angle_section: (values) => [
    draw(SECTION_FAILURE, <SeatedSectionCapacityDiagram gauge={values.gauge} className="w-full" />),
  ],

  base_plate: (values) => [draw(null, <BasePlateSketch {...values} className="w-full max-w-[420px]" />)],
  base_plate_hollow: (values) => [draw(null, <BasePlateSketch {...values} className="w-full max-w-[420px]" />)],

  b2c_end_plate: (values) => [draw(null, <BeamColumnEndPlateBoltDiagram {...values} />)],
  b2b_end_plate_sketch: (values) => [
    draw(
      null,
      <B2BEndPlateDetailingDiagram
        plateHeight={values.plateHeight}
        plateThickness={values.plateThickness}
        beamDepth={values.beamDepth}
        beamFlangeThick={values.flangeThickness}
        stiffenerHeight={values.stiffenerHeight}
        stiffenerThickness={values.stiffenerThickness}
        endplateType={values.endplateType}
      />
    ),
  ],

  cover_plate_spacing: (values) => [draw(null, spacing(values, { layout: "symmetric" }))],
  cover_plate_weld: (values) => [draw(null, <WeldDiagram {...values} className="w-full max-w-[350px]" />)],

  c2c_end_plate: (values) => [
    draw(
      null,
      <ColumnEndPlateBoltDiagram
        view={values.view}
        plateLength={values.plateLength}
        plateHeight={values.plateHeight}
        stiffenerWidth={values.stiffenerWidth}
        stiffenerThickness={values.stiffenerThickness}
        webThickness={values.webThickness}
        flangeThickness={values.flangeThickness}
        holeDia={values.holeDia}
        pitches={values.pitches}
        endDist={values.view === "web" ? values.webEnd : values.flangeEnd}
        numBoltsWeb={Math.round(values.numBoltsWeb / 2)}
        nbfTotal={values.nbfTotal}
      />
    ),
  ],
};

// The plate fracture dialogs show one card per failure pattern, each with the same capacities.
export const FRACTURES = {
  beam_web_fracture: { patterns: 3, subject: "Member and Plate" },
  column_web_fracture: { patterns: 3, subject: "Member and Plate" },
  beam_flange_fracture: { patterns: 4, subject: "Flange and Plate" },
  column_flange_fracture: { patterns: 4, subject: "Flange and Plate" },
};

/** Whether a dialog has drawings; the popup rows are shown for any other. */
export const hasDialog = (dialog) => !!dialog && (dialog.id in DIALOGS || dialog.id in FRACTURES);

/** Width of the window of a dialog, from the layouts of the desktop dialogs. */
export const dialogWidth = (dialog) => {
  if (dialog.id in FRACTURES) return 760;
  if (dialog.sections.length > 0 && dialog.id.includes("capacity")) return 980;
  return 900;
};
