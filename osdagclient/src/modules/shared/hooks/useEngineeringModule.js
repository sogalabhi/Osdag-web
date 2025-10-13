import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ModuleContext } from "../../../context/ModuleState";
import { MODULE_KEY_FIN_PLATE } from "../../../constants/DesignKeys";

export const useEngineeringModule = (moduleConfig) => {
  const navigate = useNavigate();

  // ===================================================================
  // SIMPLIFIED CONTEXT API - Using 8 Core Functions
  // ===================================================================
  const {
    // State variables (unchanged)
    beamList,
    columnList,
    connectivityList,
    materialList,
    boltDiameterList,
    thicknessList,
    propertyClassList,
    angleList, // FIXED: Added angleList from context
    boltTypeList,
    designLogs,
    designData,
    displayPDF,
    renderCadModel,
    cadModelPaths,

    // NEW SIMPLIFIED API - 8 Core Functions Only
    getModuleData,              // Universal data fetcher
    manageDesignPreferences,    // Design preferences management  
    createDesign,               // Design calculation
    createCADModel,             // CAD generation
    generateReport,             // Unified report generation
    resetModuleState,           // State reset
  } = useContext(ModuleContext);

  // Core state management
  const [inputs, setInputs] = useState(moduleConfig.defaultInputs);
  const [output, setOutput] = useState(null);
  const [logs, setLogs] = useState(null);
  const [displayOutput, setDisplayOutput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [renderBoolean, setRenderBoolean] = useState(false);
  const [modelKey, setModelKey] = useState(0);

  // Sync local output/logs/display with context design results
  useEffect(() => {
    // Prefill inputs from sessionStorage if available
    try {
      const moduleKey = moduleConfig.cameraKey || moduleConfig.moduleKey || moduleConfig.designType;
      if (moduleKey) {
        const raw = sessionStorage.getItem(`prefill:${moduleKey}`);
        if (raw) {
          const uiObj = JSON.parse(raw);
          // Optional: allow per-module mapping via moduleConfig.osiKeyMap
          const baseDefaults = moduleConfig.defaultInputs || {};
          const osiKeyMap = moduleConfig.osiKeyMap || {};

          // Build normalized inputs: only keys present in defaults
          const normalized = {};
          const addIfPresent = (inputKey, value) => {
            if (value === undefined || value === null) return;
            // Array handling: take first element
            const val = Array.isArray(value) ? (value.length ? value[0] : undefined) : value;
            if (val === undefined) return;
            // Coerce to string for number/text fields as this UI primarily holds strings
            normalized[inputKey] = typeof val === 'string' ? val : String(val);
          };

          // Iterate default input keys and try to find corresponding values in uiObj
          for (const inputKey of Object.keys(baseDefaults)) {
            // 1) Mapped key from .osi if provided
            const mappedOsiKey = osiKeyMap[inputKey];
            if (mappedOsiKey && Object.prototype.hasOwnProperty.call(uiObj, mappedOsiKey)) {
              addIfPresent(inputKey, uiObj[mappedOsiKey]);
              continue;
            }
            // 2) Heuristic: Dot-notated keys in .osi sometimes match with space/different casing
            // Try direct exact match
            if (Object.prototype.hasOwnProperty.call(uiObj, inputKey)) {
              addIfPresent(inputKey, uiObj[inputKey]);
              continue;
            }
            // 3) Simple aliases for common fields
            const aliases = {
              bolt_hole_type: 'Bolt.Bolt_Hole_Type',
              bolt_diameter: 'Bolt.Diameter',
              bolt_grade: 'Bolt.Grade',
              bolt_slip_factor: 'Bolt.Slip_Factor',
              bolt_type: 'Bolt.Type',
              connector_material: 'Connector.Material',
              design_method: 'Design.Design_Method',
              detailing_edge_type: 'Detailing.Edge_type',
              detailing_gap: 'Detailing.Gap',
              detailing_corr_status: 'Detailing.Corrosive_Influences',
              load_axial: 'Load.Axial',
              load_shear: 'Load.Shear',
              plate_thickness: 'Connector.Plate.Thickness_List',
              beam_section: 'Member.Supported_Section.Designation',
              column_section: 'Member.Supporting_Section.Designation',
              supported_material: 'Member.Supported_Section.Material',
              supporting_material: 'Member.Supporting_Section.Material',
            };
            const aliasKey = aliases[inputKey];
            if (aliasKey && Object.prototype.hasOwnProperty.call(uiObj, aliasKey)) {
              addIfPresent(inputKey, uiObj[aliasKey]);
              continue;
            }
          }

          if (Object.keys(normalized).length > 0) {
            setInputs({ ...baseDefaults, ...normalized });
          }
          // Clear the prefill once read
          sessionStorage.removeItem(`prefill:${moduleKey}`);
        }
      }
    } catch (e) {
      console.warn('Prefill from OSI failed:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (designData && Object.keys(designData).length > 0) {
      console.log("[useEngineeringModule] useEffect output::", designData);
      setOutput(designData);
      setDisplayOutput(true);
    }
    if (designLogs) {
      setLogs(designLogs);
    }
  }, [designData, designLogs]);

  // Modal states
  const [modalStates, setModalStates] = useState(
    moduleConfig.modalConfig.reduce((acc, modal) => {
      acc[modal.key] = false;
      return acc;
    }, {})
  );

  // Selection states
  const [selectionStates, setSelectionStates] = useState(
    moduleConfig.selectionConfig.reduce((acc, selection) => {
      acc[selection.key] = selection.defaultValue || "All";
      return acc;
    }, {})
  );

  // All selected states
  const [allSelected, setAllSelected] = useState(
    moduleConfig.selectionConfig.reduce((acc, selection) => {
      acc[selection.inputKey] = true;
      return acc;
    }, {})
  );

  // Selected items for transfers
  const [selectedItems, setSelectedItems] = useState(
    moduleConfig.selectionConfig.reduce((acc, selection) => {
      acc[selection.inputKey] = [];
      return acc;
    }, {})
  );

  // Initialize extraState based on module type
  const getInitialExtraState = () => {
    if (moduleConfig.cameraKey === MODULE_KEY_FIN_PLATE) {
      return {
        selectedOption: "Column Flange-Beam-Web", // Default for FinPlate
      };
    } else if (moduleConfig.cameraKey === "EndPlate") {
      return {
        selectedOption: "Column Flange-Beam-Web", // Default for EndPlate
      };
    }
    return {
      selectedOption: "Column Flange-Beam-Web", // FIXED: Default for CleatAngle (changed from endplate default)
    };
  };

  const [extraState, setExtraState] = useState(getInitialExtraState());

  // On mount: Load module data using simplified API with enhanced error handling
  useEffect(() => {
    const loadModuleData = async () => {
      console.log('📋 [ENGINEERING MODULE] Loading module data for:', moduleConfig?.designType);

      if (!moduleConfig?.designType) {
        console.warn('⚠️ [ENGINEERING MODULE] No moduleConfig or designType available');
        return;
      }

      if (!getModuleData) {
        console.error('❌ [ENGINEERING MODULE] getModuleData function not available');
        return;
      }

      try {
        console.log('🚀 [ENGINEERING MODULE] Calling getModuleData with simplified API');

        // Use the new simplified API which returns { success, data, error }
        const result = await getModuleData(moduleConfig.designType);

        if (result && result.success) {
          console.log('✅ [ENGINEERING MODULE] Module data loaded successfully');
          console.log('✅ [ENGINEERING MODULE] Data keys:', Object.keys(result.data || {}));
        } else {
          console.error('❌ [ENGINEERING MODULE] Failed to load module data:', result?.error || 'Unknown error');
        }
      } catch (error) {
        console.error('❌ [ENGINEERING MODULE] Exception while loading module data:', error);
      }
    };

    loadModuleData();
  }, [moduleConfig?.designType, getModuleData]);

  // Design report states
  const [createDesignReportBool, setCreateDesignReportBool] = useState(false);
  const [designReportInputs, setDesignReportInputs] = useState({
    companyName: "Your company",
    groupTeamName: "Your team",
    designer: "You",
    projectTitle: "",
    subtitle: "",
    jobNumber: "1",
    client: "Someone else",
    additionalComments: "No comments",
    companyLogo: null,
    companyLogoName: "",
  });

  // Navigation and reset states
  const [confirmationType, setConfirmationType] = useState("reset");
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [navigationSource, setNavigationSource] = useState(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [isLoadingModalVisible, setIsLoadingModalVisible] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");

  // Other states
  const [designPrefModalStatus, setDesignPrefModalStatus] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [displaySaveInputPopup, setDisplaySaveInputPopup] = useState(false);
  const [saveInputFileName, setSaveInputFileName] = useState("");
  const [selectedView, setSelectedView] = useState("Model");
  const [screenshotTrigger, setScreenshotTrigger] = useState(false);

  // Helper function to check if there's unsaved work
  const hasUnsavedWork = () => {
    return !!(output || renderBoolean);
  };

  // Comprehensive reset function
  const resetToDefaultState = () => {
    if (resetModuleState) {
      resetModuleState();
    }

    setRenderBoolean(false);
    setModelKey(0);
    setOutput(null);
    setLogs(null);
    setDisplayOutput(false);
    setLoading(false);

    setInputs(moduleConfig.defaultInputs);
    setExtraState(getInitialExtraState());

    // Reset selection states
    setSelectionStates(
      moduleConfig.selectionConfig.reduce((acc, selection) => {
        acc[selection.key] = selection.defaultValue || "All";
        return acc;
      }, {})
    );

    setAllSelected(
      moduleConfig.selectionConfig.reduce((acc, selection) => {
        acc[selection.inputKey] = true;
        return acc;
      }, {})
    );

    // Reset modal states
    setModalStates(
      moduleConfig.modalConfig.reduce((acc, modal) => {
        acc[modal.key] = false;
        return acc;
      }, {})
    );

    setSelectedItems(
      moduleConfig.selectionConfig.reduce((acc, selection) => {
        acc[selection.inputKey] = [];
        return acc;
      }, {})
    );

    setDesignPrefModalStatus(false);
    setConfirmationModal(false);
    setDisplaySaveInputPopup(false);
    setCreateDesignReportBool(false);
    setSelectedView("Model");
    setScreenshotTrigger(false);

  };


  // Navigation protection
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (hasUnsavedWork()) {
        const message = "You have unsaved design progress. Are you sure you want to leave?";
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    const handlePopState = (event) => {
      if (hasUnsavedWork() && !allowNavigation) {
        window.history.pushState(null, "", moduleConfig.routePath);
        setConfirmationType("navigation");
        setNavigationSource("back");
        setShowResetConfirmation(true);
        console.log("BACK BUTTON: Prevented navigation due to unsaved work");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [output, renderBoolean, allowNavigation, moduleConfig.routePath]);

  // Manage history state
  useEffect(() => {
    if (hasUnsavedWork()) {
      window.history.pushState(null, "", window.location.pathname);
    }
  }, [output, renderBoolean]);

  // Handle design logs
  useEffect(() => {
    if (displayOutput) {
      try {
        setLogs(designLogs);
      } catch (error) {
        console.log(error);
        setOutput(null);
      }
    } else {
      setLogs(null);
    }
  }, [designLogs, displayOutput]);

  // Handle design data - normalize to { key: { label, val } }
  useEffect(() => {
    if (displayOutput) {
      try {
        const formatedOutput = {};

        // Both FinPlate and others use flat entries: { label, val }
        // Be defensive to support { label, value } too
        for (const [key, value] of Object.entries(designData || {})) {
          const label = value?.label ?? key;
          const val = value?.val ?? value?.value ?? value;
          if (val !== undefined && val !== null) {
            formatedOutput[key] = { label, val };
          }
        }

        setOutput(formatedOutput);
      } catch (error) {
        console.log(error);
        setOutput(null);
      }
    }
  }, [designData, displayOutput]);

  // Handle CAD model rendering
  useEffect(() => {
    if (renderCadModel && cadModelPaths) {
      setRenderBoolean(true);
      setLoading(false);

      // Hide loading modal when model is ready
      setTimeout(() => {
        setIsLoadingModalVisible(false);
        setLoadingStage("");
      }, 500);
    } else {
      setRenderBoolean(false);
    }
  }, [renderCadModel, cadModelPaths]);

  // Get supported data when member designation changes (BeamBeamEndPlate) - Using simplified API
  useEffect(() => {
    const loadSupportedData = async () => {
      if (inputs.member_designation && moduleConfig.cameraKey !== MODULE_KEY_FIN_PLATE && moduleConfig.cameraKey !== MODULE_KEY_CLEAT_ANGLE && manageDesignPreferences) {
        try {
          console.log('Loading supported data for:', inputs.member_designation);

          const result = await manageDesignPreferences('get', {
            supported_section: inputs.member_designation,
          });

          if (result && result.success) {
            console.log('Supported data loaded successfully');
          } else {
            console.error('Failed to load supported data:', result?.error);
          }
        } catch (error) {
          console.error('Exception loading supported data:', error);
        }
      }
    };

    loadSupportedData();
  }, [inputs.member_designation, manageDesignPreferences, moduleConfig.cameraKey]);

  // Get design preferences data for FinPlate and CleatAngle - Using simplified API
  useEffect(() => {
    const loadDesignPreferences = async () => {
      if ((moduleConfig.cameraKey === MODULE_KEY_FIN_PLATE || moduleConfig.cameraKey === MODULE_KEY_CLEAT_ANGLE) && manageDesignPreferences) {
        const conn_map = {
          "Column Flange-Beam-Web": "Column Flange-Beam Web",
          "Column Web-Beam-Web": "Column Web-Beam Web",
          "Beam-Beam": "Beam-Beam",
        };

        const connectivity = extraState?.selectedOption || inputs.connectivity;

        try {
          let params = null;

          if (connectivity === "Column Flange-Beam-Web" || connectivity === "Column Web-Beam-Web") {
            if (inputs.column_section && inputs.beam_section) {
              params = {
                supported_section: inputs.beam_section,
                supporting_section: inputs.column_section,
                connectivity: conn_map[connectivity].split(" ").join("-"),
              };
            }
          } else if (connectivity === "Beam-Beam") {
            if (inputs.primary_beam && inputs.secondary_beam) {
              params = {
                supported_section: inputs.secondary_beam,
                supporting_section: inputs.primary_beam,
                connectivity: conn_map[connectivity],
              };
            }
          }

          if (params) {
            console.log('Loading design preferences for', moduleConfig.cameraKey, ':', params);

            const result = await manageDesignPreferences('get', params);

            if (result && result.success) {
              console.log('Design preferences loaded successfully');
            } else {
              console.error('Failed to load design preferences:', result?.error);
            }
          }
        } catch (error) {
          console.error('Exception loading design preferences:', error);
        }
      }
    };

    loadDesignPreferences();
  }, [
    inputs.column_section,
    inputs.beam_section,
    inputs.primary_beam,
    inputs.secondary_beam,
    extraState.selectedOption,
    inputs.connectivity,
    manageDesignPreferences,
    moduleConfig.cameraKey,
  ]);

  // Auto-hide save input popup
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

  const handleSubmit = async () => {
    const validationResult = moduleConfig.validateInputs(inputs, extraState);
    if (!validationResult.isValid) {
      alert(validationResult.message);
      return;
    }

    const param = moduleConfig.buildSubmissionParams(inputs, allSelected, {
      boltDiameterList,
      propertyClassList,
      thicknessList,
      angleList, // FIXED: Added angleList to submission params
    }, extraState);

    // Show loading modal
    setIsLoadingModalVisible(true);
    setLoadingStage("Generating design calculations...");

    try {
      await createDesign(param, moduleConfig.designType, null);
      // Auto-trigger CAD after successful design
      setLoadingStage("Generating 3D model...");
      const cadResult = await createCADModel(param, moduleConfig.designType, null);
      if (cadResult?.success) {
        setDisplayOutput(true);
        setLoading(false);
        setModelKey((prev) => prev + 1);
      } else {
        setLoading(false);
        setIsLoadingModalVisible(false);
        setLoadingStage("");
      }
    } catch (e) {
      console.error('Error in design/CAD flow:', e);
      setLoading(false);
      setIsLoadingModalVisible(false);
      setLoadingStage("");
    }
  };

  const handleReset = () => {
    setConfirmationType("reset");
    setShowResetConfirmation(true);
  };

  const handleHomeClick = () => {
    if (hasUnsavedWork()) {
      setConfirmationType("navigation");
      setNavigationSource("home");
      setShowResetConfirmation(true);
    } else {
      navigate("/home");
    }
  };

  const performReset = () => {
    if (confirmationType === "navigation") {
      console.log(`USER CONFIRMED NAVIGATION - source: ${navigationSource}`);

      setAllowNavigation(true);
      setShowResetConfirmation(false);
      setConfirmationType("reset");

      setTimeout(() => {
        resetToDefaultState();

        if (navigationSource === "home") {
          console.log("Navigating to home");
          navigate("/home");
        } else if (navigationSource === "back") {
          console.log("Navigating to connections page");
          navigate("/design-type/connections");
        }

        setAllowNavigation(false);
        setNavigationSource(null);
      }, 100);
    } else {
      console.log("USER CONFIRMED RESET - starting targeted reset");
      resetToDefaultState();
      setShowResetConfirmation(false);
      setConfirmationType("reset");
      console.log("RESET: User confirmed - targeted reset completed");
    }
  };

  const saveOutput = () => {
    const validationResult = moduleConfig.validateInputs(inputs, extraState);
    if (!validationResult.isValid) {
      alert(validationResult.message);
      return;
    }

    let data = moduleConfig.buildSubmissionParams(inputs, allSelected, {
      boltDiameterList,
      propertyClassList,
      thicknessList,
      angleList, // FIXED: Added angleList here too
    }, extraState);

    // Add output data to the submission data
    for (const key in output) {
      if (output.hasOwnProperty(key)) {
        const { label, val } = output[key];
        if (label && val !== undefined && val !== null) {
          const safeLabel = label.replace(/\s+/g, "_");
          data[`${key}.${safeLabel}`] = val;
        }
      }
    }

    // Convert to CSV and download
    data = convertToCSV(data);
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(data);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "output.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const convertToCSV = (data) => {
    const keys = Object.keys(data);
    const values = Object.values(data);

    const csvData = keys.map((key, index) => {
      const escapedValue = values[index].toString().replace(/"/g, '\\"');
      return `"${key}","${escapedValue}"`;
    });

    return csvData.join("\n");
  };

  const handleCreateDesignReport = () => {
    setCreateDesignReportBool(true);
  };

  const handleOkDesignReport = async (selectedSections = []) => {
    if (!output) {
      alert("Please submit the design first.");
      return;
    }

    try {
      console.log('Generating design report with simplified API');

      // Build the same submission params used for calculate-output
      const submissionParams = moduleConfig.buildSubmissionParams(
        inputs,
        allSelected,
        {
          boltDiameterList,
          propertyClassList,
          thicknessList,
          angleList,
        },
        extraState
      );

      // Prepare payload with selected sections for filtering
      const payload = {
        ...designReportInputs,
        moduleId: moduleConfig.designType,
        inputValues: submissionParams,
        designStatus: true,
        logs: logs || [],
      };

      // Add sections if provided for customized filtering
      if (selectedSections && selectedSections.length > 0) {
        payload.sections = selectedSections;
      }

      const result = await generateReport('design_report', payload);

      if (result && result.success) {
        console.log('Design report generated successfully');
        // Optionally show success message or further user feedback
      } else {
        console.error('Failed to generate design report:', result?.error);
        alert(`Failed to generate design report: ${result?.error || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('Exception generating design report:', error);
      alert(`Error generating design report: ${error.message}`);
    }

    handleCancelDesignReport();
  };


  const handleCancelDesignReport = () => {
    setDesignReportInputs({
      companyName: "Your company",
      groupTeamName: "Your team",
      designer: "You",
      projectTitle: "",
      subtitle: "",
      jobNumber: "1",
      client: "Someone else",
      additionalComments: "No comments",
      companyLogo: null,
      companyLogoName: "",
    });
    setCreateDesignReportBool(false);
  };

  return {
    // ===================================================================
    // CONTEXT DATA - Module state variables
    // ===================================================================
    beamList,
    columnList,
    connectivityList,
    materialList,
    boltDiameterList,
    thicknessList,
    propertyClassList,
    angleList, // FIXED: Added angleList to return object
    boltTypeList,
    displayPDF,
    renderCadModel,
    cadModelPaths,

    // ===================================================================
    // SIMPLIFIED API ACCESS - Expose core functions for advanced usage
    // ===================================================================
    getModuleData,              // Universal data fetcher
    manageDesignPreferences,    // Design preferences management  
    generateReport,             // Unified report generation
    createDesign,               // Design calculation
    resetModuleState,           // State reset


    // ===================================================================
    // COMPONENT STATE - Internal hook state
    // ===================================================================
    inputs,
    setInputs,
    output,
    logs,
    loading,
    renderBoolean,
    modelKey,
    modalStates,
    selectionStates,
    allSelected,
    selectedItems,
    extraState,
    setExtraState,

    // Report states
    createDesignReportBool,
    setCreateDesignReportBool,
    designReportInputs,
    setDesignReportInputs,

    // Modal states
    designPrefModalStatus,
    setDesignPrefModalStatus,
    confirmationModal,
    setConfirmationModal,
    displaySaveInputPopup,
    setDisplaySaveInputPopup,
    saveInputFileName,
    setSaveInputFileName,
    selectedView,
    setSelectedView,
    screenshotTrigger,
    setScreenshotTrigger,

    // Navigation and Reset states
    showResetConfirmation,
    setShowResetConfirmation,
    confirmationType,
    setConfirmationType,
    isLoadingModalVisible,
    setIsLoadingModalVisible,
    loadingStage,
    setLoadingStage,

    // ===================================================================
    // ACTIONS - Hook action functions
    // ===================================================================
    updateModalState,
    updateSelectionState,
    updateSelectedItems,
    toggleAllSelected,
    handleSubmit,
    handleReset,
    handleHomeClick,
    performReset,
    saveOutput,
    handleCreateDesignReport,
    handleOkDesignReport,
    handleCancelDesignReport,
  };
};