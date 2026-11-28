/**
 * The design request of a module, built from its `coreKeys` and its input fields.
 *
 * `makePayloadBuilder(config, options)` returns the module's `buildSubmissionParams`. For every
 * form field of `config.coreKeys` that feeds one core key it writes
 * - a customizable field (one with a `selectionKey`): the whole option list of the field when its
 *   "All" is selected, else the picked values. The option list is the field's `dataSource` list of
 *   the module data, or the one its `getDynamicDataSource` returns;
 * - an Additional Inputs field (`PREF_CORE_KEYS` and the three Additional Inputs materials): the
 *   saved value as text, left out when the form holds none;
 * - any other field: its value as text.
 *
 * A module with exceptions passes `options`:
 * - `skip`: form fields the builder leaves to the hook (fields that share a core key, or that a
 *   condition decides);
 * - `plain` and `pref`: how a value of the other fields / of the Additional Inputs fields is written
 *   (`String` and `prefText` by default);
 * - `lists`: how a customizable field is written, `(all, fullList, picked) => list`;
 * - `hook(params, context)`: gets the request built so far and `{ inputs, allSelected, lists,
 *   extraState }`, and returns the request to send.
 */
import { PREF_CORE_KEYS } from "../config/prefCoreKeys";
import { prefText } from "./prefValue";

const PREF_FIELDS = new Set([
  ...Object.keys(PREF_CORE_KEYS),
  "connector_material",
  "supported_material",
  "supporting_material",
]);

const withoutAll = (list) => list.filter((item) => item !== "All");

/** The picked values, or the whole list, as an array that leaves out an "All" entry. */
export const listValue = (all, fullList, picked) => {
  if (all) return withoutAll(fullList || []);
  return withoutAll(Array.isArray(picked) ? picked : [picked]);
};

/** The picked values, or the whole list, as they are. */
export const rawListValue = (all, fullList, picked) => (all ? fullList : picked);

const fieldsOf = (config) =>
  Object.fromEntries(
    (config.inputSections || []).flatMap((section) => section.fields || []).map((field) => [field.key, field]),
  );

/** The whole option list of a customizable field. */
export const fullListOf = (field, inputs, lists) => {
  if (typeof field.getDynamicDataSource === "function") return field.getDynamicDataSource(inputs, lists) || [];
  return lists?.[field.dataSource];
};

export function makePayloadBuilder(config, options = {}) {
  const { skip = [], plain = String, pref = prefText, lists: listWriter = listValue, hook } = options;
  const skipped = new Set(skip);
  const fields = fieldsOf(config);

  return (inputs, allSelected = {}, lists = {}, extraState = {}) => {
    const params = {};
    for (const [formKey, coreKey] of Object.entries(config.coreKeys)) {
      if (typeof coreKey !== "string" || skipped.has(formKey)) continue;
      const field = fields[formKey];
      if (field?.selectionKey) {
        params[coreKey] = listWriter(allSelected[formKey], fullListOf(field, inputs, lists), inputs[formKey]);
      } else if (PREF_FIELDS.has(formKey)) {
        params[coreKey] = pref(inputs[formKey]);
      } else {
        params[coreKey] = plain(inputs[formKey]);
      }
    }
    return hook ? hook(params, { inputs, allSelected, lists, extraState }) : params;
  };
}
