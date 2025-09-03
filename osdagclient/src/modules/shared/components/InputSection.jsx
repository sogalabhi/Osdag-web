import React, { useState, useEffect } from 'react';
import { Input, Select } from 'antd';
import FRM from "../../../assets/flush_ep.png";
import EOWIM from "../../../assets/owe_ep.png";
import EBWRM from "../../../assets/extended.png";
import CFBW from "../../../assets/ShearConnection/sc_fin_plate/fin_cf_bw.png";
import CWBW from "../../../assets/ShearConnection/sc_fin_plate/fin_cw_bw.png";
import BB from "../../../assets/ShearConnection/sc_fin_plate/fin_beam_beam.png";
import ErrorImg from "../../../assets/notSelected.png";

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
  // console.group('[ENG MODULE] ContextData');
  // console.log('connectivityList', contextData.connectivityList?.length, contextData.connectivityList?.slice(0, 5));
  // console.log('materialList', contextData.materialList?.length, contextData.materialList?.slice?.(0, 3));
  // console.log('beamList', contextData.beamList?.length, contextData.beamList?.slice(0, 3));
  // console.log('columnList', contextData.columnList?.length, contextData.columnList?.slice(0, 3));
  // console.log('boltDiameterList', contextData.boltDiameterList?.length, contextData.boltDiameterList?.slice?.(0, 5));
  // console.log('thicknessList', contextData.thicknessList?.length, contextData.thicknessList?.slice?.(0, 5));
  // console.log('propertyClassList', contextData.propertyClassList?.length, contextData.propertyClassList?.slice?.(0, 5));
  // console.groupEnd();

  // Full dump (be careful: can be large)
  // console.log('[ENG MODULE] ContextData JSON:', JSON.stringify(contextData, null, 2));
  // Ensure inputs and contextData are always defined
  const safeInputs = inputs || {};
  const safeContextData = contextData || {};
  const [imageSource, setImageSource] = useState("");

  // Debug logging for context data
  // useEffect(() => {
  //   console.log("🎯 [INPUT SECTION] Context data received:", {
  //     connectivityList: safeContextData.connectivityList?.length || 0,
  //     materialList: safeContextData.materialList?.length || 0,
  //     beamList: safeContextData.beamList?.length || 0,
  //     columnList: safeContextData.columnList?.length || 0,
  //     boltDiameterList: safeContextData.boltDiameterList?.length || 0,
  //     thicknessList: safeContextData.thicknessList?.length || 0,
  //     propertyClassList: safeContextData.propertyClassList?.length || 0
  //   });
  // }, [safeContextData]);

  const { Option } = Select;

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
    const getAllValuesForInputKey = (inputKey) => {
      switch (inputKey) {
        case 'bolt_diameter':
          return Array.isArray(safeContextData.boltDiameterList) ? safeContextData.boltDiameterList : [];
        case 'bolt_grade':
          return Array.isArray(safeContextData.propertyClassList) ? safeContextData.propertyClassList : [];
        case 'plate_thickness':
          return Array.isArray(safeContextData.thicknessList) ? safeContextData.thicknessList : [];
        default:
          return [];
      }
    };

    if (value === "Customized") {
      const current = Array.isArray(safeInputs[field.key]) ? safeInputs[field.key] : [];
      setInputs({ ...safeInputs, [field.key]: current });
      updateSelectionState(field.selectionKey, "Customized");
      toggleAllSelected(field.key, false);
      updateModalState(field.modalKey, true);
    } else {
      const allValues = getAllValuesForInputKey(field.key);
      setInputs({ ...safeInputs, [field.key]: allValues });
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
          const beamOptions = contextData.beamList?.map(item => ({ value: item, label: item })) || [];
          const currentValue = inputs[field.key] || contextData.beamList[2];
          const selectedOption = beamOptions.find(option => option.value === currentValue);

          return (
            <Select
              value={safeInputs[field.key] || (safeContextData.beamList?.[2] || '')}
              onSelect={(value) => setInputs({ ...safeInputs, [field.key]: value })}
            >
              {(safeContextData.beamList || []).map((item, index) => (
                <Option key={index} value={item}>
                  {item}
                </Option>
              ))}
            </Select>
          );
        } else if (field.options === 'columnList') {
          const columnOptions = contextData.columnList?.map(item => ({ value: item, label: item })) || [];
          const currentValue = inputs[field.key] || contextData.columnList[0];
          const selectedOption = columnOptions.find(option => option.value === currentValue);

          return (
            <Select
              value={safeInputs[field.key] || (safeContextData.columnList?.[0] || '')}
              onSelect={(value) => setInputs({ ...safeInputs, [field.key]: value })}
            >
              {(safeContextData.columnList || []).map((item, index) => (
                <Option key={index} value={item}>
                  {item}
                </Option>
              ))}
            </Select>
          );
        } else if (field.options === 'boltDiameterList') {
          const list = safeContextData.boltDiameterList || [];
          const isCustomized = selectionStates?.[field.selectionKey] === 'Customized';
          if (!isCustomized) {
            return (
              <Select value={"All"} disabled>
                <Option value="All">All</Option>
              </Select>
            );
          }
          const value = Array.isArray(safeInputs[field.key]) ? safeInputs[field.key] : [];
          return (
            <Select
              mode="multiple"
              value={value}
              onChange={(next) => setInputs({ ...safeInputs, [field.key]: next })}
            >
              {list.map((item, index) => (
                <Option key={index} value={item}>{item}</Option>
              ))}
            </Select>
          );
        } else if (field.options === 'thicknessList') {
          const list = safeContextData.thicknessList || [];
          const isCustomized = selectionStates?.[field.selectionKey] === 'Customized';
          if (!isCustomized) {
            return (
              <Select value={"All"} disabled>
                <Option value="All">All</Option>
              </Select>
            );
          }
          const value = Array.isArray(safeInputs[field.key]) ? safeInputs[field.key] : [];
          return (
            <Select
              mode="multiple"
              value={value}
              onChange={(next) => setInputs({ ...safeInputs, [field.key]: next })}
            >
              {list.map((item, index) => (
                <Option key={index} value={item}>{item}</Option>
              ))}
            </Select>
          );
        } else if (field.options === 'propertyClassList') {
          const list = safeContextData.propertyClassList || [];
          const isCustomized = selectionStates?.[field.selectionKey] === 'Customized';
          if (!isCustomized) {
            return (
              <Select value={"All"} disabled>
                <Option value="All">All</Option>
              </Select>
            );
          }
          const value = Array.isArray(safeInputs[field.key]) ? safeInputs[field.key] : [];
          return (
            <Select
              mode="multiple"
              value={value}
              onChange={(next) => setInputs({ ...safeInputs, [field.key]: next })}
            >
              {list.map((item, index) => (
                <Option key={index} value={item}>{item}</Option>
              ))}
            </Select>
          );
        } else if (field.options === 'boltTypeList') {
          const list = safeContextData.boltTypeList || [];
          return (
            <Select
              value={safeInputs[field.key]}
              onSelect={(value) => setInputs({ ...safeInputs, [field.key]: value })}
            >
              {list.map((item, index) => (
                <Option key={index} value={item}>{item}</Option>
              ))}
            </Select>
          );
        } else if (field.options === 'materialList') {

          // Check for duplicates in materialList
          const grades =
            safeContextData.materialList?.map((item) => item.Grade) || [];
          const duplicateGrades = grades.filter(
            (grade, index) => grades.indexOf(grade) !== index
          );
          if (duplicateGrades.length > 0) {
            console.warn(`Duplicate grades found in materialList:`, duplicateGrades);
          }

          const selectedMaterialGrade = safeInputs[field.key] || (safeContextData.materialList?.[0]?.Grade || '');

          return (
            <Select
              value={selectedMaterialGrade}
              onSelect={(value) => {
                if (field.onChange) {
                  field.onChange(
                    value,
                    safeInputs,
                    setInputs,
                    safeContextData.materialList
                  );
                } else {
                  setInputs({ ...safeInputs, [field.key]: value });
                }
              }}
            >
              {(safeContextData.materialList || []).map((item, index) => (
                <Option key={`${item.id}-${index}`} value={item.Grade}>
                  {item.Grade}
                </Option>
              ))}
            </Select>
          );
        } else {
          const options = field.options?.map(option => ({
            value: option.value || option,
            label: option.label || option,
            isDisabled: option.disabled
          })) || [];
          const selectedOption = options.find(option => option.value === inputs[field.key]);

          return (
            <Select
              value={safeInputs[field.key]}
              onSelect={(value) => setInputs({ ...safeInputs, [field.key]: value })}
            >
              {field.options.map((option, index) => (
                <Option
                  key={index}
                  value={option.value || option}
                  disabled={option.disabled}
                >
                  {option.label || option}
                </Option>
              ))}
            </Select>
          );
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
        const connectivityOptions = (contextData.connectivityList || []).map(item => ({ value: item, label: item }));
        const connectivityValue = extraState.selectedOption || inputs.connectivity;
        const selectedConnectivity = connectivityOptions.find(option => option.value === connectivityValue);

        return (
          <div className="w-full">
            <Select
              value={connectivityValue}
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
        const conn_map = {
          "Flushed - Reversible Moment": "Flushed - Reversible Moment",
          "Extended One Way - Irreversible Moment": "Extended One Way - Irreversible Moment",
          "Extended Both Ways - Reversible Moment": "Extended Both Ways - Reversible Moment",
        };
        const endPlateOptions = Object.keys(conn_map).map(item => ({ value: item, label: conn_map[item] }));
        const selectedEndPlate = endPlateOptions.find(option => option.value === extraState.selectedOption);

        return (
          <Select
            onSelect={(value) => {
              setExtraState({ ...extraState, selectedOption: value });
              setInputs({ ...safeInputs, output: null });
            }}
            isSearchable={false}
            menuPortalTarget={document.body}
            styles={selectStyles}
          />
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
      case 'customizable':
        const customizableOptions = [
          { value: "Customized", label: "Customized" },
          { value: "All", label: "All" }
        ];
        const selectedCustomizable = customizableOptions.find(option => option.value === selectionStates[field.selectionKey]);

        return (
          <Select
            value={selectionStates?.[field.selectionKey] || "All"}
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
    <div className="cards">
      <h3>{section.title}</h3>
      <div className="component-grid">
        {section.fields.map((field, index) => {
          // Check conditional display again for the entire field container
          if (field.conditionalDisplay && !field.conditionalDisplay(extraState)) {
            return null;
          }
          return (
            <div key={index}>
              <div className="component-grid-align">
                <h4>{field.label}</h4>
                {renderField(field)}
              </div>
              {/* Render image separately for connectivity and endPlateSelect types */}
              {(field.type === 'connectivitySelect' || field.type === 'endPlateSelect') && imageSource && (
                <div className="connectionimg">
                  <img
                    src={imageSource}
                    alt="Component"
                    height="100px"
                    width="100px"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
