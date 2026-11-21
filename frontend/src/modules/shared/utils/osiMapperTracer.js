import { INPUT_KEY_TO_LIST } from "../constants/moduleDataKeys";
import {
  CONN_CFBW,
  CONN_CWBW,
  KEY_ACTUAL_LEN_YY,
  KEY_ACTUAL_LEN_ZZ,
  KEY_ANGLE_LIST,
  KEY_AXIAL,
  KEY_AXIAL_FORCE,
  KEY_CONNECTOR_MATERIAL,
  KEY_D,
  KEY_DESIGN_FOR,
  KEY_DP_BOLT_HOLE_TYPE,
  KEY_DP_BOLT_SLIP_FACTOR,
  KEY_DP_BOLT_TYPE,
  KEY_DP_DESIGN_METHOD,
  KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
  KEY_DP_DETAILING_EDGE_TYPE,
  KEY_DP_DETAILING_GAP,
  KEY_DP_WELD_FAB,
  KEY_DP_WELD_MATERIAL_G_O,
  KEY_END1,
  KEY_END1_Y,
  KEY_END2,
  KEY_END2_Y,
  KEY_FLANGEPLATE_THICKNESS,
  KEY_GRD,
  KEY_LENYY,
  KEY_LENZZ,
  KEY_MATERIAL,
  KEY_MOMENT,
  KEY_PLATE1_THICKNESS,
  KEY_PLATE2_THICKNESS,
  KEY_PLATETHK,
  KEY_PLATE_WIDTH,
  KEY_SECTION_PROFILE,
  KEY_SEC_PROFILE,
  KEY_SHEAR,
  KEY_TYP,
  KEY_WEBPLATE_THICKNESS,
  KEY_WELD_SIZE,
  KEY_WELD_TYPE,
} from "../../../constants/generated/coreKeys";

const addTarget = (map, osiKey, reactKey) => {
  const targets = map[osiKey] || (map[osiKey] = []);
  if (!targets.includes(reactKey)) targets.push(reactKey);
};

/**
 * Maps the key names of a module's .osi file to its form field keys by dry-running
 * buildSubmissionParams with sentinel values. Returns { osiKey: [formKey, ...] }: one
 * .osi key can feed several fields when the module builds its submission differently per
 * connectivity (e.g. the supported section is `beam_section` for column-to-beam and
 * `secondary_beam` for beam-to-beam).
 *
 * moduleConfig.osiKeyAliases ({ osiKey: formKey }) adds keys the desktop writes under a
 * different name than the one buildSubmissionParams sends.
 */
