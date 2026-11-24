import {
  KEY_CONNECTOR_MATERIAL,
  KEY_MATERIAL,
  KEY_SUPTDSEC_MATERIAL,
  KEY_SUPTNGSEC_MATERIAL,
} from "../../../constants/generated/coreKeys";
import { DESIGN_PREF_TABLES } from "../../../constants/generated/designPrefTables";
import { fieldsByCoreKey } from "./designDictionary";

/**
 * The Additional Inputs sync (open, refresh, save, reset) and the defaults request talk core
 * keys and the module id, as the backend (`sync_merge.merge_design_pref_sync`) works on them.
 * The form and the section modals still use the web field names, so this is the one place that
 * turns one into the other, using the module's declared `coreKeys` (see CORE_KEYS_README.md):
 *
 * - request: every form field with declared core keys is copied to each of them; when several
 *   fields feed one core key (shear sections by connectivity) the first non-empty one wins. A
 *   field declared as feeding no core key is not sent. A name that is not a field of the module
 *   at all is taken to be a core key already (a saved Additional Inputs override) and passes through.
 * - response: the answer starts as the request state, and each core key the merge added or changed
 *   is written to every field that declares it (the inversion `fromDesignDictionary` uses), or
 *   under the core key itself when no field does. What the merge did not touch does not move.
 *
 * Purlin has no `coreKeys`: its state passes both ways unchanged.
 */

/**
 * The three material rows of Additional Inputs mean the same in every module, even where the
 * builder never sends them (the config declares the field as feeding no core key).
 */
const PREF_MATERIAL_FIELDS = {
  supporting_material: KEY_SUPTNGSEC_MATERIAL,
  supported_material: KEY_SUPTDSEC_MATERIAL,
  connector_material: KEY_CONNECTOR_MATERIAL,
};

const GENERIC_FIELD_BY_KEY = Object.fromEntries(Object.entries(PREF_MATERIAL_FIELDS).map(([field, key]) => [key, field]));

const SYNC_OPERATIONS_WITH_DRAFT = ["open", "save"];

const asList = (declared) => (declared == null ? [] : Array.isArray(declared) ? declared : [declared]);

const clone = (value) => (value === undefined ? value : JSON.parse(JSON.stringify(value)));

const isEmpty = (value) => value === "" || value == null || (Array.isArray(value) && value.length === 0);

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const forward = new WeakMap();

/** field -> [core key, ...] for every field of the module, with the three pref material rows filled in. */
const fieldKeys = (config) => {
  let map = forward.get(config);
  if (!map) {
    map = new Map();
    for (const [field, declared] of Object.entries(config.coreKeys || {})) map.set(field, asList(declared));
    for (const [field, key] of Object.entries(PREF_MATERIAL_FIELDS)) {
      if (!map.get(field)?.length) map.set(field, [key]);
    }
    forward.set(config, map);
  }
  return map;
};

// The dock fields that held the material in every module before the core's tables were read.
const LEGACY_DRIVER_FIELDS = ["material", "member_material", "connector_material"];

const isMaterialKey = (key) => key === KEY_MATERIAL || key.endsWith(".Material");

/**
 * The dock fields whose change moves the linked material rows of Additional Inputs: the fields
 * that feed the dock material the core copies to other keys ('Input Dock' rows of
 * `input_dictionary_without_design_pref`, in `DESIGN_PREF_TABLES[...].dockCopies`). A module the
 * core has no copy rows for (butt and lap joints) or that has no table (Purlin) keeps the three
 * names the web always watched.
 */
export function dockDriverFields(config) {
  const copies = DESIGN_PREF_TABLES[config.designType]?.dockCopies || {};
  const driverKeys = Object.keys(copies).filter(isMaterialKey);
  const fields = [...fieldKeys(config)].filter(([, keys]) => keys.some((key) => driverKeys.includes(key))).map(([field]) => field);
  return fields.length ? fields : LEGACY_DRIVER_FIELDS;
}

/**
 * The dock fields whose change clears every saved Additional Input, as on the desktop
 * (`clear_design_pref_dictionary`): the fields that feed a dock key the core copies into
 * Additional Inputs ('Input Dock' rows: Material, and the anchor bolt type of the base plate).
 * The butt and lap joints have none.
 */
export function prefClearingFields(config) {
  const sources = Object.keys(DESIGN_PREF_TABLES[config.designType]?.dockCopies || {});
  return [...fieldKeys(config)].filter(([, keys]) => keys.some((key) => sources.includes(key))).map(([field]) => field);
}

const mainFormFields = (config) =>
  new Set((config.inputSections || []).flatMap((section) => (section.fields || []).map((field) => field.key)));

/** The core's Additional Inputs keys of a module: its pref tabs, computed keys and 'Input Dock' targets, without its dock keys. */
const corePrefKeys = (config) => {
  const tables = DESIGN_PREF_TABLES[config.designType];
  if (!tables) return new Set();
  const keys = new Set([
    ...tables.prefTabs.flatMap(([, , tabKeys]) => tabKeys),
    ...tables.computed,
    ...Object.values(tables.dockCopies).flat(),
  ]);
  for (const key of tables.dockKeys) keys.delete(key);
  return keys;
};

