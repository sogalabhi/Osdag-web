/**
 * Merge design-pref sync API results (already in form field names) into form `inputs`,
 * only where the server linked a preference row from the dock, as `useDesignPrefSync` does.
 */

/**
 * @param {Object|null|undefined} metadata - `metadata` from design-pref sync response
 * @returns {Set<string>} Target keys that were copied from the dock driver
 */
export function collectLinkedPrefKeysFromMetadata(metadata) {
  const copied = metadata?.copied_from_input_dock_keys || {};
  const linkedKeys = new Set();
  Object.values(copied).forEach((targets) => {
    if (Array.isArray(targets)) {
      targets.forEach((k) => linkedKeys.add(k));
    }
  });
  return linkedKeys;
}

/**
 * Only apply preference keys that the server linked from the dock (e.g. supporting_material).
 * Use for `open` / `refresh` (and error rollback) so the dock selection is never reset.
 *
 * @param {Object} prev
 * @param {Object} resolvedInputs
 * @param {Object|null|undefined} metadata
 */
export function mergeLinkedParityKeysIntoInputs(prev, resolvedInputs, metadata) {
  if (!resolvedInputs || typeof resolvedInputs !== "object") {
    return { ...prev };
  }
  const next = { ...prev };
  const keys = collectLinkedPrefKeysFromMetadata(metadata);
  keys.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(resolvedInputs, k)) {
      next[k] = resolvedInputs[k];
    }
  });
  return next;
}
