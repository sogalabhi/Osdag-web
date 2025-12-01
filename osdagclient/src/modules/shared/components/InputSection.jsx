import React, { useState, useEffect } from 'react';
import Select from 'react-select'; // Re-integrated react-select
import FRM from "../../../assets/flush_ep.png";
import EOWIM from "../../../assets/owe_ep.png";
import EBWRM from "../../../assets/extended.png";
import CFBW from "../../../assets/ShearConnection/sc_fin_plate/fin_cf_bw.png";
import CWBW from "../../../assets/ShearConnection/sc_fin_plate/fin_cw_bw.png";
import BB from "../../../assets/ShearConnection/sc_fin_plate/fin_beam_beam.png";
import ANGLE_SECTION from "../../../assets/TensionMember/com1_1.png";
import BACK_TO_BACK_ANGLES_SAME_SIDE from "../../../assets/TensionMember/com1_2.png";
import BACK_TO_BACK_ANGLES_OPPOSITE_SIDE from "../../../assets/TensionMember/com1_3.png";
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
    option: (base) => ({
      ...base,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }),
    menu: (base) => ({
      ...base,
      minWidth: 'max-content',
    }),
  };

  // Helper to normalize lists into react-select option shape
  const toSelectOptions = (list = []) => {
    if (!list || list.length === 0) return [];
    if (typeof list[0] === 'object' && list[0] !== null) {
      // Supports objects shaped like { Grade, ... } or { value, label }
      if ('value' in list[0] && 'label' in list[0]) {
        return list;
      }
      return list.map(item => ({ value: item.Grade, label: item.Grade }));
    }
    return list.map(item => ({ value: item, label: item }));
  };


  useEffect(() => {
    // Check for section profile first (takes priority)
    const sectionProfileField = section.fields.find(
      (f) => f.type === 'sectionProfileSelect'
    );
    if (sectionProfileField) {
      const profileValue = extraState.selectedProfile || safeInputs[sectionProfileField.key] || sectionProfileField.defaultValue;
      if (profileValue) {
        const sectionProfileMap = {
          "Angles": ANGLE_SECTION,
          "Back to Back Angles - Same side of gusset": BACK_TO_BACK_ANGLES_SAME_SIDE,
          "Back to Back Angles - Opposite side of gusset": BACK_TO_BACK_ANGLES_OPPOSITE_SIDE,
        };
        setImageSource(sectionProfileMap[profileValue] || ErrorImg);
        return; // Exit early if section profile is found
      }
    }

    // Handle connectivity/endplate images
    if (extraState.selectedOption) {
      const imageMap = {
        "Column Flange-Beam-Web": CFBW, "Column Web-Beam-Web": CWBW, "Beam-Beam": BB,
        "Flushed - Reversible Moment": FRM, "Extended One Way - Irreversible Moment": EOWIM, "Extended Both Ways - Reversible Moment": EBWRM,
      };
      setImageSource(imageMap[extraState.selectedOption] || ErrorImg);
    } else {
      // Clear image if no selection
      setImageSource("");
    }
  }, [extraState.selectedOption, extraState.selectedProfile, safeInputs, section.fields]);

  // Set default selected values when lists/options arrive
  useEffect(() => {
    // Set defaults for regular selects
    section.fields.forEach((field) => {
      if (field.type !== 'select') return;

      // Resolve options: either a provided array on the field or a fetched list from context
      const rawList = Array.isArray(field.options)
        ? field.options
        : safeContextData[field.options];

      if (!rawList || rawList.length === 0) return;

      // Skip multi-selects managed via customizable selector
      const isMulti = ['boltDiameterList', 'thicknessList', 'propertyClassList', 'angleList'].includes(field.options);
      if (isMulti) return;

      // Determine first option value
      const first = rawList[0];
      const firstValue = typeof first === 'object' && first !== null && 'value' in first ? first.value
        : (typeof first === 'object' && first !== null && 'Grade' in first ? first.Grade : first);

      const current = safeInputs[field.key];
      const currentExistsInOptions = Array.isArray(rawList)
        ? (Array.isArray(field.options) ? rawList : toSelectOptions(rawList)).some(opt => {
            const val = Array.isArray(field.options) ? opt.value : opt.value;
            return val === current;
          })
        : false;

      if (current === undefined || current === null || current === '' || !currentExistsInOptions) {
        setInputs((prev) => ({ ...prev, [field.key]: firstValue }));
      }
    });

    // Set default for connectivity / endplate dropdowns
    const connectivityField = section.fields.find(
      (f) => f.type === 'connectivitySelect' || f.type === 'endPlateSelect'
    );
    const list = connectivityField?.type === 'connectivitySelect'
      ? (safeContextData.connectivityList || [])
      : [
          'Flushed - Reversible Moment',
          'Extended One Way - Irreversible Moment',
          'Extended Both Ways - Reversible Moment',
        ];
    if (connectivityField && !extraState.selectedOption && list && list.length > 0) {
      const first = list[0];
      const firstValue = typeof first === 'object' && first !== null && 'value' in first ? first.value
        : (typeof first === 'object' && first !== null && 'Grade' in first ? first.Grade : first);
      setExtraState((prev) => ({ ...prev, selectedOption: firstValue }));
    }

    // Set default for section profile dropdowns
    const sectionProfileField = section.fields.find(
      (f) => f.type === 'sectionProfileSelect'
    );
    if (sectionProfileField && !extraState.selectedProfile) {
      const currentValue = safeInputs[sectionProfileField.key] || sectionProfileField.defaultValue;
      if (currentValue) {
        setExtraState((prev) => ({ ...prev, selectedProfile: currentValue }));
      }
    }
  }, [safeContextData, section.fields]);

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

    switch (field.type) {
      case 'select': {
        const isMulti = ['boltDiameterList', 'thicknessList', 'propertyClassList', 'angleList'].includes(field.options);
        const rawList = Array.isArray(field.options) ? field.options : safeContextData[field.options];
        const options = Array.isArray(field.options) ? field.options : toSelectOptions(rawList);

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
              isSearchable={false}
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

        // If options are empty or not yet loaded, render disabled with placeholder
        if (!rawList || (Array.isArray(rawList) && rawList.length === 0)) {
          return (
            <Select
              isDisabled={true}
              placeholder="No data available"
              styles={customSelectStyles}
              classNamePrefix="react-select"
              className="w-[60%]"
            />
          );
        }

        const value = Array.isArray(field.options)
          ? options.find(opt => opt.value === safeInputs[field.key])
          : options.find(opt => opt.value === safeInputs[field.key]);

        return (
          <Select
            options={options}
            value={value}
            isSearchable={false}
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
            isSearchable={false}
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

      case 'sectionProfileSelect': {
        const options = Array.isArray(field.options) ? field.options : toSelectOptions(field.options);
        const currentValue = safeInputs[field.key] || field.defaultValue;
        const value = options.find(opt => opt.value === currentValue);
        return (
          <Select
            options={options}
            value={value}
            isSearchable={false}
            onChange={(selected) => {
              setExtraState({ ...extraState, selectedProfile: selected.value });
              if (field.onChange) {
                field.onChange(selected.value, safeInputs, setInputs, safeContextData, extraState, setExtraState);
              } else {
                setInputs({ ...safeInputs, [field.key]: selected.value });
              }
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
            isSearchable={false}
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
    <div className="bg-white dark:bg-osdag-dark-color/90 border-2 border-osdag-green rounded-xl mb-5 mx-4 shadow-sm relative pt-4">
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
            {((field.type === 'connectivitySelect' || field.type === 'endPlateSelect' || field.type === 'sectionProfileSelect') && imageSource) && (
              <div className="flex justify-center mb-4">
                <img
                  src={imageSource}
                  alt={field.type === 'sectionProfileSelect' ? "Section profile" : "Connection type"}
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