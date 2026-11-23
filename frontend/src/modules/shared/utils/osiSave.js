import { KEY_DISP_SEATED_ANGLE } from "../../../constants/generated/coreKeys";
import { expandAllSelectedInputs } from "./osiInputSerializer";

/**
 * The one place that turns form state into the design dictionary: the content of a saved
 * `.osi` file and the `inputs_json` of a saved project.
 *
 * The dictionary is a flat `{ core key: value }` object, as the desktop writes. It is the module's
 * design request (`buildSubmissionParams`, run on the dock inputs with the Additional Inputs
 * merged in, every "All" list expanded), plus the Additional Inputs the request does not carry,
 * written under the core keys their field declares in `config.coreKeys`. The backend writes it
 * out as YAML as it is. `fromDesignDictionary` reads it back.
 */

/** The module id and project name the save sends along with the content. */
export const getOsiSaveIdentity = ({ moduleConfig, inputs }) => ({
  moduleId: moduleConfig?.designType || inputs?.module || moduleConfig?.cameraKey || KEY_DISP_SEATED_ANGLE,
  projectName: inputs?.project_name || inputs?.name || moduleConfig?.sessionName || "project",
});

/** The core keys an Additional Inputs entry is saved under: the ones its field declares, none for a name no field declares. */
const coreKeysOf = (config, field) => {
  const declared = config?.coreKeys?.[field];
  return declared == null ? [] : [].concat(declared);
};

/**
 * @param {Object} state
 * @param {Object} state.moduleConfig - the module config (its `buildSubmissionParams` builds the request)
 * @param {Object} state.inputs - current form inputs
 * @param {Object} state.allSelected - map of input key -> true when "All" is selected
 * @param {Object} state.contextData - the module's option lists
 * @param {Object} state.extraState - the module's extra state (connectivity, profile, ...)
 * @param {Object} state.designPrefOverrides - Additional Inputs overrides
 * @returns {Object} the design dictionary
 */
export const toDesignDictionary = ({
  moduleConfig,
  inputs,
  allSelected,
  contextData,
  extraState,
  designPrefOverrides,
}) => {
  const inputsForSave = expandAllSelectedInputs(inputs, allSelected, contextData);
  const prefs = designPrefOverrides || {};

  let dictionary = {};
  if (moduleConfig && typeof moduleConfig.buildSubmissionParams === "function") {
    try {
      // The Design button merges the Additional Inputs into the dock inputs before it builds the request.
      dictionary = moduleConfig.buildSubmissionParams({ ...inputsForSave, ...prefs }, allSelected, contextData, extraState) || {};
    } catch (e) {
      console.warn("Failed to dynamically build flat parameters, falling back to raw inputs:", e);
      dictionary = { ...inputsForSave };
    }
  } else {
    dictionary = { ...inputsForSave };
  }

  // Additional Inputs the request does not carry (the desktop keeps every preference in the file).
  const computed = moduleConfig?.computedCoreKeys || [];
  Object.entries(prefs).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    coreKeysOf(moduleConfig, key).forEach((coreKey) => {
      if (!(coreKey in dictionary) && !computed.includes(coreKey)) dictionary[coreKey] = value;
    });
  });

  return dictionary;
};
