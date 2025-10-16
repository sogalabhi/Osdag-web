import React, { Suspense, useRef, useState } from 'react';
import { Canvas } from "@react-three/fiber";
import { Html, PerspectiveCamera } from "@react-three/drei";
import Model from "./btobRender";
import useViewCamera from "./btobViewCamera";
import ScreenshotCapture from "../../../components/ScreenShotCapture";
import GridSelector from "../utils/GridSelector";
import Logs from "../../../components/Logs";

/**
 * @description Renders the central 3D viewer, view options, and logs panel.
 */
export const ViewerSection = ({
    loading,
    isRedesigning,
    renderBoolean,
    cadModelPaths,
    modelKey,
    moduleConfig,
    selectedView,
    setSelectedView,
    extraState,
    screenshotTrigger,
    setScreenshotTrigger,
    isDesignComplete,
    showLogs,
    logs
}) => {
    const cameraRef = useRef();
    const [bgColor, setBgColor] = useState("#666666");
    const [orthographicView, setOrthographicView] = useState(null);

    // Camera logic remains coupled with the viewer
    const getConnectivity = () => (moduleConfig.cameraKey === "FinPlateConnection")
        ? extraState?.selectedOption || inputs?.connectivity
        : null;

    const cameraSettings = useViewCamera(moduleConfig.cameraKey, selectedView, getConnectivity(), orthographicView);

    const getViewOptions = () => {
        switch (moduleConfig.cameraKey) {
            case "FinPlateConnection": return ["Model", "Beam", "Column", "Plate"];
            case "CleatAngle": return ["Model", "Beam", "Column", "CleatAngle"];
            case "EndPlate": return ["Model", "Beam", "Column", "EndPlate"];
            case "SeatedAngleConnection": return ["Model", "Beam", "Column", "SeatedAngle"];
            default: return ["Model", "Beam", "Connector"];
        }
    };
    const options = getViewOptions();

    return (
        <div className={`superMainBody_mid ${isDesignComplete ? "has-options" : ""}`}>
            {isDesignComplete && (
                <div className="options-container">
                    <div className="view-options">
                        {options.map((option) => (
                            <div key={option} className="option-wrapper" onClick={() => { setSelectedView(option); setOrthographicView(null); }}>
                                <div className={`option-box ${selectedView === option && !orthographicView ? "selected" : ""}`}></div>
                                <span className="option-label dark:text-white">{option}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className={`model-container ${!showLogs ? "full-height" : ""}`}>
                {loading || isRedesigning ? (
                    <div className="modelLoading"><p>{isRedesigning ? "Updating Model..." : "Loading Model..."}</p></div>
                ) : renderBoolean ? (
                    <div className="cadModel">
                        <div className="absolute top-2 left-2 z-10">
                            <label>Background:</label>
                            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
                        </div>
                        <GridSelector onViewChange={(view) => setOrthographicView(view)} />
                        <Canvas gl={{ preserveDrawingBuffer: true }}>
                            <color attach="background" args={[bgColor]} />
                            <PerspectiveCamera ref={cameraRef} makeDefault position={cameraSettings.position} fov={cameraSettings.fov} />
                            <Suspense fallback={<Html><p>Loading 3D Model...</p></Html>}>
                                <Model modelPaths={cadModelPaths} selectedView={selectedView} cameraSettings={cameraSettings} key={modelKey} />
                                <ScreenshotCapture screenshotTrigger={screenshotTrigger} setScreenshotTrigger={setScreenshotTrigger} />
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
    );
};