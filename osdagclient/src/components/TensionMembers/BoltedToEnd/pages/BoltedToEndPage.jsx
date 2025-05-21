import React, { useState, useEffect, useRef } from 'react';
import DockTemplatePage from '../../../core/components/DockTemplatePage';
import InputDockTemplate from '../../../core/components/InputDockTemplate';
import MiddleDockTemplate from '../../../core/components/MiddleDockTemplate';
import OutputDockTemplate from '../../../core/components/OutputDockTemplate';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { Suspense } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';

const BoltedToEndPage = () => {
  // State for input, output, dropdowns, logs
  const [inputData, setInputData] = useState({});
  const [dropdowns, setDropdowns] = useState({});
  const [fieldGroups, setFieldGroups] = useState([]);
  const [outputFields, setOutputFields] = useState([]);
  const [outputData, setOutputData] = useState({});
  const [logs, setLogs] = useState([]);

  // Simulate API fetch for dropdowns, field definitions, etc.
  useEffect(() => {
    setTimeout(() => {
      setDropdowns({
        sectionProfile: ["Angles", "Star Angles", "Channels"],
        connLocation: ["Web"],
        sectionDesign: ["All", "Single Angle"],
        material: ["E 165 (Fe 2)", "E 250 (Fe 3)"],
        boltDiameter: ["All", "Custom"],
        boltType: ["Bearing Bolt", "Shear Bolt"],
        propertyClass: ["All", "A", "B"],
        plateThickness: ["All", "Custom"]
      });
      setFieldGroups([
        {
          label: 'Connecting Members',
          fields: [
            { name: 'sectionProfile', label: 'Section Profile*', type: 'select' },
            { name: 'connLocation', label: 'Conn_Location*', type: 'select' },
            { name: 'sectionDesign', label: 'Section Design', type: 'select' },
            { name: 'material', label: 'Material *', type: 'select' },
            { name: 'length', label: 'Length (mm) *', type: 'number' },
            { name: 'axialForce', label: 'Factored Loads', type: 'number' },
          ],
        },
        {
          label: 'Bolt',
          fields: [
            { name: 'boltDiameter', label: 'Diameter (mm)', type: 'select' },
            { name: 'boltType', label: 'Type *', type: 'select' },
            { name: 'propertyClass', label: 'Property Class *', type: 'select' },
          ],
        },
        {
          label: 'Plate',
          fields: [
            { name: 'plateThickness', label: 'Thickness (mm)', type: 'select' },
          ],
        },
      ]);
      setOutputFields([
        { label: 'Designation', name: 'designation' },
        { label: 'Tension Yielding Capacity (kN)', name: 'tensionYielding' },
        { label: 'Tension Rupture Capacity (kN)', name: 'tensionRupture' },
        { label: 'Block Shear Capacity (kN)', name: 'blockShear' },
        { label: 'Pattern', name: 'pattern', button: 'Shear Pattern' },
        { label: 'Tension Capacity (kN)', name: 'tensionCapacity' },
        { label: 'Slenderness ratio', name: 'slenderness' },
        { label: 'Utilization Ratio', name: 'utilization' },
        { label: 'End Connection', isHeader: true },
        { label: 'Bolt Details', isHeader: true },
        { label: 'Diameter (mm)', name: 'boltDiameter' },
        { label: 'Property Class', name: 'propertyClass' },
        { label: 'Shear Capacity (kN)', name: 'shearCapacity' },
        { label: 'Bearing Capacity (kN)', name: 'bearingCapacity' },
        { label: 'Long Joint Red.Factor', name: 'longJointRed' },
        { label: 'Large Grip Red.Factor', name: 'largeGripRed' },
        { label: 'Capacity (kN)', name: 'capacity' },
        { label: 'Bolt Force (kN)', name: 'boltForce' },
        { label: 'Spacing', name: 'spacing', button: 'Spacing Details' },
        { label: 'Gusset Plate Details', isHeader: true },
        { label: 'Thickness (mm)', name: 'gussetThickness' },
        { label: 'Min.Height (mm)', name: 'gussetMinHeight' },
        { label: 'Min.Plate Length (mm)', name: 'gussetMinPlateLength' },
        { label: 'Tension Yielding Capacity (kN)', name: 'gussetTensionYielding' },
        { label: 'Tension Rupture Capacity (kN)', name: 'gussetTensionRupture' },
      ]);
      setOutputData({});
    }, 300);
  }, []);

  useEffect(() => {
    const allLogs = [
      {
        timestamp: '2025-05-20 12:47:47',
        level: 'WARNING',
        message: 'The plate length of 100 mm is larger than the member length of 10.0 mm.',
      },
      {
        timestamp: '2025-05-20 12:47:49',
        level: 'INFO',
        message: 'Try a bolt of larger diameter and/or increase the member length.',
      },
      {
        timestamp: '2025-05-20 12:47:51',
        level: 'ERROR',
        message: 'Design is unsafe.',
      },
      {
        timestamp: '2025-05-20 12:47:53',
        level: 'INFO',
        message: '=========End Of design===========',
      },
    ];

    // Optional: simulate slight API delay
    const timeout = setTimeout(() => {
      setLogs(allLogs);
    }, 500); // 500ms delay

    return () => clearTimeout(timeout);
  }, []);

  // Form submit handler
  const handleFormSubmit = (formData) => {
    // Here you would call your API and update outputData, logs, etc.
    setInputData(formData);
    // Simulate output update
    setOutputData({ designation: '---' });
    console.log(formData);
  };

  // Helper: Show morph target names on hover
  function ModelWithMorphTargets() {
    const meshRef = useRef();
    const [hoveredMorph, setHoveredMorph] = useState(null);
    const gltf = useLoader(GLTFLoader, '/src/assets/test.glb');

    function findMeshWithMorphTargets(object) {
      if (object.morphTargetDictionary) return object;
      if (object.children) {
        for (let child of object.children) {
          const found = findMeshWithMorphTargets(child);
          if (found) return found;
        }
      }
      return null;
    }

    const mesh = findMeshWithMorphTargets(gltf.scene);
    const morphNames = mesh?.morphTargetDictionary
      ? Object.keys(mesh.morphTargetDictionary)
      : [];

    // Simulate picking a morph key name to show on hover
    const handlePointerMove = (e) => {
      if (morphNames.length > 0) {
        const offsetX = e.pointerId; // Random logic to vary key (you can replace with custom logic)
        const index = offsetX % morphNames.length;
        setHoveredMorph(morphNames[index]);
      }
    };

    return (
      <group>
        <primitive
          ref={meshRef}
          object={gltf.scene}
          onPointerMove={handlePointerMove}
          onPointerOut={() => setHoveredMorph(null)}
        />
        {hoveredMorph && (
          <Html center>
            <div
              style={{
                background: 'rgba(30,30,30,0.85)',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: 6,
                fontSize: 14,
                pointerEvents: 'none',
              }}
            >
              Morph Target: <b>{hoveredMorph}</b>
            </div>
          </Html>
        )}
      </group>
    );
  }

  return (
    <DockTemplatePage
      InputComponent={
        <InputDockTemplate
          fieldGroups={fieldGroups}
          inputData={inputData}
          setInputData={setInputData}
          dropdowns={dropdowns}
          onSubmit={handleFormSubmit}
        />
      }
      MiddleComponent={
        <>
          <div style={{ width: '100%', height: 500, background: '#222', borderRadius: 8 }}>
            <Canvas camera={{ position: [1, 1, 4], fov: 50 }}>
              <ambientLight intensity={0.7} />
              <Suspense fallback={null}>
                <Stage environment={null} intensity={0.8} adjustCamera={false}>
                  <ModelWithMorphTargets scale={0.3} />
                </Stage>
              </Suspense>
              <OrbitControls enablePan enableZoom enableRotate />
            </Canvas>
          </div>
        </>
      }
      OutputComponent={
        <OutputDockTemplate
          outputFields={outputFields}
          outputData={outputData}
        />
      }
    />
  );
};

export default BoltedToEndPage;
