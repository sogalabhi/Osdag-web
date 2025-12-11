import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Html, PerspectiveCamera } from "@react-three/drei";
import { useNavigate, useLocation } from "react-router-dom";
import { Modal, Button } from "antd";
import { useEngineeringModule } from "../hooks/useEngineeringModule";
import { InputSection } from "../components/InputSection";
import { CustomizationModal } from "../components/CustomizationModal";
import { DesignReportModal } from "../components/DesignReportModal";
import useViewCamera from "./btobViewCamera";
import Model from "./btobRender";
import Logs from "../../../components/Logs";
import UnifiedDropdownMenu from "../utils/UnifiedDropdownMenu";
import ScreenshotCapture from "../../../components/ScreenShotCapture";
import DesignPrefSections from "../../../components/DesignPrefSections";
import Homesvg from "../../../assets/Homesvg.svg";
import GridSelector from "../utils/GridSelector";
import { message, Modal as AntdModal } from 'antd';
import { apiBase } from "../../../api";
export const EngineeringModule = ({
  moduleConfig,
  OutputDockComponent,
  menuItems,
  title,
}) => {
  const navigate = useNavigate();
  const cameraRef = useRef();
  const lockBtnRef = useRef(null);

  const {
    // Context data
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
    isLoadingModalVisible,
    setIsLoadingModalVisible,
    loadingStage,
    setLoadingStage,

    // Actions
    updateModalState,
    updateSelectionState,
    updateSelectedItems,
    toggleAllSelected,
    handleSubmit,
    handleReset,
    handleHomeClick,
    performReset,
    handleCreateDesignReport,
    handleOkDesignReport,
    handleCancelDesignReport,
    clearDesignResults,
  } = useEngineeringModule(moduleConfig);

  const [showResetButton, setShowResetButton] = useState(false);
  const [showInputDock, setShowInputDock] = useState(true);
  const [showOutputDock, setShowOutputDock] = useState(false);
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

  // Hover tooltip state for 3D parts
  const [hoverText, setHoverText] = useState("");
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  // Auth helpers
  // const BASE_URL = 'http://localhost:8000/api/';
  const BASE_URL = `${apiBase}`;
  const getAccessToken = () => localStorage.getItem('access') || localStorage.getItem('token') || '';
  const isGuest = () => (localStorage.getItem('userType') === 'guest');
  const location = useLocation();

  const getProjectIdFromUrl = () => {
    const params = new URLSearchParams(location.search);
    const pid = params.get('projectId');
    return pid ? parseInt(pid, 10) : null;
  };

  // Enforce project presence for authenticated users
  useEffect(() => {
    if (isGuest()) {
      console.info('[EngineeringModule] Guest mode detected: skipping project enforcement');
      return; // guests can open without a project
    }
    const projectId = getProjectIdFromUrl();
    if (!projectId || Number.isNaN(projectId)) {
      message.warning('No active project. Redirecting to home.');
      navigate('/');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}projects/${projectId}/`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${getAccessToken()}` },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          message.warning('Project not found. Redirecting to home.');
          navigate('/');
          return;
        }
        // Prefill inputs from saved project when opening by id
        if (data.project && data.project.inputs_json) {
          try {
            setInputs(data.project.inputs_json);
          } catch (_ignored) {
            // ignore parse issues; user can overwrite via UI
          }
        }
      } catch (_e) {
        message.warning('Cannot verify project. Redirecting to home.');
        navigate('/');
      }
    })();
  }, [location.search]);

  // Only change dock visibility after design is complete
  useEffect(() => {
    if (!loading && !isRedesigning && output && renderBoolean) {
      setIsDesignComplete(true);
      setShowOptionsContainer(true); // Show options container after design is complete
      // Auto-switch to output dock only after design is complete
      setShowInputDock(false);
      setShowOutputDock(true);
      setShowLogs(true);
      setIsInputLocked(true);
    } else if (isRedesigning || loading) {
      setIsDesignComplete(false);
      setShowOptionsContainer(false);
      setIsInputLocked(false);
    }
  }, [loading, output, renderBoolean, isRedesigning]);

  const handleGridToggle = () => {
    setIsGridActive(!isGridActive);
  };

  // Handle orthographic view changes from GridSelector
  const handleOrthographicViewChange = (viewType) => {
    setSelectedCameraView(viewType);
  };

  const handleSubmitEnhanced = async () => {
    setIsInputLocked(false);
    // If there's already an existing design, completely reset everything
    if (isDesignComplete || renderBoolean || output) {

      // Immediately hide current model and output
      setIsRedesigning(true);
      setIsDesignComplete(false);
      setShowOutputDock(false);
      setShowLogs(false);
      setShowOptionsContainer(false);
      setSelectedSection(["Model"]);
      setSelectedCameraView("Model");

      // Reset all the data that controls model rendering
      await performReset();

      // Small delay to ensure reset is processed
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Call the actual submit function
    try {
      await handleSubmit();
      setShowResetButton(true);

      // Persist latest inputs to project after design
      if (!isGuest()) {
        const pid = getProjectIdFromUrl();
        if (pid && !Number.isNaN(pid)) {
          try {
            await fetch(`${BASE_URL}projects/${pid}/`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAccessToken()}`,
              },
              body: JSON.stringify({ inputs_json: inputs }),
            });
          } catch (_e) {
            // ignore persistence errors; UI will still show outputs
          }
        }
      }
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
    setShowInputDock((prev) => !prev);
  };

  const toggleOutputDock = () => {
    if (!isDesignComplete) return;
    setShowOutputDock((prev) => !prev);
  };

  const handleLockToggle = () => {
    if (isInputLocked) {
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
      setShowUnlockWarning(true);
    } else {
      setIsInputLocked(true);
      setShowInputDock(false);
    }
  };

  const confirmUnlock = () => {
    setIsInputLocked(false);
    setShowUnlockWarning(false);
  };

  const cancelUnlock = () => {
    setShowUnlockWarning(false);
    setIsInputLocked(true);
  };

  const toggleLogs = () => {
    setShowLogs(!showLogs);
  };

  const handleResetEnhanced = async () => {
    setShowResetConfirmation(true);
    setConfirmationType("reset");
  };

  const performResetEnhanced = async () => {
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
  };
  // Save inputs to OSI file / Project (JSON-first)
  const handleSaveInputs = async () => {
    const userIsGuest = isGuest();

    // Determine module_id - use designType from moduleConfig, or fallback to inputs.module
    const module_id = moduleConfig?.designType || inputs?.module || moduleConfig?.cameraKey || 'SeatedAngleConnection';
    const projectName = inputs?.project_name || inputs?.name || moduleConfig?.sessionName || 'project';

    try {
      // Expand inputs for any multi-selects where "All" is selected so arrays are populated
      const expandAllSelectedInputs = (baseInputs) => {
        const keyToFullListMap = {
          bolt_diameter: boltDiameterList,
          bolt_grade: propertyClassList,
          plate_thickness: thicknessList,
          flange_plate_thickness: thicknessList,
          web_plate_thickness: thicknessList,
          angle_list: angleList,
          topangle_list: angleList,
          cleat_section: angleList,
        };
        const expanded = { ...baseInputs };
        Object.keys(keyToFullListMap).forEach((inputKey) => {
          if (allSelected?.[inputKey]) {
            const fullList = keyToFullListMap[inputKey] || [];
            // Normalize values to strings like the UI does
            expanded[inputKey] = Array.isArray(fullList)
              ? fullList.map((val) => {
                if (typeof val === 'object' && val !== null) {
                  return val.value || val.Grade || String(val);
                }
                return String(val);
              })
              : [];
          }
        });
        return expanded;
      };

      const inputsForSave = expandAllSelectedInputs(inputs);
      if (userIsGuest) {
        // Guest: existing OSI download flow
        const response = await fetch(`${BASE_URL}save-osi-from-inputs/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: projectName, module_id: module_id, inputs: inputsForSave }),
        });
        const data = await response.json();
        if (response.ok && data.success && data.is_guest) {
          try {
            const binaryString = atob(data.content_base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
            const blob = new Blob([bytes], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = data.filename || `${projectName}.osi`;
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
        message.error(data.error || 'Failed to save inputs');
        return;
      }

      // Authenticated: persist inputs_json to project
      const projectId = getProjectIdFromUrl();
      if (!projectId || Number.isNaN(projectId)) {
        message.warning('No active project. Open or create a project first.');
        return;
      }
      const updateResponse = await fetch(`${BASE_URL}projects/${projectId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ inputs_json: inputsForSave }),
      });
      const upd = await updateResponse.json();
      if (!updateResponse.ok || !upd.success) {
        message.error(upd.error || 'Failed to save inputs');
        return;
      }

      // Also provide a local OSI download for logged-in users (same as guest)
      try {
        const saveRes = await fetch(`${BASE_URL}save-osi-from-inputs/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAccessToken()}` },
          body: JSON.stringify({ name: projectName, module_id, inputs: inputsForSave, inline: true }),
        });
        const data = await saveRes.json();
        if (saveRes.ok && data.success && data.content_base64) {
          const binaryString = atob(data.content_base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
          const blob = new Blob([bytes], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = data.filename || `${projectName}.osi`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          message.success('Inputs saved and OSI downloaded');
        } else {
          message.success('Inputs saved');
        }
      } catch (_e) {
        message.success('Inputs saved');
      }
    } catch (err) {
      console.error('Error saving inputs:', err);
      message.error('Failed to save inputs');
    }
  };

  // Get connectivity for FinPlateConnection module
  const getConnectivity = () => {
    if (moduleConfig.cameraKey === "FinPlateConnection") {
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

    if (moduleConfig.cameraKey === "FinPlateConnection") {
      return ["Model", "Beam", "Column", "Plate"];
    }
    else if (moduleConfig.cameraKey === "CleatAngle") {
      return ["Model", "Beam", "Column", "CleatAngle"]; // FIXED: Use CleatAngle instead of Connector
    }
    else if (moduleConfig.cameraKey === "EndPlate") {
      return ["Model", "Beam", "Column", "Plate"];
    }
    else if (moduleConfig.cameraKey === "SeatedAngle") {
      return ["Model", "Beam", "Column", "SeatedAngle"]; // FIXED: Use SeatedAngle instead of Connector
    }
    else if (moduleConfig.cameraKey === "BeamToColumnEndPlate") {
      return ["Model", "Beam", "Column", "End Plate"];
    }

    return moduleConfig.cadOptions || ["Model", "Beam", "Connector"];
  };

  const options = getViewOptions();
  // FIXED: Include angleList in contextData 
  const contextData = {
    beamList,
    columnList,
    connectivityList,
    materialList,
    boltDiameterList,
    thicknessList,
    propertyClassList,
    angleList, // FIXED: Added angleList to context data
    boltTypeList,
    sectionProfileList,
    channelList,
    sectionDesignation,
    coverPlateList,
    weldSizeList,
  };

  const triggerScreenshotCapture = () => {
    setScreenshotTrigger(true);
  };

  // Default hover dictionary mapping per-part names to labels
  // Prioritize ctxHoverDict values from backend over defaults
  // Use useMemo to recalculate when ctxHoverDict changes
  const hoverDict = useMemo(() => {
    const defaults = {
      // Defaults (fallback if backend doesn't provide)
      Beam: "Beam",
      Column: "Column",
      Plate: "Plate",
      Weld: "Weld",
      Welds: "Welds",
      Bolt: "Bolt",
      Bolts: "Bolts",
      cleatAngle: "Cleat Angle",
      SeatedAngle: "Seated Angle",
      Connector: "Connector",
      EndPlate: "End Plate",
      Member: "Member",
      Angle: "Angle",
    };

    // Backend hover_dict values override defaults
    const final = {
      ...defaults,
      ...(ctxHoverDict || {}),
    };

    // Debug: log hoverDict to see what we have
    if (ctxHoverDict && Object.keys(ctxHoverDict).length > 0) {
      console.log('[EngineeringModule] ctxHoverDict:', ctxHoverDict);
      console.log('[EngineeringModule] Final hoverDict:', final);
    }

    return final;
  }, [ctxHoverDict]);

  // If backend provided bolt details but no separate Bolt mesh exists,
  // enrich the Plate hover to include bolt info as a fallback.
  const hasBoltMesh = Boolean(cadModelPaths?.Bolt || cadModelPaths?.Bolts);
  if (!hasBoltMesh && (ctxHoverDict && ctxHoverDict.Bolt)) {
    const boltText = String(ctxHoverDict.Bolt).replace(/<br\s*\/?>/gi, ' ');
    hoverDict.Plate = hoverDict.Plate ? `${hoverDict.Plate}: ${boltText}` : boltText;
  }

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

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      {/* Navigation */}
      <div className="flex flex-row bg-[#d2d4d2] pl-4 gap-4 w-full text-sm  flex-shrink-0">
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
          />
        ))}

        {displaySaveInputPopup && (
          <span id="save-input-style" style={{ marginTop: "18px" }}>
            <strong>Saved input file as "{saveInputFileName}"</strong>
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto pr-4 text-black dark:text-white">

          {/* Input Dock Button */}
          <button
            onClick={toggleInputDock}
            className={`group p-2 rounded-md transition-colors ${showInputDock
              ? 'bg-osdag-green text-white dark:bg-osdag-dark-green'
              : 'hover:bg-black/10 dark:hover:bg-black/40'
              }`}
            title={`${showInputDock ? 'Hide' : 'Show'} input dock`}
            type="button"
            className="p-2 rounded-md transition-colors "
          >
            <svg viewBox="0 0 100 100" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="6">
              {/* Frame */}
              <rect x="8" y="8" width="84" height="84" />
              {/* Divider line */}
              <line x1="38" y1="8" x2="38" y2="92" />
              {/* LEFT panel fill only when active */}
              {showInputDock && (
                <rect x="8" y="8" width="30" height="84" fill="currentColor" stroke="none" />
              )}
            </svg>

          </button>

          {/* Logs Button */}
          <button
            onClick={toggleLogs}
            className={`p-2 rounded-md transition-colors ${showLogs
              ? 'bg-osdag-green text-white dark:bg-osdag-dark-green'
              : 'hover:bg-black/10 hover:text-osdag-green dark:hover:bg-black/40'
              }`}
            title={`${showLogs ? 'Hide' : 'Show'} logs`}
            type="button"
            className="p-2 rounded-md transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 100 100"
              className="w-5 h-5"
            >
              {/* Outer border */}
              <rect
                x="5"
                y="5"
                width="90"
                height="90"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
              />

              {/* Bottom section fill */}
              <rect
                x="5"
                y="65"
                width="90"
                height="30"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </button>

          {/* Output Dock Button */}
          <button
            onClick={toggleOutputDock}
            disabled={!isDesignComplete}
            title={isDesignComplete ? `${showOutputDock ? 'Hide' : 'Show'} output dock` : 'Run a design to view outputs'}
            type="button"
            className={`p-2 rounded-md transition-colors ${
              isDesignComplete
                ? ""
                : "opacity-40 cursor-not-allowed"
            }`}
          >
            <svg viewBox="0 0 100 100" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="6">
              {/* Frame */}
              <rect x="8" y="8" width="84" height="84" />
              {/* Divider line */}
              <line x1="62" y1="8" x2="62" y2="92" />
              {/* RIGHT panel fill only when active */}
              {showOutputDock && (
                <rect x="62" y="8" width="30" height="84" fill="currentColor" stroke="none" />
              )}
            </svg>
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

      <div
        className={`superMainBody relative ${!showInputDock ? "no-input-dock" : ""} ${!showOutputDock ? "no-output-dock" : ""
          }`}
      >
        {/* Input Dock Toggle Button - Fixed to left, shows when dock is closed */}
        {!showInputDock && (
          <button
            onClick={toggleInputDock}
            className="absolute left-0 top-0 h-full w-8 bg-white dark:bg-osdag-dark-color border-r border-gray-300 dark:border-osdag-border flex items-center justify-center z-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
            title="Open Input Dock"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            </svg>
          </button>
        )}

        {/* Output Dock Toggle Button - Fixed to right, shows when dock is closed and design is complete */}
        {!showOutputDock && isDesignComplete && (
          <button
            onClick={toggleOutputDock}
            className="absolute right-0 top-0 h-full w-8 bg-white dark:bg-osdag-dark-color border-l border-gray-300 dark:border-gray-700 flex items-center justify-center z-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
            title="Open Output Dock"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="currentColor">
              <path d="M15.41 7.41L10.83 12l4.58 4.59L14 18l-6-6 6-6 1.41 1.41z" />
            </svg>
          </button>
        )}

        {/* Input Dock Close Button - Right side, outside dock, pointing left */}
        {showInputDock && (
          <button
            onClick={toggleInputDock}
            className="absolute left-[400px] top-1/2 -translate-y-1/2 w-[30px] h-[30px] bg-white dark:bg-osdag-dark-color border border-gray-300 dark:border-gray-700 rounded flex items-center justify-center z-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
            title="Close Input Dock"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="currentColor">
              <path d="M15.41 7.41L10.83 12l4.58 4.59L14 18l-6-6 6-6 1.41 1.41z" />
            </svg>
          </button>
        )}

        {/* Left - Input Dock - Only show if showInputDock is true */}
        {showInputDock && (
          <div className="w-[400px] bg-white dark:bg-osdag-dark-color">
            <div className="flex items-center justify-between inputRow">
              <span className="flex justify-center items-center w-32 my-2 ml-4 py-1 px-1 text-sm text-center rounded-xl font-medium bg-osdag-green text-white flex-shrink-0">Input Dock</span>
              <div className="flex items-center gap-2 mr-4">
                <button
                  onClick={() => setDesignPrefModalStatus(true)}
                  className={`flex items-center justify-center px-4 py-1 my-2 text-sm font-medium rounded-lg transition-colors bg-osdag-green text-white hover:bg-osdag-dark-green`}
                  // ${isInputLocked ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400' : 'bg-osdag-green text-white hover:bg-osdag-dark-green'}`}
                  title={isInputLocked ? 'Unlock the dock to edit additional inputs' : 'Open Additional Inputs'}
                // disabled={isInputLocked}
                >
                  Additional Inputs
                </button>

                <button
                  ref={lockBtnRef}
                  onClick={handleLockToggle}
                  className={`my-2 p-2 rounded-lg transition-all duration-200 transition-colors ${lockZoom ? "scale-110" : "scale-100"} ${isInputLocked ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'}`}
                  title={isInputLocked ? 'Unlock input dock' : 'Lock input dock'}
                  type="button"
                >
                  {isInputLocked ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                      <path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 5a3 3 0 016 0v3H9V7zm3 6a2 2 0 11-2 2 2 2 0 012-2z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                      <path d="M18 10h-1V7a5 5 0 10-10 0h2a3 3 0 116 0v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2zm-6 6a2 2 0 112-2 2 2 0 01-2 2z" />
                    </svg>
                  )}
                </button>
                {/* POPUP WARNING */}
                {showUnlockWarning && (
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      zIndex: 9999,
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: "white",
                        padding: "20px",
                        borderRadius: "8px",
                        width: "300px",
                        boxShadow: "0 0 10px rgba(0,0,0,0.25)",
                      }}
                    >
                      <h2 className="text-lg font-semibold mb-4">Warning</h2>
                      <p className="mb-6">
                        The current designs will be lost.
                        You can save them by clicking on <strong>Save Input</strong>.
                      </p>

                      <div className="flex justify-end gap-3">
                        <button
                          onClick={cancelUnlock}
                          className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600"
                        >
                          Cancel
                        </button>

                        <button
                          onClick={confirmUnlock}
                          className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
                        >
                          Unlock
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* <div className={`subMainBody scroll-data dark:bg-osdag-dark-color bg-white`}>
              <div className={`${isInputLocked ? 'pointer-events-none opacity-60' : ''}`}>
              {moduleConfig.inputSections.map((section, index) => (
                <InputSection
                  key={index}
                  section={section}
                  inputs={inputs}
                  setInputs={setInputs}
                  selectionStates={selectionStates}
                  updateSelectionState={updateSelectionState}
                  updateModalState={updateModalState}
                  toggleAllSelected={toggleAllSelected}
                  contextData={contextData} // FIXED: This now includes angleList
                  extraState={extraState}
                  setExtraState={setExtraState}
                  updateSelectedItems={updateSelectedItems}
                  setModalDynamicSrc={setModalDynamicSrc}
                />
              ))}
              </div>
            </div> */}
            <div className="relative subMainBody scroll-data dark:bg-osdag-dark-color bg-white">

              {/* 🔒 Overlay when input dock is locked */}
              {/* {isInputLocked && (
                <div
                  className="absolute inset-0 z-20 cursor-not-allowed"
                  onClick={(e) => {
                    const tooltip = document.createElement("div");
                    tooltip.className =
                      "fixed px-3 py-1 text-sm bg-black text-white rounded-md opacity-0 transition-opacity z-[9999]";
                    tooltip.textContent = "Unlock to edit";

                    document.body.appendChild(tooltip);
                    tooltip.style.left = `${e.clientX + 10}px`;
                    tooltip.style.top = `${e.clientY + 10}px`;

                    requestAnimationFrame(() => {
                      tooltip.style.opacity = 1;
                    });

                    setTimeout(() => {
                      tooltip.style.opacity = 0;
                      setTimeout(() => tooltip.remove(), 150);
                    }, 300);
                  }}
                ></div>
              )} */}
              {isInputLocked && (
                <div
                  className="absolute inset-0 z-20 cursor-not-allowed"
                  onClick={() => {
                    if (!lockBtnRef.current) return;
                    // 🔥 Trigger zoom-in
                    setLockZoom(true);
                    setTimeout(() => setLockZoom(false), 1000); // return to normal


                    const rect = lockBtnRef.current.getBoundingClientRect();

                    const tooltip = document.createElement("div");
                    tooltip.className =
                      "fixed px-3 py-1 text-base font-bold bg-black text-white rounded-md opacity-0 transition-opacity z-[9999]";
                    tooltip.textContent = "Unlock to edit";

                    document.body.appendChild(tooltip);

                    // Position tooltip just to the RIGHT of the Lock button
                    tooltip.style.left = `${rect.right + 8}px`;
                    tooltip.style.top = `${rect.top + rect.height / 2}px`;
                    tooltip.style.transform = "translateY(-50%)";

                    requestAnimationFrame(() => {
                      tooltip.style.opacity = 1;
                    });

                    setTimeout(() => {
                      tooltip.style.opacity = 0;
                      setTimeout(() => tooltip.remove(), 150);
                    }, 3000);
                  }}
                />
              )}


              {/* your existing container */}
              <div className={`${isInputLocked ? "pointer-events-none opacity-60" : ""}`}>
                {moduleConfig.inputSections.map((section, index) => (
                  <InputSection
                    key={index}
                    section={section}
                    inputs={inputs}
                    setInputs={setInputs}
                    selectionStates={selectionStates}
                    updateSelectionState={updateSelectionState}
                    updateModalState={updateModalState}
                    toggleAllSelected={toggleAllSelected}
                    contextData={contextData}
                    extraState={extraState}
                    setExtraState={setExtraState}
                    updateSelectedItems={updateSelectedItems}
                    setModalDynamicSrc={setModalDynamicSrc}
                  />
                ))}
              </div>

            </div>

            <div className="flex items-center justify-between w-full gap-x-4 px-4">
              {/* Save Inputs Button */}
              <button
                onClick={handleSaveInputs}
                className="flex flex-1 items-center gap-x-2 bg-osdag-green text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-opacity-90 transition-opacity"
                disabled={!inputs || Object.keys(inputs).length === 0}
                title={isGuest() ? "Download OSI file (guest users cannot save to database)" : "Save current inputs to OSI file"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M840-680v480q0 33-23.5 56.5T760-120H200q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h480l160 160Zm-80 34L646-760H200v560h560v-446ZM480-240q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35ZM240-560h360v-160H240v160Zm-40-86v446-560 114Z" /></svg>
                {isGuest() ? "Download OSI" : "Save Inputs"}
              </button>
              {/* Design Button */}
              <button
                onClick={handleSubmitEnhanced}
                className="flex flex-1 items-center gap-x-2 bg-osdag-green text-white font-semibold px-4 py-2 rounded-lg shadow-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="m352-522 86-87-56-57-44 44-56-56 43-44-45-45-87 87 159 158Zm328 329 87-87-45-45-44 43-56-56 43-44-57-56-86 86 158 159Zm24-567 57 57-57-57ZM290-120H120v-170l175-175L80-680l200-200 216 216 151-152q12-12 27-18t31-6q16 0 31 6t27 18l53 54q12 12 18 27t6 31q0 16-6 30.5T816-647L665-495l215 215L680-80 465-295 290-120Zm-90-80h56l392-391-57-57-391 392v56Zm420-419-29-29 57 57-28-28Z" /></svg>
                Design
              </button>

            </div>
          </div>
        )}

        {/* Middle - 3D Model */}
        <div
          className={`superMainBody_mid ${showOptionsContainer ? "has-options" : ""
            }`}
        >
          {/* Options Container - Only show after design is complete */}
          {showOptionsContainer && (
            <div className="options-container">
              <div className="view-options">
                {/* {options.map((option) => (
                  <div
                    key={option}
                    className="option-wrapper"
                    onClick={() => {
                      setSelectedView(option);
                      setOrthographicView(null);
                    }}
                  >
                    <div
                      className={`option-box ${selectedView === option && !orthographicView
                        ? "selected"
                        : ""
                        }`}
                    ></div>
                    <span className="option-label dark:text-white">{option}</span>
                  </div>
                ))} */}
                {options.map((option) => {
                  const isChecked = selectedSection.includes(option);
                  const isModel = option === "Model";
                  return (
                    <label
                      key={option}
                      className={`flex items-center gap-3 px-4 py-2 cursor-pointer text-sm font-medium text-black dark:text-white`}
                    // rounded-lg cursor-pointer transition-colors text-sm font-medium ${isChecked ? 'bg-osdag-green/10 text-osdag-green dark:bg-osdag-dark-green/20 dark:text-osdag-green' : 'text-black dark:text-white hover:bg-black/10 dark:hover:bg-black/40'}`}
                    >
                      {/* Checkbox highlight box */}
                      <div
                        className={`
                          rounded-lg p-1 transition-colors
                          ${isChecked
                            ? "bg-osdag-green/20 dark:bg-osdag-dark-green/30"
                            : "bg-transparent"
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-400 text-osdag-green focus:ring-osdag-green"
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
                            } else {
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

          <div className={`model-container ${!showLogs ? "full-height" : ""}`}>
            {loading || isRedesigning ? (
              <div className="modelLoading">
                <p>{isRedesigning ? "Updating Model..." : "Loading Model..."}</p>
              </div>
            ) : renderBoolean ? (
              <div className="cadModel relative   bg-gradient-to-b from-[#FFFFFF] to-[#7E7E7E] dark:from-[#535353] dark:to-[#000000]">
                {/* Existing background color picker - left side */}
                {/* <div className="absolute top-2 left-2 flex items-center gap-2 bg-white/90 dark:bg-osdag-dark-color/90 px-3 py-1.5 rounded-lg shadow-md z-10">
                  <label htmlFor="bgColorPicker" className="text-xs font-medium text-black dark:text-white mr-1">
                    Background:
                  </label>
                  <input
                    type="color"
                    id="bgColorPicker"
                    value={bgColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="bg-color-picker"
                    title="Change Background Color"
                  />
                </div> */}

                {/* Grid selector - right side */}
                <GridSelector onViewChange={handleOrthographicViewChange} />

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
                    far={1000}
                  />
                  <Suspense
                    fallback={
                      <Html>
                        <p>Loading 3D Model...</p>
                      </Html>
                    }
                  >
                    <Model
                      modelPaths={cadModelPaths}
                      selectedView={Array.isArray(selectedSection) ? selectedSection[0] : selectedSection}
                      selectedViews={selectedSection}
                      cameraSettings={{
                        ...cameraSettings,
                        connectivity: getConnectivity(), // Add connectivity info
                      }}
                      hoverDict={hoverDict}
                      onHoverLabel={handleHoverLabel}
                      onHoverEnd={handleHoverEnd}
                      key={modelKey}
                    />
                    <ScreenshotCapture
                      screenshotTrigger={screenshotTrigger}
                      setScreenshotTrigger={setScreenshotTrigger}
                      selectedView={Array.isArray(selectedSection) ? selectedSection[0] : selectedSection}
                    />
                  </Suspense>
                </Canvas>
              </div>
            ) : (
              <div className="modelback"></div>
            )}
          </div>

          {showLogs && (
            <div className={`logs-container ${!showInputDock ? 'pl-[30px]' : ''} ${!showOutputDock && isDesignComplete ? 'pr-[30px]' : ''} `}>
              <Logs logs={logs} />
            </div>
          )}
        </div>

        {/* Output Dock Close Button - Left side, outside dock, pointing right */}
        {showOutputDock && isDesignComplete && (
          <button
            onClick={toggleOutputDock}
            className="absolute right-[25%] top-1/2 -translate-y-1/2 w-[30px] h-[30px] bg-white dark:bg-osdag-dark-color border border-gray-300 dark:border-gray-700 rounded flex items-center justify-center z-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm"
            title="Close Output Dock"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="currentColor">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            </svg>
          </button>
        )}

        {/* Right - Output Dock - Only show if showOutputDock is true and design is complete */}
        {showOutputDock && isDesignComplete && (
          <div className="superMain_right">
            <div className="OutputDock">
              <OutputDockComponent output={output} extraState={{ ...extraState, cadModelPaths, renderCadModel: renderBoolean }} />
              <div className="flex items-center w-full gap-x-4 px-5 mt-2">
                <button
                  onClick={handleCreateDesignReport}
                  className="flex flex-1 items-center justify-center gap-x-2 bg-osdag-green text-white font-semibold px-4 py-3 rounded-lg shadow-md duration-200 hover:bg-osdag-dark-green"
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h168q13-36 43.5-58t68.5-22q38 0 68.5 22t43.5 58h168q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm80-80h280v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Zm200-190q13 0 21.5-8.5T510-820q0-13-8.5-21.5T480-850q-13 0-21.5 8.5T450-820q0 13 8.5 21.5T480-790ZM200-200v-560 560Z" /></svg>
                  Generate Report
                </button>
                <button
                  onClick={saveOutput}
                  className="flex flex-1 items-center justify-center gap-x-2 bg-osdag-green text-white font-semibold px-4 py-3 rounded-lg shadow-md duration-200 hover:bg-osdag-dark-green"
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" /></svg>
                  Save Output
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Design Report Modal */}
      <DesignReportModal
        isOpen={createDesignReportBool}
        onCancel={handleCancelDesignReport}
        onOk={handleOkDesignReport}
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

      {/* Design Preferences Modal */}
      {
        designPrefModalStatus && (
          <Modal
            open={designPrefModalStatus}
            // onCancel={() => setConfirmationModal(true)}
            onCancel={() =>
              isInputLocked
                ? setDesignPrefModalStatus(false)   // Directly close
                : setConfirmationModal(true)        // Ask confirmation
            }
            footer={null}
            minWidth={1200}
            width={1400}
            maxHeight={1200}
            maskClosable={false}
            className="[&_.ant-modal-header]:bg-transparent [&_.ant-modal-close]:right-4"
          >
            <DesignPrefSections
              module={moduleConfig.sessionName}
              inputs={inputs}
              setInputs={setInputs}
              setDesignPrefModalStatus={setDesignPrefModalStatus}
              confirmationModal={confirmationModal}
              setConfirmationModal={setConfirmationModal}
              isInputLocked={isInputLocked}
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
        width={500}
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

      {/* Loading Modal */}
      <Modal
        open={isLoadingModalVisible}
        footer={null}
        closable={false}
        maskClosable={false}
        centered
        width={420}
        className="loading-modal"
        styles={{
          body: {
            textAlign: "center",
            padding: "30px 20px",
          },
        }}
      >
        <div className="loading-content">
          <div>🔧 OSDAG Design Processing</div>
          <div>
            <div className="spinner"></div>
          </div>
          <div>{loadingStage || "Generating your engineering design..."}</div>
          <div>Please wait while we create your 3D model</div>
        </div>
      </Modal>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>

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
    </div >
  );
};
