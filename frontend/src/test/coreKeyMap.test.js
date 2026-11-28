/**
 * The declared core-key map: `config.coreKeys` says which core key(s) each form field feeds.
 * See modules/shared/config/CORE_KEYS_README.md.
 *
 * For every module and every payloadParity variant, the test replaces one form field at a time
 * with a sentinel, runs buildSubmissionParams and finds the wire keys whose value carries it.
 * Those keys must be among the field's declared core keys. It also checks that every declared
 * key is a real export of coreKeys.js / webKeys.js, and that every default input is declared.
 * The declared map is its own source of truth: it is not tied to what the old .osi tracer guesses.
 *
 * A module whose `coreKeys` is not written yet is listed in PENDING and shows as a todo.
 * When you declare a module, delete its line here: a module that is declared but still listed
 * fails, and so does a module that is not listed and not declared.
 */
import { describe, expect, it } from "vitest";

import * as coreKeyExports from "../constants/generated/coreKeys";
import * as webKeyExports from "../constants/generated/webKeys";
import { MATERIAL_CORE_KEYS, PREF_CORE_KEYS } from "../modules/shared/config/prefCoreKeys";
import {
  COLUMN_OPTIMIZATION_DEFAULTS,
  FLEXURE_OPTIMIZATION_DEFAULTS,
  STRUT_OPTIMIZATION_FIELDS,
} from "../modules/shared/config/prefOptions";
import { PLATE_GIRDER_OPTIMISATION_DEFAULTS } from "../modules/flexuralMember/plateGirder/configs/plateGirderPrefOptions";
import { MODULES } from "./cases";
import { LISTS, caseState, wire } from "./cases/shared";

// Module names (from cases/index.js) that have no `coreKeys` yet. One per line.
const PENDING = [];

const SENTINEL = "zqsentinelqz";
const ALL_CORE_KEYS = new Set(
  [...Object.values(coreKeyExports), ...Object.values(webKeyExports)].filter((v) => typeof v === "string"),
);

const asList = (declared) => (declared == null ? [] : Array.isArray(declared) ? declared : [declared]);

/**
 * The Additional Inputs fields. The form holds them only once the user saved them (the default
 * inputs carry none: the backend fills them from the core), so a module's own declaration says
 * which of them it has.
 */
const ADDITIONAL_INPUTS_FIELDS = new Set([
  ...Object.keys(PREF_CORE_KEYS),
  ...Object.keys(MATERIAL_CORE_KEYS),
  ...Object.keys(FLEXURE_OPTIMIZATION_DEFAULTS),
  ...Object.keys(COLUMN_OPTIMIZATION_DEFAULTS),
  ...STRUT_OPTIMIZATION_FIELDS,
  "member_material",
  // The plate girder's Girder Properties tab.
  "girder_material",
  ...Object.keys(PLATE_GIRDER_OPTIMISATION_DEFAULTS),
]);

/** Every field the module's form can hold: default inputs, input section fields, selection and modal inputs, Additional Inputs. */
const formFields = (config) => {
  const fields = new Set(Object.keys(config.defaultInputs || {}));
  for (const field of Object.keys(config.coreKeys || {})) if (ADDITIONAL_INPUTS_FIELDS.has(field)) fields.add(field);
  for (const section of config.inputSections || []) {
    for (const field of section.fields || []) if (field.key) fields.add(field.key);
  }
  for (const entry of [...(config.selectionConfig || []), ...(config.modalConfig || [])]) {
    if (entry.inputKey) fields.add(entry.inputKey);
  }
  return fields;
};

/**
 * Which fields own which option list (`boltDiameterList` belongs to `bolt_diameter`). A list shared by
 * several fields cannot be traced to one of them with a sentinel; the customized variant covers those.
 */
const listOwners = (config) => {
  const owners = {};
  const add = (list, field) => { if (list && field) (owners[list] ||= new Set()).add(field); };
  for (const entry of config.modalConfig || []) add(entry.dataSource, entry.inputKey);
  for (const section of config.inputSections || []) {
    for (const field of section.fields || []) add(field.dataSource, field.key);
  }
  return owners;
};

/**
 * The wire keys that carry `field`'s value: the field is replaced by a sentinel (and the lists it
 * owns, for an "All" selection) and every other input keeps the case's real value.
 */
