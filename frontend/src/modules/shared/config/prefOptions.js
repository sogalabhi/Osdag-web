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
