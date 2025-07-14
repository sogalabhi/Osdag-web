import React, { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Html, PerspectiveCamera } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
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
import OutputDockHiddensvg from "../../../assets/OutputDockHiddensvg.svg";
import OutputDockVisiblesvg from "../../../assets/OutputDockVisiblesvg.svg";
import Logsvg from "../../../assets/Logsvg.svg";
import ArrowDownsvg from "../../../assets/ArrowDownsvg.svg";
import Homesvg from "../../../assets/Homesvg.svg";
import GridSelector from "../utils/GridSelector";

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
    channelList,
    sectionProfileList,
    topAngleList,
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
    loadedFromProject,

    // Project management states
    currentProjectId,
    projectNameLoading,

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
  const [selectedSection, setSelectedSection] = useState("Section Details");

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
    setBgColor(color);
    console.log("Background color changed to:", color);
  };

  // Get connectivity for FinPlate module
  const getConnectivity = () => {
    if (moduleConfig.cameraKey === MODULE_KEY_FIN_PLATE) {
      return extraState?.selectedOption || inputs?.connectivity;
    }
    return null;
  };

  const { position: cameraPos, fov } = useViewCamera(
    moduleConfig.cameraKey,
    getBackendViewName(selectedView),
    getConnectivity()
  );

  // Get view options from module configuration
  const getViewOptions = () => {
    // Use cadOptions from module config if available, otherwise fallback to default
    if (moduleConfig.cadOptions && Array.isArray(moduleConfig.cadOptions)) {
      return moduleConfig.cadOptions;
    }

    // Fallback based on module type for backward compatibility
    switch (moduleConfig.cameraKey) {
      case MODULE_KEY_FIN_PLATE:
        return ["Model", "Beam", "Column", "Plate"];
      case "TensionMember":
        return ["Model", "Member", "Plate", "Endplate"];
      case "BeamToColumnEndPlate":
        return ["Model", "Beam", "Column", "EndPlate"];
      case "BeamBeamEndPlate":
        return ["Model", "Beam", "EndPlate"];
      case "CoverPlateBolted":
        return ["Model", "Beam", "Plate"];
      case "CoverPlateWelded":
        return ["Model", "Beam", "CoverPlate"];
      case "CleatAngle":
        return ["Model", "Beam", "Column", "CleatAngle"];
      case "SeatedAngle":
        return ["Model", "Beam", "Column", "SeatedAngle"];
      case "FlexuralMember":
        return ["Model", "Beam"];
      default:
        return ["Model", "Beam", "Connector"];
    }
  };

  const viewOptions = getViewOptions();

  // Get the display name for view options (for better UI labels)
  const getViewDisplayName = (option) => {
    const displayNames = {
      "Model": "Model",
      "Beam": "Beam",
      "Column": "Column",
      "Connector": "Connector",
      "CoverPlate": "Cover Plate",
      "Member": "Member",
      "Plate": "Plate",
      "Endplate": "End Plate",
      "EndPlate": "End Plate",
      "CleatAngle": "Cleat Angle",
      "SeatedAngle": "Seated Angle"
    };
    return displayNames[option] || option;
  };



  // Initialize selectedView to first option if not set
  React.useEffect(() => {
    if (!selectedView && viewOptions.length > 0) {
      setSelectedView(viewOptions[0]);
    }
  }, [selectedView, viewOptions, setSelectedView]);

  const contextData = {
    beamList,
    columnList,
    connectivityList,
    materialList,
    boltDiameterList,
    thicknessList,
    propertyClassList,
    angleList,
    channelList,
    sectionProfileList,
    topAngleList,
  };

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
            className={`navbar-control-icon ${
              !isDesignComplete ? "disabled" : ""
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
        className={`superMainBody ${!showInputDock ? "no-input-dock" : ""} ${
          !showOutputDock ? "no-output-dock" : ""
        }`}
      >
        {/* Left - Input Dock - Only show if showInputDock is true */}
        {showInputDock && (
          <div className="InputDock">
            <div className="flex justify-between inputRow">
              <span>Input Dock</span>
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
                  { value: "Section Details", label: "Section Details"},
                  { value: "Design Preferences", label: "Design Preferences" },
                  { value: "Additional Inputs", label: "Additional Inputs" }
                ]}
                classNamePrefix="section-select"
                isSearchable={false}
              />
            </div>
            <div className="subMainBody scroll-data">
              {selectedSection !== "Additional Inputs" && 
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
                    contextData={contextData}
                    extraState={extraState}
                    setExtraState={setExtraState}
                  />
                ))
              }
              
              {selectedSection === "Additional Inputs" && (
                <div className="additional-inputs-content">
                  {/* Add your additional inputs content here */}
                  <p>Additional Inputs Content</p>
                </div>
              )}
            </div>

            <div className="inputdock-btn">
              <button onClick={handleSubmitEnhanced}>
                <img src={Designsvg} alt="Design" />
                Design
              </button>

              <button
                className="arrow-down-btn"
                onClick={toggleResetButton}
                title="Toggle Reset Options"
              >
                <img
                  src={ArrowDownsvg}
                  alt="Toggle Reset"
                  className={`arrow-icon ${showResetButton ? "rotated" : ""}`}
                />
              </button>

              {showResetButton && (
                <button onClick={handleResetEnhanced} className="reset-btn">
                  <img src={Resetsvg} alt="Reset" />
                  Reset
                </button>
              )}
            </div>
          </div>
        )}

        {/* Middle - 3D Model */}
        <div className="superMainBody_mid">
          {/* Dynamic View Options */}
          <div className="options-container">
            {viewOptions.map((option) => (
              <div
                key={option}
                className="option-wrapper"
                onClick={() => setSelectedView(option)}
                title={`View ${getViewDisplayName(option)}`}
              >
                <div
                  className={`option-box ${selectedView === option ? "selected" : ""
                    }`}
                ></div>
                <span className="option-label">{getViewDisplayName(option)}</span>
              </div>
            ))}
          </div>

          {/* 3D Model Canvas */}
          {loading ? (
            <div className="modelLoading">
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading Model...</p>
                <span className="loading-subtext">
                  {loadingStage || "Preparing 3D visualization..."}
                </span>
              </div>
            </div>
          ) : renderBoolean ? (
            <div className="cadModel">
              <Canvas
                gl={{ antialias: true, preserveDrawingBuffer: true }}
                onCreated={({ gl }) => {
                  gl.setClearColor("#ADD8E6");
                }}
              >
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
                      <div className="model-loading-fallback">
                        <div className="spinner"></div>
                        <p>Loading 3D Model...</p>
                      </div>
                    </Html>
                  }
                >
                  <Model
                    modelPaths={cadModelPaths}
                    selectedView={getBackendViewName(selectedView)}
                    key={modelKey}
                  />
                  <ScreenshotCapture
                    screenshotTrigger={screenshotTrigger}
                    setScreenshotTrigger={setScreenshotTrigger}
                    selectedView={getBackendViewName(selectedView)}
                  />
                </Suspense>
              </Canvas>
            </div>
          ) : (
            <div className="modelback">
              <div className="no-model-message">
                <div className="no-model-icon">📐</div>
                <h3>No Model Generated</h3>
                <p>Click "Design" to generate and view the 3D model</p>
                <div className="model-info">
                  <small>
                    Available views: {viewOptions.map(getViewDisplayName).join(", ")}
                  </small>
                </div>
              </div>
            </div>
          )}

          <div className={`model-container ${!showLogs ? "full-height" : ""}`}>
            {loading || isRedesigning ? (
              <div className="modelLoading">
                <p>{isRedesigning ? "Updating Model..." : "Loading Model..."}</p>
              </div>
            ) : renderBoolean ? (
              <div className="cadModel">
                {/* Existing background color picker - left side */}
                <div className="canvas-control-bar-overlay">
                  <label htmlFor="bgColorPicker" className="bg-picker-label">
                    Background:
                  </label>
                  <input
                    type="color"
                    id="bgColorPicker"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
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
        {showOutputDock && isDesignComplete && (
          <div className="superMain_right">
            <div className="OutputDock">
              <OutputDockComponent output={output} extraState={extraState} />
              <div className="inputdock-btn">
                <Button onClick={handleCreateDesignReport}>
                  <img src={Reportsvg} alt="Report" />
                  Generate Report
                </Button>
                <Button onClick={saveOutput}>
                  <img src={Outputsvg} alt="Output" />
                  Save Output
                </Button>
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
      />

      {/* Customization Modals */}
      {moduleConfig.modalConfig.map((modal) => {
        // Handle dynamic data sources
        let dataSource = [];
        
        if (modal.dataSource) {
          // Static data source from contextData
          dataSource = contextData[modal.dataSource] || [];
        } else {
          // Dynamic data source - find the field with getDynamicDataSource
          const dynamicField = moduleConfig.inputSections
            .flatMap(section => section.fields)
            .find(field => field.modalKey === modal.key && field.getDynamicDataSource);
          
          if (dynamicField && dynamicField.getDynamicDataSource) {
            dataSource = dynamicField.getDynamicDataSource(inputs, contextData) || [];
          }
        }

        return (
          <CustomizationModal
            key={modal.key}
            isOpen={modalStates[modal.key]}
            onClose={() => updateModalState(modal.key, false)}
            title="Customized"
            dataSource={dataSource}
            selectedItems={selectedItems[modal.inputKey]}
            onTransferChange={(nextTargetKeys) =>
              updateSelectedItems(modal.inputKey, nextTargetKeys)
            }
          />
        );
      })}

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
          <div>OSDAG Design Processing</div>
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

export default EngineeringModule;
