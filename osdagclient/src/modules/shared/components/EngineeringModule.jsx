import React, { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Html, PerspectiveCamera } from "@react-three/drei";
import { useNavigate, useLocation } from "react-router-dom";
import { Input, Modal, Button } from "antd";
import Select from 'react-select';
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
import Designsvg from "../../../assets/Designsvg.svg";
import Resetsvg from "../../../assets/Resetsvg.svg";
import Outputsvg from "../../../assets/Outputsvg.svg";
import Reportsvg from "../../../assets/Reportsvg.svg";
import InputDockHiddensvg from "../../../assets/InputDockHiddensvg.svg";
import InputDockVisiblesvg from "../../../assets/InputDockVisiblesvg.svg";
import OutputDockHiddensvg from "../../../assets/OutputDockhiddensvg.svg";
import OutputDockVisiblesvg from "../../../assets/OutputDockVisiblesvg.svg";
import Logsvg from "../../../assets/Logsvg.svg";
import ArrowDownsvg from "../../../assets/ArrowDownsvg.svg";
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
  const [bgColor, setBgColor] = useState("#666666"); // Gray default background
  const [isDesignComplete, setIsDesignComplete] = useState(false);
  const [showOptionsContainer, setShowOptionsContainer] = useState(false); // New state for options container
  const [isGridActive, setIsGridActive] = useState(false);
  const [orthographicView, setOrthographicView] = useState(null); // New state for orthographic view
  const [isRedesigning, setIsRedesigning] = useState(false); // New state for re-design operations
  const [selectedSection, setSelectedSection] = useState("Additional Inputs");
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
        }
      } catch (_e) {
        message.warning('Cannot verify project. Redirecting to home.');
        navigate('/');
      }
    })();
  }, [location.search]);

  // Only change dock visibility after design is complete
  useEffect(() => {
    console.log("[EngineeringModule] useEffect output:", output);
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
    console.log("Grid toggled:", !isGridActive);
  };

  // Handle orthographic view changes from GridSelector
  const handleOrthographicViewChange = (viewType) => {
    console.log("Switching to orthographic view:", viewType);
    setOrthographicView(viewType);
  };

  const handleSubmitEnhanced = async () => {
    // If there's already an existing design, completely reset everything
    if (isDesignComplete || renderBoolean || output) {
      console.log("Resetting existing design...");

      // Immediately hide current model and output
      setIsRedesigning(true);
      setIsDesignComplete(false);
      setShowOutputDock(false);
      setShowLogs(false);
      setShowOptionsContainer(false);
      setOrthographicView(null);
      setSelectedView("Model");

      // Reset all the data that controls model rendering
      await performReset();

      // Small delay to ensure reset is processed
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Call the actual submit function
    try {
      await handleSubmit();
      setShowResetButton(true);
    } catch (error) {
      console.error("Design submission failed:", error);
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
    setOrthographicView(null); // Reset orthographic view
    setIsRedesigning(false); // Reset redesigning state
  };

  const handleColorChange = (color) => {
    console.log("Current bgColor:", bgColor);
    setBgColor(color);
    console.log("Background color changed to:", color);
  };
  // console.log("Current bgColor:", bgColor);

  // Get connectivity for FinPlateConnection module
  const getConnectivity = () => {
    if (moduleConfig.cameraKey === "FinPlateConnection") {
      return extraState?.selectedOption || inputs?.connectivity;
    }
    return null;
  };

  const cameraSettings = useViewCamera(
    moduleConfig.cameraKey,
    selectedView,
    getConnectivity(),
    orthographicView
  );

  const {
    position: cameraPos,
    fov,
    modelPosition,
    modelScale,
  } = cameraSettings;

  // Determine view options based on module
  const getViewOptions = () => {
    console.log("🔍 [ENGINEERING MODULE] getViewOptions called with cameraKey:", moduleConfig.cameraKey);

    if (moduleConfig.cameraKey === "FinPlateConnection") {
      console.log("📋 [ENGINEERING MODULE] Returning FinPlate view options");
      return ["Model", "Beam", "Column", "Plate"];
    }
    else if (moduleConfig.cameraKey === "CleatAngle") {
      return ["Model", "Beam", "Column", "CleatAngle"]; // FIXED: Use CleatAngle instead of Connector
    }
    else if (moduleConfig.cameraKey === "EndPlate") {
      console.log("📋 [ENGINEERING MODULE] Returning EndPlate view options");
      return ["Model", "Beam", "Column", "EndPlate"];
    }
    else if (moduleConfig.cameraKey === "SeatedAngle") {
      return ["Model", "Beam", "Column", "SeatedAngle"]; // FIXED: Use SeatedAngle instead of Connector
    }
    console.log("📋 [ENGINEERING MODULE] Returning default view options");
    return ["Model", "Beam", "Connector"];
  };

  const options = getViewOptions();

  
  console.log("🔍 [ENGINEERING MODULE] Module Config:", {
    sessionName: moduleConfig.sessionName,
    designType: moduleConfig.designType,
    cameraKey: moduleConfig.cameraKey,
    cadOptions: moduleConfig.cadOptions
  });
  console.log("🔍 [ENGINEERING MODULE] Final view options:", options);

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
  };

  console.log("CadModelPaths*************", cadModelPaths);

  const triggerScreenshotCapture = () => {
    setScreenshotTrigger(true);
  };

  return (
    <div className="module_base">
      {/* Navigation */}
      <div className="module_nav">
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
          <img
            src={showInputDock ? InputDockVisiblesvg : InputDockHiddensvg}
            alt="Toggle Input Dock"
            className="navbar-control-icon"
            onClick={toggleInputDock}
            title="Toggle Input Dock"
          />
          <img
            src={showOutputDock ? OutputDockVisiblesvg : OutputDockHiddensvg}
            alt="Toggle Output Dock"
            className={`navbar-control-icon ${!isDesignComplete ? "disabled" : ""
              }`}
            onClick={isDesignComplete ? toggleOutputDock : undefined}
            style={{
              opacity: isDesignComplete ? 1 : 0.5,
              cursor: isDesignComplete ? "pointer" : "not-allowed",
            }}
            title="Toggle Output Dock"
          />
          <img
            src={Logsvg}
            alt="Toggle Logs"
            className="navbar-control-icon"
            onClick={toggleLogs}
            title="Toggle Logs"
          />
          <img
            src={Homesvg}
            alt="Home"
            className="navbar-control-icon"
            onClick={handleHomeClick}
            title="Home"
          />
        </div>
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
              <Select
                value={{ value: selectedSection, label: selectedSection }}
                onChange={(option) => {
                  setSelectedSection(option.value);

                  // Open design preferences modal if that option is selected
                  if (option.value === "Design Preferences") {
                    setDesignPrefModalStatus(true);
                  }
                }}
                options={[
                  { value: "Additional Inputs", label: "Additional Inputs" },
                  { value: "Section Details", label: "Section Details" },
                  { value: "Design Preferences", label: "Design Preferences" }
                ]}
                classNamePrefix="section-select"
                isSearchable={false}
              />
            </div>
            <div className="subMainBody scroll-data dark:bg-osdag-dark-color bg-white">
              {selectedSection !== "Section Details" &&
                moduleConfig.inputSections.map((section, index) => (
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
                  />
                ))
              }

            </div>

            <div className="flex items-center justify-between w-full gap-x-4 px-4">

              {/* Design Button */}
              <button
                onClick={handleSubmitEnhanced}
                className="flex flex-1 items-center gap-x-2 bg-osdag-green text-white font-semibold px-4 py-2 rounded-lg shadow-md"
              >
                <img src={Designsvg} alt="Design icon" className="w-5 h-5" />
                Design
              </button>

              {/* Reset Button */}
              <button
                onClick={handleResetEnhanced}
                className="flex flex-1 items-center gap-x-2 bg-osdag-green text-white font-semibold px-4 py-2 rounded-lg shadow-md"
              >
                <img src={Resetsvg} alt="Reset icon" className="w-5 h-5" />
                Reset
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
                  console.log("Selected option:", option),
                  <div
                    key={option}
                    className="option-wrapper"
                    onClick={() => {
                      console.log("Selected option111:", option);
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
                  console.log("Rendering option:", option); // runs during render
                  return (
                    <div
                      key={option}
                      className="option-wrapper"
                      onClick={() => {
                        console.log("Selected option111:", option); // runs when clicked
                        setSelectedView(option);
                        setOrthographicView(null);
                      }}
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
              <div className="cadModel relative" style={{ backgroundColor: bgColor }}>
                {/* Existing background color picker - left side */}
                <div className="absolute top-2 left-2 flex items-center gap-2 bg-white/90 dark:bg-osdag-dark-color/90 px-3 py-1.5 rounded-lg shadow-md z-10">
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
                </div>

                {/* Grid selector - right side */}
                <GridSelector onViewChange={handleOrthographicViewChange} />

                <Canvas
                  gl={{ antialias: true, preserveDrawingBuffer: true }}
                  style={{ width: "100%", height: "100%" }}
                >
                  <color attach="background" args={[bgColor]} />
                  <PerspectiveCamera
                    ref={cameraRef}
                    makeDefault
                    position={cameraPos}
                    fov={fov}
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
                      selectedView={selectedView}
                      cameraSettings={{
                        ...cameraSettings,
                        connectivity: getConnectivity(), // Add connectivity info
                      }}
                      key={modelKey}
                    />
                    <ScreenshotCapture
                      screenshotTrigger={screenshotTrigger}
                      setScreenshotTrigger={setScreenshotTrigger}
                      selectedView={selectedView}
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
        {console.log("Output: " + output)}
        {showOutputDock && isDesignComplete && (
          <div className="superMain_right">
            <div className="OutputDock">
              <OutputDockComponent output={output} extraState={{...extraState, cadModelPaths, renderCadModel: renderBoolean}} />
              <div className="flex justify-end flex-col items-center gap-y-3 mt-2">
                <div
                  onClick={handleCreateDesignReport}
                  className="cursor-pointer flex items-center gap-x-2 bg-osdag-green text-white font-semibold p-4 rounded-lg shadow-md duration-200"
                >
                  <img src={Reportsvg} alt="Report icon" className="w-5 h-5" />
                  Generate Report
                </div>

                <div
                  onClick={saveOutput}
                  className="cursor-pointer flex items-center gap-x-2 bg-osdag-green text-white font-semibold p-3 mb-1 rounded-lg shadow-md duration-200"
                >
                  <img src={Outputsvg} alt="Save icon" className="w-5 h-5" />
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
      {moduleConfig.modalConfig.map((modal) => (
        <CustomizationModal
          key={modal.key}
          isOpen={modalStates[modal.key]}
          onClose={() => updateModalState(modal.key, false)}
          title="Customized"
          dataSource={contextData[modal.dataSource] || []} // FIXED: This now includes angleList
          selectedItems={selectedItems[modal.inputKey]}
          onTransferChange={(nextTargetKeys) =>
            updateSelectedItems(modal.inputKey, nextTargetKeys)
          }
        />
      ))}

      {/* Design Preferences Modal */}
      {designPrefModalStatus && (
        <Modal
          open={designPrefModalStatus}
          onCancel={() => setConfirmationModal(true)}
          footer={null}
          minWidth={1200}
          width={1400}
          maxHeight={1200}
          maskClosable={false}
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
      )}

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
    </div>
  );
};