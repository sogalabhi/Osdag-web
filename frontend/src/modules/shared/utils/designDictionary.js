import { INPUT_KEY_TO_LIST } from "../constants/moduleDataKeys";
import { KEY_CONNECTOR_MATERIAL } from "../../../constants/generated/coreKeys";

/**
 * Turns a design dictionary (core key -> value, the content of a desktop `.osi` file) into
 * the form state of one module, using the module's declared `coreKeys` (field -> core key
 * or keys, see config/CORE_KEYS_README.md) read backwards.
 *
 * - A core key feeds every field that declares it (the supported section feeds both
 *   `beam_section` and `secondary_beam`; each module reads the one its connectivity uses).
 * - A key no field declares is dropped (desktop output-panel state, keys of other modules), and so
 *   is a key the module lists in `computedCoreKeys` (the builder derives it from several fields).
 * - `Pref.<core key>` entries are the Additional Inputs overrides.
 */

// The desktop stores the overall material, the connector material and each member's
// material under separate keys; a web form often has one field for several of them. When
// keys share a field, the more specific key is read last and wins.
const keyPriority = (key) => (key === "Material" ? 0 : key === KEY_CONNECTOR_MATERIAL ? 1 : 2);

const PREF_PREFIX = "Pref.";

const inverted = new WeakMap();

/** core key -> [field, ...], from `config.coreKeys`. */
const fieldsByCoreKey = (config) => {
  let map = inverted.get(config);
  if (!map) {
    map = new Map();
    const computed = config.computedCoreKeys || [];
    for (const [field, declared] of Object.entries(config.coreKeys || {})) {
      if (declared == null || (config.notLoadedFromDictionary || []).includes(field)) continue;
      for (const coreKey of Array.isArray(declared) ? declared : [declared]) {
        if (computed.includes(coreKey)) continue;
        if (!map.has(coreKey)) map.set(coreKey, []);
        if (!map.get(coreKey).includes(field)) map.get(coreKey).push(field);
      }
    }
    inverted.set(config, map);
  }
  return map;
};

/** Splits a design dictionary into the module's dock fields and its Additional Inputs overrides. */
const splitByField = (config, dict) => {
  const map = fieldsByCoreKey(config);
  const dock = {};
  const pref = {};

  Object.entries(dict)
    .sort(([a], [b]) => keyPriority(a) - keyPriority(b))
    .forEach(([key, rawValue]) => {
      const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
      if (key.startsWith(PREF_PREFIX)) {
        pref[key.substring(PREF_PREFIX.length)] = value;
        return;
      }
      (map.get(key) || []).forEach((field) => {
        dock[field] = Array.isArray(value) ? [...value] : value;
      });
    });

  return { dock, pref };
};

// The `.osi` spellings of a few dropdown values differ from the web options.
const normalizeValue = (config, field, value, lists) => {
  const baseDefaults = config.defaultInputs || {};
  let finalVal = String(value);

  if (field === "bolt_type") {
    let boltTypeField = null;
    for (const sec of config.inputSections || []) {
      const found = sec.fields?.find((f) => f.key === "bolt_type");
      if (found) {
        boltTypeField = found;
        break;
      }
    }
    if (boltTypeField && Array.isArray(boltTypeField.options)) {
      const optionValues = boltTypeField.options.map((o) => (typeof o === "object" ? o.value : o));
      if (!optionValues.includes(finalVal)) {
        const valWithUnderscore = finalVal.replace(/\s+/g, "_");
        const valWithSpace = finalVal.replace(/_/g, " ");
        if (optionValues.includes(valWithUnderscore)) {
          finalVal = valWithUnderscore;
        } else if (optionValues.includes(valWithSpace)) {
          finalVal = valWithSpace;
        }
      }
    }
  }

  if (field === "bolt_tension_type") {
    if (/non[- ]?pretensioned/i.test(finalVal) || /non pre-tensioned/i.test(finalVal)) {
      finalVal = baseDefaults[field]?.includes("pre-tensioned") ? "Non pre-tensioned" : "Non Pre-tensioned";
    } else if (/pretensioned/i.test(finalVal) || /pre-tensioned/i.test(finalVal)) {
      finalVal = "Pre-tensioned";
    }
  }

  if (field === "bolt_hole_type") {
    if (/oversized/i.test(finalVal) || /over-sized/i.test(finalVal)) {
      finalVal = "Over-sized";
    } else if (/standard/i.test(finalVal)) {
      finalVal = "Standard";
    }
  }

  if (field === "material" && lists.materialList) {
    const matched = lists.materialList.find((m) => {
      const g = String(m.Grade || m.value || m).trim();
      return g === finalVal.trim() || finalVal.trim().startsWith(g) || g.startsWith(finalVal.trim());
    });
    if (matched) {
      finalVal = String(matched.Grade || matched.value || matched);
    }
  }

  return finalVal;
};

