/**
 * The Additional Inputs sync talks core keys and the module id (modules/shared/utils/prefSyncKeys.js).
 * For every module: the state turns into a core-keyed dict and back without losing a value, the
 * requests built from the config are the ones the backend golden replays, and the dock fields that
 * drive the linked material rows are the ones the core's tables name.
 */
import { describe, expect, it } from "vitest";

import goldenInputs from "../../../backend/apps/core/tests/fixtures/design_pref_sync_inputs.json";
import {
  KEY_CONNECTOR_MATERIAL,
  KEY_DISP_FINPLATE,
  KEY_DISP_FLEXURE4,
  KEY_DISP_TENSION_BOLTED,
  KEY_DP_BOLT_HOLE_TYPE,
  KEY_MATERIAL,
  KEY_SEC_MATERIAL,
  KEY_SUPTDSEC_MATERIAL,
  KEY_SUPTNGSEC_MATERIAL,
} from "../constants/generated/coreKeys";
import { DESIGN_PREF_TABLES } from "../constants/generated/designPrefTables";
import { purlinConfig } from "../modules/flexuralMember/purlin/configs/purlinConfig";
import {
  dockDriverFields,
  fieldNamesOf,
  fromSyncResponse,
  prefSyncModuleId,
  resolvedToState,
  stateToCore,
  toSyncRequest,
} from "../modules/shared/utils/prefSyncKeys";
import { MODULES } from "./cases";
import { syncCases, syncRequests } from "./prefSyncCases";

const GRADE = "E 350 (Fe 490)";

const asList = (declared) => (declared == null ? [] : Array.isArray(declared) ? declared : [declared]);

/** The form fields that feed at least one core key. */
const feedingFields = (config) => Object.entries(config.coreKeys).filter(([, declared]) => asList(declared).length);

/** The state of a case: default inputs plus Additional Inputs values the user changed. */
const withPrefs = (config) => ({
  ...config.defaultInputs,
  supporting_material: GRADE,
  supported_material: GRADE,
  connector_material: GRADE,
  bolt_hole_type: "Over-sized",
  detailing_gap: "7",
});

/** Every core key written to the fields that declare it, starting from nothing. */
const backToState = (config, core) =>
  resolvedToState(config, { state: {}, draft: null, operation: "open", coreIn: {}, coreDraft: null }, core);

/** Fields whose value another field feeding the same key overrides (shear sections by connectivity). */
const sharedWithOtherValue = (config, state, field) =>
  asList(config.coreKeys[field]).some((key) =>
    Object.entries(config.coreKeys).some(
      ([other, declared]) =>
        other !== field && asList(declared).includes(key) && state[other] !== undefined && JSON.stringify(state[other]) !== JSON.stringify(state[field]),
    ),
  );

