import { useEffect, useMemo, useRef } from "react";
import { fetchDesignPrefSync } from "../../../datasources/modulesDataSource";
import { mergeLinkedParityKeysIntoInputs } from "../utils/mergeDesignPrefSyncIntoInputs";
import { dockDriverFields } from "../utils/prefSyncKeys";

const DEBOUNCE_MS = 200;

/**
 * Keep main `inputs` material preference keys in sync with the
 * input dock (driving grade) through backend refresh.
 */
export function useDesignPrefSync({
  moduleConfig,
  inputs,
  setInputs,
  applyStrictLinkedReseed,
  setLastKnownGoodDesignPrefSnapshot,
  /** When true, Additional Inputs modal owns refresh calls. */
  pause = false,
}) {
  const abortRef = useRef(null);
  const reqGen = useRef(0);
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;

  /**
   * When the modal opens we record the current driver value. When the modal
   * closes (pause: true → false) we compare: if the driver hasn't changed we
   * skip the refresh so user-saved pref overrides are not clobbered.
   * If the driver DID change while the modal was open, the modal's own
   * runSync("refresh") already handled it; we still skip to avoid a duplicate.
   */
  const driverAtPauseRef = useRef(null);

  // The dock fields that hold the driving grade (see `dockDriverFields`); a change in any re-runs the effect.
  const driverFields = useMemo(() => dockDriverFields(moduleConfig), [moduleConfig]);
  const driverKey = JSON.stringify(driverFields.map((field) => inputs?.[field]));

  useEffect(() => {
    if (!moduleConfig?.designType || !setInputs) return;

    const latest = inputsRef.current;
    const driver = driverFields.map((field) => latest?.[field]).find((grade) => grade);

    if (pause) {
      // Record driver value when modal opens so we can detect no-change on close.
      driverAtPauseRef.current = driver ?? null;
      abortRef.current?.abort();
      return;
    }

    // Modal just closed: skip refresh if driver is unchanged.
    if (driverAtPauseRef.current !== null) {
      const wasDriver = driverAtPauseRef.current;
      driverAtPauseRef.current = null;
      if (driver === wasDriver) return;
    }

    if (!driver) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const myGen = ++reqGen.current;

    const t = setTimeout(async () => {
      const snap = inputsRef.current;
      const res = await fetchDesignPrefSync(moduleConfig, { state: snap, operation: "refresh" }, ac.signal);
      if (myGen !== reqGen.current) return;
      if (!res.success) {
        if (res.aborted) return;
        return;
      }
      const { data } = res;
      const resolvedInputs = data.resolved_inputs || {};
      const metadata = data.metadata;
      let mergedSnapshotInputs = null;
      setInputs((prev) => {
        const next = mergeLinkedParityKeysIntoInputs(prev, resolvedInputs, metadata);
        mergedSnapshotInputs = next;
        return next;
      });
      const snapshot = {
        resolved_inputs: mergedSnapshotInputs || { ...inputsRef.current },
        material_details: data.material_details,
        metadata: data.metadata,
      };
      applyStrictLinkedReseed?.({
        material_details: data.material_details,
        metadata: data.metadata,
        snapshot,
      });
      setLastKnownGoodDesignPrefSnapshot(snapshot);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [
    moduleConfig,
    driverFields,
    driverKey,
    setInputs,
    applyStrictLinkedReseed,
    setLastKnownGoodDesignPrefSnapshot,
    pause,
  ]);
}
