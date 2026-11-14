/**
 * Payload parity: what each module's `buildSubmissionParams` sends for its default inputs.
 *
 * The request body is the contract with the backend. These snapshots pin it down, so a
 * refactor of a module config (keys, factories, derived payloads) can't change what is
 * sent without the diff showing in `__snapshots__/payloadParity.test.js.snap`.
 *
 * Every module is run on its `defaultInputs`, once per connectivity choice it has, with
 * every customizable list on "All" (the builder sends the whole option list) and with
 * explicit selections. The option lists are small fixed samples, so the tests need no
 * backend and no catalog. If a snapshot changes on purpose, review the diff and update
 * it with `npm test -- -u`.
 */
import { describe, expect, it } from "vitest";

import { basePlateConfig } from "../modules/basePlate/configs/basePlateConfig";
import { beamBeamEndPlateConfig } from "../modules/beamBeamEndPlate/configs/beamBeamEndPlateConfig";
import { beamToColumnEndPlateConfig } from "../modules/beamToColumnEndPlate/configs/beamToColumnEndPlateConfig";
import { coverPlateBoltedConfig as bbCoverBolted } from "../modules/coverPlateBolted/configs/coverPlateBoltedConfig";
import { coverPlateWeldedConfig as bbCoverWelded } from "../modules/coverPlateWelded/configs/coverPlateWeldedConfig";
import { coverPlateBoltedConfig as ccCoverBolted } from "../modules/columnColumnCoverPlateBolted/configs/coverPlateBoltedConfig";
import { coverPlateWeldedConfig as ccCoverWelded } from "../modules/columnColumnCoverPlateWelded/configs/coverPlateWeldedConfig";
import { columnColumnEndPlateConfig } from "../modules/columnColumnEndPlate/configs/columnColumnEndPlateConfig";
import { axiallyLoadedColumnConfig } from "../modules/compressionMember/configs/axiallyLoadedColumnConfig";
import { strutsBoltedConfig } from "../modules/compressionMember/configs/strutsBoltedConfig";
import { strutsWeldedConfig } from "../modules/compressionMember/configs/strutsWeldedConfig";
import { onCantileverConfig } from "../modules/flexuralMember/onCantilever/configs/onCantileverConfig";
import { plateGirderConfig } from "../modules/flexuralMember/plateGirder/configs/plateGirderConfig";
import { simplySupportedBeamConfig } from "../modules/flexuralMember/simplySupportedBeam/configs/simplySupportedBeamConfig";
import { cleatAngleConfig } from "../modules/shearConnection/cleatAngle/configs/cleatAngleConfig";
import { endPlateConfig } from "../modules/shearConnection/endPlate/configs/endPlateConfig";
import { finPlateConfig } from "../modules/shearConnection/finPlate/configs/finPlateConfig";
import { seatedAngleConfig } from "../modules/shearConnection/seatAngle/configs/seatedAngleConfig";
import { buttJointBoltedConfig } from "../modules/SimpleConnection/ButtJointBolted/config/buttJointBoltedConfig";
import { buttJointWeldedConfig } from "../modules/SimpleConnection/ButtJointWelded/config/buttJointWeldedConfig";
import { lapJointBoltedConfig } from "../modules/SimpleConnection/LapJointBolted/config/lapJointBoltedConfig";
import { lapJointWeldedConfig } from "../modules/SimpleConnection/LapJointWelded/config/lapJointWeldedConfig";
import { boltedToEndConfig } from "../modules/TensionMembers/BoltedToEnd/configs/boltedToEndConfig";
import { weldedToEndConfig } from "../modules/TensionMembers/WeldedToEnd/configs/weldedToEndConfig";

