
import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Html, PerspectiveCamera } from "@react-three/drei";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Modal, Button, Radio } from "antd";
import { useEngineeringModule } from "../hooks/useEngineeringModule";
import {
  MODULE_KEY_FIN_PLATE,
  MODULE_KEY_CLEAT_ANGLE,
  MODULE_KEY_END_PLATE,
  MODULE_KEY_SEAT_ANGLE,
  MODULE_KEY_BEAM_COLUMN_END_PLATE,
} from "../../../constants/DesignKeys";
import { BaseInputDock } from "./BaseInputDock";
import { BaseOutputDock } from "./BaseOutputDock";
import { CustomizationModal } from "../components/CustomizationModal";
import { DesignReportModal } from "../components/DesignReportModal";
import { DesignStatusModal } from "./DesignStatusModal";
import { DESIGN_STATUS } from "../hooks/useDesignSubmission";
import {
  CadScene,
  useViewCamera,
  ScreenshotCapture,
  ReportCaptureDev,
  CadSceneProvider,
  CadSceneBbox,
} from "./cad";
import Logs from "./Logs";
import UnifiedDropdownMenu from "../utils/UnifiedDropdownMenu";
import DesignPrefSections from "./DesignPrefSections";
import { message, Modal as AntdModal } from 'antd';
import { menuItems } from "../utils/moduleUtils";
import { UI_STRINGS } from "../../../constants/UIStrings";
import { isGuestUser, canCreateProjects } from "../../../utils/auth";
import { expandAllSelectedInputs } from "../utils/osiInputSerializer";
import {
  downloadGroupedInputsCsv,
  downloadGroupedOutputsCsv,
} from "../utils/groupedCsvExport";
import ProjectNameModal from "../../../homepage/components/ProjectNameModal";
import { useProjectCreation } from '../hooks/useProjectCreation';
import { deleteAllCustomSections } from "../../../datasources/sectionsDataSource";
import HelpLinkModal from "./help/HelpLinkModal";
import AboutOsdagModal from "./help/AboutOsdagModal";
import { ASK_QUESTION_LINK, DESIGN_EXAMPLES_URL } from "./help/helpContent";
import { openOsiFile } from "../../../datasources/osiDataSource";
import {
  downloadCachedModelByFormat,
  downloadExportCadResponse,
} from "../utils/cadExport";
import { canOpenAdditionalInputs } from "../utils/designPrefOpenGuard";
import { getModuleConfig as getDesignPrefModuleConfig } from "../utils/moduleConfig";
import { useShortcutLayer } from "../../../utils/shortcuts/ShortcutProvider";
import { SHORTCUT_ACTION_BY_ID } from "../../../constants/shortcuts";