export function getModuleKeyMap(moduleConfig) {
  if (!moduleConfig || typeof moduleConfig.buildSubmissionParams !== "function") {
    return {};
  }
  // Targets read straight from an input, and targets guessed from the full option list of
  // an "All" selection (the list name may belong to several fields).
  const exactMap = {};
  const guessedMap = {};
  const defaultInputs = moduleConfig.defaultInputs || {};
  const standardInputs = Object.keys(defaultInputs);

  // We run multiple mock sweeps to hit conditional branches and selections across all 22+ modules
  const sweeps = [
    { allSelected: false, boltType: "Bearing_Bolt", weldType: "Fillet", connectivity: CONN_CFBW },
    { allSelected: true, boltType: "Friction_Grip_Bolt", weldType: "Groove", connectivity: CONN_CWBW },
    { allSelected: false, boltType: "Friction_Grip_Bolt", weldType: "Fillet", connectivity: "Beam-Beam" },
    { allSelected: true, boltType: "Bearing_Bolt", weldType: "Groove", connectivity: "Beam-Column" },
  ];

  sweeps.forEach(({ allSelected, boltType, weldType, connectivity }) => {
    const mockInputs = {};
    standardInputs.forEach(key => {
      mockInputs[key] = `__TRACER_VAL__:${key}`;
    });
    // Force specific conditional flag overrides to satisfy path conditions in parameter builders
    if (standardInputs.includes("bolt_type")) mockInputs.bolt_type = boltType;
    if (standardInputs.includes("weld_type")) mockInputs.weld_type = weldType;
    if (standardInputs.includes("connectivity")) mockInputs.connectivity = connectivity;

    const mockAllSelected = {};
    standardInputs.forEach(key => {
      mockAllSelected[key] = allSelected;
    });

    const mockLists = new Proxy({}, {
      get(target, prop) {
        let match = Object.keys(INPUT_KEY_TO_LIST).find(
          (k) => INPUT_KEY_TO_LIST[k] === prop
        );
        if (!match) {
          const possibleKey = prop.replace(/List$/, "").replace(/Select$/, "");
          match = standardInputs.find(k => {
            const normK = k.toLowerCase().replace(/_/g, "");
            const normP = possibleKey.toLowerCase().replace(/_/g, "");
            return normK.includes(normP) || normP.includes(normK);
          }) || possibleKey;
        }
        return [`__TRACER_VAL__:${match}`];
      }
    });

    try {
      const result = moduleConfig.buildSubmissionParams(mockInputs, mockAllSelected, mockLists, {});

      Object.entries(result).forEach(([osiKey, val]) => {
        if (typeof val === "string" && val.startsWith("__TRACER_VAL__:")) {
          addTarget(allSelected ? guessedMap : exactMap, osiKey, val.split(":")[1]);
        } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string" && val[0].startsWith("__TRACER_VAL__:")) {
          addTarget(allSelected ? guessedMap : exactMap, osiKey, val[0].split(":")[1]);
        }
      });
    } catch {
      // Gracefully continue to next pass
    }
  });

  // Global baseline aliases for keys not returned by buildSubmissionParams
  const baselineAliases = {
    [KEY_DP_BOLT_HOLE_TYPE]: "bolt_hole_type",
    [KEY_D]: "bolt_diameter",
    [KEY_GRD]: "bolt_grade",
    [KEY_DP_BOLT_SLIP_FACTOR]: "bolt_slip_factor",
    [KEY_DP_BOLT_TYPE]: "bolt_tension_type",
    [KEY_TYP]: "bolt_type",
    [KEY_CONNECTOR_MATERIAL]: "connector_material",
    [KEY_PLATETHK]: "plate_thickness",
    [KEY_FLANGEPLATE_THICKNESS]: "flange_plate_thickness",
    [KEY_WEBPLATE_THICKNESS]: "web_plate_thickness",
    [KEY_ANGLE_LIST]: "angle_list",
    [KEY_SEC_PROFILE]: "section_profile",
    [KEY_SECTION_PROFILE]: "section_profile",
    "Section Profile": "section_profile",
    [KEY_END1]: "end_condition_1",
    [KEY_END2]: "end_condition_2",
    [KEY_END1_Y]: "end_condition_1_y",
    [KEY_END2_Y]: "end_condition_2_y",
    [KEY_ACTUAL_LEN_ZZ]: "actual_length_zz",
    [KEY_ACTUAL_LEN_YY]: "actual_length_yy",
    [KEY_LENZZ]: "actual_length_zz",
    [KEY_LENYY]: "actual_length_yy",
    [KEY_DP_DESIGN_METHOD]: "design_method",
    [KEY_DP_DETAILING_CORROSIVE_INFLUENCES]: "detailing_corr_status",
    [KEY_DP_DETAILING_EDGE_TYPE]: "detailing_edge_type",
    [KEY_DP_DETAILING_GAP]: "detailing_gap",
    [KEY_DESIGN_FOR]: "design_for",
    [KEY_AXIAL]: "load_axial",
    [KEY_AXIAL_FORCE]: "axial_force",
    [KEY_SHEAR]: "load_shear",
    [KEY_MOMENT]: "load_moment",
    [KEY_MATERIAL]: "material",
    [KEY_PLATE1_THICKNESS]: "plate1_thickness",
    [KEY_PLATE2_THICKNESS]: "plate2_thickness",
    [KEY_PLATE_WIDTH]: "plate_width",
    [KEY_DP_WELD_FAB]: "weld_fab",
    [KEY_DP_WELD_MATERIAL_G_O]: "weld_material_grade",
    [KEY_WELD_SIZE]: "weld_size",
    [KEY_WELD_TYPE]: "weld_type"
  };

  // The sweeps can also reach list keys the form does not own (an "All" selection reads
  // the full list); keep only real form fields when there are any.
  const formKeys = new Set([
    ...standardInputs,
    ...(moduleConfig.inputSections || []).flatMap((section) => (section.fields || []).map((field) => field.key)),
  ]);
  const keyMap = { ...guessedMap, ...exactMap };
  Object.entries(keyMap).forEach(([osiKey, targets]) => {
    const real = targets.filter((target) => formKeys.has(target));
    if (real.length > 0) keyMap[osiKey] = real;
  });

  const aliases = {};
  Object.entries({ ...baselineAliases, ...(moduleConfig.osiKeyAliases || {}) }).forEach(([osiKey, formKey]) => {
    aliases[osiKey] = [formKey];
  });
  return { ...aliases, ...keyMap };
}
