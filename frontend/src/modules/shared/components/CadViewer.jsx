import React, { useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, PerspectiveCamera } from "@react-three/drei";
import { CadScene, CadSceneProvider, CadSceneBbox, ScreenshotCapture, ReportCaptureDev } from "./cad";

export const CadViewer = React.memo(({
  isMobile,
  showCad,
  showLogs,
  loading,
  isRedesigning,
  renderBoolean,
  customBgColor,
  cameraPos,
  normalizedCadModelPaths,
  selectedSection,
  modelKey,
  cameraSettings,
  getConnectivity,
  hoverDict,
  handleHoverLabel,
  handleHoverEnd,
  moduleConfig,
  selectedCameraView,
  screenshotTrigger,
  setScreenshotTrigger
}) => {
  const cameraRef = useRef();

  if (isMobile && !showCad) return null;

  return (
    <div className={`
      model-container relative
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
          className={`cadModel relative h-full w-full ${!customBgColor ? 'bg-gradient-to-b from-[#FFFFFF] to-[#D8D8D0] dark:from-[#535353] dark:to-[#000000]' : ''}`}
          style={customBgColor ? { backgroundColor: customBgColor } : {}}
        >
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
                    connectivity: getConnectivity(),
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
                className="h-8 w-8 rounded-lg border border-white/35 bg-[rgba(32,32,32,0.78)] text-[20px] font-semibold leading-none text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] hover:bg-[rgba(50,50,50,0.8)] transition-colors"
                onClick={() => document.dispatchEvent(new CustomEvent("cad-camera-action", { detail: action }))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="modelback h-full w-full"></div>
      )}
    </div>
  );
});
