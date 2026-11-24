// Bugs the sweep found and has not fixed. An entry is the exact list the test sees today, so the
// sweep stays green while it stays that way and fails the moment the behaviour changes (fixed or
// worse): then update or remove the entry.

/** Additional Inputs changes that are not there after Save and reopening the dialog, by module id. */
export const KNOWN_LOST_CHANGES = {};

/**
 * Fields that show another value after a saved .osi file is loaded into a fresh page, by module
 * id. Each is "label: before -> after". The Design requests are identical (that is asserted
 * separately and strictly).
 */
export const KNOWN_ROUND_TRIP_ROW_DIFFS = {};