describe.each(MODULES.map((m) => [m.config.sessionName, m.config]))("%s", (_name, config) => {
  it("is addressed by the desktop module id the core has tables for", () => {
    expect(prefSyncModuleId(config)).toBe(config.defaultInputs.module);
    expect(DESIGN_PREF_TABLES[prefSyncModuleId(config)]).toBeDefined();
  });

  it.each([
    ["its defaults", (c) => ({ ...c.defaultInputs })],
    ["defaults with Additional Inputs values", withPrefs],
  ])("round-trips %s: state to core dict to state", (_label, makeState) => {
    const state = makeState(config);
    const core = stateToCore(config, state);
    const back = backToState(config, core);

    for (const [field] of feedingFields(config)) {
      // A field the loader never fills from a dict (`notLoadedFromDictionary`) is not read back either.
      if (state[field] === undefined || (config.notLoadedFromDictionary || []).includes(field)) continue;
      if (sharedWithOtherValue(config, state, field)) continue;
      // A field with several core keys can be read back from any of them; the value is the same.
      expect(back[field], `${field} lost`).toEqual(state[field]);
    }
    // Every core key the dict holds is a declared key of some field (or a field that passes through).
    const declared = new Set(feedingFields(config).flatMap(([, keys]) => asList(keys)));
    for (const key of Object.keys(core)) {
      expect(declared.has(key) || !(key in config.coreKeys), `${key} is neither a declared core key nor a pass-through`).toBe(true);
    }
  });

  it("sends core keys only: no web field name that feeds a different core key", () => {
    const core = stateToCore(config, withPrefs(config));
    for (const [field, declared] of Object.entries(config.coreKeys)) {
      if (!(field in core)) continue;
      expect(asList(declared), `${field} is sent as a key of its own`).toContain(field);
    }
  });

  it("builds the requests the backend golden replays", () => {
    const entry = goldenInputs[prefSyncModuleId(config)];
    expect(entry, "module missing from design_pref_sync_inputs.json").toBeDefined();
    expect(JSON.parse(JSON.stringify(syncRequests(config)))).toEqual(entry.requests);
  });

  it("names dock drivers that exist in the form and feed a material the core copies", () => {
    const drivers = dockDriverFields(config);
    expect(drivers.length).toBeGreaterThan(0);
    const dockFields = new Set(config.inputSections.flatMap((section) => section.fields.map((f) => f.key)));
    const copies = Object.keys(DESIGN_PREF_TABLES[prefSyncModuleId(config)].dockCopies);
    if (copies.length) {
      // The core's table, read through the declared keys: each driver is a dock field.
      for (const driver of drivers) expect(dockFields.has(driver), `${driver} is not a dock field`).toBe(true);
    } else {
      // Butt and lap joints: the core copies no material, so the old names stay.
      expect(drivers).toEqual(["material", "member_material", "connector_material"]);
    }
  });
});

describe("the request", () => {
  const finPlate = MODULES.find((m) => m.config.designType === KEY_DISP_FINPLATE).config;
  const tension = MODULES.find((m) => m.config.designType === KEY_DISP_TENSION_BOLTED).config;

  it("carries the module id, core keys and a core-keyed draft", () => {
    const { body } = toSyncRequest(finPlate, {
      state: { connector_material: GRADE, bolt_hole_type: "Standard", profile_image: "x" },
      operation: "save",
      draft: { bolt_hole_type: "Over-sized" },
    });
    expect(body).toEqual({
      module_id: KEY_DISP_FINPLATE,
      inputs: { [KEY_CONNECTOR_MATERIAL]: GRADE, [KEY_MATERIAL]: GRADE, [KEY_DP_BOLT_HOLE_TYPE]: "Standard", profile_image: "x" },
      operation: "save",
      design_pref_draft: { [KEY_DP_BOLT_HOLE_TYPE]: "Over-sized" },
    });
  });

  it("sends the pref material rows under their meaning even where the module declares them as feeding nothing", () => {
    const lapJoint = MODULES.find((m) => m.config.sessionName === "Lap Joint Bolted").config;
    const core = stateToCore(lapJoint, { connector_material: GRADE, supporting_material: GRADE, material: "E 250 (Fe 410 W)A" });
    expect(core[KEY_CONNECTOR_MATERIAL]).toBe(GRADE);
    expect(core[KEY_SUPTNGSEC_MATERIAL]).toBe(GRADE);
    expect(core[KEY_MATERIAL]).toBe("E 250 (Fe 410 W)A");
  });

  it("takes the first non-empty field when several feed one core key", () => {
    const core = stateToCore(finPlate, { column_section: "", primary_beam: "JB 200" });
    expect(Object.values(core)).toContain("JB 200");
    expect(stateToCore(finPlate, { column_section: "HB 150", primary_beam: "JB 200" })).toMatchObject({
      "Member.Supporting_Section.Designation": "HB 150",
    });
  });

  it("the defaults request has no operation and no draft", () => {
    const { body } = toSyncRequest(finPlate, { state: { connector_material: GRADE } });
    expect(body).toEqual({ module_id: KEY_DISP_FINPLATE, inputs: { [KEY_CONNECTOR_MATERIAL]: GRADE, [KEY_MATERIAL]: GRADE } });
  });

  it("an Additional Inputs override saved under its core key passes through", () => {
    const { body } = toSyncRequest(tension, { state: { material: GRADE, [KEY_DP_BOLT_HOLE_TYPE]: "Over-sized" }, operation: "open" });
    expect(body.inputs).toEqual({ [KEY_MATERIAL]: GRADE, [KEY_SEC_MATERIAL]: GRADE, [KEY_DP_BOLT_HOLE_TYPE]: "Over-sized" });
  });
});

