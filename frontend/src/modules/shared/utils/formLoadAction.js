/**
 * What a page does with its form once the auth state and the option lists are known and the URL names
 * `projectId` (null for a new design).
 *
 * A page that opens without a project already holds the defaults (the form state starts from
 * `defaultInputs`), and by now it also holds what the page filled in since (the dock Material copied to
 * the Additional Inputs materials, the first option of a list). Setting the defaults again then wipes
 * that, and when the lists or the auth state arrive after the first sync it wipes it for good, so only a
 * form that was filled from a project or a file is set back to the defaults.
 *
 * @returns {"load-project" | "keep-prefill" | "keep-defaults" | "reset-defaults"}
 */
export const formLoadAction = ({ projectId, formHoldsDefaults, hasPrefill }) => {
  if (projectId) return "load-project";
  if (hasPrefill) return "keep-prefill";
  return formHoldsDefaults ? "keep-defaults" : "reset-defaults";
};
