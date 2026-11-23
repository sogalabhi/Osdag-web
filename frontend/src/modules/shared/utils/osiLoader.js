import { fromDesignDictionary } from "./designDictionary";

/**
 * Hydrates React state hooks from a design dictionary: the parsed `.osi` file or a saved
 * project's `inputs_json` (core key -> value), read with the module's declared `coreKeys`
 * (see `fromDesignDictionary`).
 */
export function loadStateFromOsi(dictionary, {
  setInputs,
  setDesignPrefOverrides,
  setExtraState,
  setSelectionStates,
  setAllSelected,
  setSelectedItems,
  moduleConfig,
  safeModuleData = {}
}) {
  if (!dictionary || !moduleConfig) return;

  const state = fromDesignDictionary(moduleConfig, dictionary, safeModuleData);

  if (setDesignPrefOverrides) setDesignPrefOverrides(state.designPrefOverrides);
  if (setInputs) setInputs(state.inputs);
  if (setAllSelected && Object.keys(state.allSelected).length > 0) {
    setAllSelected(prev => ({ ...prev, ...state.allSelected }));
  }
  if (setSelectionStates && Object.keys(state.selectionStates).length > 0) {
    setSelectionStates(prev => ({ ...prev, ...state.selectionStates }));
  }
  if (setSelectedItems && Object.keys(state.selectedItems).length > 0) {
    setSelectedItems(prev => ({ ...prev, ...state.selectedItems }));
  }
  if (setExtraState && Object.keys(state.extraState).length > 0) {
    setExtraState(prev => ({ ...prev, ...state.extraState }));
  }
}
