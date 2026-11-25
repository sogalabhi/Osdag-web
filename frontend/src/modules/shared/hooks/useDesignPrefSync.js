import { useEffect, useMemo, useRef } from "react";
import { fetchDesignPrefSync } from "../../../datasources/modulesDataSource";
import { mergeLinkedParityKeysIntoInputs } from "../utils/mergeDesignPrefSyncIntoInputs";
import { dockDriverChange, dockSyncOperation } from "../utils/dockDriverChange";
import { dockDriverFields } from "../utils/prefSyncKeys";

const DEBOUNCE_MS = 200;

/**
 * Keep main `inputs` material preference keys in sync with the
 * input dock (driving grade) through backend refresh.
 */
export function useDesignPrefSync({
  moduleConfig,
  inputs,
  /** The saved Additional Inputs overrides: a commit that replaces them along with the dock is a load, not an edit. */
  designPrefOverrides,
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
  const overridesRef = useRef(designPrefOverrides);
  overridesRef.current = designPrefOverrides;

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

  // What the previous commit held (the effect below reads it, the one after it moves it on), and the
  // dock value of the last load whose rows are the file's: while the dock stays there, only "open" runs.
  const previousDriverKeyRef = useRef(null);
  const previousOverridesRef = useRef(designPrefOverrides);
  const loadedDriverKeyRef = useRef(null);

  useEffect(() => {
    if (!moduleConfig?.designType || !setInputs) return;

    // A file, project or example load sets the dock and the saved overrides in one commit. The rows
    // are then the file's: they must not be refreshed from the dock Material (the desktop keeps them
    // too, `ui_loaded`); only a row the file lacks is filled. A later edit of the dock refreshes.
    const change = dockDriverChange({
      previousSnapshot: previousDriverKeyRef.current,
      snapshot: driverKey,
      previousOverrides: previousOverridesRef.current,
      overrides: overridesRef.current,
    });
    previousDriverKeyRef.current = driverKey;
    if (change === "load") loadedDriverKeyRef.current = driverKey;
    else if (change === "user") loadedDriverKeyRef.current = null;
    const operation = dockSyncOperation(loadedDriverKeyRef.current === driverKey ? "load" : change);

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
      const res = await fetchDesignPrefSync(moduleConfig, { state: snap, operation }, ac.signal);
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

  useEffect(() => {
    previousOverridesRef.current = designPrefOverrides;
  }, [designPrefOverrides]);
}
