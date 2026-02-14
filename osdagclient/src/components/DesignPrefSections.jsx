import React, { useState, useContext } from "react";
import { ModuleContext } from "../context/ModuleState";
import ColumnSectionModal from "./ColumnSectionModal";
import BeamSectionModal from "./BeamSectionModal";
import ConnectorSectionModal from "./ConnectorSectionModal";
import BoltSectionModal from "./BoltSectionModal";
import WeldSectionModal from "./WeldSectionModal";
import DetailingSectionModal from "./DetailingSectionModal";
import DesignSectionModal from "./DesignSectionModal";
import { Button, Modal } from "antd";
import { MODULE_KEY_FIN_PLATE, MODULE_DISPLAY_FIN_PLATE } from '../constants/DesignKeys';

const DesignPrefSections = ({
  module = MODULE_KEY_FIN_PLATE, // default to fin plate
  inputs,
  setInputs,
  selectedOption = null, // Default to null
  setDesignPrefModalStatus,
  setConfirmationModal,
  confirmationModal,
  isInputLocked
}) => {
  // Simple connection module names
  const SIMPLE_CONNECTION_MODULES = [
    "Butt Joint Bolted",
    "Butt Joint Welded", 
    "Lap Joint Bolted",
    "Lap Joint Welded"
  ];

  const [activeTab, setActiveTab] = useState(() => {
    if (SIMPLE_CONNECTION_MODULES.includes(module)) {
      // For simple connections, start with first available tab (Bolt/Weld = id 3/4, Detailing = 5, Design = 6)
      if (module === "Butt Joint Bolted" || module === "Lap Joint Bolted") {
        return 3; // Start with Bolt tab
      } else {
        return 4; // Start with Weld tab
      }
    }
    return module === "Cover Plate Bolted Connection" || module === "Beam Beam End Plate Connection" ? 1 : 0;
  });
  const { designPrefData, design_pref_defaults } = useContext(ModuleContext);

  // Tabs configuration per module
  let tabs = [
    { name: "Column Section*", id: 0 },
    { name: "Beam Section*", id: 1 },
    { name: "Connector", id: 2 },
    { name: "Bolt", id: 3 },
    { name: "Weld", id: 4 },
    { name: "Detailing", id: 5 },
    { name: "Design", id: 6 },
  ];

  // Simple connection tab filtering
  if (SIMPLE_CONNECTION_MODULES.includes(module)) {
    // For bolted simple connections: Bolt, Detailing, Design
    if (module === "Butt Joint Bolted" || module === "Lap Joint Bolted") {
      tabs = tabs.filter(
        (tab) => tab.name !== "Column Section*" && 
                 tab.name !== "Beam Section*" && 
                 tab.name !== "Connector" && 
                 tab.name !== "Weld"
      );
    }
    // For welded simple connections: Weld, Detailing, Design
    else if (module === "Butt Joint Welded" || module === "Lap Joint Welded") {
      tabs = tabs.filter(
        (tab) => tab.name !== "Column Section*" && 
                 tab.name !== "Beam Section*" && 
                 tab.name !== "Connector" && 
                 tab.name !== "Bolt"
      );
    }
  }

  if (module === "Cover Plate Bolted Connection") {
    tabs = tabs.filter(
      (tab) => tab.name !== "Column Section*" && tab.name !== "Weld"
    );
  }

  if (module === "Beam Beam End Plate Connection") {
    tabs = tabs.filter(
      (tab) => tab.name !== "Column Section*"
    );
  }

  const [designPrefInputs, setDesignPrefInputs] = useState(() => {
    // Simple connection modules
    if (module === "Butt Joint Bolted" || module === "Lap Joint Bolted") {
      return {
        bolt_tension_type: inputs.bolt_tension_type || "Non Pre-tensioned",
        bolt_hole_type: inputs.bolt_hole_type || "Standard",
        bolt_slip_factor: inputs.bolt_slip_factor || "0.3",
        detailing_edge_type: inputs.detailing_edge_type || "Sheared or hand flame cut",
        design_for: inputs.design_for || "Tension",
      };
    }
    else if (module === "Butt Joint Welded" || module === "Lap Joint Welded") {
      return {
        weld_fab: inputs.weld_fab || "Shop weld",  // Note: Osdag uses "Shop weld" not "Shop Weld"
        weld_material_grade: inputs.weld_material_grade || "",
        detailing_edge_type: inputs.detailing_edge_type || "Sheared or hand flame cut",
        detailing_packing_plate: inputs.detailing_packing_plate || (module === "Butt Joint Welded" ? "No" : undefined),
        design_for: inputs.design_for || "Tension",
      };
    }
    else if (module === "Cover Plate Bolted Connection") {
      return {
        supported_material: inputs.member_material,
        connector_material: inputs.connector_material,
        bolt_tension_type: inputs.bolt_tension_type,
        bolt_hole_type: inputs.bolt_hole_type,
        bolt_slip_factor: inputs.bolt_slip_factor,
        detailing_edge_type: inputs.detailing_edge_type,
        detailing_gap: inputs.detailing_gap,
        detailing_corr_status: inputs.detailing_corr_status,
        design_method: inputs.design_method,
      };
    }
    else if(module === "Beam Beam End Plate Connection") {
      return {
        supported_material: inputs.supported_material,
        connector_material: inputs.connector_material,
        bolt_tension_type: inputs.bolt_tension_type,
        bolt_hole_type: inputs.bolt_hole_type,
        bolt_slip_factor: inputs.bolt_slip_factor,
        weld_fab: inputs.weld_fab,
        weld_material_grade: inputs.weld_material_grade,
        detailing_edge_type: inputs.detailing_edge_type,
        detailing_gap: inputs.detailing_gap,
        detailing_corr_status: inputs.detailing_corr_status,
        design_method: inputs.design_method,
      }
    }
    else {
      return {
        supported_material: inputs.supported_material,
        supporting_material: inputs.supporting_material,
        connector_material: inputs.connector_material,
        bolt_tension_type: inputs.bolt_tension_type,
        bolt_hole_type: inputs.bolt_hole_type,
        bolt_slip_factor: inputs.bolt_slip_factor,
        weld_fab: inputs.weld_fab,
        weld_material_grade: inputs.weld_material_grade,
        detailing_edge_type: inputs.detailing_edge_type,
        detailing_gap: inputs.detailing_gap,
        detailing_corr_status: inputs.detailing_corr_status,
        design_method: inputs.design_method,
        design_for: inputs.design_for,
      };
    }
  });

  const saveCoreInputs = () => {
    setInputs({ ...inputs, ...designPrefInputs });
    setDesignPrefModalStatus(false);
    setConfirmationModal(false);
  };

  const resetInputs = () => {
    setDesignPrefInputs(design_pref_defaults);
    setInputs({ ...inputs, ...design_pref_defaults });
    setConfirmationModal(false);
    setDesignPrefModalStatus(false);
  };

  return (
    <div>
      <div className="bloc-tabs" style={{ marginTop: "10px" }}>
        {tabs.map((item) => {
          return (
            <button
              key={item.id}
              className={
                activeTab == item.id
                  ? "tab-btn tabs-design-pref active-tabs"
                  : "tab-btn tabs-design-pref"
              }
              onClick={() => setActiveTab(item.id)}
            >
              {selectedOption === "Beam-Beam" &&
              (item.name === "Column Section*" || item.name == "Beam Section*")
                ? item.name === "Column Section*"
                  ? "Primary Beam*"
                  : "Secondary Beam*"
                : item.name}
            </button>
          );
        })}
      </div>
      <div className="design-pref-cont">
        {activeTab == 0 && tabs[0].name === "Column Section*" && (
          <ColumnSectionModal
            inputs={inputs}
            setInputs={setInputs}
            designPrefInputs={designPrefInputs}
            setDesignPrefInputs={setDesignPrefInputs}
            supportingSectionData={
              (designPrefData?.supporting_section_results?.length ?? 0) > 0
                ? designPrefData.supporting_section_results[0]
                : designPrefData?.supporting_section_results ?? []
            }
            isInputLocked={isInputLocked}
          />
        )}
        {activeTab == 1 && (
          // <h2>Beam Section</h2>
          <BeamSectionModal
            inputs={inputs}
            setInputs={setInputs}
            designPrefInputs={designPrefInputs}
            setDesignPrefInputs={setDesignPrefInputs}
            supportedSectionData={
              (designPrefData?.supported_section_results?.length ?? 0) > 0
                ? designPrefData.supported_section_results[0]
                : designPrefData?.supported_section_results ?? []
            }
            isInputLocked={isInputLocked}
          />
        )}
        {activeTab == 2 && (
          <ConnectorSectionModal
            inputs={inputs}
            setInputs={setInputs}
            designPrefInputs={designPrefInputs}
            setDesignPrefInputs={setDesignPrefInputs}
            isInputLocked={isInputLocked}
          />
        )}
        {activeTab == 3 && (
          <BoltSectionModal
            module={module}
            inputs={inputs}
            setInputs={setInputs}
            designPrefInputs={designPrefInputs}
            setDesignPrefInputs={setDesignPrefInputs}
            isInputLocked={isInputLocked}
          />
        )}
        {activeTab == 4 && tabs.find(t => t.name === "Weld") && (
          <WeldSectionModal
            module={module}
            inputs={inputs}
            setInputs={setInputs}
            designPrefInputs={designPrefInputs}
            setDesignPrefInputs={setDesignPrefInputs}
            isInputLocked={isInputLocked}
          />
        )}
        {activeTab == 5 && (
          <DetailingSectionModal
            module={module}
            inputs={inputs}
            setInputs={setInputs}
            designPrefInputs={designPrefInputs}
            setDesignPrefInputs={setDesignPrefInputs}
            isInputLocked={isInputLocked}
          />
        )}
        {activeTab == 6 && (
          <DesignSectionModal
            module={module}
            inputs={inputs}
            setInputs={setInputs}
            designPrefInputs={designPrefInputs}
            setDesignPrefInputs={setDesignPrefInputs}
            isInputLocked={isInputLocked}
          />
        )}
      </div>

      {/*{ activeTab ==  0 || activeTab ==  1 
        ?  
        <div className='DesignPrefFooter DesignPrefFooter-btn'>
            
            <Button type="button" onClick={() => null}>Add</Button>
            <Button type="button" onClick={() => null}>Clear</Button>  
            <Button type="button" onClick={() => null}>import xlxs file </Button>
            <Button type="button" onClick={() => null}>Download xlxs file </Button>            
        </div> 
        : 
        null 
        }*/}
        
      <div className="subDesignPrefFooter subDesignPrefFooter-btn">
        <Button type="button" onClick={() => setConfirmationModal(true)} disabled={isInputLocked} style={isInputLocked ? { opacity: 0.5, cursor: "not-allowed" } : {}}>
          Default
        </Button>

        <Button type="button" onClick={() => saveCoreInputs()} disabled={isInputLocked} style={isInputLocked ? { opacity: 0.5, cursor: "not-allowed" } : {}}>
          Save and Close
        </Button>
      </div>
      <Modal
        title="Alert!"
        open={confirmationModal}
        onOk={resetInputs}
        onCancel={saveCoreInputs}
        cancelText="Save and Continue"
        okText="Discard Changes"
        closable={false}
        maskClosable={false}
      >
        This action will discard your changes.
      </Modal>
    </div>
  );
};

export default DesignPrefSections;
