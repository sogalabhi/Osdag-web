import { useEffect, useState, useRef, useMemo } from "react";
import { optionText } from "../utils/fieldOptionUtils";
import { loadStateFromOsi } from "../utils/osiLoader";
import { shouldClearOverridesOnDockChange } from "../utils/dockDriverChange";
import { isAdditionalInput, prefClearingFields } from "../utils/prefSyncKeys";

const buildInitialSelectionStates = (config) =>
  (config.selectionConfig || []).reduce((acc, selection) => {
    acc[selection.key] = selection.defaultValue || "All";
    return acc;
  }, {});

const buildInitialAllSelected = (config) =>
  (config.selectionConfig || []).reduce((acc, selection) => {
    acc[selection.inputKey] = true;
    return acc;
  }, {});

const buildInitialSelectedItems = (config) =>
  (config.selectionConfig || []).reduce((acc, selection) => {
    acc[selection.inputKey] = [];
    return acc;
  }, {});

const buildInitialModalStates = (config) =>
  (config.modalConfig || []).reduce((acc, modal) => {
    acc[modal.key] = false;
    return acc;
  }, {});

const buildInitialModalDynamicSrc = (config) =>
  (config.modalConfig || []).reduce((acc, modal) => {
    if (!modal?.dataSource) acc[modal.key] = [];
    return acc;
  }, {});

const NO_LISTS = {};

