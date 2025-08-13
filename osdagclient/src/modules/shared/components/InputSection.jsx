import React, { useState, useEffect } from 'react';
import { Select, Input } from 'antd';
import FRM from "../../../assets/flush_ep.png";
import EOWIM from "../../../assets/owe_ep.png";
import EBWRM from "../../../assets/extended.png";
import CFBW from "../../../assets/ShearConnection/sc_fin_plate/fin_cf_bw.png";
import CWBW from "../../../assets/ShearConnection/sc_fin_plate/fin_cw_bw.png";
import BB from "../../../assets/ShearConnection/sc_fin_plate/fin_beam_beam.png";
import ErrorImg from "../../../assets/notSelected.png";

const { Option } = Select;

export const InputSection = ({
  section,
  inputs,
  setInputs,
  selectionStates,
  updateSelectionState,
  updateModalState,
  toggleAllSelected,
  contextData,
  extraState = {},
  setExtraState = () => { }
}) => {
  // Ensure inputs and contextData are always defined
  const safeInputs = inputs || {};
  const safeContextData = contextData || {};
  const [imageSource, setImageSource] = useState("");

  // Handle connectivity selection with image (for FinePlate)
  useEffect(() => {
    if (extraState.selectedOption) {
      const connectivityImageMap = {
        "Column Flange-Beam-Web": CFBW,
        "Column Web-Beam-Web": CWBW,
        "Beam-Beam": BB,
      };

      const endPlateImageMap = {
        "Flushed - Reversible Moment": FRM,
        "Extended One Way - Irreversible Moment": EOWIM,
        "Extended Both Ways - Reversible Moment": EBWRM,
      };

      // Check if it's a connectivity or end plate selection
      if (connectivityImageMap[extraState.selectedOption]) {
        setImageSource(connectivityImageMap[extraState.selectedOption]);
      } else if (endPlateImageMap[extraState.selectedOption]) {
        setImageSource(endPlateImageMap[extraState.selectedOption]);
      } else {
        setImageSource(ErrorImg);
      }
    }
  }, [extraState.selectedOption]);

  const handleCustomizableSelect = (field, value) => {
    if (value === "Customized") {
      if (safeInputs[field.key]?.length !== 0) {
        setInputs({ ...safeInputs, [field.key]: safeInputs[field.key] });
      } else {
        setInputs({ ...safeInputs, [field.key]: [] });
      }
      updateSelectionState(field.selectionKey, "Customized");
      toggleAllSelected(field.key, false);
      updateModalState(field.modalKey, true);
    } else {
      updateSelectionState(field.selectionKey, "All");
      toggleAllSelected(field.key, true);
      updateModalState(field.modalKey, false);
    }
  };

  const renderField = (field) => {
    // Check conditional display
    if (field.conditionalDisplay && !field.conditionalDisplay(extraState)) {
      return null;
    }

    switch (field.type) {
      case 'select': {
        let optionsArr = [];
        if (field.options === 'beamList') {
          optionsArr = safeContextData.beamList || [];
        } else if (field.options === 'columnList') {
          optionsArr = safeContextData.columnList || [];
        } else if (field.options === 'materialList') {
          optionsArr = (safeContextData.materialList || []).map(item => item.Grade);
        } else {
          optionsArr = field.options.map(opt => (opt.value || opt));
        }
        // If loaded value is not in options, add it as a custom option
        const selectValue = safeInputs[field.key];
        const displayOptions = optionsArr.includes(selectValue) || selectValue === undefined ? optionsArr : [selectValue, ...optionsArr];
        return (
          <Select
            value={selectValue}
            onSelect={(value) => setInputs({ ...safeInputs, [field.key]: value })}
            className="w-full"
            placeholder={field.placeholder || `Select ${field.label}`}
          >
            {displayOptions.map((option, index) => (
              <Option key={index} value={option}>{option}</Option>
            ))}
          </Select>
        );
      }
      case 'connectivitySelect':
        return (
          <div className="w-full">
            <Select
              value={safeInputs[field.key]}
              onSelect={(value) => {
                if (field.onChange) {
                  field.onChange(
                    value,
                    safeInputs,
                    setInputs,
                    safeContextData,
                    extraState,
                    setExtraState
                  );
                } else {
                  setInputs({ ...safeInputs, [field.key]: value });
                }
              }}
              className="w-full h-11"
              placeholder={field.placeholder || `Select ${field.label}`}
            >
              {(safeContextData.connectivityList || []).map((connectivity, index) => (
                <Option key={index} value={connectivity}>
                  <div className="flex items-center justify-between py-1">
                    <span>{connectivity}</span>
                    {imageSource && (
                      <img
                        src={imageSource}
                        alt="Connectivity"
                        className="w-8 h-8 rounded border border-gray-200 ml-2 object-cover"
                      />
                    )}
                  </div>
                </Option>
              ))}
            </Select>
          </div>
        );
      case 'endPlateSelect':
        return (
          <div className="w-full">
            <Select
              value={safeInputs[field.key]}
              onSelect={(value) => {
                if (field.onChange) {
                  field.onChange(
                    value,
                    safeInputs,
                    setInputs,
                    safeContextData,
                    extraState,
                    setExtraState
                  );
                } else {
                  setInputs({ ...safeInputs, [field.key]: value });
                }
              }}
              className="w-full h-11"
              placeholder={field.placeholder || `Select ${field.label}`}
            >
              {(safeContextData.endPlateList || []).map((endPlate, index) => (
                <Option key={index} value={endPlate}>
                  <div className="flex items-center justify-between py-1">
                    <span>{endPlate}</span>
                    {imageSource && (
                      <img
                        src={imageSource}
                        alt="End Plate"
                        className="w-8 h-8 rounded border border-gray-200 ml-2 object-cover"
                      />
                    )}
                  </div>
                </Option>
              ))}
            </Select>
          </div>
        );
      case 'number':
        return (
          <Input
            type="number"
            value={safeInputs[field.key] ?? ""}
            onChange={(event) =>
              setInputs({ ...safeInputs, [field.key]: event.target.value })
            }
            placeholder={field.placeholder || `ex. ${field.label}`}
            className="w-full h-11 border border-gray-300 rounded-lg px-3 text-sm bg-white transition-all duration-200 hover:border-gray-400 focus:border-osdag-green focus:ring-2 focus:ring-osdag-green/20 focus:outline-none placeholder:text-gray-400"
          />
        );
      case 'customizableSelect':
        return (
          <Select
            value={safeInputs[field.key] || "All"}
            onSelect={(value) => handleCustomizableSelect(field, value)}
            className="w-full h-11"
            placeholder={field.placeholder || `Select ${field.label}`}
          >
            <Option value="All">All</Option>
            <Option value="Customized">Customized</Option>
          </Select>
        );
      case 'sectionProfileSelect':
        return (
          <Select
            value={safeInputs[field.key]}
            onSelect={(value) => {
              if (field.onChange) {
                field.onChange(
                  value,
                  safeInputs,
                  setInputs,
                  safeContextData,
                  extraState,
                  setExtraState
                );
              } else {
                setInputs({ ...safeInputs, [field.key]: value });
              }
            }}
            className="w-full h-11"
            placeholder={field.placeholder || `Select ${field.label}`}
          >
            {(safeContextData.sectionProfileList || []).map((profile, index) => (
              <Option key={index} value={profile}>
                {profile}
              </Option>
            ))}
          </Select>
        );
      case 'dynamicSelect':
        const options = field.getOptions ? field.getOptions(inputs, extraState) : [];
        return (
          <Select
            value={safeInputs[field.key]}
            onSelect={(value) => setInputs({ ...safeInputs, [field.key]: value })}
            className="w-full h-11"
            placeholder={field.placeholder || `Select ${field.label}`}
          >
            {options.map((option, index) => (
              <Option key={index} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        );
      case 'image':
        const imageUrl = field.imageSource ? field.imageSource(extraState) : null;
        return imageUrl ? (
          <img
            src={imageUrl}
            alt={field.label || "Section Profile"}
            height={field.height || "100px"}
            width={field.width || "100px"}
            className="rounded border border-gray-200"
          />
        ) : null;
      default:
        return (
          <Input
            value={safeInputs[field.key] ?? ""}
            onChange={(event) =>
              setInputs({ ...safeInputs, [field.key]: event.target.value })
            }
            placeholder={field.placeholder || `ex. ${field.label}`}
            className="w-full h-11 border border-gray-300 rounded-lg px-3 text-sm bg-white transition-all duration-200 hover:border-gray-400 focus:border-osdag-green focus:ring-2 focus:ring-osdag-green/20 focus:outline-none placeholder:text-gray-400"
          />
        );
    }
  };

  return (
    <div className="mb-6 relative">
      {/* Fieldset-style border */}
      <div className="border-2 border-osdag-green rounded-xl p-4 bg-white">
        {/* Legend-style title that cuts through the border */}
        <div className="absolute -top-3 left-4 bg-white px-3">
          <h3 className="text-lg font-semibold text-gray-900 m-0">{section.title}</h3>
        </div>
        
        {/* Content with consistent spacing */}
        <div className="pt-2">
          {section.fields.map((field, index) => {
            // Check conditional display again for the entire field container
            if (field.conditionalDisplay && !field.conditionalDisplay(extraState)) {
              return null;
            }

            return (
              <div key={index} className="mb-6 last:mb-0">
                {field.type === 'image' ? (
                  <div className="flex justify-center my-3">
                    {renderField(field)}
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <h4 className={`text-sm font-semibold text-gray-900 flex-[0_0_45%] ${field.required ? 'after:content-["_*"] after:text-red-500 after:font-bold' : ''}`}>{field.label}</h4>
                    {renderField(field)}
                  </div>
                )}
                {/* Render image separately for connectivity and endPlateSelect types */}
                {(field.type === 'connectivitySelect' || field.type === 'endPlateSelect') && imageSource && (
                  <div className="flex justify-center mt-3">
                    <img
                      src={imageSource}
                      alt="Component"
                      height="60px"
                      width="60px"
                      className="rounded border border-gray-200"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
