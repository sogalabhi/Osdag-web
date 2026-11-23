import { INPUT_KEY_TO_LIST } from '../constants/moduleDataKeys';

/**
 * Expands inputs for "All" selections using contextData and INPUT_KEY_TO_LIST.
 * @param {Object} baseInputs - Current form inputs
 * @param {Object} allSelected - Map of inputKey -> true when "All" is selected
 * @param {Object} contextData - Module lists (e.g. boltDiameterList, angleList)
 */
export const expandAllSelectedInputs = (baseInputs, allSelected, contextData = {}) => {
  const expanded = { ...baseInputs };
  Object.entries(INPUT_KEY_TO_LIST).forEach(([inputKey, listKey]) => {
    if (allSelected?.[inputKey]) {
      const fullList = Array.isArray(contextData[listKey]) ? contextData[listKey] : [];
      expanded[inputKey] = Array.isArray(fullList)
        ? fullList.map((val) => {
            if (typeof val === 'object' && val !== null) {
              return val.value || val.Grade || String(val);
            }
            return String(val);
          })
        : [];
    }
  });
  return expanded;
};
