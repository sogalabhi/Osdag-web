/**
 * Per-field errors: which form field, or which Additional Inputs tab, a server error belongs to.
 *
 * The backend reports a bad design request as `fields: { <core key>: <message> }`. A module's
 * `coreKeys` says which form field feeds each core key, so inverting it names the field. A core
 * key whose field is not shown in the dock is looked up in the module's Additional Inputs tabs.
 */
import { DESIGN_PREF_TABLES } from "../../../constants/generated/designPrefTables";
import { getDesignPrefTabs } from "../config/designPrefModuleConfig";
import { fieldsByCoreKey } from "./designDictionary";

const normalTabName = (name) => String(name).replace(/\s*\*$/, "*").replace("Optimisation", "Optimization");

const asText = (value) => (typeof value === "string" ? value : JSON.stringify(value));

/** Form fields of the dock by key; images show no value and hold no error. */
const dockFieldsByKey = (config) => {
  const map = new Map();
  for (const section of config.inputSections || []) {
    for (const field of section.fields || []) {
      if (field.key && field.type !== "image") map.set(field.key, field);
    }
  }
  return map;
};

/** Id of the Additional Inputs tab (in the module's tab list) that holds a core key, or null. */
export function prefTabIdForCoreKey(config, coreKey) {
  const entry = (DESIGN_PREF_TABLES[config.designType]?.prefTabs || []).find(([, , keys]) => (keys || []).includes(coreKey));
  if (!entry) return null;
  const wanted = normalTabName(entry[0]);
  const tab = getDesignPrefTabs(config.sessionName).find((candidate) => normalTabName(candidate.name) === wanted);
  return tab ? tab.id : null;
}

/**
 * Sorts the `fields` of an error response.
 *
 * @returns {{
 *   fieldErrors: Record<string, string>,
 *   prefErrors: Array<{ coreKey: string, field: string, message: string, tabId: number }>,
 *   unmapped: Record<string, string>
 * }} `fieldErrors` by form field, `prefErrors` for Additional Inputs rows, and `unmapped` for keys
 *   that have no visible field and no tab.
 */
export function mapServerFieldErrors(config, fields, { inputs = {}, extraState = {} } = {}) {
  const result = { fieldErrors: {}, prefErrors: [], unmapped: {} };
  const dock = dockFieldsByKey(config);
  const owners = fieldsByCoreKey(config);

  for (const [coreKey, raw] of Object.entries(fields || {})) {
    const message = asText(raw);
    const named = owners.get(coreKey) || [];
    const visible = named.filter((id) => {
      const field = dock.get(id);
      return field && (typeof field.conditionalDisplay !== "function" || field.conditionalDisplay(extraState, inputs));
    });
    if (visible.length > 0) {
      for (const id of visible) if (!(id in result.fieldErrors)) result.fieldErrors[id] = message;
      continue;
    }
    const tabId = prefTabIdForCoreKey(config, coreKey);
    if (tabId !== null) {
      result.prefErrors.push({ coreKey, field: named[0] || coreKey, message, tabId });
      continue;
    }
    result.unmapped[coreKey] = message;
  }
  return result;
}
