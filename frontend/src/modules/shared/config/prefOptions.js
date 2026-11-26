/**
 * The values the Additional Inputs dropdowns offer, in the core's own spelling: what the dialog
 * shows is what the design request sends, and the core only knows these spellings.
 */
import { KEY_DP_FAB_FIELD, KEY_DP_FAB_SHOP } from "../../../constants/generated/coreKeys";

/** Weld.Fab (KEY_DP_WELD_FAB_VALUES in the core): the fabrication tab of every module with a weld tab. */
export const WELD_FAB_OPTIONS = [KEY_DP_FAB_SHOP, KEY_DP_FAB_FIELD];

/**
 * Weld.Type of the butt and lap joint welded modules, whose core module lists 'Shop weld' and
 * 'Field weld' (lowercase w) for its one weld dropdown. The form field is `weld_fab` there too.
 */
export const WELD_TYPE_OPTIONS = ["Shop weld", "Field weld"];

/**
 * Bolt.TensionType (KEY_DP_BOLT_TYPE): the Bolt tab's Type, `bolt_values` in design_type/main.py, which lists
 * 'Pre-tensioned' and 'Non pre-tensioned' (lowercase p) for every module that has the tab.
 */
export const BOLT_PRE_TENSIONED = "Pre-tensioned";
export const BOLT_NON_PRE_TENSIONED = "Non pre-tensioned";
export const BOLT_TENSION_TYPE_OPTIONS = [BOLT_PRE_TENSIONED, BOLT_NON_PRE_TENSIONED];

/** The modules whose weld tab is Weld.Type, not Weld.Fab. */
const WELD_TYPE_MODULES = ["Butt Joint Welded", "Lap Joint Welded"];

/** The weld options of a module's weld tab (`module` is the session name `designPrefModuleConfig` is keyed by). */
export const weldOptionsFor = (module) => (WELD_TYPE_MODULES.includes(module) ? WELD_TYPE_OPTIONS : WELD_FAB_OPTIONS);

/**
 * Design.Design_Method: the core's dropdown (`design_values` in design_type/main.py) lists these three; only
 * 'Limit State Design' is implemented, so the other two are shown and cannot be picked, as in the desktop.
 */
export const DESIGN_METHOD_OPTIONS = [
  { value: "Limit State Design", disabled: false },
  { value: "Limit State (capacity based) Design", disabled: true },
  { value: "Working Stress Design", disabled: true },
];

/**
 * Base Plate Analysis (KEY_DP_DESIGN_BASE_PLATE, label KEY_DISP_DP_DESIGN_BASE_PLATE): the second box of the base plate's
 * Design tab (`design_values` in design_type/connection/base_plate_connection.py). The core lists one method, so it can
 * be shown but not changed.
 */
export const BASE_PLATE_ANALYSIS_OPTIONS = ["Effective Area Method"];

/** The design method a module starts with: the one option that can be picked. */
export const DEFAULT_DESIGN_METHOD = DESIGN_METHOD_OPTIONS[0].value;

/**
 * The Optimization tab of the simply supported and the cantilever beam (`optimization_tab_flexure_design` in
 * design_type/member.py). The five values are the core's own keys (`Optimum.Class`, `Effective.Area_Para`,
 * `Loading.Condition`, `Length.Overwrite`, `Bearing.Length`); the defaults are those of the core's
 * `get_values_for_design_pref`, which the design reads from the request.
 */
export const FLEXURE_OPTIMIZATION_DEFAULTS = {
  allowable_class: "Yes",
  effective_area_parameter: "1.0",
  loading_condition: "Normal",
  length_overwrite: "NA",
  bearing_length: "NA",
};

/** Optimum.Class: the core offers Yes and No. */
export const ALLOW_CLASS_OPTIONS = ["Yes", "No"];

/** Loading.Condition (KEY_DISP_LOAD_list in the core). */
export const LOADING_CONDITION_OPTIONS = ["Normal", "Destabilizing"];

