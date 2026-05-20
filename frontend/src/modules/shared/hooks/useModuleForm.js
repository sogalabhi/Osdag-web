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
      const moduleKey = moduleConfig.cameraKey || moduleConfig.moduleKey || moduleConfig.designType;
      if (moduleKey) {
        const raw = sessionStorage.getItem(`prefill:${moduleKey}`);
        if (raw) {
          const uiObj = JSON.parse(raw);
          const baseDefaults = moduleConfig.defaultInputs || {};
          const osiKeyMap = moduleConfig.osiKeyMap || {};
          console.log("Raw Session Storage Prefill:", raw);
          console.log("Base default inputs:", baseDefaults);

          let rawConnectivity = uiObj["Connectivity"] ?? uiObj["Connectivity *"] ?? uiObj["connectivity"];
          let normalizedConnectivity = undefined;
          if (rawConnectivity) {
            const connStr = String(rawConnectivity).trim();
            if (/Beam[- ]Beam/i.test(connStr)) {
              normalizedConnectivity = "Beam-Beam";
            } else if (/Column[- ]Flange/i.test(connStr)) {
              normalizedConnectivity = "Column Flange-Beam-Web";
            } else if (/Column[- ]Web/i.test(connStr)) {
              normalizedConnectivity = "Column Web-Beam-Web";
            } else {
              normalizedConnectivity = connStr;
            }
          }

          let supportingDesignationKey = "column_section";
          let supportedDesignationKey = "beam_section";

          if ("primary_beam" in baseDefaults && normalizedConnectivity === "Beam-Beam") {
            supportingDesignationKey = "primary_beam";
            supportedDesignationKey = "secondary_beam";
          } else if ("supporting_designation" in baseDefaults) {
            supportingDesignationKey = "supporting_designation";
            supportedDesignationKey = "supported_designation";
          } else if ("section_profile" in baseDefaults) {
            supportedDesignationKey = "section_profile";
          }

          const normalized = {};
          if (normalizedConnectivity !== undefined && "connectivity" in baseDefaults) {
            normalized.connectivity = normalizedConnectivity;
          }

          const targetAllSelected = {};
          const targetSelectionStates = {};
          const targetSelectedItems = {};

          const addIfPresent = (inputKey, value) => {
            if (value === undefined || value === null) return;

            const selectionItem = (moduleConfig.selectionConfig || []).find(
              (item) => item.inputKey === inputKey
            );

            const isArrayField = Array.isArray(baseDefaults[inputKey]) || !!INPUT_KEY_TO_LIST[inputKey];

            if (isArrayField) {
              const listVal = Array.isArray(value) ? value : [value];
              const normalizedList = listVal.map(item => String(item));
              normalized[inputKey] = normalizedList;

              if (inputKey === "bolt_diameter") {
                let configOptions = [];
                for (const sec of moduleConfig.inputSections || []) {
                  const found = sec.fields?.find(f => f.key === "bolt_diameter");
                  if (found && Array.isArray(found.options)) {
                    configOptions = found.options;
                    break;
                  }
                }
                const dynamicListKey = INPUT_KEY_TO_LIST[inputKey];
                const dynamicOptions = dynamicListKey ? safeModuleData[dynamicListKey] : [];

                console.log("['diameter check'] OSI Diameters:", normalizedList);
                console.log("['diameter check'] Field Static Config Options:", configOptions);
                console.log("['diameter check'] Field Dynamic Database Options:", dynamicOptions);
              }

              if (selectionItem) {
                targetAllSelected[inputKey] = false;
                targetSelectionStates[selectionItem.key] = "Customized";
                targetSelectedItems[inputKey] = normalizedList;
              }
            } else {
              const val = Array.isArray(value) ? (value.length ? value[0] : undefined) : value;
              if (val === undefined) return;
              let finalVal = typeof val === "string" ? val : String(val);

              if (inputKey === "bolt_type") {
                let boltTypeField = null;
                for (const sec of moduleConfig.inputSections || []) {
                  const found = sec.fields?.find(f => f.key === "bolt_type");
                  if (found) {
                    boltTypeField = found;
                    break;
                  }
                }
                if (boltTypeField && Array.isArray(boltTypeField.options)) {
                  const optionValues = boltTypeField.options.map(o => typeof o === "object" ? o.value : o);
                  if (!optionValues.includes(finalVal)) {
                    const valWithUnderscore = finalVal.replace(/\s+/g, "_");
                    const valWithSpace = finalVal.replace(/_/g, " ");
                    if (optionValues.includes(valWithUnderscore)) {
                      finalVal = valWithUnderscore;
                    } else if (optionValues.includes(valWithSpace)) {
                      finalVal = valWithSpace;
                    }
                  }
                } else if (moduleKey === "FinPlateConnection" || moduleKey === "Fin Plate Connection") {
                  finalVal = finalVal.replace(/\s+/g, "_");
                }
              }

              if (inputKey === "bolt_tension_type") {
                if (/non[- ]?pretensioned/i.test(finalVal) || /non pre-tensioned/i.test(finalVal)) {
                  const defaultVal = baseDefaults[inputKey] || "";
                  if (defaultVal.includes("pre-tensioned")) {
                    finalVal = "Non pre-tensioned";
                  } else {
                    finalVal = "Non Pre-tensioned";
                  }
                } else if (/pretensioned/i.test(finalVal) || /pre-tensioned/i.test(finalVal)) {
                  finalVal = "Pre-tensioned";
                }
              }

              if (inputKey === "bolt_hole_type") {
                if (/oversized/i.test(finalVal) || /over-sized/i.test(finalVal)) {
                  finalVal = "Over-Sized";
                } else if (/standard/i.test(finalVal)) {
                  finalVal = "Standard";
                }
              }

              normalized[inputKey] = finalVal;
            }
          };

          console.log("=== Prefill Key Matching Logs ===");
          for (const inputKey of Object.keys(baseDefaults)) {
            const mappedOsiKey = osiKeyMap[inputKey];
            let foundVal = undefined;
            let matchType = "None";

            if (mappedOsiKey && Object.prototype.hasOwnProperty.call(uiObj, mappedOsiKey)) {
              foundVal = uiObj[mappedOsiKey];
              matchType = `Mapped OSI Key (${mappedOsiKey})`;
              addIfPresent(inputKey, foundVal);
            } else if (Object.prototype.hasOwnProperty.call(uiObj, inputKey)) {
              foundVal = uiObj[inputKey];
              matchType = "Direct Match";
              addIfPresent(inputKey, foundVal);
            } else {
              const aliases = {
                bolt_hole_type: "Bolt.Bolt_Hole_Type",
                bolt_diameter: "Bolt.Diameter",
                bolt_grade: "Bolt.Grade",
                bolt_slip_factor: "Bolt.Slip_Factor",
                bolt_type: "Bolt.Type",
                bolt_tension_type: "Bolt.TensionType",
                weld_fab: "Weld.Fab",
                weld_material_grade: "Weld.Material_Grade_OverWrite",
                connector_material: "Connector.Material",
                design_method: "Design.Design_Method",
                detailing_edge_type: "Detailing.Edge_type",
                detailing_gap: "Detailing.Gap",
                detailing_corr_status: "Detailing.Corrosive_Influences",
                load_axial: "Load.Axial",
                load_shear: "Load.Shear",
                plate_thickness: "Connector.Plate.Thickness_List",
                supported_material: "Member.Supported_Section.Material",
                supporting_material: "Member.Supporting_Section.Material",
                location: "Conn_Location",
                length: "Member.Length",
                axial_force: "Load.Axial",
              };

              if ("section_profile" in baseDefaults) {
                aliases.section_profile = "Member.Profile";
                aliases.section_designation = "Member.Designation";
              } else {
                aliases[supportingDesignationKey] = "Member.Supporting_Section.Designation";
                aliases[supportedDesignationKey] = "Member.Supported_Section.Designation";
              }

              const aliasKey = aliases[inputKey];
              if (aliasKey && Object.prototype.hasOwnProperty.call(uiObj, aliasKey)) {
                foundVal = uiObj[aliasKey];
                matchType = `Alias Match (${aliasKey})`;
                addIfPresent(inputKey, foundVal);
              }
            }
            console.log(`Input Key: "${inputKey}" | Match Type: ${matchType} | Found Value:`, foundVal);
          }
          console.log("=== End Prefill Matching Logs ===");

          if (Object.keys(normalized).length > 0) {
            setInputs({ ...baseDefaults, ...normalized });

            if (Object.keys(targetAllSelected).length > 0) {
              setAllSelected(prev => ({ ...prev, ...targetAllSelected }));
            }
            if (Object.keys(targetSelectionStates).length > 0) {
              setSelectionStates(prev => ({ ...prev, ...targetSelectionStates }));
            }
            if (Object.keys(targetSelectedItems).length > 0) {
              setSelectedItems(prev => ({ ...prev, ...targetSelectedItems }));
            }

            if (normalized.connectivity) {
              setExtraState(prev => ({
                ...prev,
                selectedOption: normalized.connectivity
              }));
            }

            if (normalized.section_profile && typeof moduleConfig.getSectionImage === "function") {
              const img = moduleConfig.getSectionImage(normalized.section_profile);
              setExtraState(prev => ({
                ...prev,
                selectedProfile: normalized.section_profile,
                imageSource: img
              }));
            }
          }
          setTimeout(() => {
            sessionStorage.removeItem(`prefill:${moduleKey}`);
          }, 1000);
        }
      }
    } catch (e) {
      console.warn("Prefill from OSI failed:", e);
    }
  }, []);

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