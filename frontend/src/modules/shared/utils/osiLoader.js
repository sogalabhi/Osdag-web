import { fromDesignDictionary, fromFieldState } from "./designDictionary";

/**
 * Hydrates React state hooks with an input/preference payload.
 *
 * The payload is one of:
 * - a design dictionary, the parsed `.osi` file (core key -> value), read with the module's
 *   declared `coreKeys` (see `fromDesignDictionary`);
 * - nested `{ dock, pref }` (or `{ inputs: { dock, pref } }`) as stored with a project, keyed
 *   by the module's field names.
 */
export function loadStateFromOsi(payload, {
  setInputs,
  setDesignPrefOverrides,
  setExtraState,
  setSelectionStates,
  setAllSelected,
  setSelectedItems,
  moduleConfig,
  safeModuleData = {}
}) {
  if (!payload || !moduleConfig) return;

  const isNested = (payload.dock || payload.pref) || (payload.inputs && (payload.inputs.dock || payload.inputs.pref));
  const state = isNested
    ? fromFieldState(moduleConfig, {
        dock: payload.dock || payload.inputs?.dock,
        pref: payload.pref || payload.inputs?.pref,
      }, safeModuleData)
    : fromDesignDictionary(moduleConfig, payload, safeModuleData);

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
