import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import AxisHelperWidget from "../utils/AxisHelperWidget";
import { getPartColor, getRenderOrder } from "./3d/config/cadConfig";
import { createViewMapper } from "./3d/config/viewMappings";
import { SceneManager } from "./3d/SceneManager";

function Model({ 
  modelPaths, 
  selectedView, 
  selectedViews = null, 
  cameraSettings, 
  hoverDict = {}, 
  onHoverLabel, 
  onHoverEnd, 
  moduleCadConfig = null 
}) {
  
  const GRID_VIEWS = [
    "XY", "YZ", "ZX", "ANGLE1", "ANGLE2", "ANGLE3", "ANGLE4", "ANGLE5", "ANGLE6"
  ];

  // 1. Prepare View Logic
  const activeViews = selectedViews && Array.isArray(selectedViews) ? selectedViews : [selectedView];
  const primaryView = activeViews[0] || selectedView;
  
  // 2. Prepare Position Logic
  const useGridCenteredPosition = GRID_VIEWS.includes(primaryView);
  const modelPosition = useGridCenteredPosition ? [0, 0, 0] : (cameraSettings?.modelPosition || [0, -4, 0]);
  const modelScale = cameraSettings?.modelScale || 0.008;
  const orthographicView = cameraSettings?.orthographicView || null;
  const connectivity = cameraSettings?.connectivity || null;
  const isColumnWebBeamWeb = connectivity === "Column Web-Beam-Web";

  // 3. Helpers (Memoized to prevent reload loops)
  const shouldShowPart = useMemo(() => {
    const mapper = createViewMapper(moduleCadConfig);
    // SceneManager uses this to decide what to render
    return (partName) => mapper(partName, activeViews);
  }, [moduleCadConfig, activeViews]);

  const getPartRenderOrder = useMemo(() => {
    return (partName) => getRenderOrder(partName, moduleCadConfig);
  }, [moduleCadConfig]);

  const getColorForPart = useMemo(() => {
    return (partName) => getPartColor(partName, moduleCadConfig);
  }, [moduleCadConfig]);

  return (
    <group name="scene">
      {/* Lighting */}
      <ambientLight intensity={2.0} />
      <directionalLight position={[5, 5, 5]} intensity={2.0} />
      <directionalLight position={[-5, -5, -5]} intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <pointLight position={[-10, -10, -10]} intensity={1.5} />
      <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={1.0} />
      
      <AxisHelperWidget orthographicView={orthographicView} />

      {/* Single Source of Truth: 
        SceneManager handles ALL rendering (Model view AND Individual views).
        It uses 'shouldShowPart' to filter what is visible.
      */}
      <SceneManager
        modelPaths={modelPaths}
        activeViews={activeViews}
        modelPosition={modelPosition}
        modelScale={modelScale}
        modelRotation={[Math.PI / -2, 0, 0]}
        orthographicView={orthographicView}
        hoverDict={hoverDict}
        onHoverLabel={onHoverLabel}
        onHoverEnd={onHoverEnd}
        moduleCadConfig={moduleCadConfig}
        shouldShowPart={shouldShowPart}
        getPartRenderOrder={getPartRenderOrder}
        getColorForPart={getColorForPart}
        isColumnWebBeamWeb={isColumnWebBeamWeb}
        GRID_VIEWS={GRID_VIEWS}
        primaryView={primaryView}
      />

      <OrbitControls enableDamping={false} target={[0, 0, 0]} />
    </group>
  );
}

export default Model;