// Fixed option lists, the shapes the options endpoints return, kept short.
const LISTS = {
  columnList: ["HB 150", "UC 305 x 305 x 118"],
  beamList: ["MB 300", "JB 200"],
  sectionDesignation: ["HB 150", "MB 300"],
  angleList: ["50 x 50 x 6", "60 x 60 x 6"],
  channelList: ["MC 100", "MC 125"],
  rhsList: ["RHS 100 x 50 x 4"],
  shsList: ["SHS 100 x 100 x 4"],
  chsList: ["CHS 88.9 x 4"],
  materialList: [
    { id: 1, Grade: "E 250 (Fe 410 W)A" },
    { id: 2, Grade: "E 165 (Fe 290)" },
    { id: -1, Grade: "Custom" },
  ],
  boltDiameterList: ["12", "16", "20"],
  propertyClassList: ["4.6", "8.8", "10.9"],
  thicknessList: ["8", "10", "12"],
  stiffenerThicknessList: ["6", "8"],
  weldSizeList: ["4", "6", "8"],
  coverPlateList: ["Single-Cover", "Double-Cover"],
  boltTypeList: ["Bearing Bolt", "Friction Grip Bolt"],
  endConditionList: ["Fixed", "Hinged"],
  anchorDiameterList: ["M20", "M24"],
  anchorGradeList: ["4.6", "8.8"],
  footingGradeList: ["M20", "M25"],
  connectivityList: ["Welded Column Base", "Moment Base Plate", "Hollow/Tubular Column Base"],
};

const SHEAR_CONNECTIVITY = ["Column Flange-Beam Web", "Column Web-Beam Web", "Beam-Beam"];
const BOLT_CUSTOM = { bolt_diameter: ["16", "20"], bolt_grade: ["8.8", "10.9"], plate_thickness: ["10", "12"] };
const COVER_CUSTOM = { bolt_diameter: ["16", "20"], bolt_grade: ["8.8", "10.9"], flange_plate_thickness: ["10", "12"], web_plate_thickness: ["8", "10"] };
const SHEAR_FILL = { column_section: "HB 150", beam_section: "MB 300", primary_beam: "JB 200", secondary_beam: "JB 150" };