/**
 * Whether a name of the form state (a field, or a core key a saved override is kept under) holds
 * an Additional Input of the module. A main-form field never does. Purlin has no table: none.
 */
export function isAdditionalInput(config, name) {
  const prefKeys = corePrefKeys(config);
  if (!prefKeys.size || mainFormFields(config).has(name)) return false;
  if (prefKeys.has(name)) return true;
  return (fieldKeys(config).get(name) || []).some((key) => prefKeys.has(key));
}

/** The module id the backend keys its tables by: the desktop `KEY_DISP_*` name. */
export const prefSyncModuleId = (config) => config.designType;

/** Form state (field names) to a core-keyed dict. */
export function stateToCore(config, state) {
  if (!config.coreKeys) return clone(state || {});
  const core = {};
  const fields = fieldKeys(config);
  for (const [field, keys] of fields) {
    const value = state?.[field];
    if (value === undefined) continue;
    for (const key of keys) {
      if (!(key in core) || (isEmpty(core[key]) && !isEmpty(value))) core[key] = clone(value);
    }
  }
  for (const [name, value] of Object.entries(state || {})) {
    if (!fields.has(name) && value !== undefined) core[name] = clone(value);
  }
  return core;
}

/** The form fields a core key is written to (the core key itself when no field has it). */
export function fieldNamesOf(config, coreKey) {
  const names = [...(fieldsByCoreKey(config).get(coreKey) || [])];
  const generic = GENERIC_FIELD_BY_KEY[coreKey];
  if (generic && !names.includes(generic) && asList(config.coreKeys?.[generic]).length === 0) names.unshift(generic);
  return names.length ? names : [coreKey];
}

const fieldNamesOfAll = (config, coreKeys) => [...new Set((coreKeys || []).flatMap((key) => fieldNamesOf(config, key)))];

/**
 * The body of POST /api/design-preferences/sync/ (and, without `operation`, of .../defaults/).
 * `state` is the dock inputs merged with the current Additional Inputs values, `draft` the values
 * the dialog wants applied. `context` is what `fromSyncResponse` needs to read the answer.
 */
export function toSyncRequest(config, { state, operation, draft = null }) {
  const body = { module_id: prefSyncModuleId(config), inputs: stateToCore(config, state) };
  if (operation) body.operation = operation;
  const coreDraft = draft ? stateToCore(config, draft) : null;
  if (operation) body.design_pref_draft = coreDraft;
  return { body, context: { state: state || {}, draft, operation, coreIn: body.inputs, coreDraft } };
}

const toFieldKeyedMetadata = (config, state, meta) => {
  if (!meta || !config.coreKeys) return meta;
  // The field that holds the driver's value, or the first one that could.
  const firstName = (key) => {
    const names = fieldNamesOf(config, key);
    return names.find((name) => !isEmpty(state?.[name])) ?? names[0];
  };
  return {
    ...meta,
    copied_from_input_dock_keys: Object.fromEntries(
      Object.entries(meta.copied_from_input_dock_keys || {}).map(([driver, targets]) => [firstName(driver), fieldNamesOfAll(config, targets)]),
    ),
    linked_input_dock_keys: (meta.linked_input_dock_keys || []).map(firstName),
    linked_pref_keys: fieldNamesOfAll(config, meta.linked_pref_keys),
    defaulted_keys: fieldNamesOfAll(config, meta.defaulted_keys),
  };
};

/**
 * The form state a core-keyed answer stands for. A draft the operation applied comes back exactly
 * as the dialog sent it; only what the merge did beyond that is translated.
 */
export function resolvedToState(config, context, resolvedCore) {
  if (!config.coreKeys) return resolvedCore || {};
  const { state, draft, operation, coreIn, coreDraft } = context;
  const usesDraft = !!draft && Object.keys(draft).length > 0 && SYNC_OPERATIONS_WITH_DRAFT.includes(operation);
  const stateBase = usesDraft ? { ...state, ...draft } : state;
  const coreBase = usesDraft ? { ...coreIn, ...coreDraft } : coreIn;
  const out = { ...stateBase };
  for (const [key, value] of Object.entries(resolvedCore || {})) {
    if (key in coreBase && sameValue(coreBase[key], value)) continue;
    for (const name of fieldNamesOf(config, key)) out[name] = clone(value);
  }
  return out;
}

/** The answer of /sync/ or /defaults/ with `resolved_inputs` (or `default_pref_inputs`) and `metadata` in field names. */
export function fromSyncResponse(config, context, data) {
  const out = { ...data, metadata: toFieldKeyedMetadata(config, context.state, data.metadata) };
  if ("resolved_inputs" in data) out.resolved_inputs = resolvedToState(config, context, data.resolved_inputs);
  if ("default_pref_inputs" in data) out.default_pref_inputs = resolvedToState(config, context, data.default_pref_inputs);
  return out;
}