/**
 * Builds the form state from the values of a module's fields.
 *
 * @returns {{inputs, designPrefOverrides, allSelected, selectionStates, selectedItems, extraState}}
 *   `allSelected`, `selectionStates`, `selectedItems` and `extraState` hold only what the
 *   loaded values set; the caller merges them into the current state.
 */
const buildState = (config, dock, pref, lists) => {
  // A section profile fixes where the member is connected.
  const profile = dock.section_profile;
  if (profile && (profile === "Channels" || profile === "Back to Back Channels")) {
    dock.location = "Web";
  } else if (profile && profile.includes("Angle") && dock.location !== "Short Leg") {
    dock.location = "Long Leg";
  }

  const inputs = { ...(config.defaultInputs || {}), ...dock };
  const allSelected = {};
  const selectionStates = {};
  const selectedItems = {};

  Object.entries(dock).forEach(([field, value]) => {
    if (value === undefined || value === null) return;

    const selectionItems = (config.selectionConfig || []).filter((item) => item.inputKey === field);

    if (selectionItems.length === 0) {
      inputs[field] = normalizeValue(config, field, value, lists);
      return;
    }

    const list = (Array.isArray(value) ? value : [value]).map((item) => String(item));
    inputs[field] = list;

    selectionItems.forEach((selectionItem) => {
      const listKey = INPUT_KEY_TO_LIST[field];
      const options = listKey ? lists[listKey] : [];

      // "All" is the whole option list.
      let isAll = false;
      if (Array.isArray(options) && options.length > 0 && options.length === list.length) {
        const optionSet = new Set(options.map((o) => String(o.id || o.Grade || o)));
        isAll = list.every((x) => optionSet.has(x));
      }

      allSelected[field] = isAll;
      selectionStates[selectionItem.key] = isAll ? "All" : "Customized";
      selectedItems[field] = isAll ? [] : list;
    });
  });

  // The option dropdown of the end plate modules is the end plate type; elsewhere it is the
  // connectivity.
  const extraState = {};
  const selectedOption = inputs.endPlateType || inputs.connectivity;
  if (selectedOption) extraState.selectedOption = selectedOption;
  if (inputs.section_profile) {
    const img = typeof config.getSectionImage === "function" ? config.getSectionImage(inputs.section_profile) : null;
    extraState.selectedProfile = inputs.section_profile;
    if (img) extraState.imageSource = img;
  }

  return { inputs, designPrefOverrides: pref, allSelected, selectionStates, selectedItems, extraState };
};

/**
 * Form state from a design dictionary (core keys, as in a desktop `.osi` file).
 *
 * @param {Object} config - the module config (`coreKeys`, `defaultInputs`, `selectionConfig`, ...)
 * @param {Object} dict - flat `{ "Bolt.Diameter": [...], "Material": "...", "Pref.Detailing.Gap": "5", ... }`
 * @param {Object} lists - the module's option lists (`boltDiameterList`, `materialList`, ...)
 */
export function fromDesignDictionary(config, dict, lists = {}) {
  const { dock, pref } = splitByField(config, dict || {});
  return buildState(config, dock, pref, lists);
}

/**
 * Form state from a stored project: `{ dock, pref }` keyed by the module's own field names,
 * as `useProjectCreation` and the design run save it.
 */
export function fromFieldState(config, { dock, pref }, lists = {}) {
  return buildState(config, { ...(dock || {}) }, pref || {}, lists);
}
