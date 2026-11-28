/**
 * Inputs shared by the per-module cases and the tests that use them.
 */

// Fixed option lists, the shapes the options endpoints return, kept short.
export const LISTS = {
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

export const SHEAR_CONNECTIVITY = ["Column Flange-Beam Web", "Column Web-Beam Web", "Beam-Beam"];
export const BOLT_CUSTOM = { bolt_diameter: ["16", "20"], bolt_grade: ["8.8", "10.9"], plate_thickness: ["10", "12"] };
export const COVER_CUSTOM = { bolt_diameter: ["16", "20"], bolt_grade: ["8.8", "10.9"], flange_plate_thickness: ["10", "12"], web_plate_thickness: ["8", "10"] };
export const SHEAR_FILL = { column_section: "HB 150", beam_section: "MB 300", primary_beam: "JB 200", secondary_beam: "JB 150" };
export const PLATE_FILL = { plate1_thickness: "10", plate2_thickness: "12" };

export const allSelectedFor = (config, value) =>
  Object.fromEntries((config.selectionConfig || []).map((s) => [s.inputKey, value]));

export const initialExtraState = (config) =>
  typeof config.getInitialExtraState === "function" ? config.getInitialExtraState() : {};

// What goes over the wire: JSON drops `undefined`.
export const wire = (value) => JSON.parse(JSON.stringify(value));

/** The form state of one case: its default inputs, `fill`, and either "All" or its `custom` selection. */
export const caseState = (module, selection, connectivity = null) => {
  const { config } = module;
  const allSelected = allSelectedFor(config, selection === "all");
  let inputs = { ...config.defaultInputs, ...(module.fill || {}) };
  if (connectivity) inputs[module.connectivityKey || "connectivity"] = connectivity;
  if (selection === "customized") inputs = { ...inputs, ...(module.custom || {}) };
  return { inputs, allSelected, extraState: initialExtraState(config) };
};

const buildInitialSelection = (config) => ({
  allSelected: Object.fromEntries((config.selectionConfig || []).map((s) => [s.inputKey, true])),
  selectionStates: Object.fromEntries((config.selectionConfig || []).map((s) => [s.key, s.defaultValue || "All"])),
  selectedItems: Object.fromEntries((config.selectionConfig || []).map((s) => [s.inputKey, []])),
});

/**
 * A module's form state as `useModuleForm` starts it, with React-like setters that apply
 * updater functions to a plain object. Pass `options` to `loadStateFromOsi`; read `state` after.
 */
export const formRecorder = (config, safeModuleData = LISTS) => {
  const state = {
    inputs: config.defaultInputs,
    designPrefOverrides: {},
    extraState: initialExtraState(config),
    ...buildInitialSelection(config),
  };
  const merge = (key) => (next) => { state[key] = typeof next === "function" ? next(state[key]) : next; };
  return {
    state,
    options: {
      setInputs: merge("inputs"),
      setDesignPrefOverrides: merge("designPrefOverrides"),
      setExtraState: merge("extraState"),
      setSelectionStates: merge("selectionStates"),
      setAllSelected: merge("allSelected"),
      setSelectedItems: merge("selectedItems"),
      moduleConfig: config,
      safeModuleData,
    },
  };
};

/** What the Design button sends for a form state: the dock inputs with the Additional Inputs merged in. */
export const designRequest = (config, state, lists = LISTS) =>
  wire(config.buildSubmissionParams(
    { ...state.inputs, ...(state.designPrefOverrides || {}) },
    state.allSelected,
    lists,
    state.extraState,
  ));
