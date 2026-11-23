/**
 * The Additional Inputs sync requests the dialog sends for a module: one per operation and
 * variant, built from the config's default inputs through the same adapter the app uses.
 * `dump_design_pref_sync_inputs.mjs` writes them to the backend golden's input fixture, and
 * `prefSyncKeys.test.js` checks the fixture is current.
 */
import { toSyncRequest } from "../modules/shared/utils/prefSyncKeys";

const ALT_GRADE = "E 350 (Fe 490)";
const ALT_GRADE_2 = "E 450 (Fe 570) D";
const DRIVER_FIELDS = ["connector_material", "material", "member_material"];
const PREF_MATERIAL_FIELDS = ["supporting_material", "supported_material", "connector_material"];

const withDriver = (inputs, grade) => {
  const out = { ...inputs };
  for (const field of DRIVER_FIELDS) if (field in out) out[field] = grade;
  return out;
};

const withStalePrefs = (inputs, grade) => ({
  ...inputs,
  ...Object.fromEntries(PREF_MATERIAL_FIELDS.map((field) => [field, grade])),
  bolt_hole_type: "Over-sized",
});

/** case name -> { state, operation, draft } in the web field names of the module config. */
export const syncCases = (config) => {
  const inputs = { ...config.defaultInputs };
  const draft = { connector_material: ALT_GRADE, supporting_material: ALT_GRADE, bolt_hole_type: "Over-sized" };
  const stale = withStalePrefs(inputs, ALT_GRADE_2);
  const changed = withDriver(inputs, ALT_GRADE);
  return {
    open: { state: inputs, operation: "open" },
    open_draft: { state: inputs, operation: "open", draft },
    open_saved_overrides: { state: stale, operation: "open" },
    refresh: { state: inputs, operation: "refresh" },
    refresh_changed_driver: { state: changed, operation: "refresh" },
    refresh_stale_prefs: { state: stale, operation: "refresh" },
    save: { state: inputs, operation: "save" },
    save_draft: { state: inputs, operation: "save", draft },
    save_saved_overrides_draft: { state: stale, operation: "save", draft },
    reset: { state: inputs, operation: "reset" },
    reset_changed_driver: { state: changed, operation: "reset" },
    reset_saved_overrides: { state: stale, operation: "reset" },
  };
};

/** case name -> the request body the dialog posts to /api/design-preferences/sync/. */
export const syncRequests = (config) =>
  Object.fromEntries(Object.entries(syncCases(config)).map(([name, c]) => [name, toSyncRequest(config, c).body]));
