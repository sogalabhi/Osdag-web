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

export const BaseOutputDock = ({
  output,
  outputConfig,
  title = "Output Dock",
  extraState = {}
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

  const getImageForModal = (imageType, selectedOption) => {
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
      capacity2: capacityIMG2
    };

    if (imageType === 'groove' || imageType === 'spacing' ||
      imageType === 'capacity1' || imageType === 'capacity2') {
      return imageMap[imageType];
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
      const image = getImageForModal(config.imageType, extraState.selectedOption);
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
            {fields.map(({ key, label }, idx) => (
              <div key={idx} className="details-main-body-align">
                <h4 dangerouslySetInnerHTML={{ __html: label }} />
                <ValueBox value={getOutputValue(key, output)} />
              </div>
            ))}
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
      <p>{title}</p>
      <div className="subMainBody scroll-data">
        {Object.entries(outputConfig.sections).map(([sectionName, fields]) => (
          <div key={sectionName} className='cards'>
            <h3 className='text-black dark:text-white'>{sectionName}</h3>
            <div className="component-grid">
              {fields.map((field, index) => renderField(field, index))}
            </div>
          </div>
        ))}
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