describe("the answer", () => {
  const finPlate = MODULES.find((m) => m.config.designType === KEY_DISP_FINPLATE).config;

  it("writes back only what the merge changed, to every field that declares the key", () => {
    const state = { connector_material: GRADE, bolt_diameter: ["12"] };
    const { body, context } = toSyncRequest(finPlate, { state, operation: "refresh" });
    const resolved = { ...body.inputs, [KEY_SUPTNGSEC_MATERIAL]: GRADE, [KEY_SUPTDSEC_MATERIAL]: GRADE };
    const data = fromSyncResponse(finPlate, context, {
      resolved_inputs: resolved,
      metadata: {
        copied_from_input_dock_keys: { [KEY_CONNECTOR_MATERIAL]: [KEY_SUPTNGSEC_MATERIAL, KEY_SUPTDSEC_MATERIAL] },
        linked_input_dock_keys: [KEY_CONNECTOR_MATERIAL],
        linked_pref_keys: [KEY_SUPTNGSEC_MATERIAL, KEY_SUPTDSEC_MATERIAL],
        defaulted_keys: [],
        module_id: KEY_DISP_FINPLATE,
      },
    });
    expect(data.resolved_inputs).toEqual({ ...state, supporting_material: GRADE, supported_material: GRADE });
    expect(data.metadata.copied_from_input_dock_keys).toEqual({ connector_material: ["supporting_material", "supported_material"] });
    expect(data.metadata.linked_pref_keys).toEqual(["supporting_material", "supported_material"]);
    expect(state).toEqual({ connector_material: GRADE, bolt_diameter: ["12"] });
  });

  it("a draft the operation applies comes back as sent", () => {
    const state = { connector_material: "E 250 (Fe 410 W)A" };
    const { body, context } = toSyncRequest(finPlate, { state, operation: "save", draft: { bolt_hole_type: "Over-sized" } });
    const data = fromSyncResponse(finPlate, context, {
      resolved_inputs: { ...body.inputs, ...body.design_pref_draft },
      metadata: {},
    });
    expect(data.resolved_inputs).toEqual({ ...state, bolt_hole_type: "Over-sized" });
  });

  it("a core key no field declares comes back under its own name", () => {
    expect(fieldNamesOf(finPlate, "Optimum.Anything")).toEqual(["Optimum.Anything"]);
  });
});

describe("every case of the golden requests", () => {
  it("is built from the case table (no request without a case)", () => {
    for (const { config } of MODULES) {
      expect(Object.keys(goldenInputs[config.designType].requests)).toEqual(Object.keys(syncCases(config)));
    }
  });
});

describe("Purlin (no coreKeys)", () => {
  it("is sent as it is, under its module id, and answered as it is", () => {
    const state = { material: GRADE, section_material: "E 250 (Fe 410 W)A" };
    const { body, context } = toSyncRequest(purlinConfig, { state, operation: "open" });
    expect(body).toEqual({ module_id: KEY_DISP_FLEXURE4, inputs: state, operation: "open", design_pref_draft: null });
    const data = fromSyncResponse(purlinConfig, context, { resolved_inputs: state, metadata: { copied_from_input_dock_keys: {} } });
    expect(data.resolved_inputs).toEqual(state);
  });
});
