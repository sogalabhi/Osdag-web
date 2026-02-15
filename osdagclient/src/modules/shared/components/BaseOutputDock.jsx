import React, { useState } from 'react';
import { Input, Modal } from 'antd';
import spacingIMG from "../../../assets/spacing_3.png";
import capacityIMG1 from "../../../assets/L_shear1.png";
import capacityIMG2 from "../../../assets/L.png";
import Stiffener_BWE from "../../../assets/BB_Stiffener_BWE.png";
import Stiffener_FP from "../../../assets/BB_Stiffener_FP.png";
import Stiffener_OWE from "../../../assets/BB_Stiffener_OWE.png";
import Detailing_BWE from "../../../assets/Detailing-BWE.png";
import Detailing_FP from "../../../assets/Detailing-Flush.png";
import Detailing_OWE from "../../../assets/Detailing-OWE.png";
import GrooveImg from "../../../assets/BB-BC-single_bevel_groove.png";
import SpacingDiagram from "./SpacingDiagram";
// Base plate output modals (sketch, detailing, weld, key)
import Moment_BP from "../../../assets/Moment_BP.png";
import Moment_BP_C2 from "../../../assets/Moment_BP_C2.png";
import Moment_BP_C3 from "../../../assets/Moment_BP_C3.png";
import Welded_BP from "../../../assets/Welded_BP.png";
import SHS_BP from "../../../assets/SHS_BP.png";
import RHS_BP from "../../../assets/RHS_BP.png";
import CHS_BP from "../../../assets/CHS_BP.png";
import Moment_BP_Detailing from "../../../assets/Moment_BP_Detailing.png";
import Welded_BP_Detailing from "../../../assets/Welded_BP_Detailing.png";
import SHS_BP_Detailing from "../../../assets/SHS_BP_Detailing.png";
import RHS_BP_Detailing from "../../../assets/RHS_BP_Detailing.png";
import CHS_BP_Detailing from "../../../assets/CHS_BP_Detailing.png";
import Moment_BP_weld_1_1 from "../../../assets/Moment_BP_weld_details_1-1.png";
import Moment_BP_weld_1_2 from "../../../assets/Moment_BP_weld_details_1-2.png";
import Moment_BP_weld_2 from "../../../assets/Moment_BP_weld_details_2.png";
import Welded_BP_single_bevel from "../../../assets/Welded_BP_single_bevel.png";
import Welded_BP_double_J from "../../../assets/Welded_BP_double_J.png";
import SHS_BP_groove_weld from "../../../assets/SHS_BP_groove_weld_details.png";
import SHS_BP_weld from "../../../assets/SHS_BP_weld_details.png";
import RHS_BP_groove_weld from "../../../assets/RHS_BP_groove_weld_details.png";
import RHS_BP_weld from "../../../assets/RHS_BP_weld_details.png";
import CHS_BP_groove_weld from "../../../assets/CHS_BP_groove_weld_details.png";
import CHS_BP_weld from "../../../assets/CHS_BP_weld_details.png";
import BP_welded_weld from "../../../assets/BP_welded_weld_details.png";
import Key_SHS from "../../../assets/Key_SHS.png";
import Key_SHS_D from "../../../assets/Key_SHS_D.png";
import Key_SHS_B from "../../../assets/Key_SHS_B.png";
import Key_RHS from "../../../assets/Key_RHS.png";
import Key_RHS_D from "../../../assets/Key_RHS_D.png";
import Key_RHS_B from "../../../assets/Key_RHS_B.png";
import Key_CHS from "../../../assets/Key_CHS.png";

