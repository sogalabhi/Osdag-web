import React, { useState, useEffect } from 'react';
import { Input } from 'antd';
import Select from 'react-select';
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

  const [imageSource, setImageSource] = useState("");

  // Common select styles with high z-index
  const selectStyles = {
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    menu: (base) => ({ ...base, zIndex: 9999 })
  };

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
      if (inputs[field.key].length !== 0) {
        setInputs({ ...inputs, [field.key]: inputs[field.key] });
      } else {
        setInputs({ ...inputs, [field.key]: [] });
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
      case 'select':
        if (field.options === 'beamList') {
          const beamOptions = contextData.beamList?.map(item => ({ value: item, label: item })) || [];
          const currentValue = inputs[field.key] || contextData.beamList[2];
          const selectedOption = beamOptions.find(option => option.value === currentValue);
          
          return (
            <Select
              className="react-select-container"
              classNamePrefix="react-select"
              value={selectedOption}
              options={beamOptions}
              onChange={(selectedOption) => setInputs({ ...inputs, [field.key]: selectedOption.value })}
              isSearchable={false}
              menuPortalTarget={document.body}
              styles={selectStyles}
            />
          );
        } else if (field.options === 'columnList') {
          const columnOptions = contextData.columnList?.map(item => ({ value: item, label: item })) || [];
          const currentValue = inputs[field.key] || contextData.columnList[0];
          const selectedOption = columnOptions.find(option => option.value === currentValue);
          
          return (
            <Select
              className="react-select-container"
              classNamePrefix="react-select"
              value={selectedOption}
              options={columnOptions}
              onChange={(selectedOption) => setInputs({ ...inputs, [field.key]: selectedOption.value })}
              isSearchable={false}
              menuPortalTarget={document.body}
              styles={selectStyles}
            />
          );
        } else if (field.options === 'materialList') {
   
          // Check for duplicates in materialList
          const grades = contextData.materialList?.map(item => item.Grade) || [];
          const duplicateGrades = grades.filter((grade, index) => grades.indexOf(grade) !== index);
          if (duplicateGrades.length > 0) {
            console.warn(`Duplicate grades found in materialList:`, duplicateGrades);
          }

          return (
            <Select
              className="react-select-container"
              classNamePrefix="react-select"
              value={selectedOption}
              options={materialOptions}
              onChange={(selectedOption) => {
                if (field.onChange) {
                  field.onChange(selectedOption.value, inputs, setInputs, contextData.materialList);
                } else {
                  setInputs({ ...inputs, [field.key]: selectedOption.value });
                }
              }}
            >
              {contextData.materialList.map((item, index) => (
                <Option key={`${item.id}-${index}`} value={item.id}>{item.Grade}</Option>
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
              className="react-select-container"
              classNamePrefix="react-select"
              value={selectedOption}
              options={options}
              onChange={(selectedOption) => setInputs({ ...inputs, [field.key]: selectedOption.value })}
              isSearchable={false}
              menuPortalTarget={document.body}
              styles={selectStyles}
            />
          );
        }

      case 'connectivitySelect':
        const connectivityOptions = (contextData.connectivityList || []).map(item => ({ value: item, label: item }));
        const connectivityValue = extraState.selectedOption || inputs.connectivity;
        const selectedConnectivity = connectivityOptions.find(option => option.value === connectivityValue);
        
        return (
          <Select
            className="react-select-container"
            classNamePrefix="react-select"
            value={selectedConnectivity}
            options={connectivityOptions}
            onChange={(selectedOption) => {
              setExtraState({ ...extraState, selectedOption: selectedOption.value });
              setInputs({ ...inputs, connectivity: selectedOption.value, output: null }); 
            }}
            isSearchable={false}
            menuPortalTarget={document.body}
            styles={selectStyles}
          />
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
            className="react-select-container"
            classNamePrefix="react-select"
            value={selectedEndPlate}
            options={endPlateOptions}
            onChange={(selectedOption) => {
              setExtraState({ ...extraState, selectedOption: selectedOption.value });
              setInputs({ ...inputs, output: null }); 
            }}
            isSearchable={false}
            menuPortalTarget={document.body}
            styles={selectStyles}
          />
        );

      case 'number':
        return (
          <Input
            type="text"
            onInput={(event) => {
              event.target.value = event.target.value.replace(/[^0-9.]/g, "");
            }}
            value={inputs[field.key]}
            onChange={(event) => setInputs({ ...inputs, [field.key]: event.target.value })}
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
            onSelect={(value) => handleCustomizableSelect(field, value)}
            value={selectionStates[field.selectionKey]}
          >
            <Option value="All">All</Option>
            <Option value="Customized">Customized</Option>
          </Select>
        );

      case 'sectionProfileList':
        // Check for duplicates in sectionProfileList
        const profiles = contextData.sectionProfileList || [];
        const duplicateProfiles = profiles.filter((profile, index) => profiles.indexOf(profile) !== index);
        if (duplicateProfiles.length > 0) {
          console.warn(`⚠️ Duplicate profiles found in sectionProfileList:`, duplicateProfiles);
        }

        return (
          <Select
            value={inputs[field.key]}
            onSelect={(value) => {
              if (field.onChange) {
                field.onChange(value, inputs, setInputs, contextData, extraState, setExtraState);
              } else {
                setInputs({ ...inputs, [field.key]: value });
              }
            }}
          >
            {(contextData.sectionProfileList || []).map((profile, index) => (
              <Option key={`${profile}-${index}`} value={profile}>
                {profile}
              </Option>
            ))}
          </Select>
        );

      case 'dynamicSelect':
        const options = field.getOptions ? field.getOptions(inputs, extraState) : [];
        return (
          <Select
            value={inputs[field.key]}
            onSelect={(value) => setInputs({ ...inputs, [field.key]: value })}
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
          />
        );

      default:
        return (
          <Input
            value={inputs[field.key]}
            onChange={(event) => setInputs({ ...inputs, [field.key]: event.target.value })}
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