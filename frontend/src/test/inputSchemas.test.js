/**
 * The request each module builds against the backend's request model (`INPUT_SCHEMAS`, generated from the
 * Pydantic `DesignInput` classes): every required key is sent, with a value of the kind the model takes.
 *
 * Keys the backend fills in before it validates are not sent by the form: the Additional Inputs rows
 * (`fill_request_prefs`), which every module's tabs list in `DESIGN_PREF_TABLES`.
 */
import { describe, expect, it } from "vitest";

import { DESIGN_PREF_TABLES } from "../constants/generated/designPrefTables";
import { INPUT_SCHEMAS } from "../constants/generated/inputSchemas";
import { MODULES } from "./cases";
import { LISTS, allSelectedFor, initialExtraState, wire } from "./cases/shared";

const isEmpty = (value) => value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

const KIND_CHECKS_INT = (v) => typeof v === "string" && /^\s*[-+]?\d+\s*$/.test(v);
const KIND_CHECKS_FLOAT = (v) => typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v));

/** One test per kind of value in `INPUT_SCHEMAS`; the model takes strings only (numbers are sent as text). */
const KIND_CHECKS = {
  text: (v) => typeof v === "string" && v.length > 0,
  present: (v) => !isEmpty(v),
  int: (v) => typeof v === "string" && /^\s*[-+]?\d+\s*$/.test(v),
  float: (v) => typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)),
  yesNo: (v) => v === "Yes" || v === "No",
  number: (v) => (typeof v === "number" && Number.isFinite(v)) || KIND_CHECKS_FLOAT(v),
  textOrList: (v) => (typeof v === "string" && v.trim() !== "") || (Array.isArray(v) && v.some((item) => typeof item === "string" && item.trim() !== "")),
  intOrList: (v) => KIND_CHECKS_INT(v) || (Array.isArray(v) && v.length > 0 && v.every(KIND_CHECKS_INT)),
};

const matchesKind = (value, kind) => {
  if (kind.endsWith("List") && !(kind in KIND_CHECKS)) {
    const check = KIND_CHECKS[kind.slice(0, -4)];
    return Array.isArray(value) && value.length > 0 && value.every(check);
  }
  return KIND_CHECKS[kind](value);
};

const requestsOf = (module) => {
  const { config } = module;
  const connectivities = module.connectivities || [null];
  const variants = [
    ...connectivities.map((connectivity) => ({ selection: "all", connectivity })),
    { selection: "customized", connectivity: connectivities[0] },
  ];
  return variants.map(({ selection, connectivity }) => {
    const allSelected = allSelectedFor(config, selection === "all");
    let inputs = { ...config.defaultInputs, ...(module.fill || {}) };
    if (connectivity) inputs[module.connectivityKey || "connectivity"] = connectivity;
    if (selection === "customized") inputs = { ...inputs, ...(module.custom || {}) };
    return {
      label: `${selection}${connectivity ? ` / ${connectivity}` : ""}`,
      payload: wire(config.buildSubmissionParams(inputs, allSelected, LISTS, initialExtraState(config, connectivity))),
    };
  });
};

describe("request models against the requests the forms build", () => {
  it("has a model for every module", () => {
    for (const { config } of MODULES) expect(INPUT_SCHEMAS[config.designType], config.designType).toBeDefined();
  });

  it.each(MODULES.map((m) => [m.name, m]))("%s: every key the model requires is sent, of the right kind", (_name, module) => {
    const schema = INPUT_SCHEMAS[module.config.designType];
    const filledByBackend = new Set((DESIGN_PREF_TABLES[module.config.designType].prefTabs || []).flatMap((tab) => tab[2]));
    for (const { label, payload } of requestsOf(module)) {
      for (const [key, kind] of Object.entries(schema.required)) {
        if (filledByBackend.has(key)) continue;
        expect(key in payload, `${label}: ${key} is missing`).toBe(true);
        expect(matchesKind(payload[key], kind), `${label}: ${key} should be ${kind}, is ${JSON.stringify(payload[key])}`).toBe(true);
      }
    }
  });

  it.each(MODULES.map((m) => [m.name, m]))("%s: an optional key that is sent is of the right kind", (_name, module) => {
    const schema = INPUT_SCHEMAS[module.config.designType];
    for (const { label, payload } of requestsOf(module)) {
      for (const [key, kind] of Object.entries(schema.optional)) {
        if (!(key in payload)) continue;
        expect(matchesKind(payload[key], kind), `${label}: ${key} should be ${kind}, is ${JSON.stringify(payload[key])}`).toBe(true);
      }
    }
  });
});
