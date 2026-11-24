/**
 * What the Defaults button of Additional Inputs shows.
 *
 * The server's answer (`/design-preferences/defaults/`, core-derived) is what a pref is set to
 * wherever the core has a default. The form's own fallbacks (`getDefaultPrefs`) only fill the fields the
 * core did not default (the Optimization tabs), so they never replace a value the core gave.
 *
 * @param {Object} serverDefaults - `default_pref_inputs` of the answer, in form field names
 * @param {Object} [metadata] - `metadata` of the answer (field names): `defaulted_keys` are the fields the core
 *   defaulted, `linked_pref_keys` the ones it copies from the dock, and the server decides both
 * @param {(serverDefaults: Object) => Object} formFallbacks - the form's own defaults for the module
 */
export const withFormDefaults = (serverDefaults, metadata, formFallbacks) => {
  const defaulted = new Set([...(metadata?.defaulted_keys || []), ...(metadata?.linked_pref_keys || [])]);
  const fallbacks = formFallbacks(serverDefaults) || {};
  const open = Object.fromEntries(Object.entries(fallbacks).filter(([field]) => !defaulted.has(field)));
  return { ...serverDefaults, ...open };
};

/**
 * Section details after the server answered: a section the answer does not describe stays as it is
 * shown. The defaults request carries no section choice a user made in the dialog, so it can come back
 * without the section's properties, which would blank the tab.
 *
 * @param {Object} answered - `section_details` of the answer, role -> row
 * @param {Object} shown - the section details on screen, role -> row
 */
export const keepShownSections = (answered, shown) => {
  const next = { ...(shown || {}), ...(answered || {}) };
  for (const [role, row] of Object.entries(answered || {})) {
    if (!row || Object.keys(row).length === 0) next[role] = (shown || {})[role] ?? row;
  }
  return next;
};
