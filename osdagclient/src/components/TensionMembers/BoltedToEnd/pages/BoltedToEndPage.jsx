import React, { useState, useEffect } from 'react';
import DockTemplatePage from '../../../core/components/DockTemplatePage';
import InputDockTemplate from '../../../core/components/InputDockTemplate';
import MiddleDockTemplate from '../../../core/components/MiddleDockTemplate';
import OutputDockTemplate from '../../../core/components/OutputDockTemplate';

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
        <MiddleDockTemplate
          imageUrl="http://localhost:5173/src/assets/TensionMember/bolted_to_end.png"
          logs={logs}
        />
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