export const useModuleForm = (moduleConfig, moduleData) => {
  const safeModuleData = useMemo(() => moduleData || {}, [moduleData]);

  const [inputs, setInputs] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasProjectId = urlParams.get('projectId') != null || window.location.pathname.match(/\/\d+$/);
    return hasProjectId ? {} : moduleConfig.defaultInputs;
  });

  const resolveInitialExtraState = () => {
    if (typeof moduleConfig.getInitialExtraState === "function") {
      return moduleConfig.getInitialExtraState();
    }
    return {};
  };

  const [extraState, setExtraState] = useState(resolveInitialExtraState());

  const [selectionStates, setSelectionStates] = useState(() => buildInitialSelectionStates(moduleConfig));

  const [allSelected, setAllSelected] = useState(() => buildInitialAllSelected(moduleConfig));

  const [selectedItems, setSelectedItems] = useState(() => buildInitialSelectedItems(moduleConfig));

  const [modalStates, setModalStates] = useState(() => buildInitialModalStates(moduleConfig));

  const [modalDynamicSrc, setModalDynamicSrc] = useState(() => buildInitialModalDynamicSrc(moduleConfig));

  const [designPrefModalStatus, setDesignPrefModalStatus] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [displaySaveInputPopup, setDisplaySaveInputPopup] = useState(false);
  const [saveInputFileName, setSaveInputFileName] = useState("");
  const [designPrefOverrides, setDesignPrefOverrides] = useState({});

  useEffect(() => {
    try {
      const moduleKey = moduleConfig.designType || moduleConfig.moduleKey || moduleConfig.cameraKey;
      if (moduleKey) {
        const raw = sessionStorage.getItem(`prefill:${moduleKey}`);
        if (raw) {
          // The "All" of a selection is the whole option list, so the file is read once the lists are here.
          const hasLoadedLists = safeModuleData.loadingOptions === false;
          if (hasLoadedLists) {
            const uiObj = JSON.parse(raw);
            loadStateFromOsi(uiObj, {
              setInputs,
              setDesignPrefOverrides,
              setExtraState,
              setSelectionStates,
              setAllSelected,
              setSelectedItems,
              moduleConfig,
              safeModuleData,
            });
            sessionStorage.removeItem(`prefill:${moduleKey}`);
          }
        }
      }
    } catch (e) {
      console.warn("Prefill from OSI failed:", e);
    }
  }, [safeModuleData, moduleConfig]);

  const inputKeyToList = moduleConfig.inputKeyToList || NO_LISTS;
  useEffect(() => {
    setInputs((prev) => {
      let isChanged = false;
      const nextInputs = { ...prev };

      Object.entries(inputKeyToList).forEach(([inputKey, listKey]) => {
        if (!allSelected?.[inputKey]) return;

        const current = prev?.[inputKey];
        const isEmptyArray = Array.isArray(current) ? current.length === 0 : !current;
        if (!isEmptyArray) return;

        const fullList = safeModuleData[listKey];
        const normalized = Array.isArray(fullList)
          ? fullList.map(optionText)
          : [];

        if (normalized.length > 0) {
          nextInputs[inputKey] = normalized;
          isChanged = true;
        }
      });

      return isChanged ? nextInputs : prev;
    });
  }, [safeModuleData, allSelected, inputKeyToList]);

  useEffect(() => {
    if (displaySaveInputPopup) {
      const timer = setTimeout(() => setDisplaySaveInputPopup(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [displaySaveInputPopup]);

  const dockDriverSnapshotRef = useRef(null);
  // The dock fields whose change clears the saved Additional Inputs (see `prefClearingFields`).
  const dockDriverFieldNames = useMemo(() => prefClearingFields(moduleConfig), [moduleConfig]);
  const dockDriverSnapshot = JSON.stringify(dockDriverFieldNames.map((field) => inputs?.[field]));
  // The overrides of the previous commit: a file or project load (or a reset) sets the dock and the
  // overrides in one commit, and what it loads must stay (see `dockDriverChange`). Updated by the
  // effect after this one.
  const previousOverridesRef = useRef(designPrefOverrides);

  useEffect(() => {
    // A load only moves the last seen dock driver; the user's later edit of it clears.
    const commit = {
      previousSnapshot: dockDriverSnapshotRef.current,
      snapshot: dockDriverSnapshot,
      previousOverrides: previousOverridesRef.current,
      overrides: designPrefOverrides,
    };
    dockDriverSnapshotRef.current = dockDriverSnapshot;
    if (!shouldClearOverridesOnDockChange(commit)) return;

    // As on the desktop, every saved Additional Input is dropped: the design takes the core's
    // values for the new dock again (the backend fills them), and the dialog shows those.
    const withoutPrefs = (state) => {
      if (!state || typeof state !== "object") return state;
      const kept = Object.entries(state).filter(([name]) => !isAdditionalInput(moduleConfig, name));
      return kept.length === Object.keys(state).length ? state : Object.fromEntries(kept);
    };
    setDesignPrefOverrides(withoutPrefs);
    setInputs(withoutPrefs);
    // designPrefOverrides is read only to tell a load from a user's dock change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dockDriverSnapshot, moduleConfig, setDesignPrefOverrides]);

  useEffect(() => {
    previousOverridesRef.current = designPrefOverrides;
  }, [designPrefOverrides]);

  const updateModalState = (modalKey, isOpen) => {
    setModalStates((prev) => ({
      ...prev,
      [modalKey]: isOpen,
    }));
  };

  const updateSelectionState = (selectionKey, value) => {
    setSelectionStates((prev) => ({
      ...prev,
      [selectionKey]: value,
    }));
  };

  const updateSelectedItems = (inputKey, items) => {
    setSelectedItems((prev) => ({
      ...prev,
      [inputKey]: items,
    }));
    setInputs((prev) => ({
      ...prev,
      [inputKey]: items,
    }));
  };

  const toggleAllSelected = (inputKey, isAll) => {
    setAllSelected((prev) => ({
      ...prev,
      [inputKey]: isAll,
    }));
  };

  const resetFormState = () => {
    const resolvedInputs = moduleConfig.defaultInputs || {};
    console.log('[useModuleForm] resetFormState: setting inputs to config defaults', resolvedInputs);
    setInputs(resolvedInputs);
    setExtraState(resolveInitialExtraState());
    setSelectionStates(buildInitialSelectionStates(moduleConfig));
    setAllSelected(buildInitialAllSelected(moduleConfig));
    setSelectedItems(buildInitialSelectedItems(moduleConfig));
    setModalStates(buildInitialModalStates(moduleConfig));
    setModalDynamicSrc(buildInitialModalDynamicSrc(moduleConfig));

    setDesignPrefModalStatus(false);
    setConfirmationModal(false);
    setDisplaySaveInputPopup(false);
    setSaveInputFileName("");
    setDesignPrefOverrides({});
  };

  return {
    inputs,
    setInputs,
    extraState,
    setExtraState,
    selectionStates,
    setSelectionStates,
    allSelected,
    setAllSelected,
    selectedItems,
    setSelectedItems,
    modalStates,
    setModalStates,
    modalDynamicSrc,
    setModalDynamicSrc,
    designPrefModalStatus,
    setDesignPrefModalStatus,
    confirmationModal,
    setConfirmationModal,
    displaySaveInputPopup,
    setDisplaySaveInputPopup,
    saveInputFileName,
    setSaveInputFileName,
    designPrefOverrides,
    setDesignPrefOverrides,
    updateModalState,
    updateSelectionState,
    updateSelectedItems,
    toggleAllSelected,
    resetFormState,
  };
};