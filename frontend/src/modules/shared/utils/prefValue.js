/**
 * An Additional Inputs value as the design request sends it: as text, or left out (undefined,
 * which JSON drops) when the form holds none. The web invents no Additional Inputs: what the user
 * did not save the backend fills from the core (`design_dictionary.fill_prefs`), as the desktop
 * does when its dialog was never opened.
 */
export const prefText = (value) => (value == null || value === "" ? undefined : String(value));