export const EngineeringModule = ({
  moduleConfig,
  outputConfig,
  title,
}) => {
  const isGuest = isGuestUser;
  const navigate = useNavigate();
  const cameraRef = useRef();
  const lockBtnRef = useRef(null);
  const designCompletedRef = useRef(false); // Track if we've already handled design completion
  const prevModuleRef = useRef(null); // Track previous module for change detection
  const prevProjectIdRef = useRef(null); // Track previous projectId for change detection
  const lastLoadedProjectIdRef = useRef(null); // Prevent re-fetching same project (stops infinite GET loop)
  const [showAskQuestionModal, setShowAskQuestionModal] = useState(false);
  const [showAboutOsdagModal, setShowAboutOsdagModal] = useState(false);
  const [showSave3dTypeModal, setShowSave3dTypeModal] = useState(false);
  const [selectedSave3dType, setSelectedSave3dType] = useState("Export STL");

  const {
    // Module data
    beamList,
    columnList,
    connectivityList,
    materialList,
    boltDiameterList,
    thicknessList,
    propertyClassList,
    angleList,
    boltTypeList,
    sectionProfileList,
    channelList,
    sectionDesignation,
    cadModelPaths,
    hoverDict: ctxHoverDict,
    coverPlateList,
    weldSizeList,
    profileList = [],
    anchorDiameterList = [],
    anchorGradeList = [],
    footingGradeList = [],
    weldTypeList = [],
    anchorTypeList = [],

    // State
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
    saveOutput,
    createDesignReportBool,
    setCreateDesignReportBool,
    designReportInputs,
    setDesignReportInputs,
    designPrefModalStatus,
    setDesignPrefModalStatus,
    confirmationModal,
    setConfirmationModal,
    displaySaveInputPopup,
    saveInputFileName,
    designPrefOverrides,
    setDesignPrefOverrides,
    selectedView,
    setSelectedView,
    screenshotTrigger,
    setScreenshotTrigger,
    extraState,
    setExtraState,
    modalDynamicSrc,
    setModalDynamicSrc,

    // Navigation and Reset states
    showResetConfirmation,
    setShowResetConfirmation,
    confirmationType,
    setConfirmationType,
    status,
    setStatus,

    // Actions
    updateModalState,
    updateSelectionState,
    updateSelectedItems,
    toggleAllSelected,
    handleSubmit,
    handleReset,
    handleHomeClick,
    performReset,

    // Report
    handleCreateDesignReport,
    handleCancelDesignReport,
    clearDesignResults,
    loadSavedOutputs,
    loadOutputs,
    resetDesignState,
    service,

    // Direct access to module context reset
    resetModuleState,
    contextData,
    refetchModuleOptions,
  } = useEngineeringModule(moduleConfig);

  const { handleCreateProject, projectCreationModal } = useProjectCreation({
    inputs,
    extraState,
    allSelected,
    contextData,
    moduleConfig,
  });

  const [showResetButton, setShowResetButton] = useState(false);
  const [showInputDock, setShowInputDock] = useState(true);
  const [showOutputDock, setShowOutputDock] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const [isDesignComplete, setIsDesignComplete] = useState(false);
  const [isInputLocked, setIsInputLocked] = useState(false);
  const [showUnlockWarning, setShowUnlockWarning] = useState(false);
  const [showOptionsContainer, setShowOptionsContainer] = useState(false); // New state for options container
  const [isGridActive, setIsGridActive] = useState(false);
  const [isRedesigning, setIsRedesigning] = useState(false); // New state for re-design operations
  const [selectedSection, setSelectedSection] = useState(["Model"]);
  const [selectedCameraView, setSelectedCameraView] = useState("Model");
  const [lockZoom, setLockZoom] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showCad, setShowCad] = useState(window.innerWidth >= 768); // Default: true on desktop, false on mobile

  // Hooking Graphics Options (Model / Selected Section & Bg Color)
  const colorPickerRef = useRef(null);
  const [customBgColor, setCustomBgColor] = useState(null);

  useEffect(() => {
    if (inputs?.graphicsOption) {
      const opt = inputs.graphicsOption;
      if (["Model", "Beam", "Column", "Seated Angle", "Cleat Angle"].includes(opt)) {
        if (opt === "Model") {
          setSelectedSection(["Model"]);
          setSelectedView("Model");
          setSelectedCameraView("Model");
        } else {
          // If a non-Model option is selected, add it
          const newSelection = selectedSection.filter(s => s !== "Model");
          if (!newSelection.includes(opt)) {
            newSelection.push(opt);
          }
          if (newSelection.length > 0) {
            setSelectedSection(newSelection);
            setSelectedView(newSelection[0]);
            setSelectedCameraView(newSelection[0]);
          }
        }
      } else if (opt === "Change Background") {
        if (colorPickerRef.current) {
          colorPickerRef.current.click();
        }
      } else if (opt === "Show front view") {
        setSelectedCameraView("XY");
      } else if (opt === "Show side view") {
        setSelectedCameraView("YZ");
      } else if (opt === "Show top view") {
        setSelectedCameraView("ZX");
      }
      // Cleanup graphicOption to allow consecutive clicks of same option
      setInputs(prev => {
        const next = { ...prev };
        delete next.graphicsOption;
        return next;
      });
    }
  }, [inputs?.graphicsOption, selectedSection]);

  // Normalize CAD path keys to handle case/spacing differences
  const normalizedCadModelPaths = useMemo(() => {
    const out = {};
    Object.entries(cadModelPaths || {}).forEach(([key, value]) => {
      if (!key) return;
      const trimmed = key.trim();
      out[trimmed] = value;
      out[trimmed.toLowerCase()] = value;
      out[trimmed.toUpperCase()] = value;
    });
    return out;
  }, [cadModelPaths]);

  // Debug: log CAD paths when they change
  useEffect(() => {
    if (normalizedCadModelPaths) {
      const keys = Object.keys(normalizedCadModelPaths || {});
      console.log("[EngineeringModule] cadModelPaths keys:", keys);
      console.log("[EngineeringModule] selectedSection:", selectedSection);
    }
  }, [normalizedCadModelPaths, selectedSection]);

  // Detect mobile/desktop and landscape orientation
  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      console.log(`[VIEWPORT] Width changed: ${width}px | isMobile: ${mobile}`);
      setIsMobile(mobile);
      // Landscape: width > height and on mobile/tablet
      setIsLandscape(width > window.innerHeight && mobile);

      // On desktop, ensure CAD is always visible (only set once on mount/resize, not on every showCad change)
      if (!mobile) {
        setShowCad(true);
      }
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    window.addEventListener('orientationchange', checkViewport);

    return () => {
      window.removeEventListener('resize', checkViewport);
      window.removeEventListener('orientationchange', checkViewport);
    };
  }, []); // Empty dependency array - only run on mount and resize

  // Log isMobile state changes
  useEffect(() => {
    console.log(`[STATE] isMobile changed: ${isMobile} | Window width: ${window.innerWidth}px`);
  }, [isMobile]);

  // Log showInputDock state changes
  useEffect(() => {
    console.log(`[DOCK] showInputDock changed: ${showInputDock}`);
  }, [showInputDock]);

  // Log showOutputDock state changes
  useEffect(() => {
    console.log(`[DOCK] showOutputDock changed: ${showOutputDock}`);
  }, [showOutputDock]);

  // Log showLogs state changes
  useEffect(() => {
    console.log(`[DOCK] showLogs changed: ${showLogs}`);
  }, [showLogs]);

  // Log showCad state changes
  useEffect(() => {
    console.log(`[DOCK] showCad changed: ${showCad}`);
  }, [showCad]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  // Hover tooltip state for 3D parts
  const [hoverText, setHoverText] = useState("");
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const location = useLocation();
  const params = useParams();

  // Project ID from path (e.g. /design/connections/shear/fin_plate/1) or query (?projectId=1)
  const getProjectIdFromUrl = () => {
    const fromPath = params.projectId;
    if (fromPath != null && fromPath !== '') {
      const n = parseInt(fromPath, 10);
      if (!Number.isNaN(n)) return n;
    }
    const searchParams = new URLSearchParams(location.search);
    const fromQuery = searchParams.get('projectId');
    return fromQuery ? parseInt(fromQuery, 10) : null;
  };

  // ===================================================================
  // MODULE CHANGE DETECTION - Clear state when switching modules
  // ===================================================================
  useEffect(() => {
    const currentModule = moduleConfig.designType;
    const currentProjectId = getProjectIdFromUrl();

    // Check if module changed
    if (prevModuleRef.current && prevModuleRef.current !== currentModule) {
      console.log(`[STATE_CLEANUP] Module changed: ${prevModuleRef.current} -> ${currentModule}`);

      // Clear ModuleContext state (designData, logs, CAD paths, etc.)
      resetModuleState();

      // Clear hook-level design state
      clearDesignResults();

      // Reset UI state
      setIsDesignComplete(false);
      setShowOutputDock(false);
      setShowLogs(false);
      setShowOptionsContainer(false);
      setIsInputLocked(false);
      setSelectedSection(["Model"]);
      setSelectedCameraView("Model");
      setIsRedesigning(false);
      designCompletedRef.current = false;

      // Reset CAD visibility based on device
      if (isMobile) {
        setShowCad(false);
      } else {
        setShowCad(true);
      }
    }

    // Check if projectId changed (same module, different project)
    if (prevProjectIdRef.current !== null && prevProjectIdRef.current !== currentProjectId) {
      console.log(`[STATE_CLEANUP] Project changed: ${prevProjectIdRef.current} -> ${currentProjectId}`);

      // Clear design state when switching projects
      resetModuleState();
      clearDesignResults();
      setIsDesignComplete(false);
      setShowOutputDock(false);
      setShowLogs(false);
      setShowOptionsContainer(false);
      setIsInputLocked(false);
      designCompletedRef.current = false;
    }

    // Update refs
    prevModuleRef.current = currentModule;
    prevProjectIdRef.current = currentProjectId;
  }, [moduleConfig.designType, location.search, location.pathname, resetModuleState, clearDesignResults, isMobile]);

  // ===================================================================
  // CLEANUP ON UNMOUNT - Clear state when component unmounts
  // ===================================================================
  useEffect(() => {
    return () => {
      console.log('[STATE_CLEANUP] Component unmounting, clearing ModuleContext state');
      // Clear ModuleContext state when component unmounts
      resetModuleState();
    };
  }, [resetModuleState]);

  // ===================================================================
  // PROJECT LOADING - Load project inputs if project ID exists
  // ===================================================================
  const projectIdFromUrl = getProjectIdFromUrl();
  useEffect(() => {
    // Skip project enforcement - allow users to work without project
    if (isGuestUser()) {
      console.info('[EngineeringModule] Guest mode detected: skipping project loading');
      return;
    }

    const projectId = projectIdFromUrl;
    // If no project ID, allow user to work without project (they can create one later)
    if (!projectId || Number.isNaN(projectId)) {
      console.info('[EngineeringModule] No project ID in URL: user can work without project');
      lastLoadedProjectIdRef.current = null;
      return;
    }

    // Prevent infinite loop: only fetch once per projectId
    if (lastLoadedProjectIdRef.current === projectId) {
      return;
    }
    lastLoadedProjectIdRef.current = projectId;

    (async () => {
      try {
        resetModuleState();
        clearDesignResults();
        setIsDesignComplete(false);
        setShowOutputDock(false);
        setShowLogs(false);
        setShowOptionsContainer(false);
        setIsInputLocked(false);
        designCompletedRef.current = false;

        const result = await service.getProject(projectId);
        console.log('[EngineeringModule] Project loaded:', result);
        if (!result.success || !result.project) {
          lastLoadedProjectIdRef.current = null;
          message.warning('Project not found.');
          return;
        }
        if (result.project.inputs_json) {
          try {
            const savedInputs = result.project.inputs_json;
            if (
              savedInputs &&
              typeof savedInputs === "object" &&
              Object.prototype.hasOwnProperty.call(savedInputs, "dock")
            ) {
              setInputs(savedInputs.dock || {});
              setDesignPrefOverrides(savedInputs.pref || {});
            } else {
              // Backward compatibility for older projects that stored a flat inputs_json.
              setInputs(savedInputs || {});
              setDesignPrefOverrides({});
            }
          } catch (err) {
            console.error('[EngineeringModule] Error parsing inputs_json:', err);
            message.error('Failed to parse saved project inputs.');
          }
        }
        if (result.project.outputs_json) {
          try {
            loadSavedOutputs(result.project.outputs_json);
          } catch (err) {
            console.error('[EngineeringModule] Error loading saved outputs:', err);
            message.error('Failed to load saved project outputs.');
          }
        }
        // Deduplicated block
        // Normalize URL to path form: .../fin_plate/1 instead of .../fin_plate?projectId=1
        const pathname = location.pathname;
        const pathEndsWithId = pathname.endsWith(`/${projectId}`);
        const hasQueryProjectId = new URLSearchParams(location.search).get('projectId') != null;
        if (!pathEndsWithId && hasQueryProjectId && moduleConfig.routePath) {
          const basePath = moduleConfig.routePath.replace(/\/$/, '');
          navigate(`${basePath}/${projectId}`, { replace: true });
        }
      } catch (_e) {
        lastLoadedProjectIdRef.current = null;
        console.error('[EngineeringModule] Error loading project:', _e);
        message.warning('Cannot load project. Redirecting to module base.');

        // Navigate back to the base module path (e.g. /Connections, /Member)
        const basePath = moduleConfig.routePath || '/home';
        navigate(basePath, { replace: true });
      }
    })();
  }, [projectIdFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally stable deps to avoid infinite GET

  // Only change dock visibility after design is complete
  useEffect(() => {
    // Check if design just completed (transition to COMPLETE status)
    const designJustCompleted = status.step === DESIGN_STATUS.COMPLETE && !designCompletedRef.current;

    if (designJustCompleted) {
      console.log(`[DESIGN_COMPLETE] Design completed | isMobile: ${isMobile}`);
      designCompletedRef.current = true; // Mark as handled
      setIsDesignComplete(true);
      setShowOptionsContainer(true); // Show options container after design is complete

      if (isMobile) {
        // Mobile: Auto-open CAD+Logs so results are visible immediately
        console.log(`[DESIGN_COMPLETE] Setting mobile docks: CAD=true, Logs=true, Input=false, Output=false`);
        setShowInputDock(false);
        setShowOutputDock(false);
        setShowCad(true);
        setShowLogs(true);
      } else {
        // Desktop: Auto-open output dock and logs
        console.log(`[DESIGN_COMPLETE] Setting desktop docks: Output=opening, Logs=opening`);
        setShowOutputDock(true);
        setShowLogs(true);
      }

      // Lock inputs after successful design
      setIsInputLocked(true);
    } else if (isRedesigning || status.step === DESIGN_STATUS.CALCULATING || status.step === DESIGN_STATUS.CAD_GENERATING) {
      // Reset the completion flag when redesigning or during design process
      if (isRedesigning) {
        designCompletedRef.current = false;
        setIsDesignComplete(false);
        setShowOptionsContainer(false);
        setIsInputLocked(false);
      }
    }
  }, [status.step, isRedesigning, isMobile]);

  // Show output dock immediately after calculation completes (before CAD)
  useEffect(() => {
    // When status transitions to CAD_GENERATING, calculation just completed
    if (status.step === DESIGN_STATUS.CAD_GENERATING && output && !isRedesigning && !designCompletedRef.current) {
      console.log(`[EARLY_OUTPUT] Calculation complete, showing output dock early`);
      if (!isMobile) {
        setShowOutputDock(true);
        setShowLogs(true);
      }
    }
  }, [status.step, output, isRedesigning, isMobile]);

  const handleGridToggle = () => {
    setIsGridActive(!isGridActive);
  };

  const handleSubmitEnhanced = async () => {
    setIsInputLocked(false);
    // If there's already an existing design, completely reset everything
    if (isDesignComplete || renderBoolean || output) {

      // Immediately hide current model and output
      designCompletedRef.current = false; // Reset completion flag
      setIsRedesigning(true);
      setIsDesignComplete(false);
      setShowOutputDock(false);
      setShowLogs(false);
      setShowOptionsContainer(false);
      setSelectedSection(["Model"]);
      setSelectedCameraView("Model");
      // Reset CAD state based on device type
      if (isMobile) {
        setShowCad(false);
      } else {
        setShowCad(true);
      }

      // Reset all the data that controls model rendering but PRESERVE inputs
      clearDesignResults();
      resetModuleState();

      // Small delay to ensure reset is processed
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Call the actual submit function
    try {
      await handleSubmit();
      setShowResetButton(true);
    } catch (error) {
    } finally {
      // Reset the redesigning state after completion
      setIsRedesigning(false);
    }
  };

  // Toggle reset button visibility
  const toggleResetButton = () => {
    setShowResetButton(!showResetButton);
  };

  // Toggle functions for SVG clicks
  const toggleInputDock = () => {
    console.log(`[TOGGLE] toggleInputDock called | isMobile: ${isMobile} | current showInputDock: ${showInputDock}`);
    if (isMobile) {
      // Mobile: Close all other docks when opening input dock
      if (showInputDock) {
        // Closing input dock
        console.log(`[TOGGLE] Closing input dock (mobile)`);
        setShowInputDock(false);
      } else {
        // Opening input dock - close all others first
        console.log(`[TOGGLE] Opening input dock (mobile) - closing others`);
        setShowOutputDock(false);
        setShowLogs(false);
        setShowCad(false);
        setShowInputDock(true);
      }
    } else {
      // Desktop: Independent toggle
      console.log(`[TOGGLE] Toggling input dock (desktop): ${!showInputDock}`);
      setShowInputDock(prev => !prev);
    }
  };

  const toggleOutputDock = () => {
    // Only check if output exists, not isDesignComplete
    if (!output) {
      console.log(`[TOGGLE] toggleOutputDock called but output is null`);
      return;
    }

    console.log(`[TOGGLE] toggleOutputDock called | isMobile: ${isMobile} | current showOutputDock: ${showOutputDock}`);
    if (isMobile) {
      // Mobile: Close all other docks when opening output dock
      if (showOutputDock) {
        // Closing output dock
        console.log(`[TOGGLE] Closing output dock (mobile)`);
        setShowOutputDock(false);
      } else {
        // Opening output dock - close all others first
        console.log(`[TOGGLE] Opening output dock (mobile) - closing others`);
        setShowInputDock(false);
        setShowLogs(false);
        setShowCad(false);
        setShowOutputDock(true);
      }
    } else {
      // Desktop: Independent toggle
      console.log(`[TOGGLE] Toggling output dock (desktop): ${!showOutputDock}`);
      setShowOutputDock(prev => !prev);
    }
  };

  const handleLockToggle = () => {
    if (isInputLocked) {
      // Show warning modal first
      setShowUnlockWarning(true);
    } else {
      setIsInputLocked(true);
      // Don't close the dock when locking - keep it open but locked
    }
  };

  const confirmUnlock = () => {
    console.log(`[UNLOCK] confirmUnlock called | isMobile: ${isMobile}`);
    designCompletedRef.current = false; // Reset completion flag
    clearDesignResults();
    setIsDesignComplete(false);
    setShowOptionsContainer(false);
    setShowOutputDock(false);
    setShowLogs(false);
    setSelectedSection(["Model"]);
    setSelectedCameraView("Model");
    setShowResetButton(false);
    setHoverText("");
    setHoverPos({ x: 0, y: 0 });
    setIsInputLocked(false);
    setShowInputDock(true);
    setIsRedesigning(false);
    setShowUnlockWarning(false);
    // Reset CAD state based on device type
    if (isMobile) {
      console.log(`[UNLOCK] Resetting docks for mobile: Input=true, CAD=false`);
      setShowCad(false);
    } else {
      console.log(`[UNLOCK] Resetting docks for desktop: Input=true, CAD=true`);
      setShowCad(true);
    }
  };

  const cancelUnlock = () => {
    setShowUnlockWarning(false);
    setIsInputLocked(true);
  };

  const toggleLogs = () => {
    // Only check if output exists
    if (!output) {
      console.log(`[TOGGLE] toggleLogs called but output is null`);
      return;
    }

    console.log(`[TOGGLE] toggleLogs called | isMobile: ${isMobile} | current showLogs: ${showLogs} | current showCad: ${showCad}`);
    if (isMobile) {
      // Mobile: Special logic for CAD+Logs combination
      if (showLogs) {
        // Closing logs
        console.log(`[TOGGLE] Closing logs (mobile)`);
        setShowLogs(false);
      } else {
        // Opening logs
        if (showCad) {
          // If CAD is open, keep it open (CAD+Logs case)
          console.log(`[TOGGLE] Opening logs with CAD (mobile) - CAD+Logs case`);
          setShowInputDock(false);
          setShowOutputDock(false);
          setShowLogs(true);
        } else {
          // Open logs only, close all other docks
          console.log(`[TOGGLE] Opening logs only (mobile) - closing others`);
          setShowInputDock(false);
          setShowOutputDock(false);
          setShowCad(false);
          setShowLogs(true);
        }
      }
    } else {
      // Desktop: Independent toggle
      console.log(`[TOGGLE] Toggling logs (desktop): ${!showLogs}`);
      setShowLogs(prev => !prev);
    }
  };

  // New CAD toggle function
  const toggleCad = () => {
    console.log(`[TOGGLE] toggleCad called | isMobile: ${isMobile} | current showCad: ${showCad} | current showLogs: ${showLogs}`);
    if (isMobile) {
      // Mobile: Special logic for CAD+Logs combination
      if (showCad) {
        // Closing CAD
        console.log(`[TOGGLE] Closing CAD (mobile)`);
        setShowCad(false);
      } else {
        // Opening CAD
        if (showLogs) {
          // If logs are open, keep them open (CAD+Logs case)
          console.log(`[TOGGLE] Opening CAD with logs (mobile) - CAD+Logs case`);
          setShowInputDock(false);
          setShowOutputDock(false);
          setShowCad(true);
        } else {
          // Open CAD only, close all other docks
          console.log(`[TOGGLE] Opening CAD only (mobile) - closing others`);
          setShowInputDock(false);
          setShowOutputDock(false);
          setShowLogs(false);
          setShowCad(true);
        }
      }
    } else {
      // Desktop: CAD is always visible, no toggle needed
      // This shouldn't be called on desktop, but handle gracefully
      console.log(`[TOGGLE] toggleCad called on desktop - setting showCad to true`);
      setShowCad(true);
    }
  };

  const handleResetEnhanced = async () => {
    setShowResetConfirmation(true);
    setConfirmationType("reset");
  };

  const performResetEnhanced = async () => {
    // Guests never store custom sections in backend.
    if (isGuestUser()) {
      message.info("Guest users do not have custom sections stored in the backend.");
    } else {
      try {
        await deleteAllCustomSections();
        // Ensure dropdown options no longer include deleted user sections.
        try {
          await refetchModuleOptions?.();
        } catch (_e) {
          // ignore refetch errors; local reset still proceeds
        }
      } catch (e) {
        message.error(e?.message || "Failed to delete custom sections.");
      }
    }

    performReset();
    setShowResetButton(false);
    setShowResetConfirmation(false);
    setShowOutputDock(false);
    setShowInputDock(true);
    setIsDesignComplete(false);
    setShowLogs(false); // Reset logs visibility
    setShowOptionsContainer(false); // Hide options container on reset
    setSelectedSection("Model"); // Reset selected section
    setSelectedCameraView("Model"); // Reset selected camera view
    setIsRedesigning(false); // Reset redesigning state
    setIsInputLocked(false);
    // Reset CAD state based on device type
    if (isMobile) {
      setShowCad(false);
    } else {
      setShowCad(true);
    }
  };
  const handleSaveInputs = async () => {
    // Determine module_id - use designType from moduleConfig, or fallback to inputs.module
    const module_id = moduleConfig?.designType || inputs?.module || moduleConfig?.cameraKey || MODULE_KEY_SEAT_ANGLE;
    const projectName = inputs?.project_name || inputs?.name || moduleConfig?.sessionName || 'project';

    try {
      const inputsForSave = expandAllSelectedInputs(inputs, allSelected, contextData);
      // Always download-only (no backend persistence). Force inline/base64 response.
      const result = await service.saveOSIFromInputs(projectName, module_id, inputsForSave, true);
      if (result.success && result.content_base64) {
        try {
          const binaryString = atob(result.content_base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
          const blob = new Blob([bytes], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = result.filename || `${projectName}.osi`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          message.success('OSI file downloaded successfully');
        } catch (err) {
          console.error('Error downloading OSI file:', err);
          message.error('Failed to download OSI file');
        }
        return;
      }
      message.error(result.error || 'Failed to download OSI');
    } catch (err) {
      console.error('Error saving inputs:', err);
      message.error('Failed to download OSI');
    }
  };

  // Get connectivity for FinPlateConnection module
  const getConnectivity = () => {
    if (moduleConfig.cameraKey === MODULE_KEY_FIN_PLATE) {
      return extraState?.selectedOption || inputs?.connectivity;
    }
    return null;
  };

  const cameraSettings = useViewCamera(
    moduleConfig.cameraKey,
    selectedCameraView,
    getConnectivity()
  );

  const {
    position: cameraPos,
    modelPosition,
    modelScale,
  } = cameraSettings;

  // Determine view options based on module config
  const getViewOptions = () => {
    if (moduleConfig.cadOptions) {
      return moduleConfig.cadOptions || ["Model", "Beam", "Connector"];
    }

    if (moduleConfig.cameraKey === MODULE_KEY_FIN_PLATE) {
      return ["Model", "Beam", "Column", "Plate"];
    }
    else if (moduleConfig.cameraKey === MODULE_KEY_CLEAT_ANGLE) {
      return ["Model", "Beam", "Column", "CleatAngle"]; // FIXED: Use CleatAngle instead of Connector
    }
    else if (moduleConfig.cameraKey === MODULE_KEY_END_PLATE) {
      return ["Model", "Beam", "Column", "Plate"];
    }
    else if (moduleConfig.cameraKey === MODULE_KEY_SEAT_ANGLE) {
      return ["Model", "Beam", "Column", "SeatedAngle"]; // FIXED: Use SeatedAngle instead of Connector
    }
    else if (moduleConfig.cameraKey === MODULE_KEY_BEAM_COLUMN_END_PLATE) {
      return ["Model", "Beam", "Column", "End Plate"];
    }

    return moduleConfig.cadOptions || ["Model", "Beam", "Connector"];
  };

  const options = getViewOptions();

  const triggerScreenshotCapture = () => {
    setScreenshotTrigger(true);
  };

  const handleLoadInputFromShortcut = async () => {
    const element = document.createElement("input");
    element.setAttribute("type", "file");
    element.accept = ".osi,application/json";
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();

    element.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) {
        document.body.removeChild(element);
        return;
      }
      try {
        const formData = new FormData();
        formData.append("file", file);
        const data = await openOsiFile(formData);
        if (data.ok && data.success) {
          setInputs(data.inputs || {});
          message.success("Input loaded from OSI");
        } else {
          message.error(data.error || "Failed to open OSI file");
        }
      } catch (err) {
        message.error("Failed to open OSI file");
      } finally {
        if (document.body.contains(element)) {
          document.body.removeChild(element);
        }
      }
    });
  };

  const handleOpenDesignPrefFromShortcut = () => {
    const mod = getDesignPrefModuleConfig(inputs?.module);
    const guard = canOpenAdditionalInputs(
      mod,
      inputs,
      { selectedOption: extraState?.selectedOption },
      contextData,
      selectionStates
    );
    if (!guard.ok) {
      message.warning(guard.message);
      return;
    }
    setDesignPrefModalStatus(true);
  };

  // Build the hover dictionary: backend values take priority.
  // We intentionally do NOT include default fallback strings for parts like
  // Beam/Column/Plate so that when the backend provides nothing, SmartPart
  // falls back to just the part name (clean), rather than a static string.
  const hoverDict = useMemo(() => {
    // Backend hover_dict values are the source of truth.
    // Only keep truly generic part-name labels for parts
    // the backend never annotates (e.g. SeatedAngle, Member).
    const staticFallbacks = {
      "Cleat Angle": "Cleat Angle",
      "Seated Angle": "Seated Angle",
      "Member": "Member",
    };

    const final = {
      ...staticFallbacks,
      ...(ctxHoverDict || {}),
    };

    if (ctxHoverDict && Object.keys(ctxHoverDict).length > 0) {
      console.log('[EngineeringModule] hoverDict from backend:', final);
    }

    return final;
  }, [ctxHoverDict]);

  const handleHoverLabel = (label, clientX, clientY) => {
    if (!label) return;
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      setHoverPos({ x: clientX + 12, y: clientY + 12 });
    }
    setHoverText(label);
  };
  const handleHoverEnd = () => {
    setHoverText("");
  };

  const handleNavbarMenuClick = async (name) => {
    const exportCadByType = async (optionName) => {
      const formatMap = {
        "Export BREP": "brep",
        "Export STL": "stl",
        "Export STEP": "step",
        "Export IGS": "iges",
        "Export IFC": "ifc",
      };
      const format = formatMap[optionName];
      if (!format) {
        message.error("Unsupported export type.");
        return;
      }

      const moduleId = moduleConfig?.designType || inputs?.module;
      if (!moduleId) {
        message.error("Module ID is missing. Unable to export CAD.");
        return;
      }

      if (!cadModelPaths || Object.keys(cadModelPaths).length === 0) {
        message.warning("Run design first to generate CAD output.");
        return;
      }

      if (format === "brep" || format === "stl") {
        const downloaded = await downloadCachedModelByFormat({
          cadModelPaths,
          format,
          moduleId,
          message,
        });
        if (downloaded) return;
      }

      if (typeof moduleConfig?.buildSubmissionParams !== "function") {
        message.error("Module export configuration is missing.");
        return;
      }

      try {
        const inputValues = moduleConfig.buildSubmissionParams(
          inputs,
          allSelected,
          contextData || {},
          extraState || {}
        );

        const result = await service.exportCADModel(
          moduleId,
          inputValues,
          format,
          "Model"
        );

        if (!result?.success || !result?.blob) {
          message.error(result?.error || "CAD export failed");
          return;
        }

        downloadExportCadResponse({
          blob: result.blob,
          disposition: result.disposition,
          fallbackFilename: `${moduleId}_Model.${format}`,
        });
        message.success(`${format.toUpperCase()} exported successfully`);
      } catch (error) {
        console.error("CAD export error:", error);
        message.error(error?.message || "Failed to export CAD");
      }
    };

    // Database menu actions (desktop-style)
    if (name === "Download Inputs CSV") {
      const inputsExpanded = expandAllSelectedInputs(inputs, allSelected, contextData);
      const effectiveInputs = { ...inputsExpanded, ...(designPrefOverrides || {}) };
      const moduleId = moduleConfig?.designType || inputs?.module || moduleConfig?.cameraKey || MODULE_KEY_SEAT_ANGLE;
      return downloadGroupedInputsCsv({
        moduleConfig,
        inputs: inputsExpanded,
        effectiveInputs,
        designPrefOverrides,
        extraState,
        filename: `${moduleId}_inputs.csv`,
      });
    }
    if (name === "Download Outputs CSV") {
      const moduleId = moduleConfig?.designType || inputs?.module || moduleConfig?.cameraKey || MODULE_KEY_SEAT_ANGLE;
      return downloadGroupedOutputsCsv({
        output,
        outputConfig,
        logs,
        filename: `${moduleId}_outputs.csv`,
      });
    }
    if (name === "Download Inputs OSI") {
      return handleSaveInputs();
    }
    if (
      name === "Export BREP" ||
      name === "Export STL" ||
      name === "Export STEP" ||
      name === "Export IGS" ||
      name === "Export IFC"
    ) {
      return exportCadByType(name);
    }
    if (name === "Design Examples") {
      window.open(DESIGN_EXAMPLES_URL, "_blank", "noopener,noreferrer");
      return;
    }
    if (name === "Ask us a question") {
      setShowAskQuestionModal(true);
      return;
    }
    if (name === "About Osdag") {
      setShowAboutOsdagModal(true);
      return;
    }
    if (name === "Reset") {
      return handleResetEnhanced();
    }

    // Reset/Downloads are handled elsewhere (existing handlers or upcoming reset work).
    return undefined;
  };

  const hasModalContext =
    !!createDesignReportBool ||
    !!designPrefModalStatus ||
    !!showResetConfirmation ||
    !!showUnlockWarning ||
    !!showAskQuestionModal ||
    !!showAboutOsdagModal ||
    !!confirmationModal ||
    Object.values(modalStates || {}).some(Boolean) ||
    status.step === DESIGN_STATUS.ERROR;

  useShortcutLayer({
    id: "engineering-modal-blocker",
    priority: 100,
    enabled: hasModalContext,
    blockLower: true,
    bindings: [],
  });

  useShortcutLayer({
    id: "engineering-core-shortcuts",
    priority: 50,
    enabled: true,
    bindings: [
      {
        combos: SHORTCUT_ACTION_BY_ID["global.nav.home"]?.shortcuts,
        handler: () => navigate("/home"),
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.dock.input.toggle"]?.shortcuts,
        handler: () => toggleInputDock(),
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.dock.output.toggle"]?.shortcuts,
        when: () => !!output,
        handler: () => toggleOutputDock(),
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.logs.toggle"]?.shortcuts,
        when: () => !!output,
        handler: () => toggleLogs(),
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.design.submit"]?.shortcuts,
        when: () =>
          status.step !== DESIGN_STATUS.CALCULATING &&
          status.step !== DESIGN_STATUS.CAD_GENERATING,
        handler: () => {
          handleSubmitEnhanced();
        },
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.design.reset"]?.shortcuts,
        handler: () => {
          handleResetEnhanced();
        },
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.input.lockToggle"]?.shortcuts,
        handler: () => {
          handleLockToggle();
        },
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.cad.zoomIn"]?.shortcuts,
        when: () => !!showCad,
        handler: () => {
          document.dispatchEvent(new CustomEvent("cad-camera-action", { detail: "zoom-in" }));
        },
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.cad.zoomOut"]?.shortcuts,
        when: () => !!showCad,
        handler: () => {
          document.dispatchEvent(new CustomEvent("cad-camera-action", { detail: "zoom-out" }));
        },
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.cad.view.front"]?.shortcuts,
        when: () => !!showCad,
        handler: () => {
          setSelectedCameraView("XY");
        },
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.cad.view.top"]?.shortcuts,
        when: () => !!showCad,
        handler: () => {
          setSelectedCameraView("ZX");
        },
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.cad.view.side"]?.shortcuts,
        when: () => !!showCad,
        handler: () => {
          setSelectedCameraView("YZ");
        },
      },
    ],
  });

  useShortcutLayer({
    id: "engineering-extended-shortcuts",
    priority: 45,
    enabled: true,
    bindings: [
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.project.create"]?.shortcuts,
        when: () => !projectIdFromUrl,
        handler: () => {
          handleCreateProject();
        },
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.input.load"]?.shortcuts,
        handler: () => {
          handleLoadInputFromShortcut();
        },
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.model.save3d"]?.shortcuts,
        handler: () => {
          if (!cadModelPaths || Object.keys(cadModelPaths).length === 0) {
            message.warning("No 3D model available. Run design first to enable Save 3D Model.");
            return;
          }
          setSelectedSave3dType("Export STL");
          setShowSave3dTypeModal(true);
        },
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.report.download"]?.shortcuts,
        when: () => !!output,
        handler: () => {
          setCreateDesignReportBool(true);
        },
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["eng.pref.open"]?.shortcuts,
        handler: () => {
          handleOpenDesignPrefFromShortcut();
        },
      },
      {
        combos: SHORTCUT_ACTION_BY_ID["global.theme.toggle"]?.shortcuts,
        handler: () => {
          toggleTheme();
        },
      },
    ],
  });

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      {/* Navigation */}
      <div className="sticky top-0 z-[60] h-[52px] flex flex-row justify-between items-center bg-[#d2d4d2] w-full text-sm flex-shrink-0 px-4">
        <div className="flex flex-row items-center gap-x-4">
          {menuItems.map((item, index) => (
            <UnifiedDropdownMenu
              key={index}
              label={item.label}
              dropdown={item.dropdown}
              setDesignPrefModalStatus={setDesignPrefModalStatus}
              inputs={inputs}
              setInputs={setInputs}
              allSelected={allSelected}
              logs={logs}
              setCreateDesignReportBool={setCreateDesignReportBool}
              triggerScreenshotCapture={triggerScreenshotCapture}
              selectedOption={extraState.selectedOption}
              setSelectedOption={(value) =>
                setExtraState({ ...extraState, selectedOption: value })
              }
              cadModelPaths={cadModelPaths}
              contextData={contextData}
              selectionStates={selectionStates}
              hasOutput={!!output}
              onMenuClick={handleNavbarMenuClick}
              onCreateProject={handleCreateProject}
              isExistingProject={!!projectIdFromUrl}
              moduleConfig={moduleConfig}
              extraState={extraState}
            />
          ))}

          {displaySaveInputPopup && (
            <span id="save-input-style" style={{ marginTop: "18px" }}>
              <strong>Saved input file as "{saveInputFileName}"</strong>
            </span>
          )}
        </div>

        <div className="flex flex-row justify-center items-center gap-2 text-black dark:text-white pr-4">

          {/* Input Dock Button */}
          <button
            onClick={toggleInputDock}
            className={`w-9 h-9 flex items-center justify-center transition`}
            title={`${showInputDock ? 'Hide' : 'Show'} input dock`}
            type="button"
          >
            <svg viewBox="0 0 100 100" className="w-5 h-5">
              <rect x="10" y="10" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="6" />
              <line x1="40" y1="10" x2="40" y2="90" stroke="currentColor" strokeWidth="6" />
              {showInputDock && (
                <rect x="10" y="10" width="30" height="80" fill="currentColor" />
              )}
            </svg>

          </button>

          {/* Logs Button */}
          <button
            onClick={toggleLogs}
            disabled={!output}
            className={`w-9 h-9 flex items-center justify-center transition`}
            title={output ? `${showLogs ? 'Hide' : 'Show'} logs` : 'Run a design to view logs'}
            type="button"
          >
            <svg
              viewBox="0 0 100 100"
              className="w-5 h-5"
              fill="none"
            >
              <rect
                x="10"
                y="10"
                width="80"
                height="80"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
              />

              <line
                x1="10"
                y1="60"
                x2="90"
                y2="60"
                stroke="currentColor"
                strokeWidth="6"
              />

              {showLogs && (
                <rect
                  x="10"
                  y="60"
                  width="80"
                  height="30"
                  fill="currentColor"
                  stroke="none"
                />
              )}
            </svg>
          </button>

          {/* CAD Toggle Button - Mobile Only */}
          <button
            onClick={toggleCad}
            className={`md:hidden p-2 min-w-[44px] min-h-[44px] rounded-md transition-colors ${showCad
              ? 'bg-osdag-green text-white dark:bg-osdag-dark-green'
              : 'hover:bg-black/10 dark:hover:bg-black/40'
              }`}
            title={`${showCad ? 'Hide' : 'Show'} CAD`}
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* 3D Cube Icon */}
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </button>

          {/* Output Dock Button */}
          <button
            onClick={toggleOutputDock}
            disabled={!output}
            title={output ? `${showOutputDock ? 'Hide' : 'Show'} output dock` : 'Run a design to view outputs'}
            type="button"
            className={`p-2 md:p-2 min-w-[44px] min-h-[44px] rounded-md transition-colors ${output
              ? (showOutputDock ? 'bg-osdag-green text-white dark:bg-osdag-dark-green' : 'hover:bg-black/10 dark:hover:bg-black/40')
              : "opacity-40 cursor-not-allowed"
              }`}
          >
            <svg viewBox="0 0 100 100" className="w-5 h-5">
              <rect x="10" y="10" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="6" />
              <line x1="60" y1="10" x2="60" y2="90" stroke="currentColor" strokeWidth="6" />
              {showOutputDock && (
                <rect x="60" y="10" width="30" height="80" fill="currentColor" />
              )}
            </svg>
          </button>
          {/* home */}
          <button
            onClick={() => navigate('/home')}
            title="Home"
            type="button"
            className="p-2 md:p-2 min-w-[44px] min-h-[44px] rounded-md transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </button>
          {/* theme mode */}
          <button
            onClick={toggleTheme}
            disabled
            className="p-2 md:p-2 min-w-[44px] min-h-[44px] text-black transition-colors dark:text-white opacity-50 cursor-not-allowed"
          >
            {isDark ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="currentColor"
              >
                <path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21.64 13.64a1 1 0 00-1.05-.24 8 8 0 01-10-10 1 1 0 00-.24-1.05A1 1 0 008.73 2 10 10 0 1022 15.27a1 1 0 00-.36-1.63z" />
              </svg>
            )} 
          </button>

        </div>

        {/* Initial theme detection, run once per mount */}
        {React.useEffect(() => {
          const saved = localStorage.getItem('osdag-theme');
          if (saved === 'dark') {
            document.body.classList.add('dark');
          } else if (saved === 'light') {
            document.body.classList.remove('dark');
          }
        }, [])}
      </div>

      <div className="relative flex flex-row flex-1 overflow-hidden w-full">
        {/* Input Dock Toggle Button - Fixed to left, shows when dock is closed (Desktop only) */}
        {!showInputDock && !isMobile && (
          <button
            onClick={toggleInputDock}
            className="hidden md:flex absolute left-0 top-0 h-full w-10 bg-white dark:bg-osdag-dark-color border-r border-gray-300 dark:border-osdag-border items-center justify-center z-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
            title="Open Input Dock"
            type="button"
          >
          </button>
        )}

        {/* Output Dock Toggle Button - Fixed to right, shows when dock is closed and output exists (Desktop only) */}
        {!showOutputDock && output && !isMobile && (
          <button
            onClick={toggleOutputDock}
            className="hidden md:flex absolute right-0 top-0 h-full w-10 bg-white dark:bg-osdag-dark-color border-l border-gray-300 dark:border-gray-700 items-center justify-center z-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
            title="Open Output Dock"
            type="button"
          >
          </button>
        )}

        {/* Left - Input Dock */}
        {showInputDock ? (
          <BaseInputDock
            moduleConfig={moduleConfig}
            inputs={inputs}
            setInputs={setInputs}
            isInputLocked={isInputLocked}
            lockBtnRef={lockBtnRef}
            lockZoom={lockZoom}
            setLockZoom={setLockZoom}
            showUnlockWarning={showUnlockWarning}
            confirmUnlock={confirmUnlock}
            cancelUnlock={cancelUnlock}
            handleSaveInputs={handleSaveInputs}
            handleSubmitEnhanced={handleSubmitEnhanced}
            isGuest={isGuest}
            setDesignPrefModalStatus={setDesignPrefModalStatus}
            handleLockToggle={handleLockToggle}
            selectionStates={selectionStates}
            updateSelectionState={updateSelectionState}
            updateModalState={updateModalState}
            toggleAllSelected={toggleAllSelected}
            contextData={contextData}
            extraState={extraState}
            setExtraState={setExtraState}
            updateSelectedItems={updateSelectedItems}
            setModalDynamicSrc={setModalDynamicSrc}
            isOpen={showInputDock}
          />
        ) : (
          <div className="fixed left-0 top-0 h-[105vh] w-[40px] flex flex-col items-center justify-center font-bold z-[1000]">
            <div className="relative flex flex-col items-center w-[30px] py-[10px] gap-[14px]">
              <span className="inline-block rotate-[270deg]"><b>T</b></span>
              <span className="inline-block rotate-[270deg]"><b>U</b></span>
              <span className="inline-block rotate-[270deg]"><b>P</b></span>
              <span className="inline-block rotate-[270deg]"><b>N</b></span>
              <span className="inline-block rotate-[270deg]"><b>I</b></span>
            </div>
          </div>
        )}
        {/* EDGE BAR (always visible) */}
        <div
          className={`absolute top-0 h-screen w-[40px] z-[1000] ${
            showInputDock ? "left-[400px]" : "left-[30px]"
          }`}
        >
          {/* GREEN LINE */}
          <div className="absolute left-0 top-0 w-[8px] h-full bg-[#84bd00]">
            
            {/* TOGGLE HANDLE */}
            <div
              onClick={toggleInputDock}
              className="absolute right-0 top-[40%] w-[8px] h-[80px] bg-[#6a8f00] flex items-center justify-center cursor-pointer"
            >
              <span className="text-white text-[14px]">
                {showInputDock ? "❮" : "❯"}
              </span>
            </div>
          </div>
        </div>

        {/* Middle - 3D Model and Logs Container */}
        <div className={`
          flex-1 flex flex-col relative min-w-0
          ${isMobile && (showInputDock || showOutputDock) ? 'hidden' : 'flex'}
        `}>
          {/* Options Container - Show after design is complete. On desktop, show even when docks are open. On mobile, only show when CAD is visible */}
          {showOptionsContainer && output && (isMobile ? showCad : true) && (
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-40 max-w-[95%] w-fit overflow-x-auto overflow-y-hidden flex flex-row items-center gap-2 p-1 bg-white/90 dark:bg-osdag-dark-color/90 rounded-md border border-gray-200 dark:border-gray-700 shadow-md">
              <div className="flex flex-row items-center gap-2 whitespace-nowrap">
                {options.map((option) => {
                  const isChecked = selectedSection.includes(option);
                  const isModel = option === "Model";
                  return (
                    <label
                      key={option}
                      className={`flex items-center gap-1 px-2 py-1 cursor-pointer text-xs font-medium text-black dark:text-white`}
                    // rounded-lg cursor-pointer transition-colors text-sm font-medium ${isChecked ? 'bg-osdag-green/10 text-osdag-green dark:bg-osdag-dark-green/20 dark:text-osdag-green' : 'text-black dark:text-white hover:bg-black/10 dark:hover:bg-black/40'}`}
                    >
                      {/* Checkbox highlight box */}
                      <div
                        className={`
                          rounded-md p-[2px] transition-colors
                          ${isChecked
                            ? "bg-osdag-green/20 dark:bg-osdag-dark-green/30"
                            : "bg-transparent"
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-gray-400 text-osdag-green focus:ring-osdag-green"
                          checked={isChecked}
                          onChange={(event) => {
                            if (isModel) {
                              // If Model is selected, clear all others and select only Model
                              if (event.target.checked) {
                                setSelectedSection(["Model"]);
                                setSelectedView("Model");
                                setSelectedCameraView("Model");
                              } else {
                                // Don't allow unchecking Model if it's the only one
                                if (selectedSection.length === 1 && selectedSection[0] === "Model") {
                                  return;
                                }
                              }
                            }
                            else {
                              // If a non-Model option is selected
                              if (event.target.checked) {
                                // Remove Model from selection and add this option
                                const newSelection = selectedSection.filter(s => s !== "Model");
                                if (!newSelection.includes(option)) {
                                  newSelection.push(option);
                                }
                                setSelectedSection(newSelection);
                                // Use first selected for camera/view if needed
                                setSelectedView(newSelection[0]);
                                setSelectedCameraView(newSelection[0]);
                              } else {
                                // Uncheck: remove this option
                                const newSelection = selectedSection.filter(s => s !== option);
                                // If nothing left, default to Model
                                if (newSelection.length === 0) {
                                  setSelectedSection(["Model"]);
                                  setSelectedView("Model");
                                  setSelectedCameraView("Model");
                                } else {
                                  setSelectedSection(newSelection);
                                  setSelectedView(newSelection[0]);
                                  setSelectedCameraView(newSelection[0]);
                                }
                              }
                            }
                          }}
                        />
                      </div>
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* CAD Window Container */}
          {(!isMobile || showCad) && (
            <div className={`
              model-container
              ${isMobile
                ? (showLogs ? 'h-[70%]' : 'h-full')
                : (showLogs ? 'h-[60%]' : 'h-full')
              }
            `}>
              {loading || isRedesigning ? (
                <div className="modelLoading">
                  <p>{isRedesigning ? "Updating Model..." : "Loading Model..."}</p>
                </div>
              ) : renderBoolean ? (
                <div 
                  className={`cadModel relative ${!customBgColor ? 'bg-gradient-to-b from-[#FFFFFF] to-[#7E7E7E] dark:from-[#535353] dark:to-[#000000]' : ''}`}
                  style={customBgColor ? { backgroundColor: customBgColor } : {}}
                >
                  {/* <input
                    type="color"
                    className="absolute opacity-0 pointer-events-none w-0 h-0"
                    value={customBgColor || "#ffffff"}
                    onChange={(e) => setCustomBgColor(e.target.value)}
                  /> */}

                  <Canvas
                    gl={{ antialias: true, preserveDrawingBuffer: true, alpha: true }}
                    style={{ width: "100%", height: "100%", background: 'transparent' }}
                  >
                    <PerspectiveCamera
                      ref={cameraRef}
                      makeDefault
                      position={cameraPos}
                      fov={13}
                      near={0.1}
                      far={2000}
                    />
                    <Suspense
                      fallback={
                        <Html>
                          <p>Loading 3D Model...</p>
                        </Html>
                      }
                    >
                      {renderBoolean && normalizedCadModelPaths && Object.keys(normalizedCadModelPaths).length > 0 && (() => {
                        const activeViews = Array.isArray(selectedSection) ? selectedSection : [selectedSection];
                        const primary = activeViews[0] || "Model";
                        if (primary && primary !== "Model") {
                          let hasPart =
                            normalizedCadModelPaths[primary] ||
                            normalizedCadModelPaths[primary?.toLowerCase?.()] ||
                            normalizedCadModelPaths[primary?.toUpperCase?.()];

                          if (!hasPart && primary === "EndPlate" || !hasPart && primary === "CoverPlate") {
                            hasPart =
                              normalizedCadModelPaths["Connector"] ||
                              normalizedCadModelPaths["connector"];
                          }

                          if (!hasPart) {
                            return (
                              <Html>
                                <p>{`No CAD part found for view "${primary}". Available parts: ${Object.keys(normalizedCadModelPaths).join(", ")}`}</p>
                              </Html>
                            );
                          }
                        }
                        return null;
                      })()}
                      <CadSceneProvider>
                        <CadScene
                          modelPaths={normalizedCadModelPaths}
                          selectedView={Array.isArray(selectedSection) ? selectedSection[0] : selectedSection}
                          selectedViews={selectedSection}
                          isMobile={isMobile}
                          cameraSettings={{
                            ...cameraSettings,
                            connectivity: getConnectivity(), // Add connectivity info
                          }}
                          hoverDict={hoverDict}
                          onHoverLabel={handleHoverLabel}
                          onHoverEnd={handleHoverEnd}
                          moduleCadConfig={moduleConfig}
                          key={`${modelKey}-${selectedSection}`}
                        />
                        <CadSceneBbox
                          modelKey={modelKey}
                          selectedCameraView={selectedCameraView}
                        />
                        <ScreenshotCapture
                          screenshotTrigger={screenshotTrigger}
                          setScreenshotTrigger={setScreenshotTrigger}
                          selectedView={Array.isArray(selectedSection) ? selectedSection[0] : selectedSection}
                        />
                        <ReportCaptureDev />
                      </CadSceneProvider>
                    </Suspense>
                  </Canvas>
                  <div className="absolute right-[18px] top-[108px] z-10 flex flex-col gap-2">
                    {[
                      { label: "+", action: "zoom-in", title: "Zoom in" },
                      { label: "-", action: "zoom-out", title: "Zoom out" },
                    ].map(({ label, action, title }) => (
                      <button
                        key={action}
                        type="button"
                        aria-label={title}
                        title={title}
                        className="h-8 w-8 rounded-lg border border-white/35 bg-[rgba(32,32,32,0.78)] text-[20px] font-semibold leading-none text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
                        onClick={() => document.dispatchEvent(new CustomEvent("cad-camera-action", { detail: action }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="modelback"></div>
              )}
            </div>
          )}

          {/* Logs Dock */}
          {showLogs && output && (
            <div className={`
              ${isMobile
                ? (showCad ? 'h-[30%]' : 'fixed inset-0 z-50 h-full pt-[80px]')
                : 'h-[40%]'
              }
              ${isMobile && !showCad ? 'bg-white dark:bg-osdag-dark-color' : ''}
              ${!isMobile && !showInputDock ? 'md:pl-0' : 'md:pl-[30px]'}
              ${!isMobile && !showOutputDock && output ? 'md:pr-0' : ''}
            `}>
              <Logs logs={logs} />
            </div>
          )}
        </div>

      {/* Right - Output Dock */}
      {showOutputDock && outputConfig && status.step !== DESIGN_STATUS.ERROR ? (
       <div className={`
         fixed inset-0 z-50 h-full pt-[80px] sm:relative sm:inset-auto sm:z-auto sm:h-auto sm:pt-0
         w-full sm:w-[320px] md:w-[350px] lg:w-[400px]
         flex flex-col bg-white dark:bg-osdag-dark-color
        `}>
        <BaseOutputDock
         output={output}
         outputConfig={outputConfig}
         title={title || UI_STRINGS.OUTPUT_DOCK}
         extraState={{
          ...extraState,
          cadModelPaths,
          renderCadModel: renderBoolean,
          connectivity: inputs?.connectivity,
          member_designation: inputs?.member_designation,
          designation: inputs?.member_designation,
          weld_type: inputs?.weld_type }}
          handleCreateDesignReport={handleCreateDesignReport}
          saveOutput={saveOutput}
        />
         {/* GREEN STRIP (attached to dock edge) */}
          <div className="absolute left-0 top-0 h-full w-[8px] bg-[#84bd00]">
            <div
              onClick={() => setShowOutputDock((prev) => !prev)}
              className="
                absolute left-0 top-[40%]
                w-[8px] h-[80px]
                bg-[#6a8f00]
                flex items-center justify-center
                cursor-pointer
              "
            >
              <span className="text-white text-sm">
                ❯
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* COLLAPSED STRIP */
        <div
          className="
            fixed right-0 top-0 h-screen w-[40px]
            flex flex-col items-center justify-center
            z-[1000]
          "
        >
          <div className="relative flex flex-col items-center w-[30px] py-[10px] gap-[14px]">
            {"OUTPUT".split("").map((ch, i) => (
              <span key={i} className="rotate-90 font-bold">{ch}</span>
            ))}
          </div>
          {/* GREEN STRIP (collapsed state) */}
          <div className="absolute left-0 top-0 h-full w-[8px] bg-[#84bd00]">
            <div
              onClick={() => setShowOutputDock(true)}
              className="
                absolute left-0 top-[40%]
                w-[8px] h-[80px]
                bg-[#6a8f00]
                flex items-center justify-center
                cursor-pointer
              "
            >
              <span className="text-white text-sm">❮</span>
            </div>
          </div>
        </div>

      )}
    </div>

      {/* Design Report Modal */}
      <DesignReportModal
        isOpen={createDesignReportBool}
        onCancel={handleCancelDesignReport}
        onOk={undefined}
        designReportInputs={designReportInputs}
        setDesignReportInputs={setDesignReportInputs}
        output={output}
        moduleId={moduleConfig?.designType}
        inputValues={inputs}
        logs={logs}
        moduleConfig={moduleConfig}
        boltDiameterList={boltDiameterList}
        propertyClassList={propertyClassList}
        thicknessList={thicknessList}
        angleList={angleList}
        allSelected={allSelected}
        extraState={extraState}
        selectedSection={selectedSection}
        setSelectedSection={setSelectedSection}
      />

      {/* Customization Modals */}
      {
        moduleConfig.modalConfig.map((modal) => (
          <CustomizationModal
            key={modal.key}
            isOpen={modalStates[modal.key]}
            onClose={() => updateModalState(modal.key, false)}
            title="Customized"
            dataSource={contextData[modal.dataSource] || (modalDynamicSrc[modal.inputKey] || [])} // FIXED: This now includes angleList
            selectedItems={selectedItems[modal.inputKey]}
            onTransferChange={(nextTargetKeys) =>
              updateSelectedItems(modal.inputKey, nextTargetKeys)
            }
          />
        ))
      }

      {/* Design Preferences Modal (Additional Inputs) */}
      {
        designPrefModalStatus && (
          <Modal
            title="Additional Inputs"
            open={designPrefModalStatus}
            // onCancel={() =>
            //   isInputLocked
            //     ? setDesignPrefModalStatus(false)   // Directly close
            //     : setConfirmationModal(true)        // Ask confirmation
            // }
            onCancel={(e) => {
              e.preventDefault(); // prevent default close
          
              if (isInputLocked) {
                setDesignPrefModalStatus(false); // Direct close when locked
              } else {
                setConfirmationModal(true); // Show Save dialog
              }
            }}
            footer={null}
            minWidth={isMobile ? undefined : 1200}
            width={isMobile ? '100%' : 1400}
            maxHeight={isMobile ? '100%' : 1200}
            maskClosable={false}
            className="[&_.ant-modal-header]:bg-transparent [&_.ant-modal-close]:right-4"
          >
            <DesignPrefSections
              module={moduleConfig.sessionName}
              inputs={inputs}
              setInputs={setInputs}
              setDesignPrefModalStatus={setDesignPrefModalStatus}
              designPrefOverrides={designPrefOverrides}
              setDesignPrefOverrides={setDesignPrefOverrides}
              confirmationModal={confirmationModal}
              setConfirmationModal={setConfirmationModal}
              isInputLocked={isInputLocked}
              moduleMaterialList={materialList}
              isGuest={isGuestUser()}
              onRefetchModuleOptions={refetchModuleOptions}
            />
          </Modal>
        )
      }

      {/* Reset Confirmation Modal */}
      <Modal
        open={showResetConfirmation}
        title={
          <span>
            {confirmationType === "reset"
              ? "Confirm Reset"
              : "Unsaved Progress"}
          </span>
        }
        onCancel={() => {
          setShowResetConfirmation(false);
          setConfirmationType("reset");
        }}
        footer={[
          <Button key="cancel" onClick={() => setShowResetConfirmation(false)}>
            Cancel
          </Button>,
          <Button
            key="confirm"
            type="primary"
            style={{ background: "rgb(135, 91, 91)", color: "white" }}
            onClick={performResetEnhanced}
          >
            {confirmationType === "reset"
              ? "Yes, Reset Everything"
              : "Yes, Leave Page"}
          </Button>,
        ]}
        width={isMobile ? '90%' : 500}
        className="[&_.ant-modal-header]:bg-transparent [&_.ant-modal-close]:right-4"
      >
        <div>
          <p>
            {confirmationType === "reset"
              ? "Are you sure you want to reset all inputs and clear the current design?"
              : "You have unsaved design progress. Are you sure you want to leave?"}
          </p>
          <br />
          <p>
            <strong>This will lose all your current work.</strong>
          </p>
        </div>
      </Modal>

      {/* Design Status Modal */}
      <DesignStatusModal
        status={status}
        isMobile={isMobile}
        onRetry={() => {
          // Retry logic - could trigger handleSubmitEnhanced again
          setStatus({ step: DESIGN_STATUS.IDLE, message: '', error: null });
        }}
        onClose={() => {
          if (status.step === DESIGN_STATUS.ERROR) {
            setStatus({ step: DESIGN_STATUS.IDLE, message: '', error: null });
          }
        }}
      />

      {/* Hover tooltip overlay */}
      {hoverText && (
        <div
          style={{
            position: 'fixed',
            left: hoverPos.x,
            top: hoverPos.y,
            background: 'rgba(0,0,0,0.85)',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: 6,
            pointerEvents: 'none',
            fontSize: 12,
            zIndex: 1000,
            maxWidth: '250px',
            lineHeight: '1.4',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
          dangerouslySetInnerHTML={{ __html: hoverText }}
        />
      )}
      {projectCreationModal}
      <HelpLinkModal
        open={showAskQuestionModal}
        onClose={() => setShowAskQuestionModal(false)}
        title="Ask us a question"
        helperText="Please visit:"
        link={ASK_QUESTION_LINK}
      />
      <AboutOsdagModal
        open={showAboutOsdagModal}
        onClose={() => setShowAboutOsdagModal(false)}
      />
      <Modal
        open={showSave3dTypeModal}
        title="Save 3D Model"
        onCancel={() => setShowSave3dTypeModal(false)}
        onOk={async () => {
          await handleNavbarMenuClick(selectedSave3dType);
          setShowSave3dTypeModal(false);
        }}
        okText="Export"
        cancelText="Cancel"
        width={isMobile ? "90%" : 520}
        className="[&_.ant-modal-header]:bg-transparent [&_.ant-modal-close]:right-4"
      >
        <div className="space-y-3">
          <p className="text-sm">Choose CAD file type to export:</p>
          <Radio.Group
            value={selectedSave3dType}
            onChange={(event) => setSelectedSave3dType(event.target.value)}
            className="flex flex-col gap-2"
          >
            <Radio value="Export BREP">BREP</Radio>
            <Radio value="Export STL">STL</Radio>
            <Radio value="Export STEP">STEP</Radio>
            <Radio value="Export IGS">IGS</Radio>
            <Radio value="Export IFC">IFC</Radio>
          </Radio.Group>
        </div>
      </Modal>
    </div>
  );
};
