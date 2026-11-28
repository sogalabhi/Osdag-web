/**
 * Every payloadParity variant of every module: the module, a label, and the arguments of its
 * `buildSubmissionParams`.
 */
import { MODULES } from "./cases";
import { LISTS, allSelectedFor, initialExtraState } from "./cases/shared";

/** JSON with the keys of every object in sorted order, the same text for the same payload. */
export const canonicalJson = (value) =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
      : v, 1);

export const variantsOf = (module) => {
  const connectivities = module.connectivities || [null];
  return [
    ...connectivities.map((connectivity) => ({ selection: "all", connectivity })),
    { selection: "customized", connectivity: connectivities[0] },
  ].map(({ selection, connectivity }) => {
    const { config } = module;
    const allSelected = allSelectedFor(config, selection === "all");
    let inputs = { ...config.defaultInputs, ...(module.fill || {}) };
    if (connectivity) inputs[module.connectivityKey || "connectivity"] = connectivity;
    if (selection === "customized") inputs = { ...inputs, ...(module.custom || {}) };
    return {
      label: `${selection}${connectivity ? ` / ${connectivity}` : ""}`,
      args: [inputs, allSelected, LISTS, initialExtraState(config)],
    };
  });
};

export const payloadsOf = (module) =>
  Object.fromEntries(
    variantsOf(module).map(({ label, args }) => [label, canonicalJson(module.config.buildSubmissionParams(...args))]),
  );

export { MODULES };