/**
 * The Optimization tab of the axially loaded column (`optimization_tab_column_design` in design_type/member.py).
 * The three values are the core's own keys (`Optimum.AllowUR`, `Optimum.Para`, `Effective.Area_Para`); the
 * defaults are those of the core's `get_values_for_design_pref`, which the design reads from the request.
 */
export const COLUMN_OPTIMIZATION_DEFAULTS = {
  allow_ur: "1.0",
  optimum_para: "Utilization Ratio",
  effective_area_parameter: "1.0",
};

/** Optimum.Para: the one option the core's tab offers (the Cost option is commented out there). */
export const OPTIMIZATION_PARA_OPTIONS = ["Utilization Ratio"];

/**
 * The Optimization tab of the welded strut (`optimization_tab_strut_design` in design_type/member.py). The tab is built
 * from the section profile (`VALUES_SEC_PROFILE_Compression_Strut`): the single angle, and the back to back angles on
 * the same side or on the opposite sides of the gusset. The values are the core's own keys (`Optimum.AllowUR`,
 * `Effective.Area_Para`, ` Out_of_Plane`, ` In_Plane`, `Load.Type`, `Bolt.Number`, `Connector.Plate.Thickness_List`).
 */
export const STRUT_PROFILE_ANGLES = "Angles";
export const STRUT_PROFILE_SAME_SIDE = "Back to Back Angles - Same side of gusset";
export const STRUT_PROFILE_OPPOSITE_SIDE = "Back to Back Angles - Opposite side of gusset";

/** Load.Type (Load_type1, Load_type2 in the core). */
export const STRUT_LOAD_CONCENTRIC = "Concentric Load";
export const STRUT_LOAD_LEG = "Leg Load";

/** The gusset plate thicknesses the tab offers (PLATE_THICKNESS_SAIL in the core). */
export const STRUT_GUSSET_THICKNESS_OPTIONS = [
  "8", "10", "12", "14", "16", "18", "20", "22", "25", "28", "32", "36", "40", "45", "50", "56", "63", "75", "80", "90", "100",
  "110", "120",
];

const isBackToBack = (profile) => profile === STRUT_PROFILE_SAME_SIDE || profile === STRUT_PROFILE_OPPOSITE_SIDE;

/**
 * The rows the core's tab shows for a profile: the load types it offers (the first is the default), whether it lists the
 * gusset plate thickness, and whether it lists the number of bolts (the opposite-side tab leaves it out).
 */
export const strutOptimizationLayout = (profile) => ({
  loadTypes:
    profile === STRUT_PROFILE_SAME_SIDE
      ? [STRUT_LOAD_LEG]
      : profile === STRUT_PROFILE_OPPOSITE_SIDE
        ? [STRUT_LOAD_CONCENTRIC]
        : [STRUT_LOAD_CONCENTRIC, STRUT_LOAD_LEG],
  gusset: isBackToBack(profile),
  boltNumber: profile !== STRUT_PROFILE_OPPOSITE_SIDE,
});

/** The values the core's tab starts with for a profile; the back to back angles start with 0.85 in the plane of the gusset. */
export const strutOptimizationDefaults = (profile) => {
  const layout = strutOptimizationLayout(profile);
  return {
    allow_ur: "1.0",
    effective_area_parameter: "1.0",
    buckling_out_of_plane: "1.0",
    buckling_in_plane: isBackToBack(profile) ? "0.85" : "1.0",
    load_type: layout.loadTypes[0],
    ...(layout.boltNumber ? { bolt_number: "1.0" } : {}),
    ...(layout.gusset ? { plate_thickness: "8" } : {}),
  };
};

/** Every form field the welded strut's Optimization tab can hold (which of them a profile shows is `strutOptimizationLayout`). */
export const STRUT_OPTIMIZATION_FIELDS = [
  "allow_ur",
  "effective_area_parameter",
  "buckling_out_of_plane",
  "buckling_in_plane",
  "load_type",
  "bolt_number",
  "plate_thickness",
];
