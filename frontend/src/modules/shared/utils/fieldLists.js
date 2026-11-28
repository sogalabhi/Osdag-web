/**
 * The customizable lists of a module, read from its input fields.
 *
 * A field declares a list that can be "All" or "Customized" with `selectionKey` (the state that holds
 * the choice), `modalKey` (the state of its selection dialog) and `dataSource` (the module data list
 * that holds all of its options). From these a module's
 * - `selectionConfig` has one `{ key, inputKey, defaultValue }` entry for each `selectionKey`;
 * - `modalConfig` has one `{ key, inputKey, dataSource }` entry for each `modalKey` (`dataSource` is
 *   null when the options are computed by the field's `getDynamicDataSource`);
 * - `inputKeyToList` maps each such field's key to its `dataSource`.
 */

const declaredFields = (config) =>
  (config.inputSections || []).flatMap((section) => section.fields || []);

/** The `selectionConfig` entries the fields declare. */
export const deriveSelectionConfig = (config) =>
  declaredFields(config)
    .filter((field) => field.selectionKey)
    .map((field) => ({ key: field.selectionKey, inputKey: field.key, defaultValue: 'All' }));

/** The `modalConfig` entries the fields declare. */
export const deriveModalConfig = (config) =>
  declaredFields(config)
    .filter((field) => field.modalKey)
    .map((field) => ({ key: field.modalKey, inputKey: field.key, dataSource: field.dataSource ?? null }));

/** The module data list of each customizable field that names one. */
export const deriveInputKeyToList = (config) =>
  Object.fromEntries(
    declaredFields(config)
      .filter((field) => (field.selectionKey || field.modalKey) && field.dataSource)
      .map((field) => [field.key, field.dataSource]),
  );

/**
 * Give a module config the `selectionConfig`, `modalConfig` and `inputKeyToList` its fields declare.
 *
 * `extraSelections` lists selections that no field declares but the module still holds state for,
 * as `{ key, inputKey }` entries.
 *
 * @returns the same config object
 */
export function applyFieldLists(config, { extraSelections = [] } = {}) {
  config.selectionConfig = [
    ...deriveSelectionConfig(config),
    ...extraSelections.map((entry) => ({ defaultValue: 'All', ...entry })),
  ];
  config.modalConfig = deriveModalConfig(config);
  config.inputKeyToList = deriveInputKeyToList(config);
  return config;
}
