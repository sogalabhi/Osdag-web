import { useEffect, useState } from "react";
import {
  MODULE_KEY_FIN_PLATE,
  MODULE_KEY_CLEAT_ANGLE,
  MODULE_KEY_SEAT_ANGLE,
  MODULE_KEY_END_PLATE,
  MODULE_KEY_BEAM_BEAM_END_PLATE,
  MODULE_KEY_BEAM_COLUMN_END_PLATE,
} from "../../../constants/DesignKeys";
import { INPUT_KEY_TO_LIST } from "../constants/moduleDataKeys";
import { loadStateFromOsi } from "../utils/osiLoader";

export const useModuleForm = (moduleConfig, moduleData) => {
  const safeModuleData = moduleData || {};

  const [inputs, setInputs] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasProjectId = urlParams.get('projectId') != null || window.location.pathname.match(/\/\d+$/);
    return hasProjectId ? {} : moduleConfig.defaultInputs;
  });

  const resolveInitialExtraState = () => {
    if (typeof moduleConfig.getInitialExtraState === "function") {
      return moduleConfig.getInitialExtraState();
    }
    if (moduleConfig.cameraKey === MODULE_KEY_FIN_PLATE) {
      return { selectedOption: "Column Flange-Beam-Web" };
    } else if (moduleConfig.cameraKey === MODULE_KEY_CLEAT_ANGLE) {
      return { selectedOption: "Column Flange-Beam-Web" };
    } else if (moduleConfig.cameraKey === MODULE_KEY_SEAT_ANGLE) {
      return { selectedOption: "Column Flange-Beam-Web" };
    } else if (moduleConfig.cameraKey === MODULE_KEY_END_PLATE) {
      return { selectedOption: "Column Flange-Beam-Web" };
    } else if (moduleConfig.cameraKey === MODULE_KEY_BEAM_BEAM_END_PLATE) {
      return { selectedOption: "Flushed - Reversible Moment" };
    } else if (moduleConfig.cameraKey === MODULE_KEY_BEAM_COLUMN_END_PLATE) {
      return { selectedOption: "Flushed - Reversible Moment" };
    }
    return { selectedOption: "Column Flange-Beam-Web" };
  };

  const [extraState, setExtraState] = useState(resolveInitialExtraState());

  const [selectionStates, setSelectionStates] = useState(
    (moduleConfig.selectionConfig || []).reduce((acc, selection) => {
      acc[selection.key] = selection.defaultValue || "All";
      return acc;
    }, {})
  );

  const [allSelected, setAllSelected] = useState(
    (moduleConfig.selectionConfig || []).reduce((acc, selection) => {
      acc[selection.inputKey] = true;
      return acc;
    }, {})
  );

  const [selectedItems, setSelectedItems] = useState(
    (moduleConfig.selectionConfig || []).reduce((acc, selection) => {
      acc[selection.inputKey] = [];
      return acc;
    }, {})
  );

  const [modalStates, setModalStates] = useState(
    (moduleConfig.modalConfig || []).reduce((acc, modal) => {
      acc[modal.key] = false;
      return acc;
    }, {})
  );

  const [modalDynamicSrc, setModalDynamicSrc] = useState(
    (moduleConfig.modalConfig || []).reduce((acc, modal) => {
      if (!modal?.dataSource) acc[modal.key] = [];
      return acc;
    }, {})
  );

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
          const uiObj = JSON.parse(raw);
          const hasLoadedLists = Object.keys(safeModuleData).length > 0;
          
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
          
          if (hasLoadedLists) {
            setTimeout(() => {
              sessionStorage.removeItem(`prefill:${moduleKey}`);
            }, 1000);
          }
        }
      }
    } catch (e) {
      console.warn("Prefill from OSI failed:", e);
    }
  }, [safeModuleData]);

  useEffect(() => {
    if (moduleData && Object.keys(moduleData).length > 0) {
      console.log("['diameter check'] Loaded Database Options (once API resolves):", moduleData.boltDiameterList);
    }
  }, [moduleData]);

  useEffect(() => {
    setInputs((prev) => {
      let isChanged = false;
      const nextInputs = { ...prev };

      Object.entries(INPUT_KEY_TO_LIST).forEach(([inputKey, listKey]) => {
        if (!allSelected?.[inputKey]) return;

        const current = prev?.[inputKey];
        const isEmptyArray = Array.isArray(current) ? current.length === 0 : !current;
        if (!isEmptyArray) return;

        const fullList = safeModuleData[listKey];
        const normalized = Array.isArray(fullList)
          ? fullList.map((val) => {
            if (typeof val === "object" && val !== null) {
              return val.value || val.Grade || String(val);
            }
            return String(val);
          })
          : [];

        if (normalized.length > 0) {
          nextInputs[inputKey] = normalized;
          isChanged = true;
        }
      });

      return isChanged ? nextInputs : prev;
    });
  }, [safeModuleData, allSelected]);

  useEffect(() => {
    if (displaySaveInputPopup) {
      setTimeout(() => setDisplaySaveInputPopup(false), 4000);
    }
  }, [displaySaveInputPopup]);

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
    setSelectionStates(
      (moduleConfig.selectionConfig || []).reduce((acc, selection) => {
        acc[selection.key] = selection.defaultValue || "All";
        return acc;
      }, {})
    );
    setAllSelected(
      (moduleConfig.selectionConfig || []).reduce((acc, selection) => {
        acc[selection.inputKey] = true;
        return acc;
      }, {})
    );
    setSelectedItems(
      (moduleConfig.selectionConfig || []).reduce((acc, selection) => {
        acc[selection.inputKey] = [];
        return acc;
      }, {})
    );

    setModalStates(
      (moduleConfig.modalConfig || []).reduce((acc, modal) => {
        acc[modal.key] = false;
        return acc;
      }, {})
    );
    setModalDynamicSrc(
      (moduleConfig.modalConfig || []).reduce((acc, modal) => {
        if (!modal?.dataSource) acc[modal.key] = [];
        return acc;
      }, {})
    );

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