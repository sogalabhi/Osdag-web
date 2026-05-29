import { MODULE_ROUTES, MODULE_NAME_TO_KEY } from "./modules";

/**
 * Get the route path for a stable module key.
 * @param {string} moduleKey
 * @returns {string|undefined}
 */
export function getModuleRoute(moduleKey) {
  const stableKey = MODULE_NAME_TO_KEY[moduleKey] || moduleKey;
  return MODULE_ROUTES[stableKey];
}

export { MODULE_ROUTES as ROUTES_BY_KEY };
