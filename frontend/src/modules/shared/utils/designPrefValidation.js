/**
 * Save check for the Additional Inputs dialog: every value the dialog holds must be filled in.
 * Keys that name a designation or a type are skipped.
 */
import {
  KEY_DP_DESIGN_METHOD,
  KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
  KEY_DP_DETAILING_EDGE_TYPE,
  KEY_DP_WELD_FAB,
  KEY_DP_WELD_MATERIAL_G_O,
} from "../../../constants/generated/coreKeys";

/** What Save sends to the server: the dialog state, plus the Base Plate core-key copies. */
export function buildPrefDraft(designPrefInputs, module) {
  const draft = { ...designPrefInputs };
  if (module === "Base Plate") {
    draft[KEY_DP_WELD_FAB] = draft.weld_fab;
    draft[KEY_DP_WELD_MATERIAL_G_O] = draft.weld_material_grade;
    draft[KEY_DP_DETAILING_EDGE_TYPE] = draft.detailing_edge_type;
    draft[KEY_DP_DETAILING_CORROSIVE_INFLUENCES] = draft.detailing_corr_status;
    draft[KEY_DP_DESIGN_METHOD] = draft.design_method;
  }
  return draft;
}

/** Name of the first empty field in a draft, or null when every field is filled. */
export function findEmptyPrefField(draft) {
  for (const [key, value] of Object.entries(draft)) {
    if (key.includes("Designation") || key.includes("Type")) continue;
    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return key
        .replace(/^(DesignPreferences\.)?Anchor_Bolt\./, "")
        .replace(/_/g, " ")
        .replace(/\./g, " ");
    }
  }
  return null;
}
