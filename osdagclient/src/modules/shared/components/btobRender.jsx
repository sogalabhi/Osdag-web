import { OrbitControls, useTexture } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import AxisHelperWidget from "../utils/AxisHelperWidget";

function Model({ modelPaths, selectedView, cameraSettings }) {
  const [parsedModels, setParsedModels] = useState(null);
  const texture = useTexture("/texture.png");
  texture.needsUpdate = true;

  // Get model position, scale, orthographic view, and connectivity from camera settings
  const modelPosition = cameraSettings?.modelPosition || [0, -4, 0];
  const modelScale = cameraSettings?.modelScale || 0.008;
  const orthographicView = cameraSettings?.orthographicView || null;
  const connectivity = cameraSettings?.connectivity || null;

  // Check if we're in the specific FinPlate Column Web-Beam-Web case
  const isColumnWebBeamWeb = connectivity === "Column Web-Beam-Web";

  useEffect(() => {
    if (modelPaths) {
      try {
        const loader = new OBJLoader();
        const parsedData = Object.fromEntries(
          Object.entries(modelPaths).map(([key, objData]) => {
            return [key, loader.parse(objData)];
          })
        );

        setParsedModels(parsedData);
      } catch (error) {
        console.error("Error parsing .obj data:", error);
      }
    }
  }, [modelPaths]);

  const getGeometry = (obj) => {
    let g;
    obj.traverse((c) => {
      if (c.type === "Mesh") {
        c.material.map = texture;
        c.material.needsUpdate = true;
        g = c.geometry;
      }
    });
    if (!g) console.warn("No geometry found in object:", obj);
    return g;
  };

  // All geometry definitions
  const geometryModel = useMemo(
    () => (parsedModels?.Model ? getGeometry(parsedModels.Model) : null),
    [parsedModels, texture]
  );
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

  // Tension Member specific geometries
  const geometryMember = useMemo(
    () => (parsedModels?.Member ? getGeometry(parsedModels.Member) : null),
    [parsedModels, texture]
  );
  const geometryEndplate = useMemo(
    () => (parsedModels?.EndPlate ? getGeometry(parsedModels.EndPlate) : null),
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
      <primitive object={new THREE.AxesHelper(5)} />

      {/* Model Section - Blue Solid Material */}
      {selectedView === "Model" && geometryModel && (
        <>
          <mesh
            geometry={geometryModel}
            scale={modelScale}
            rotation={isColumnWebBeamWeb ? [0, Math.PI / -2, 0] : [Math.PI / -2, 0, 0]}
            position={modelPosition}
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
                new THREE.EdgesGeometry(geometryModel, 15),
                new THREE.LineBasicMaterial({ color: "black" })
              )
            }
            scale={modelScale}
            rotation={isColumnWebBeamWeb ? [0, Math.PI / -2, 0] : [Math.PI / -2, 0, 0]}
            position={modelPosition}
          />
        </>
      )}

      {/* Beam Section - Keep existing material */}
      {selectedView === "Beam" && geometryBeam && (
        <>
          <mesh
            geometry={geometryBeam}
            scale={modelScale}
            position={modelPosition}
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

      {/* Column Section - Keep existing material */}
      {selectedView === "Column" && geometryColumn && (
        <>
          <mesh
            geometry={geometryColumn}
            scale={modelScale}
            position={modelPosition}
            rotation={isColumnWebBeamWeb ? [0, Math.PI / -2, 0] : [Math.PI / -2, 0, 0]}
          >
            <meshPhysicalMaterial
              color="#594100"
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

      {/* Plate Section - Blue Solid Material */}
      {selectedView === "Plate" && geometryPlate && (
        <>
          <mesh
            geometry={geometryPlate}
            scale={modelScale}
            position={modelPosition}
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

      {/* Connector Section - Blue Solid Material */}
      {selectedView === "Connector" && geometryConnector && (
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

      {/* Member Section - For Tension Members */}
      {selectedView === "Member" && geometryMember && (
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

      {/* EndPlate Section - For Beam-Beam End Plate and Tension Members */}
      {(selectedView === "EndPlate" || selectedView === "Endplate") && geometryEndplate && (
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
