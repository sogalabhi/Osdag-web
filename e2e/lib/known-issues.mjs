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
