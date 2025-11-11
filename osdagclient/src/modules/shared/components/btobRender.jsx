import { OrbitControls, useTexture } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import AxisHelperWidget from "../utils/AxisHelperWidget";

function Model({ modelPaths, selectedView, selectedViews = null, cameraSettings, hoverDict = {}, onHoverLabel, onHoverEnd }) {
  const [parsedModels, setParsedModels] = useState(null);
  const [hoveredMeshId, setHoveredMeshId] = useState(null);
  const texture = useTexture("/texture.png");
  texture.needsUpdate = true;

  // Get model position, scale, orthographic view, and connectivity from camera settings
  const GRID_VIEWS = [
    "XY", "YZ", "ZX", "ANGLE1", "ANGLE2", "ANGLE3", "ANGLE4", "ANGLE5", "ANGLE6"
  ];
  // Use selectedViews array if provided, otherwise use selectedView as single item
  const activeViews = selectedViews && Array.isArray(selectedViews) ? selectedViews : [selectedView];
  const primaryView = activeViews[0] || selectedView;
  const useGridCenteredPosition = GRID_VIEWS.includes(primaryView);
  const modelPosition = useGridCenteredPosition ? [0, 0, 0] : (cameraSettings?.modelPosition || [0, -4, 0]);
  const modelScale = cameraSettings?.modelScale || 0.008;
  const orthographicView = cameraSettings?.orthographicView || null;
  const connectivity = cameraSettings?.connectivity || null;

  // Check if we're in the specific FinPlate Column Web-Beam-Web case
  const isColumnWebBeamWeb = connectivity === "Column Web-Beam-Web";

  // Helper function to check if a part should be shown based on selected views
  const shouldShowPart = (partName) => {
    // If Model is selected, show all parts
    if (activeViews.includes("Model")) {
      return true;
    }
    // Map view names to part names
    const viewToPartMap = {
      "Beam": ["Beam"],
      "Column": ["Column"],
      "Plate": ["Plate"],
      "Connector": ["Connector", "cleatAngle", "SeatedAngle", "EndPlate"],
      "CleatAngle": ["cleatAngle"],
      "SeatedAngle": ["SeatedAngle"],
      "EndPlate": ["EndPlate"],
      "Member": ["Member"],
    };
    
    // Check if any selected view maps to this part
    for (const view of activeViews) {
      const mappedParts = viewToPartMap[view] || [];
      if (mappedParts.includes(partName) || mappedParts.some(p => partName.toLowerCase().includes(p.toLowerCase()))) {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    if (!modelPaths) return;
    try {
      const stlLoader = new STLLoader();
      const parsedData = {};
      const partsGroup = new THREE.Group();
      const partKeys = new Set([
        "Member",
        "Endplate",
        "Beam",
        "Column",
        "Plate",
        "Weld",
        "Welds",
        "Bolt",
        "Bolts",
        "cleatAngle",
        "SeatedAngle",
        "Connector"
      ]);

      Object.entries(modelPaths).forEach(([key, dataUrl]) => {
        try {
          if (typeof dataUrl === 'string' && dataUrl.startsWith('data:application/octet-stream;base64,')) {
            const base64 = dataUrl.split(',')[1];
            const binary = atob(base64);
            const arrayBuffer = new ArrayBuffer(binary.length);
            const bytes = new Uint8Array(arrayBuffer);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

            const geometry = stlLoader.parse(arrayBuffer);
            const colorMap = {
              // requested colors
              beam: '#868664',
              column: '#484836',
              plate: '#2f2f23',
              weld_left: '#ff0000',
              weld_right: '#ff0000',
              // map to canonical keys used by sections
              Member: '#808080',
              Endplate: '#2f2f23',
              Beam: '#868664',
              Column: '#484836',
              Plate: '#2f2f23',
              Weld: '#ff0000',
              Welds: '#ff0000',
              // fallbacks/others
              Bolt: '#996633',
              Bolts: '#996633',
              cleatAngle: '#2f2f23',
              Model: '#999999',
              seatedAngle: '#2f2f23',
            };
            const material = new THREE.MeshStandardMaterial({
              color: colorMap[key] ?? colorMap[key?.toLowerCase?.()] ?? '#888888',
              metalness: 0.3,
              roughness: 0.5,
              side: THREE.DoubleSide,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = key;
            // Attach hover label metadata
            mesh.userData.hoverLabel = hoverDict?.[key] || hoverDict?.[key?.toLowerCase?.()] || key;
            parsedData[key] = mesh;

            // Accumulate per-part meshes into a single group (exclude merged Model)
            if (partKeys.has(key)) {
              partsGroup.add(mesh);
            }
          } else if (typeof dataUrl === 'string' && dataUrl.includes('v ')) {
            // Fallback: legacy OBJ text
            const objLoader = new OBJLoader();
            parsedData[key] = objLoader.parse(dataUrl);
          }
        } catch (e) {
          console.warn(`[btobRender] Failed to load section ${key}:`, e);
        }
      });

      // If we have a merged Model and also per-part meshes, show parts in place of Model
      if (parsedData.Model && partsGroup.children.length > 0) {
        // Prefer per-part colored group for Model view
        parsedData.Model = partsGroup;
      } else if (!parsedData.Model && partsGroup.children.length > 0) {
        // If no merged Model exists, still expose parts under Model key for existing render paths
        parsedData.Model = partsGroup;
      }

      setParsedModels(parsedData);
    } catch (error) {
      console.error('Error parsing model data:', error);
    }
  }, [modelPaths]);

  const getGeometry = (obj) => {
    let g;
    obj.traverse((c) => {
      if (c.type === "Mesh") {
        // Debug: log each mesh encountered in traversal
        try {
        } catch (e) { }
        c.material.map = texture;
        c.material.needsUpdate = true;
        g = c.geometry;
      }
    });
    if (!g) console.warn("No geometry found in object:", obj);
    return g;
  };

  // Extract all meshes under an object; used for Model where we want per-part colors
  const getMeshes = (obj) => {
    const meshes = [];
    if (!obj) return meshes;
    obj.traverse((c) => {
      if (c.type === "Mesh" && c.geometry) {
        const label = c.userData?.hoverLabel || c.name || "";
        meshes.push({ name: c.name || "", geometry: c.geometry, hoverLabel: label });
      }
    });
    if (meshes.length === 0) console.warn("No meshes found in object:", obj);
    return meshes;
  };

  // All geometry definitions
  const geometryModel = useMemo(
    () => (parsedModels?.Model ? getGeometry(parsedModels.Model) : null),
    [parsedModels, texture]
  );
  const modelMeshes = useMemo(
    () => (parsedModels?.Model ? getMeshes(parsedModels.Model) : []),
    [parsedModels]
  );
  // Part color map (dark mode hex values provided)
  const partColors = useMemo(() => ({
    Member: '#808080',
    Endplate: '#2f2f23',
    Beam: "#868664",
    Column: "#484836",
    Plate: "#2f2f23",
    Weld: "#ff0000",
    weld_left: "#ff0000",
    weld_right: "#ff0000",
  }), []);
  const geometryBeam = useMemo(
    () => (parsedModels?.Beam ? getGeometry(parsedModels.Beam) : null),
    [parsedModels, texture]
  );
  const geometryColumn = useMemo(
    () => (parsedModels?.Column ? getGeometry(parsedModels.Column) : null),
    [parsedModels, texture]
  );
  const geometryPlate = useMemo(
    () => (parsedModels?.Plate ? getGeometry(parsedModels.Plate) : null),
    [parsedModels, texture]
  );
  const geometryConnector = useMemo(
    () =>
      parsedModels?.Connector ? getGeometry(parsedModels.Connector) : null,
    [parsedModels, texture]
  );

  const geometryCleatAngle = useMemo(
    () => (parsedModels?.cleatAngle ? getGeometry(parsedModels.cleatAngle) : null),
    [parsedModels, texture]
  );

  // Tension Member specific geometries
  const geometryMember = useMemo(
    () => (parsedModels?.Member ? getGeometry(parsedModels.Member) : null),
    [parsedModels, texture]
  );
  const geometryEndplate = useMemo(
    () => (parsedModels?.Endplate ? getGeometry(parsedModels.Endplate) : null),
    [parsedModels, texture]
  );
  const geometrySeatedAngle = useMemo(
    () => (parsedModels?.SeatedAngle ? getGeometry(parsedModels.SeatedAngle) : null),
    [parsedModels, texture]
  );

  if (!parsedModels) {
    return null;
  }

  return (
    <group name="scene">
      {/* Lighting to ensure visibility */}
      <ambientLight intensity={2.0} />
      <directionalLight position={[5, 5, 5]} intensity={2.0} />
      <directionalLight position={[-5, -5, -5]} intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <pointLight position={[-10, -10, -10]} intensity={1.5} />
      <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={1.0} />
      <AxisHelperWidget orthographicView={orthographicView} />

      {/* Model Section - render each subpart with its own color (used for Model view or multi-select) */}
      {((activeViews.includes("Model") || GRID_VIEWS.includes(primaryView) || activeViews.length > 1) && modelMeshes.length > 0) && (
        <>
          {modelMeshes.map((m, idx) => {
            const name = m.name || "";
            const lower = name.toLowerCase();
            // Filter: only show parts that match selected views
            if (!shouldShowPart(name)) {
              return null;
            }
            let color = partColors[name] || partColors[lower] || "#6b7280";
            if (!partColors[name] && !partColors[lower] && lower.startsWith("weld")) {
              color = partColors.Weld;
            }
            const meshId = `${name}-${idx}`;
            const isHovered = hoveredMeshId === meshId;
            return (
              <group key={meshId}>
                <mesh
                  geometry={m.geometry}
                  scale={modelScale}
                  rotation={isColumnWebBeamWeb ? [0, Math.PI / -2, 0] : [Math.PI / -2, 0, 0]}
                  position={modelPosition}
                  userData={{ hoverLabel: m.hoverLabel || (hoverDict?.[name] || hoverDict?.[lower]) || name }}
                  onPointerMove={(e) => {
                    const label = e.object?.userData?.hoverLabel || name;
                    const nx = e?.nativeEvent?.clientX;
                    const ny = e?.nativeEvent?.clientY;
                    if (onHoverLabel && typeof onHoverLabel === 'function') {
                      onHoverLabel(label, nx, ny);
                    }
                    if (hoveredMeshId !== meshId) {
                      setHoveredMeshId(meshId);
                    }
                  }}
                  onPointerOut={() => {
                    if (onHoverEnd && typeof onHoverEnd === 'function') {
                      onHoverEnd();
                    }
                    setHoveredMeshId(null);
                  }}
                >
                  <meshPhysicalMaterial
                    attach="material"
                    color={color}
                    metalness={0.3}
                    roughness={0.4}
                    opacity={1.0}
                    transparent={false}
                    clearcoat={0.8}
                    clearcoatRoughness={0.2}
                    emissive={isHovered ? "#8cc480" : undefined}
                    emissiveIntensity={isHovered ? 0.2 : 0}
                    depthWrite={!isHovered}
                  />
                </mesh>
                <primitive
                  object={
                    new THREE.LineSegments(
                      new THREE.EdgesGeometry(m.geometry, 15),
                      new THREE.LineBasicMaterial({ color: isHovered ? "#9fda90" : "black", linewidth: isHovered ? 2 : 1 })
                    )
                  }
                  scale={modelScale}
                  rotation={isColumnWebBeamWeb ? [0, Math.PI / -2, 0] : [Math.PI / -2, 0, 0]}
                  position={modelPosition}
                />
              </group>
            );
          })}
        </>
      )}

      {/* Beam Section - only show if single selection (not multi-select) */}
      {activeViews.includes("Beam") && !activeViews.includes("Model") && activeViews.length === 1 && geometryBeam && (
        <>
          <mesh
            geometry={geometryBeam}
            scale={modelScale}
            position={modelPosition}
            rotation={[Math.PI / -2, 0, 0]}
          >
            <meshPhysicalMaterial
              color={partColors.Beam}
              attach="material"
              metalness={0.25}
              roughness={0.3}
              opacity={1.0}
              transparent={true}
              transmission={0.008}
              clearcoat={1.0}
              clearcoatRoughness={0.25}
            />
          </mesh>
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometryBeam, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={modelScale}
            rotation={[Math.PI / -2, 0, 0]}
            position={modelPosition}
          />
        </>
      )}

      {/* Column Section - only show if single selection (not multi-select) */}
      {activeViews.includes("Column") && !activeViews.includes("Model") && activeViews.length === 1 && geometryColumn && (
        <>
          <mesh
            geometry={geometryColumn}
            scale={modelScale}
            position={modelPosition}
            rotation={isColumnWebBeamWeb ? [0, Math.PI / -2, 0] : [Math.PI / -2, 0, 0]}
          >
            <meshPhysicalMaterial
              color={partColors.Column}
              attach="material"
              metalness={0.25}
              roughness={0.3}
              opacity={1.0}
              transparent={true}
              transmission={0.008}
              clearcoat={1.0}
              clearcoatRoughness={0.25}
            />
          </mesh>
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometryColumn, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={modelScale}
            rotation={isColumnWebBeamWeb ? [0, Math.PI / -2, 0] : [Math.PI / -2, 0, 0]}
            position={modelPosition}
          />
        </>
      )}

      {/* Plate Section - only show if single selection (not multi-select) */}
      {activeViews.includes("Plate") && !activeViews.includes("Model") && activeViews.length === 1 && geometryPlate && (
        <>
          <mesh
            geometry={geometryPlate}
            scale={modelScale}
            position={modelPosition}
            rotation={[Math.PI / -2, 0, 0]}
          >
            <meshPhysicalMaterial
              attach="material"
              color={partColors.Plate}
              metalness={0.3}
              roughness={0.4}
              opacity={1.0}
              transparent={false}
              clearcoat={0.8}
              clearcoatRoughness={0.2}
            />
          </mesh>
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometryPlate, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={modelScale}
            rotation={[Math.PI / -2, 0, 0]}
            position={modelPosition}
          />
        </>
      )}

      {/* FIXED: CleatAngle Section - only show if single selection (not multi-select) */}
      {activeViews.includes("CleatAngle") && !activeViews.includes("Model") && activeViews.length === 1 && geometryCleatAngle && (
        <>
          <mesh
            geometry={geometryCleatAngle}
            scale={modelScale}
            position={[modelPosition[0], modelPosition[1], modelPosition[2] + 1]} // Slightly offset
            rotation={[Math.PI / -2, 0, 0]}
          >
            <meshPhysicalMaterial
              attach="material"
              color="#2E5A87"
              metalness={0.3}
              roughness={0.4}
              opacity={1.0}
              transparent={false}
              clearcoat={0.8}
              clearcoatRoughness={0.2}
            />
          </mesh>
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometryCleatAngle, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={modelScale}
            rotation={[Math.PI / -2, 0, 0]}
            position={[modelPosition[0], modelPosition[1], modelPosition[2] + 1]}
          />
        </>
      )}

      {/* FIXED: SeatedAngle Section - only show if single selection (not multi-select) */}
      {activeViews.includes("SeatedAngle") && !activeViews.includes("Model") && activeViews.length === 1 && geometrySeatedAngle && (
        <>
          <mesh
            geometry={geometrySeatedAngle}
            scale={modelScale}
            position={[modelPosition[0], modelPosition[1], modelPosition[2] + 1]} // Slightly offset
            rotation={[Math.PI / -2, 0, 0]}
          >
            <meshPhysicalMaterial
              attach="material"
              color="#2E5A87"
              metalness={0.3}
              roughness={0.4}
              opacity={1.0}
              transparent={false}
              clearcoat={0.8}
              clearcoatRoughness={0.2}
            />
          </mesh>
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometrySeatedAngle, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={modelScale}
            rotation={[Math.PI / -2, 0, 0]}
            position={[modelPosition[0], modelPosition[1], modelPosition[2] + 1]}
          />
        </>
      )}
      {/* Connector Section - only show if single selection (not multi-select) */}
      {activeViews.includes("Connector") && !activeViews.includes("Model") && activeViews.length === 1 && geometryConnector && (
        <>
          <mesh
            geometry={geometryConnector}
            scale={modelScale}
            position={[modelPosition[0], modelPosition[1], modelPosition[2] + 1]} // Slightly offset
            rotation={[Math.PI / -2, 0, 0]}
          >
            <meshPhysicalMaterial
              attach="material"
              color="#2E5A87"
              metalness={0.3}
              roughness={0.4}
              opacity={1.0}
              transparent={false}
              clearcoat={0.8}
              clearcoatRoughness={0.2}
            />
          </mesh>
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometryConnector, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={modelScale}
            rotation={[Math.PI / -2, 0, 0]}
            position={[modelPosition[0], modelPosition[1], modelPosition[2] + 1]}
          />
        </>
      )}

      {/* Member Section - only show if single selection (not multi-select) */}
      {activeViews.includes("Member") && !activeViews.includes("Model") && activeViews.length === 1 && geometryMember && (
        <>
          <mesh
            geometry={geometryMember}
            scale={0.008}
            position={[0, 0, 4]}
            rotation={[Math.PI / -2, 0, 0]}
          >
            <meshPhysicalMaterial
              color="#808080"
              attach="material"
              metalness={0.25}
              roughness={0.3}
              opacity={1.0}
              transparent={true}
              transmission={0.008}
              clearcoat={1.0}
              clearcoatRoughness={0.25}
            />
          </mesh>
          {/* Member outline */}
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometryMember, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={0.008}
            rotation={[Math.PI / -2, 0, 0]}
            position={[0, 0, 4]}
          />
        </>
      )}

      {/* EndPlate Section - only show if single selection (not multi-select) */}
      {(activeViews.includes("EndPlate") || activeViews.includes("Endplate")) && !activeViews.includes("Model") && activeViews.length === 1 && geometryEndplate && (
        <>
          <mesh
            geometry={geometryEndplate}
            scale={0.008}
            position={[0, 0, 4]}
            rotation={[Math.PI / -2, 0, 0]}
          >
            <meshPhysicalMaterial
              attach="material"
              map={texture}
              metalness={0.25}
              roughness={0.1}
              opacity={1.0}
              transparent={true}
              transmission={0.99}
              clearcoat={1.0}
              clearcoatRoughness={0.25}
            />
          </mesh>
          {/* Endplate outline */}
          <primitive
            object={
              new THREE.LineSegments(
                new THREE.EdgesGeometry(geometryEndplate, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={0.008}
            rotation={[Math.PI / -2, 0, 0]}
            position={[0, 0, 4]}
          />
        </>
      )}

      {/* Controls */}
      <OrbitControls enableDamping={false} target={[0, 0, 0]} />
    </group>
  );
}

export default Model;