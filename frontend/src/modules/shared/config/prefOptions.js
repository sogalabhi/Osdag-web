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

/** The design method a module starts with: the one option that can be picked. */
export const DEFAULT_DESIGN_METHOD = DESIGN_METHOD_OPTIONS[0].value;