// `fill` gives values to inputs the user has to enter, which are empty in `defaultInputs`.
// `custom` is the explicit selection used when the lists are not on "All".
const MODULES = [
  { name: "fin plate", config: finPlateConfig, connectivities: SHEAR_CONNECTIVITY, custom: BOLT_CUSTOM },
  { name: "cleat angle", config: cleatAngleConfig, connectivities: SHEAR_CONNECTIVITY, custom: { bolt_diameter: ["16", "20"], bolt_grade: ["8.8", "10.9"], cleat_section: ["50 x 50 x 6"] } },
  { name: "header plate", config: endPlateConfig, connectivities: SHEAR_CONNECTIVITY, fill: SHEAR_FILL, custom: BOLT_CUSTOM },
  { name: "seated angle", config: seatedAngleConfig, connectivities: ["Column Flange-Beam Web", "Column Web-Beam Web"], custom: { bolt_diameter: ["16", "20"], bolt_grade: ["8.8", "10.9"], angle_list: ["50 x 50 x 6"], topangle_list: ["50 x 50 x 6"] } },
  { name: "beam-beam cover plate bolted", config: bbCoverBolted, custom: COVER_CUSTOM },
  { name: "column-column cover plate bolted", config: ccCoverBolted, custom: COVER_CUSTOM },
  { name: "beam-beam cover plate welded", config: bbCoverWelded, custom: { flange_plate_thickness: ["10", "12"], web_plate_thickness: ["8", "10"] } },
  { name: "column-column cover plate welded", config: ccCoverWelded, custom: { flange_plate_thickness: ["10", "12"], web_plate_thickness: ["8", "10"] } },
  { name: "beam-beam end plate", config: beamBeamEndPlateConfig, custom: BOLT_CUSTOM },
  { name: "beam-column end plate", config: beamToColumnEndPlateConfig, custom: BOLT_CUSTOM },
  { name: "column-column end plate", config: columnColumnEndPlateConfig, connectivities: ["Flush End Plate", "Extended Both Ways"], custom: BOLT_CUSTOM },
  { name: "tension bolted", config: boltedToEndConfig, custom: { ...BOLT_CUSTOM, section_designation: ["50 x 50 x 6"] } },
  { name: "tension welded", config: weldedToEndConfig, custom: { plate_thickness: ["10", "12"], section_designation: ["50 x 50 x 6"] } },
  {
    name: "base plate",
    config: basePlateConfig,
    connectivities: ["Welded Column Base", "Moment Base Plate", "Hollow/Tubular Column Base"],
    connectivityKey: "connectivity",
    fill: { member_designation: "HB 200", load_axial: "200", load_axial_tension: "50", load_shear_major: "50", load_shear_minor: "30", load_moment_major: "40", load_moment_minor: "20" },
    custom: { anchor_diameter_ocf: ["M20", "M24"], anchor_grade_ocf: ["8.8"], anchor_diameter_icf: ["M20"], anchor_grade_icf: ["8.8"] },
  },
  { name: "lap joint bolted", config: lapJointBoltedConfig, fill: { plate1_thickness: "10", plate2_thickness: "12" }, custom: { bolt_diameter: ["16", "20"], bolt_grade: ["8.8", "10.9"] } },
  { name: "lap joint welded", config: lapJointWeldedConfig, fill: { plate1_thickness: "10", plate2_thickness: "12" }, custom: { weld_size: ["6", "8"] } },
  { name: "butt joint bolted", config: buttJointBoltedConfig, fill: { plate1_thickness: "10", plate2_thickness: "12" }, custom: { bolt_diameter: ["16", "20"], bolt_grade: ["8.8", "10.9"] } },
  { name: "butt joint welded", config: buttJointWeldedConfig, fill: { plate1_thickness: "10", plate2_thickness: "12" }, custom: { weld_size: ["6", "8"] } },
  { name: "axially loaded column", config: axiallyLoadedColumnConfig, custom: { section_designation: ["MB 300", "JB 200"] } },
  { name: "struts bolted", config: strutsBoltedConfig, custom: { ...BOLT_CUSTOM, section_designation: ["50 x 50 x 6"] } },
  { name: "struts welded", config: strutsWeldedConfig, custom: { plate_thickness: ["10", "12"], section_designation: ["50 x 50 x 6"] } },
  { name: "simply supported beam", config: simplySupportedBeamConfig, custom: { section_designation: ["MB 300", "JB 200"] } },
  { name: "on cantilever", config: onCantileverConfig, custom: { section_designation: ["MB 300", "JB 200"] } },
  { name: "plate girder", config: plateGirderConfig, custom: { web_thickness: ["10"], top_flange_thickness: ["12"], bottom_flange_thickness: ["12"] } },
];

const allSelectedFor = (config, value) =>
  Object.fromEntries((config.selectionConfig || []).map((s) => [s.inputKey, value]));

const initialExtraState = (config, connectivity) => {
  const base = typeof config.getInitialExtraState === "function"
    ? config.getInitialExtraState()
    : { selectedOption: "Column Flange-Beam Web" };
  return connectivity ? { ...base, selectedOption: connectivity } : base;
};

// What goes over the wire: JSON drops `undefined`.
const wire = (value) => JSON.parse(JSON.stringify(value));

describe("payload parity: buildSubmissionParams on the default inputs", () => {
  for (const module of MODULES) {
    describe(module.name, () => {
      const connectivities = module.connectivities || [null];
      const variants = [
        ...connectivities.map((connectivity) => ({ selection: "all", connectivity })),
        { selection: "customized", connectivity: connectivities[0] },
      ];

      for (const { selection, connectivity } of variants) {
        const label = `${selection}${connectivity ? ` / ${connectivity}` : ""}`;
        it(label, () => {
          const { config } = module;
          const allSelected = allSelectedFor(config, selection === "all");
          let inputs = { ...config.defaultInputs, ...(module.fill || {}) };
          if (connectivity) inputs[module.connectivityKey || "connectivity"] = connectivity;
          if (selection === "customized") inputs = { ...inputs, ...(module.custom || {}) };
          const payload = config.buildSubmissionParams(inputs, allSelected, LISTS, initialExtraState(config, connectivity));
          expect(wire(payload)).toMatchSnapshot();
        });
      }
    });
  }
});