export const BaseOutputDock = ({
  output,
  outputConfig,
  title = "Output Dock",
  extraState = {},
  handleCreateDesignReport,
  saveOutput,
}) => {
  const normalizedOutput = output && output.data ? output.data : output;

  // Shared state management
  const [activeModals, setActiveModals] = useState({});
  const [activeSections, setActiveSections] = useState({});

  // Shared modal management
  const openModal = (modalType, sectionKey = null) => {
    setActiveModals(prev => ({ ...prev, [modalType]: true }));
    if (sectionKey) {
      setActiveSections(prev => ({ ...prev, [modalType]: sectionKey }));
    }
  };

  const closeModal = (modalType) => {
    setActiveModals(prev => ({ ...prev, [modalType]: false }));
    setActiveSections(prev => ({ ...prev, [modalType]: null }));
  };

  // Shared dialog handler
  const handleDialog = (key) => {
    const modalConfig = outputConfig.modals[key];
    if (modalConfig) {
      openModal(modalConfig.type, key);
    }
  };

  // Read-only value box styled like input (transparent bg, grey border)
  const ValueBox = ({ value }) => (
    <div
      className="w-full px-2 py-1 rounded-md border border-gray-400/60 bg-transparent text-sm text-black dark:text-white leading-6"
      style={{ minHeight: 32 }}
    >
      {value !== undefined && value !== null && value !== '' ? String(value) : ' '}
    </div>
  );

  const getImageForModal = (imageType, selectedOption, basePlateState = {}) => {
    const imageMap = {
      stiffener: {
        "Flushed - Reversible Moment": Stiffener_FP,
        "Extended One Way - Irreversible Moment": Stiffener_OWE,
        "Extended Both Ways - Reversible Moment": Stiffener_BWE,
      },
      detailing: {
        "Flushed - Reversible Moment": Detailing_FP,
        "Extended One Way - Irreversible Moment": Detailing_OWE,
        "Extended Both Ways - Reversible Moment": Detailing_BWE,
      },
      groove: GrooveImg,
      spacing: spacingIMG,
      capacity1: capacityIMG1,
      capacity2: capacityIMG2,
      // Base plate: sketch by connectivity (desktop: moment_bp_case for Moment Base Plate)
      basePlateSketch: {
        "Moment Base Plate": Moment_BP,
        "Welded Column Base": Welded_BP,
        "Hollow/Tubular Column Base": null, // resolved below by section
      },
      basePlateDetailing: {
        "Moment Base Plate": Moment_BP_Detailing,
        "Welded Column Base": Welded_BP_Detailing,
        "Hollow/Tubular Column Base": null,
      },
      weldDetails: {
        "Moment Base Plate": Moment_BP_weld_1_1,
        "Welded Column Base": Welded_BP_single_bevel,
        "Hollow/Tubular Column Base": null,
      },
      keySketch: {
        SHS: Key_SHS,
        RHS: Key_RHS,
        CHS: Key_CHS,
      },
    };

    if (imageType === 'groove' || imageType === 'spacing' ||
      imageType === 'capacity1' || imageType === 'capacity2') {
      return imageMap[imageType];
    }
    if (imageType === 'basePlateSketch') {
      const conn = basePlateState.connectivity || selectedOption;
      let img = imageMap.basePlateSketch?.[conn];
      if (conn === 'Hollow/Tubular Column Base') {
        const sec = (basePlateState.member_designation || basePlateState.designation || '') + '';
        if (sec.includes('SHS')) img = SHS_BP;
        else if (sec.includes('RHS')) img = RHS_BP;
        else if (sec.includes('CHS')) img = CHS_BP;
      }
      return img || Moment_BP;
    }
    if (imageType === 'basePlateDetailing') {
      const conn = basePlateState.connectivity || selectedOption;
      let img = imageMap.basePlateDetailing?.[conn];
      if (conn === 'Hollow/Tubular Column Base') {
        const sec = (basePlateState.member_designation || basePlateState.designation || '') + '';
        if (sec.includes('SHS')) img = SHS_BP_Detailing;
        else if (sec.includes('RHS')) img = RHS_BP_Detailing;
        else if (sec.includes('CHS')) img = CHS_BP_Detailing;
      }
      return img || Moment_BP_Detailing;
    }
    if (imageType === 'weldDetails') {
      const conn = basePlateState.connectivity || selectedOption;
      let img = imageMap.weldDetails?.[conn];
      if (conn === 'Welded Column Base') return BP_welded_weld || Welded_BP_single_bevel;
      if (conn === 'Hollow/Tubular Column Base') {
        const sec = (basePlateState.member_designation || basePlateState.designation || '') + '';
        const groove = basePlateState.weld_type === 'Groove Weld';
        if (sec.includes('SHS')) img = groove ? SHS_BP_groove_weld : SHS_BP_weld;
        else if (sec.includes('RHS')) img = groove ? RHS_BP_groove_weld : RHS_BP_weld;
        else if (sec.includes('CHS')) img = groove ? CHS_BP_groove_weld : CHS_BP_weld;
      }
      return img || Moment_BP_weld_1_1;
    }
    if (imageType === 'keySketch') {
      const sec = (basePlateState.member_designation || basePlateState.designation || '') + '';
      if (sec.includes('SHS')) return Key_SHS;
      if (sec.includes('RHS')) return Key_RHS;
      if (sec.includes('CHS')) return Key_CHS;
      return Key_SHS;
    }
    return imageMap[imageType]?.[selectedOption] || null;
  };

  // Helper function to get output value - Works for both module formats
  const getOutputValue = (key, rawOutput) => {
    const out = rawOutput && rawOutput.data ? rawOutput.data : rawOutput;
    if (!out) {
      return " ";
    }

    // Both modules now use flat structure: { "Bolt.Diameter": { label, val } }
    if (out[key]?.val !== undefined) {
      return out[key].val;
    }

    // Try alternative structures
    if (out[key] !== undefined) {
      return out[key];
    }
    return " ";
  };

  // JSX Rendering Functions
  const resolveModalEntry = (modalType, activeSection) => {
    const modalEntries = outputConfig.modalData?.[modalType] || {};
    const entry = modalEntries[activeSection];

    if (!entry) {
      return { fields: [], diagram: null };
    }

    if (Array.isArray(entry)) {
      return { fields: entry, diagram: null };
    }

    return {
      fields: entry.fields || [],
      diagram: entry.diagram || null,
    };
  };

  const getNumeric = (key, rawOutput) => {
    const raw = getOutputValue(key, rawOutput);
    if (raw === undefined || raw === null || raw === " ") {
      return undefined;
    }
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : undefined;
  };

  const resolveDiagramProps = (diagramConfig, rawOutput) => {
    if (!diagramConfig) {
      return null;
    }

    const mapValue = (descriptor) => {
      if (descriptor === undefined || descriptor === null) {
        return undefined;
      }
      if (Array.isArray(descriptor)) {
        return descriptor
          .map((item) => mapValue(item))
          .filter((value) => value !== undefined);
      }

      if (typeof descriptor === "number") {
        return descriptor;
      }

      return getNumeric(descriptor, rawOutput);
    };

    const resolved = Object.entries(diagramConfig.props || {}).reduce(
      (acc, [key, descriptor]) => {
        const value = mapValue(descriptor);
        if (value !== undefined && value !== null && value !== "") {
          acc[key] = value;
        }
        return acc;
      },
      {}
    );

    if (Object.keys(resolved).length === 0) {
      return null;
    }

    if (diagramConfig.origin) {
      resolved.origin = diagramConfig.origin;
    }

    return resolved;
  };

  const renderModalContent = (modalType, activeSection, output) => {
    const config = outputConfig.modalTypes[modalType];
    const { fields, diagram } = resolveModalEntry(modalType, activeSection);
    const diagramProps = resolveDiagramProps(diagram, output);

    if (config.layout === "two-column") {
      return (
        <div className="spacing-main-body">
          {config.note && (
            <p style={{ padding: "20px" }}>
              Note: {config.note}
            </p>
          )}
          <div className="spacing-main-two">
            <div className="spacing-left-body">
              {fields.map(({ key, label }, idx) => (
                <div key={idx} className="spacing-left-body-align">
                  <h4>{label}</h4>
                  <ValueBox value={getOutputValue(key, output)} />
                </div>
              ))}
            </div>
            {config.hasImage && (
              <div className="spacing-right-body">
                <img src={getImageForModal('spacing')} alt="Spacing Image" />
              </div>
            )}
          </div>
        </div>
      );
    } else if (config.layout === "capacity-complex") {
      // Complex capacity layout with multiple sections and images
      const groupedFields = fields.reduce((acc, field) => {
        const section = field.section || 'Default';
        if (!acc[section]) acc[section] = [];
        acc[section].push(field);
        return acc;
      }, {});

      return (
        <div className="spacing-main-body">
          {config.note && (
            <p style={{ padding: "20px" }}>
              Note: {config.note}
            </p>
          )}
          <div className="Capacity-main-body">
            {Object.entries(groupedFields).map(([sectionName, sectionFields], sectionIdx) => (
              <div key={sectionIdx}>
                <div className="Capacity-sub-body-title">
                  <h4>{sectionName}</h4>
                </div>
                <div className="Capacity-sub-body">
                  <div className="Capacity-left-body">
                    {sectionFields.map(({ key, label }, idx) => (
                      <div key={idx} className="Capacity-left-body-align">
                        <p>{label}</p>
                        <ValueBox value={getOutputValue(key, output)} />
                      </div>
                    ))}
                  </div>
                  {sectionIdx < 2 && ( // Show images for first two sections
                    <div className="Capacity-right-body">
                      <img
                        src={getImageForModal(sectionIdx === 0 ? 'capacity1' : 'capacity2')}
                        alt={`Capacity Image ${sectionIdx + 1}`}
                      />
                      <h5>Block Shear Pattern</h5>
                    </div>
                  )}
                </div>
                {sectionIdx < Object.entries(groupedFields).length - 1 && <hr />}
              </div>
            ))}
          </div>
        </div>
      );
    } else if (config.layout === "image-only") {
      const image = getImageForModal(config.imageType, extraState.selectedOption, extraState);
      return (
        <div className="spacing-main-body">
          {image && <img src={image} alt={`${config.imageType} Image`} />}
        </div>
      );
    } else if (config.layout === "spacing-diagram") {
      return (
        <div className="flex w-full flex-col justify-center border border-gray-300 p-2">
          {config.note && (
            <p className="px-5 py-4 text-sm text-gray-600">Note: {config.note}</p>
          )}
          <div className="flex w-full flex-col gap-6 md:flex-row">
            <div className="flex w-full flex-col gap-3 px-4 md:w-1/2">
              {fields.map(({ key, label }, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                  <h4 className="font-medium text-gray-700">{label}</h4>
                  <div className="min-w-[40%]">
                    <ValueBox value={getOutputValue(key, output)} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex w-full items-center justify-center px-4 pb-4 md:w-1/2 md:pb-0">
              {diagramProps ? (
                <SpacingDiagram className="md:max-w-2xl" {...diagramProps} />
              ) : (
                <div className="flex w-full min-h-[280px] items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                  No diagram data available.
                </div>
              )}
            </div>
          </div>
        </div>
      );
    } else if (config.layout === "single-column") {
      return (
        <div className="details-main-body">
          <div className="details-main-body-inside">
            {fields.length > 0 ? (
              fields.map(({ key, label }, idx) => (
                <div key={idx} className="details-main-body-align">
                  <h4 dangerouslySetInnerHTML={{ __html: label }} />
                  <ValueBox value={getOutputValue(key, output)} />
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 px-2 py-4">No details available for this section.</p>
            )}
          </div>
        </div>
      );
    }
  };

  // Shared field renderer
  const renderField = (field, index) => {
    const isModalTrigger = field.key in outputConfig.modals;
    const fieldValue = getOutputValue(field.key, output);

    return (
      <div key={index} className="flex my-1">
        <h4>{field.label}</h4>
        {isModalTrigger ? (
          <Input
            className="btn"
            type="button"
            value={outputConfig.modals[field.key].buttonText || field.label}
            disabled={!output}
            onClick={() => handleDialog(field.key)}
          />
        ) : (
          <ValueBox value={fieldValue} />
        )}
      </div>
    );
  };
  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        <div className="p-2">
          <p className="p-2 inline-block bg-osdag-green text-white rounded">{title}</p>
        </div>
        <div className="flex-1 overflow-y-auto subMainBody scroll-data min-h-0 pb-20">
          {Object.entries(outputConfig.sections).map(([sectionName, fields]) => (
            <div key={sectionName} className='cards'>
              <h3 className='text-black dark:text-white'>{sectionName}</h3>
              <div className="component-grid">
                {fields.map((field, index) => renderField(field, index))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions - sticky at bottom; scroll area has padding so last content is not hidden */}
        {(handleCreateDesignReport || saveOutput) && (
          <div className="sticky bottom-0 flex-shrink-0 z-10 bg-white dark:bg-osdag-dark-color border-t border-gray-200 dark:border-gray-700 flex items-center w-full gap-x-4 px-5 py-2">
            {handleCreateDesignReport && (
              <button
                onClick={handleCreateDesignReport}
                className="flex flex-1 items-center justify-center gap-x-2 bg-osdag-green text-white font-semibold px-4 py-3 rounded-lg shadow-md duration-200 hover:bg-osdag-dark-green"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF">
                  <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h168q13-36 43.5-58t68.5-22q38 0 68.5 22t43.5 58h168q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm80-80h280v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Zm200-190q13 0 21.5-8.5T510-820q0-13-8.5-21.5T480-850q-13 0-21.5 8.5T450-820q0 13 8.5 21.5T480-790ZM200-200v-560 560Z" />
                </svg>
                Generate Report
              </button>
            )}
            {saveOutput && (
              <button
                onClick={saveOutput}
                className="flex flex-1 items-center justify-center gap-x-2 bg-osdag-green text-white font-semibold px-4 py-3 rounded-lg shadow-md duration-200 hover:bg-osdag-dark-green"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFFFF">
                  <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" />
                </svg>
                Save Output
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Modal Rendering */}
      {Object.entries(outputConfig.modalTypes).map(([modalType, config]) => (
        <Modal
          key={modalType}
          open={activeModals[modalType]}
          onCancel={() => closeModal(modalType)}
          footer={null}
          width={config.width || "50%"}
          title={config.title}
          className="[&_.ant-modal-header]:bg-transparent [&_.ant-modal-close]:right-4"
        >
          {renderModalContent(modalType, activeSections[modalType], output)}
        </Modal>
      ))}
    </>
  );
};
