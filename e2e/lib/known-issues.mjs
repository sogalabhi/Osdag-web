// Bugs the sweep found and has not fixed. An entry is the exact list the test sees today, so the
// sweep stays green while it stays that way and fails the moment the behaviour changes (fixed or
// worse): then update or remove the entry.

/** Additional Inputs changes that are not there after Save and reopening the dialog, by module id. */
export const KNOWN_LOST_CHANGES = {
  // Cover plate modules: the section tab's Material goes back to the dock Material on reopening
  // (the shear, tension, strut, beam and base plate modules keep it).
  'Column-to-Column Cover Plate Bolted Connection': ['Column Section* / Material *: E 250 (Fe 410 W)A -> E 165 (Fe 290) not kept'],
  'Column-to-Column Cover Plate Welded Connection': ['Column Section* / Material *: E 165 (Fe 290) -> E 250 (Fe 410 W)A not kept'],
  'Beam-to-Beam Cover Plate Bolted Connection': ['Beam Section* / Material *: E 250 (Fe 410 W)A -> E 165 (Fe 290) not kept'],
  'Beam-to-Beam Cover Plate Welded Connection': ['Beam Section* / Material *: E 165 (Fe 290) -> E 250 (Fe 410 W)A not kept'],
};

/**
 * Fields that show another value after a saved .osi file is loaded into a fresh page, by module
 * id. Each is "label: before -> after". The Design requests are identical (that is asserted
 * separately and strictly).
 */
export const KNOWN_ROUND_TRIP_ROW_DIFFS = {};

/**
 * Keys of the default Design request that the app sets late and not always: in these modules the
 * dock Material (E 250) is copied to the Additional Inputs materials by a refresh after the page
 * loads, and in a share of the loads (about every second one with four browsers running) the request
 * is sent with the older E 165 values, or without them (base plate). The default request is
 * compared without these keys; `E2E_RACE=1` runs a test that checks them and fails on the race.
 */
export const RACY_DEFAULT_KEYS = {
  'Cleat Angle Connection': ['Member.Supported_Section.Material', 'Member.Supporting_Section.Material'],
  'Header Plate Connection': ['Member.Supported_Section.Material', 'Member.Supporting_Section.Material'],
  'Seated Angle Connection': ['Member.Supported_Section.Material', 'Member.Supporting_Section.Material'],
  'Base Plate Connection': ['Member.Material', 'Base_Plate.Material', 'Stiffener_Key.Material'],
};

/** A Design request body without the keys of RACY_DEFAULT_KEYS for the module. */
export const withoutRacyKeys = (moduleId, body) => {
  const racy = RACY_DEFAULT_KEYS[moduleId] || [];
  return { ...body, inputs: Object.fromEntries(Object.entries(body.inputs).filter(([key]) => !racy.includes(key))) };
};
