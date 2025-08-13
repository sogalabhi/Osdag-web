import React, { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Html, PerspectiveCamera } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import { Input, Modal, Button, Alert, Select } from "antd";

import { useEngineeringModule } from "../hooks/useEngineeringModule";
import { InputSection } from "../components/InputSection";
import { CustomizationModal } from "../components/CustomizationModal";
import { DesignReportModal } from "../components/DesignReportModal";
import useViewCamera from "./btobViewCamera";
import Model from "./btobRender";
import Logs from "../../../components/Logs";
import Header from "../../../components/Header";
import UnifiedDropdownMenu from "../utils/UnifiedDropdownMenu";
import ScreenshotCapture from "../../../components/ScreenShotCapture";
import DesignPrefSections from "../../../components/DesignPrefSections";
import { MODULE_KEY_FIN_PLATE, MODULE_DISPLAY_FIN_PLATE } from '../../../constants/DesignKeys';

export const EngineeringModule = ({
  moduleConfig,
  OutputDockComponent,
  menuItems,
  title,
}) => {
  const navigate = useNavigate();
  const cameraRef = useRef();

  // Dock visibility states
  const [leftDockOpen, setLeftDockOpen] = useState(true);
  const [bottomDockOpen, setBottomDockOpen] = useState(false);
  const [rightDockOpen, setRightDockOpen] = useState(true);

  // Add dock switching state
  const [currentDock, setCurrentDock] = useState("input");

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

  // Dock toggle handlers
  const toggleLeftDock = () => setLeftDockOpen(!leftDockOpen);
  const toggleBottomDock = () => setBottomDockOpen(!bottomDockOpen);
  const toggleRightDock = () => setRightDockOpen(!rightDockOpen);

  // Get the backend parameter name (different from display name for some cases)
  const getBackendViewName = (displayOption) => {
    // Map UI display names to backend parameter names  
    const backendMapping = {
      "CoverPlate": "Connector", // UI shows "CoverPlate" but backend expects "Connector"
    };
    return backendMapping[displayOption] || displayOption;
  };
  // Get connectivity for modules that support it (FinPlate, etc.)
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

  // Render dock content based on current selection
  const renderDockContent = () => {
    switch (currentDock) {
      case "input":
        return (
          <>
            {loadedFromProject && (
              <Alert message="Input fields loaded from saved project." type="success" showIcon style={{ marginBottom: 16 }} />
            )}
            <div className="mb-5">
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
                />
              ))}
            </div>

            <div className="flex gap-3 py-4 border-t border-gray-200 mt-5">
              <Input type="button" value="Reset" onClick={handleReset} className="flex-1 py-2.5 px-4 border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg bg-gray-100 text-gray-600 hover:bg-gray-200" />
              <Input type="button" value="Design" onClick={handleSubmit} className="flex-1 py-2.5 px-4 border-none rounded-md text-sm font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg bg-osdag-green text-white hover:bg-osdag-green/90" />
            </div>
          </>
        );
      case "assumptions":
        return (
          <div className="mb-6 relative">
            <div className="border-2 border-osdag-green rounded-xl p-4 bg-white">
              <div className="absolute -top-3 left-4 bg-white px-3">
                <h3 className="text-lg font-semibold text-gray-900 m-0">Assumptions & Preferences</h3>
              </div>
              <div className="pt-2">
                <p className="text-gray-600">This is the Additional Inputs content including assumptions and preferences.</p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col w-full bg-gray-100 overflow-hidden">
      {/* Header */}
      <Header
        leftDockOpen={leftDockOpen}
        bottomDockOpen={bottomDockOpen}
        rightDockOpen={rightDockOpen}
        onToggleLeftDock={toggleLeftDock}
        onToggleBottomDock={toggleBottomDock}
        onToggleRightDock={toggleRightDock}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex mt-12 w-full overflow-hidden">
        {/* Left Dock - Input Panel */}
        {leftDockOpen && (
          <div className="w-80 bg-white shadow-lg transition-all duration-300 ease-in-out flex flex-col h-full">
            <div className="h-full overflow-y-auto">
              <div className="p-4">
                <div className="flex space-x-1 mb-4">
                  <button
                    className={`px-4 py-2 rounded-lg font-bold transition-all duration-200 ${currentDock === "input"
                        ? "bg-osdag-green text-white"
                        : "bg-white text-black border border-black"
                      }`}
                    onClick={() => setCurrentDock("input")}
                  >
                    Basic Inputs
                  </button>
                  <button
                    className={`px-4 py-2 rounded-lg font-bold transition-all duration-200 ${currentDock === "assumptions"
                        ? "bg-osdag-green text-white"
                        : "bg-white text-black border border-black"
                      }`}
                    onClick={() => setCurrentDock("assumptions")}
                  >
                    Additional Inputs
                  </button>
                </div>
                {renderDockContent()}
              </div>
            </div>
          </div>
        )}

        {/* Center Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* View Options */}
          <div className="p-4 flex-shrink-0">
            <div className="flex gap-3 p-3 bg-gradient-to-br from-blue-50 to-blue-200 rounded-lg mb-2 shadow-md">
              {viewOptions.map((option) => (
                <div
                  key={option}
                  className="flex items-center gap-1.5 p-2 px-3 rounded-md cursor-pointer transition-all duration-200 bg-white/70 border border-white/30 hover:bg-white/90 hover:-translate-y-0.5 hover:shadow-lg"
                  onClick={() => setSelectedView(option)}
                  title={`View ${getViewDisplayName(option)}`}
                >
                  <div
                    className={`w-3 h-3 rounded-full border-2 transition-all duration-200 ${selectedView === option
                        ? "bg-gradient-to-br from-blue-500 to-purple-600 border-blue-500 shadow-[0_0_0_2px_rgba(102,126,234,0.3)]"
                        : "border-gray-400"
                      }`}
                  ></div>
                  <span className="text-sm font-medium text-gray-700 select-none hover:text-blue-600">{getViewDisplayName(option)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3D Model Canvas */}
          <div className="flex-1 p-4 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-lg font-semibold text-gray-700">Loading Model...</p>
                  <span className="text-gray-500 text-sm block mt-1">
                    {loadingStage || "Preparing 3D visualization..."}
                  </span>
                </div>
              </div>
            ) : renderBoolean ? (
              <div className="rounded-lg overflow-hidden shadow-lg">
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
                        <div className="text-center text-white">
                          <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2.5"></div>
                          <p className="text-white">Loading 3D Model...</p>
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
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                  <div className="text-5xl mb-4 opacity-60">📐</div>
                  <h3 className="m-0 mb-2 text-gray-600">No Model Generated</h3>
                  <p className="m-0 mb-4 text-sm">Click "Design" to generate and view the 3D model</p>
                  <div className="px-3 py-2 bg-white/70 rounded inline-block">
                    <small className="text-gray-600">
                      Available views: {viewOptions.map(getViewDisplayName).join(", ")}
                    </small>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Dock - Logs Panel */}
          {bottomDockOpen && (
            <div className="h-64 bg-gray-900 shadow-lg transition-all duration-300 ease-in-out flex flex-col border-t border-gray-700">
              <div className="h-full overflow-y-auto">
                <Logs logs={logs || []} />
              </div>
            </div>
          )}
        </div>

        {/* Right Dock - Output Panel */}
        {rightDockOpen && (
          <div className="w-80 bg-white shadow-lg transition-all duration-300 ease-in-out flex flex-col h-full">
            <div className="h-full overflow-y-auto">
              <OutputDockComponent output={output} extraState={extraState} />
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
            onClick={performReset}
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
        width={400}
        className="text-center"
        styles={{
          body: {
            padding: "40px 20px",
          },
        }}
      >
        <div>
          <div className="text-lg mb-5 font-bold text-gray-800">
            Processing Design
          </div>
          <div className="mb-5">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          </div>
          <div className="text-gray-600 text-sm">
            {loadingStage || "Please wait while we generate your results..."}
          </div>
          <div className="mt-2.5 text-gray-400 text-xs">
            This may take a few moments
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EngineeringModule;
