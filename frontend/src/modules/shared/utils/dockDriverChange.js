/**
 * What a commit that moved the dock driver (the dock Material, the anchor bolt type of the base
 * plate) means for the saved Additional Inputs.
 *
 * On the desktop a file load does not count as the user changing the dock: `loadDesign_inputs`
 * sets `ui_loaded` to False around `setDictToUserInputs`, and `clear_design_pref_dictionary`
 * clears the saved Additional Inputs only `if self.ui_loaded`. So the material rows of a file
 * survive a load whose dock Material differs from the one before, and go only when the user
 * changes the dock afterwards.
 *
 * On the web a load (a file, a saved project, an example, a reset) replaces the form inputs and
 * the saved overrides in one commit, as `loadStateFromOsi` does, and always with a new overrides
 * object. A user's edit of the dock moves the dock driver and leaves the overrides object as it was.
 *
 * @param {object}      commit
 * @param {string|null} commit.previousSnapshot  JSON of the dock driver fields at the previous commit (null before the first)
 * @param {string}      commit.snapshot          the same, now
 * @param {*}           commit.previousOverrides the saved overrides at the previous commit
 * @param {*}           commit.overrides         the saved overrides now
 * @returns {"none" | "load" | "user"} the dock driver did not move | a load moved it | the user moved it
 */
export function dockDriverChange({ previousSnapshot, snapshot, previousOverrides, overrides }) {
  if (previousSnapshot === null || previousSnapshot === snapshot) return "none";
  return previousOverrides !== overrides ? "load" : "user";
}

/**
 * The design-pref sync a commit that moved the dock driver starts: "refresh" makes the dock win and
 * copies it to every linked row; after a load the rows are the file's, so only "open" runs, which
 * fills a row the file lacks and keeps the rows it holds (`merge_design_pref_sync`).
 */
export const dockSyncOperation = (change) => (change === "load" ? "open" : "refresh");

/** Whether a commit that moved the dock driver clears every saved Additional Input (the user's edit only). */
export const shouldClearOverridesOnDockChange = (commit) => dockDriverChange(commit) === "user";
