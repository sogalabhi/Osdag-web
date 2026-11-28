import { KEY_CONNECTOR_MATERIAL } from "../../../constants/generated/coreKeys";
import { DESIGN_PREF_TABLES } from "../../../constants/generated/designPrefTables";
import { BOLT_NON_PRE_TENSIONED, BOLT_PRE_TENSIONED } from "../config/prefOptions";

/**
 * Turns a design dictionary (core key -> value, the content of a desktop `.osi` file) into
 * the form state of one module, using the module's declared `coreKeys` (field -> core key
 * or keys, see config/CORE_KEYS_README.md) read backwards.
 *
 * - A core key feeds every field that declares it (the supported section feeds both
 *   `beam_section` and `secondary_beam`; each module reads the one its connectivity uses).
 * - A key no field declares is dropped (desktop output-panel state, keys of other modules), and so is
 *   a key the module lists in `computedCoreKeys` (the builder derives it from several fields).
 * - The Additional Inputs a file carries are core keys like any other. The ones a form field
 *   declares (bolt hole type, gap, weld fabrication, ...) come back as form values; the ones no
 *   field declares but the core lists for the module's Additional Inputs tabs
 *   (`DESIGN_PREF_TABLES`) become `designPrefOverrides`, keyed by core key, as the desktop does.
 */

// The desktop stores the overall material, the connector material and each member's
// material under separate keys; a web form often has one field for several of them. When
// keys share a field, the more specific key is read last and wins.
const keyPriority = (key) => (key === "Material" ? 0 : key === KEY_CONNECTOR_MATERIAL ? 1 : 2);

const inverted = new WeakMap();

/** core key -> [field, ...], from `config.coreKeys`. */
export const fieldsByCoreKey = (config) => {
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

/** The form values a design dictionary sets: the module's field for each core key it declares. */
const splitByField = (config, dict) => {
  const map = fieldsByCoreKey(config);
  const dock = {};

  Object.entries(dict)
    .sort(([a], [b]) => keyPriority(a) - keyPriority(b))
    .forEach(([key, rawValue]) => {
      const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
      (map.get(key) || []).forEach((field) => {
        dock[field] = Array.isArray(value) ? [...value] : value;
      });
    });

  return dock;
};

// The `.osi` spellings of a few dropdown values differ from the web options.
const normalizeValue = (config, field, value, lists) => {
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
    if (/non[- ]?pre-?tensioned/i.test(finalVal)) {
      finalVal = BOLT_NON_PRE_TENSIONED;
    } else if (/pre-?tensioned/i.test(finalVal)) {
      finalVal = BOLT_PRE_TENSIONED;
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

// The Additional Inputs keys of a module (those on the core's Additional Inputs tabs) that no
// form field declares, with the values the dictionary holds for them.
const prefOverridesOf = (config, dict) => {
  const table = DESIGN_PREF_TABLES[config.designType];
  if (!table) return {};
  const declared = fieldsByCoreKey(config);
  const prefKeys = new Set();
  (table.prefTabs || []).forEach((tab) => (tab[2] || []).forEach((key) => prefKeys.add(key)));
  const overrides = {};
  Object.entries(dict).forEach(([key, value]) => {
    if (prefKeys.has(key) && !declared.has(key) && !/^Label_/.test(key)) {
      overrides[key] = Array.isArray(value) ? [...value] : value;
    }
  });
  return overrides;
};

/**
 * The options a selection field offers: "All" is all of them. Most lists are held by the module data
 * (the config's `inputKeyToList`); the section designation depends on the section profile of the form, so the
 * module's field gives its own list (`getDynamicDataSource`), read with the profile just loaded.
 */
const optionsOf = (config, field, inputs, lists) => {
  const listKey = (config.inputKeyToList || {})[field];
  if (listKey) return lists[listKey];
  for (const section of config.inputSections || []) {
    const entry = (section.fields || []).find((f) => f.key === field);
    if (typeof entry?.getDynamicDataSource === "function") return entry.getDynamicDataSource(inputs, lists);
  }
  return [];
};

const optionValue = (option) =>
  String(option?.id ?? option?.Grade ?? option?.value ?? option);

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
      const options = optionsOf(config, field, inputs, lists);

      // "All" is the whole option list (a file may repeat an option; the list is still all of them).
      let isAll = false;
      if (Array.isArray(options) && options.length > 0) {
        const optionSet = new Set(options.map(optionValue));
        const listSet = new Set(list);
        isAll = optionSet.size === listSet.size && list.every((x) => optionSet.has(x));
      }

      allSelected[field] = isAll;
      selectionStates[selectionItem.key] = isAll ? "All" : "Customized";
      selectedItems[field] = isAll ? [] : list;
    });
  });

  const extraState = {};
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
 * @param {Object} dict - flat `{ "Bolt.Diameter": [...], "Material": "...", "Bolt.Material_Grade_OverWrite": "...", ... }`
 * @param {Object} lists - the module's option lists (`boltDiameterList`, `materialList`, ...)
 */
export function fromDesignDictionary(config, dict, lists = {}) {
  const source = dict || {};
  return buildState(config, splitByField(config, source), prefOverridesOf(config, source), lists);
}
