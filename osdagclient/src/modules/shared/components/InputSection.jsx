import React, { useState, useEffect } from 'react';
import Select from 'react-select'; // Re-integrated react-select
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
  const safeInputs = inputs || {};
  const safeContextData = contextData || {};
  const [imageSource, setImageSource] = useState("");

  // Styling object for react-select to fix z-index and other container issues
  const customSelectStyles = {
    menuPortal: base => ({ ...base, zIndex: 9999 }),
    control: (base) => ({
      ...base,
      borderColor: '#000',
      '&:hover': {
        borderColor: '#91B014',
      },
    }),
  };

  useEffect(() => {
    if (extraState.selectedOption) {
      const imageMap = {
        "Column Flange-Beam-Web": CFBW, "Column Web-Beam-Web": CWBW, "Beam-Beam": BB,
        "Flushed - Reversible Moment": FRM, "Extended One Way - Irreversible Moment": EOWIM, "Extended Both Ways - Reversible Moment": EBWRM,
      };
      setImageSource(imageMap[extraState.selectedOption] || ErrorImg);
    }
  }, [extraState.selectedOption]);

  const handleCustomizableSelect = (field, value) => {
    const getAllValuesForInputKey = (inputKey) => {
      const keyMap = {
        'bolt_diameter': 'boltDiameterList', 'bolt_grade': 'propertyClassList',
        'plate_thickness': 'thicknessList', 'angle_list': 'angleList',
      };
      const listName = keyMap[inputKey];
      return Array.isArray(safeContextData[listName]) ? safeContextData[listName] : [];
    };

    if (value === "Customized") {
      setInputs({ ...safeInputs, [field.key]: [] });
      updateSelectionState(field.selectionKey, "Customized");
      updateModalState(field.modalKey, true);
    } else {
      const allValues = getAllValuesForInputKey(field.key);
      setInputs({ ...safeInputs, [field.key]: allValues });
      updateSelectionState(field.selectionKey, "All");
      updateModalState(field.modalKey, false);
    }
  };

  const renderField = (field) => {
    if (field.conditionalDisplay && !field.conditionalDisplay(extraState)) return null;

    const toSelectOptions = (list = []) => {
      if (!list || list.length === 0) return [];
      if (typeof list[0] === 'object' && list[0] !== null) {
        return list.map(item => ({ value: item.Grade, label: item.Grade }));
      }
      return list.map(item => ({ value: item, label: item }));
    };

    switch (field.type) {
      case 'select': {
        const isMulti = ['boltDiameterList', 'thicknessList', 'propertyClassList', 'angleList'].includes(field.options);
        const options = toSelectOptions(safeContextData[field.options]);

        if (isMulti) {
          const isCustomized = selectionStates?.[field.selectionKey] === 'Customized';
          if (!isCustomized) {
            return (
              <Select
                value={{ label: "All", value: "All" }}
                isDisabled={true}
                styles={customSelectStyles}
                classNamePrefix="react-select"
                className="w-[60%]"
              />
            );
          }
          const currentValue = (Array.isArray(safeInputs[field.key]) ? safeInputs[field.key] : [])
            .map(val => ({ value: val, label: val }));

          return (
            <Select
              isMulti
              options={options}
              value={currentValue}
              onChange={(selectedOptions) => {
                const newValues = selectedOptions.map(opt => opt.value);
                setInputs({ ...safeInputs, [field.key]: newValues });
              }}
              menuPortalTarget={document.body}
              styles={customSelectStyles}
              classNamePrefix="react-select"
              className="w-[60%]"
            />
          );
        }

        const value = options.find(opt => opt.value === safeInputs[field.key]);
        return (
          <Select
            options={options}
            value={value}
            onChange={(selected) => setInputs({ ...safeInputs, [field.key]: selected.value })}
            menuPortalTarget={document.body}
            styles={customSelectStyles}
            classNamePrefix="react-select"
            className="w-[60%]"
          />
        );
      }

      case 'connectivitySelect':
      case 'endPlateSelect': {
        const list = field.type === 'connectivitySelect' ? (safeContextData.connectivityList || []) : Object.keys({
          "Flushed - Reversible Moment": "", "Extended One Way - Irreversible Moment": "", "Extended Both Ways - Reversible Moment": ""
        });
        const options = toSelectOptions(list);
        const value = options.find(opt => opt.value === extraState.selectedOption);
        return (
          <Select
            options={options}
            value={value}
            onChange={(selected) => {
              setExtraState({ ...extraState, selectedOption: selected.value });
              setInputs({ ...safeInputs, output: null });
            }}
            menuPortalTarget={document.body}
            styles={customSelectStyles}
            classNamePrefix="react-select"
            className="w-[60%]"
          />
        );
      }

      case 'customizable': {
        const options = [{ value: "All", label: "All" }, { value: "Customized", label: "Customized" }];
        const value = options.find(opt => opt.value === (selectionStates?.[field.selectionKey] || "All"));
        return (
          <Select
            options={options}
            value={value}
            onChange={(selected) => handleCustomizableSelect(field, selected.value)}
            menuPortalTarget={document.body}
            styles={customSelectStyles}
            classNamePrefix="react-select"
            className="w-[60%]"
          />
        );
      }

      case 'number':
      default:
        return (
          <div className="w-[60%]">
            <input
              type={field.type === 'number' ? 'number' : 'text'}
              value={safeInputs[field.key] ?? ""}
              onChange={(e) => setInputs({ ...safeInputs, [field.key]: e.target.value })}
              placeholder={field.placeholder || `ex. ${field.label}`}
              className="w-full h-9 border border-gray-400 rounded-md px-3 text-sm focus:border-osdag-green focus:ring-2 focus:ring-osdag-green/20 outline-none"
            />
          </div>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800/20 border-2 border-osdag-green rounded-xl mb-5 mx-4 shadow-sm relative pt-4">
      <h3 className="text-base font-bold text-osdag-text-primary dark:text-white bg-white dark:bg-osdag-dark-color px-1 absolute -top-4 left-4">
        {section.title}
      </h3>
      <div className="flex flex-col w-full p-4 pt-2">
        {section.fields.map((field, index) => (
          <div key={index}>
            <div className="flex w-full justify-between items-center mb-3">
              <h4 className="w-[40%] text-sm font-medium text-osdag-text-primary dark:text-white">
                {field.label}
              </h4>
              {renderField(field)}
            </div>
            {(field.type === 'connectivitySelect' || field.type === 'endPlateSelect') && imageSource && (
              <div className="flex justify-center">
                <img
                  src={imageSource}
                  alt="Connection type"
                  className="w-[100px] h-[100px] object-contain"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};