const keysFedBy = (module, field, state, owners) => {
  const { config } = module;
  const inputs = { ...state.inputs, [field]: SENTINEL };
  const lists = new Proxy(LISTS, {
    get: (target, prop) => (owners[prop]?.size === 1 && owners[prop].has(field) ? [SENTINEL] : target[prop]),
  });
  let params;
  try {
    params = wire(config.buildSubmissionParams(inputs, state.allSelected, lists, state.extraState));
  } catch {
    return []; // a field the builder cannot take a sentinel for; its other variants still run
  }
  return Object.entries(params)
    .filter(([, value]) => JSON.stringify(value).toLowerCase().includes(SENTINEL))
    .map(([key]) => key);
};

const variantsOf = (module) => {
  const connectivities = module.connectivities || [null];
  return [
    ...connectivities.map((connectivity) => ({ selection: "all", connectivity })),
    { selection: "customized", connectivity: connectivities[0] },
  ];
};

describe("declared core-key map", () => {
  it("lists only modules that exist", () => {
    const names = new Set(MODULES.map((module) => module.name));
    expect(PENDING.filter((name) => !names.has(name))).toEqual([]);
  });

  it("has well-formed shared tables", () => {
    for (const table of [PREF_CORE_KEYS, MATERIAL_CORE_KEYS]) {
      for (const [field, declared] of Object.entries(table)) {
        for (const key of asList(declared)) expect(ALL_CORE_KEYS.has(key), `${field}: ${key}`).toBe(true);
      }
    }
  });

  for (const module of MODULES) {
    const { config } = module;
    const pending = PENDING.includes(module.name);

    if (pending && !config.coreKeys) {
      it.todo(`TODO: coreKeys not declared yet: ${module.name}`);
      continue;
    }

    describe(module.name, () => {
      if (pending) {
        it("is declared, so it leaves PENDING", () => {
          expect.fail(`${module.name} has coreKeys: delete it from PENDING in coreKeyMap.test.js`);
        });
        return;
      }
      if (!config.coreKeys) {
        it("declares coreKeys", () => {
          expect.fail(`TODO: coreKeys not declared yet for "${module.name}": add config.coreKeys (see CORE_KEYS_README.md)`);
        });
        return;
      }

      const coreKeys = config.coreKeys;
      const fields = formFields(config);

      it("declares only real core keys", () => {
        const problems = [];
        for (const [field, declared] of Object.entries(coreKeys)) {
          if (declared !== null && declared !== undefined && !Array.isArray(declared) && typeof declared !== "string") {
            problems.push(`${field}: expected a core key, a list of them, or null`);
          }
          if (declared === undefined) problems.push(`${field}: undefined (misspelled constant import?)`);
          const list = asList(declared);
          if (Array.isArray(declared) && list.length === 0) problems.push(`${field}: empty list, use null`);
          if (new Set(list).size !== list.length) problems.push(`${field}: repeats a key`);
          for (const key of list) {
            if (!ALL_CORE_KEYS.has(key)) problems.push(`${field}: ${String(key)} is not exported by coreKeys.js or webKeys.js`);
          }
        }
        expect(problems).toEqual([]);
      });

      it("declares every form field", () => {
        const known = new Set([...fields, ...Object.keys(PREF_CORE_KEYS), ...Object.keys(MATERIAL_CORE_KEYS)]);
        const undeclared = [...fields].filter((field) => !(field in coreKeys));
        // a core-keyed field (the Additional Inputs keys of base plate) may be declared as its own key
        const unknown = Object.keys(coreKeys).filter(
          (field) => !known.has(field) && !(asList(coreKeys[field]).length === 1 && coreKeys[field] === field),
        );
        expect({ undeclared, unknown }).toEqual({ undeclared: [], unknown: [] });
      });

      it("matches what buildSubmissionParams sends", () => {
        const owners = listOwners(config);
        const problems = [];
        let attributed = 0;
        for (const variant of variantsOf(module)) {
          const state = caseState(module, variant.selection, variant.connectivity);
          const label = `${variant.selection}${variant.connectivity ? ` / ${variant.connectivity}` : ""}`;
          for (const field of fields) {
            const declared = asList(coreKeys[field]);
            for (const key of keysFedBy(module, field, state, owners)) {
              attributed += 1;
              if (!declared.includes(key)) problems.push(`${label}: ${field} feeds ${key}, declared ${JSON.stringify(declared)}`);
            }
          }
        }
        expect(problems).toEqual([]);
        expect(attributed, "no wire key traced to a field").toBeGreaterThan(0);
      });
    });
  }
});
