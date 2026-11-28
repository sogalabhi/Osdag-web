/**
 * Resolve raw options for a field from contextData or field config.
 * @param {Object} field - Field config (options, getOptions, type)
 * @param {Object} contextData - Module lists (e.g. beamList, boltDiameterList)
 * @param {Object} inputs - Current form inputs (for getOptions / dynamicSelect)
 * @returns {Array} Raw list (array of values or { value, label } objects)
 */
export function getOptionsForField(field, contextData = {}, inputs = {}) {
  if (!field) return [];
  if (Array.isArray(field.options)) return field.options;
  if (typeof field.getOptions === 'function') return field.getOptions(inputs, contextData) || [];
  if (typeof field.options === 'string') return contextData[field.options] ?? [];
  if (field.type === 'sectionProfileList') return contextData[field.type] ?? contextData.sectionProfileList ?? [];
  return [];
}

/**
 * The list of a module data list key (for "All" / customizable).
 * @param {Object} contextData - Module lists
 * @param {string} [dataSource] - The field's `dataSource`
 * @returns {Array}
 */
export function getListForDataSource(contextData = {}, dataSource) {
  const list = dataSource ? contextData[dataSource] : undefined;
  return Array.isArray(list) ? list : [];
}

/**
 * The text an option stands for: `value`, else `Grade` of an option object, else the option itself.
 */
export function optionText(option) {
  if (typeof option === 'object' && option !== null) {
    return option.value || option.Grade || String(option);
  }
  return String(option);
}

/**
 * Turn a list into react-select options `{ value, label }`. A list already in that shape is kept;
 * object items take their text from the first of value, label, Grade, grade, Designation,
 * designation, name, section or id; any other item is its own value and label.
 */
export function toSelectOptions(list = []) {
  if (!list || list.length === 0) return [];
  if (typeof list[0] === 'object' && list[0] !== null) {
    if ('value' in list[0] && 'label' in list[0]) return list;
    return list.map((item) => {
      const val =
        item.value ??
        item.label ??
        item.Grade ??
        item.grade ??
        item.Designation ??
        item.designation ??
        item.name ??
        item.section ??
        item.id ??
        String(item);
      return { value: val, label: val };
    });
  }
  return list.map((item) => ({ value: item, label: item }));
}

/**
 * An option's text without case and whitespace, for comparing a stored value with an option.
 */
export function comparableOption(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * The value of the first option of a list: its `value` (or `Grade`) when it is an object, else the option.
 */
export function firstOptionValue(list) {
  const first = list[0];
  if (typeof first === 'object' && first !== null) {
    if ('value' in first) return first.value;
    if ('Grade' in first) return first.Grade;
  }
  return first;
}
