import React, { useRef, useState, useEffect } from "react";
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

export const EngineeringModule = ({
  moduleConfig,
  OutputDockComponent,
  menuItems,
  title,
}) => {
  const navigate = useNavigate();
  const cameraRef = useRef();

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
  } = useEngineeringModule(moduleConfig);

  const [showResetButton, setShowResetButton] = useState(false);
  const [showInputDock, setShowInputDock] = useState(true);
  const [showOutputDock, setShowOutputDock] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [isDesignComplete, setIsDesignComplete] = useState(false);
  const [showOptionsContainer, setShowOptionsContainer] = useState(false); // New state for options container
  const [isGridActive, setIsGridActive] = useState(false);
  const [isRedesigning, setIsRedesigning] = useState(false); // New state for re-design operations
  const [selectedSection, setSelectedSection] = useState("Model");
  const [selectedCameraView, setSelectedCameraView] = useState("Model");
  // Auth helpers
  const BASE_URL = 'http://localhost:8000/api/';
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
    if (isGuest()) return; // guests can open without a project
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
    } else if (isRedesigning || loading) {
      setIsDesignComplete(false);
      setShowOptionsContainer(false);
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
    // If there's already an existing design, completely reset everything
    if (isDesignComplete || renderBoolean || output) {

      // Immediately hide current model and output
      setIsRedesigning(true);
      setIsDesignComplete(false);
      setShowOutputDock(false);
      setShowLogs(false);
      setShowOptionsContainer(false);
      setSelectedSection("Model");
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
    if (showInputDock) return;
    setShowInputDock(true);
    setShowOutputDock(false);
  };

  const toggleOutputDock = () => {
    if (!isDesignComplete || showOutputDock) return;
    setShowInputDock(false);
    setShowOutputDock(true);
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

  // Determine view options based on module
  const getViewOptions = () => {
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
    return moduleConfig.cadOptions;
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
    sectionDesignation
  };

  const triggerScreenshotCapture = () => {
    setScreenshotTrigger(true);
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

        <div className="element">
          {/* All 4 buttons together with same styling */}
          <button onClick={toggleInputDock}>
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-80v-560H200v560h120Zm80 0h360v-560H400v560Zm-80 0H200h120Z" /></svg>
          </button>
          <button onClick={toggleLogs}>
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-200v120h560v-120H200Zm0-80h560v-360H200v360Zm0 80v120-120Z" /></svg>
          </button>
          <button
            onClick={isDesignComplete ? toggleOutputDock : undefined} >
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm440-80h120v-560H640v560Zm-80 0v-560H200v560h360Zm80 0h120-120Z" /></svg>
          </button>
          <img
            src={Homesvg}
            alt="Home"
            className="navbar-control-icon"
            onClick={handleHomeClick}
            title="Home"
          />
        </div>
        {/* Dark/Light Mode Toggle */}
        <button
          onClick={() => {
            // Toggle a "dark" class on the <body> (simple theme swap)
            const current = document.body.classList.contains('dark');
            if (current) {
              document.body.classList.remove('dark');
              localStorage.setItem('osdag-theme', 'light');
            } else {
              document.body.classList.add('dark');
              localStorage.setItem('osdag-theme', 'dark');
            }
          }}
          title="Toggle dark/light mode"
          className="ml-2 text-black dark:text-white"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            outline: "none",
            height: "32px",
            width: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {
            document.body.classList.contains('dark')
              ? (
                // Light icon (sun)
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000"><path d="M440-760v-160h80v160h-80Zm266 110-55-55 112-115 56 57-113 113Zm54 210v-80h160v80H760ZM440-40v-160h80v160h-80ZM254-652 140-763l57-56 113 113-56 54Zm508 512L651-255l54-54 114 110-57 59ZM40-440v-80h160v80H40Zm157 300-56-57 112-112 29 27 29 28-114 114Zm283-100q-100 0-170-70t-70-170q0-100 70-170t170-70q100 0 170 70t70 170q0 100-70 170t-170 70Zm0-80q66 0 113-47t47-113q0-66-47-113t-113-47q-66 0-113 47t-47 113q0 66 47 113t113 47Zm0-160Z" /></svg>
              ) : (
                // Dark icon (moon)
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000"><path d="M484-80q-84 0-157.5-32t-128-86.5Q144-253 112-326.5T80-484q0-146 93-257.5T410-880q-18 99 11 193.5T521-521q71 71 165.5 100T880-410q-26 144-138 237T484-80Zm0-80q88 0 163-44t118-121q-86-8-163-43.5T464-465q-61-61-97-138t-43-163q-77 43-120.5 118.5T160-484q0 135 94.5 229.5T484-160Zm-20-305Z" /></svg>
              )
          }
        </button>

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
        className={`superMainBody ${!showInputDock ? "no-input-dock" : ""} ${!showOutputDock ? "no-output-dock" : ""
          }`}
      >
        {/* Left - Input Dock - Only show if showInputDock is true */}
        {showInputDock && (
          <div className="w-[400px] bg-white dark:bg-osdag-dark-color">
            <div className="flex justify-between inputRow">
              <span className="flex justify-center items-center w-32 my-2 ml-4 py-1 px-1 text-sm text-center rounded-xl font-medium bg-osdag-green text-white flex-shrink-0">Input Dock</span>
              <button
                onClick={() => setDesignPrefModalStatus(true)}
                className="flex items-center justify-center px-4 py-1 my-2 mr-4 text-sm font-medium text-white bg-osdag-green rounded-lg hover:bg-osdag-dark-green transition-colors"
                title="Open Additional Preferences"
              >
                Additional Preferences
              </button>
            </div>
            <div className="subMainBody scroll-data dark:bg-osdag-dark-color bg-white">
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
                  return (
                    <div
                      key={option}
                      className="option-wrapper text-black dark:text-white hover:text-osdag-green"
                      onClick={() => setSelectedSection(option)}
                    >
                      {option}
                    </div>
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
                      selectedView={selectedSection}
                      cameraSettings={{
                        ...cameraSettings,
                        connectivity: getConnectivity(), // Add connectivity info
                      }}
                      key={modelKey}
                    />
                    <ScreenshotCapture
                      screenshotTrigger={screenshotTrigger}
                      setScreenshotTrigger={setScreenshotTrigger}
                      selectedView={selectedSection}
                    />
                  </Suspense>
                </Canvas>
              </div>
            ) : (
              <div className="modelback"></div>
            )}
          </div>

          {showLogs && (
            <div className="logs-container">
              <Logs logs={logs} />
            </div>
          )}
        </div>

        {/* Right - Output Dock - Only show if showOutputDock is true and design is complete */}
        {showOutputDock && isDesignComplete && (
          <div className="superMain_right">
            <div className="OutputDock">
              <OutputDockComponent output={output} extraState={{ ...extraState, cadModelPaths, renderCadModel: renderBoolean }} />
              <div className="flex flex-row justify-between mx-5 items-center gap-y-3 mt-2">
                <div
                  onClick={handleCreateDesignReport}
                  className="cursor-pointer flex items-center gap-x-2 bg-osdag-green text-white font-semibold p-3 rounded-lg shadow-md duration-200"
                ><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h168q13-36 43.5-58t68.5-22q38 0 68.5 22t43.5 58h168q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm80-80h280v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Zm200-190q13 0 21.5-8.5T510-820q0-13-8.5-21.5T480-850q-13 0-21.5 8.5T450-820q0 13 8.5 21.5T480-790ZM200-200v-560 560Z" /></svg>
                  Generate Report
                </div>

                <div
                  onClick={saveOutput}
                  className="cursor-pointer flex items-center gap-x-2 bg-osdag-green text-white font-semibold p-3 mb-1 rounded-lg shadow-md duration-200"
                ><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" /></svg>
                  Save Output
                </div>

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
            onCancel={() => setConfirmationModal(true)}
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
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div >
  );
};