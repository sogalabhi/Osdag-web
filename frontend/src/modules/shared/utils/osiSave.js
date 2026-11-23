import { KEY_DISP_SEATED_ANGLE } from "../../../constants/generated/coreKeys";
import { expandAllSelectedInputs } from "./osiInputSerializer";

/**
 * The one place that turns form state into the content of a saved `.osi` file.
 *
 * The content is the module's design request (`buildSubmissionParams`, with every "All"
 * list expanded) plus one `Pref.<key>` entry per Additional Inputs override. The backend
 * (`saveOSIFromInputs`) writes it out as YAML.
 */

/** The module id and project name the save sends along with the content. */
export const getOsiSaveIdentity = ({ moduleConfig, inputs }) => ({
  moduleId: moduleConfig?.designType || inputs?.module || moduleConfig?.cameraKey || KEY_DISP_SEATED_ANGLE,
  projectName: inputs?.project_name || inputs?.name || moduleConfig?.sessionName || "project",
});

/**
 * @param {Object} state
 * @param {Object} state.moduleConfig - the module config (its `buildSubmissionParams` builds the request)
 * @param {Object} state.inputs - current form inputs
 * @param {Object} state.allSelected - map of input key -> true when "All" is selected
 * @param {Object} state.contextData - the module's option lists
 * @param {Object} state.extraState - the module's extra state (connectivity, profile, ...)
 * @param {Object} state.designPrefOverrides - Additional Inputs overrides
 * @returns {Object} the content object for `saveOSIFromInputs`
 */
export const buildOsiSaveContent = ({
  moduleConfig,
  inputs,
  allSelected,
  contextData,
  extraState,
  designPrefOverrides,
}) => {
  const inputsForSave = expandAllSelectedInputs(inputs, allSelected, contextData);

  let content = {};
  if (moduleConfig && typeof moduleConfig.buildSubmissionParams === "function") {
    try {
      content = moduleConfig.buildSubmissionParams(inputsForSave, allSelected, contextData, extraState) || {};
    } catch (e) {
      console.warn("Failed to dynamically build flat parameters, falling back to raw inputs:", e);
      content = { ...inputsForSave };
    }
  } else {
    content = { ...inputsForSave };
  }

  Object.entries(designPrefOverrides || {}).forEach(([key, val]) => {
    content[`Pref.${key}`] = val;
  });

  return content;
};
