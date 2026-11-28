import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { Modal } from 'antd';
import { getOptionsForField, getListForInputKey, optionText, firstOptionValue, toSelectOptions, comparableOption } from '../utils/fieldOptionUtils';
import { stripRequiredMark } from '../utils/validation';
import { ModuleContext } from "../../../context/ModuleState";
import CustomMaterialModal from "./CustomMaterialModal";
import { fieldComponentFor } from './fields';
import { errorIdFor, fieldHasError } from './fields/common';

const EMPTY_LIST = [];
const NO_ERRORS = {};

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Field callbacks.
 *
 * A field of type `connectivitySelect`, `endPlateSelect` or `sectionProfileList` may declare
 * `onChange(value, context)`, called after the widget has stored the chosen value. `context` is
 * `{ inputs, setInputs, contextData, extraState, setExtraState }`: the inputs and extra state as
 * rendered, the two state setters and the module's data lists.
 *
 * A field of type `image`, `connectivitySelect` or `endPlateSelect` may declare
 * `imageSource(extraState, inputs)`, which returns the picture to show for the current state.
 */
export const InputSection = ({
  section,
  inputs,
  setInputs,
  isInputLocked,
  selectionStates,
  updateSelectionState,
  updateModalState,
  toggleAllSelected,
  contextData,
  extraState = {},
  setExtraState = () => { },
  updateSelectedItems = () => { },
  setModalDynamicSrc,
  onRefetchModuleOptions,
  fieldErrors = NO_ERRORS,
  onClearFieldError,
}) => {
  const safeInputs = inputs || {};
  // The picture a connectivity or end plate type field declares through `imageSource`.
  const fieldImage = (field) => (typeof field.imageSource === 'function' ? field.imageSource(extraState, safeInputs) : null);
  const [showCustomMaterialModal, setShowCustomMaterialModal] = useState(false);
  const [customMaterialType, setCustomMaterialType] = useState("connector");
  // Field whose optimization bounds modal is open (for optimized_number fields)
  const [boundsModalField, setBoundsModalField] = useState(null);
  const { materialList: contextMaterialList = EMPTY_LIST } = useContext(ModuleContext);
  const safeContextData = useMemo(() => ({
    ...(contextData || {}),
    materialList:
      contextMaterialList.length > 0
        ? contextMaterialList
        : contextData?.materialList || [],
  }), [contextData, contextMaterialList]);

  // A field with an error is outlined in red and flagged to assistive technology.
  const hasError = (field) => fieldHasError(field, fieldErrors);

  // An edit of a field clears the error shown for it.
  const previousInputs = useRef(safeInputs);
  useEffect(() => {
    const before = previousInputs.current;
    previousInputs.current = safeInputs;
    if (!onClearFieldError) return;
    for (const key of Object.keys(fieldErrors)) {
      if (!sameValue(before[key], safeInputs[key])) onClearFieldError(key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeInputs]);

  useEffect(() => {
    setInputs((prev) => {
      let isChanged = false;
      const nextInputs = { ...prev };

      section.fields.forEach((field) => {
        if (field.type !== 'select' && field.type !== 'connectivitySelect' && field.type !== 'endPlateSelect') return;

        let rawList = getOptionsForField(field, safeContextData, prev);
        if (!rawList || rawList.length === 0) {
          if (field.type === 'connectivitySelect') {
            rawList = safeContextData.connectivityList || [];
          } else if (field.type === 'endPlateSelect') {
            rawList = safeContextData.endPlateList || [];
          }
        }

        if (!rawList || rawList.length === 0) return;

        const isCustomizable = Boolean(field.selectionKey);
        if (isCustomizable) return;

        // Determine first option value (1st element in array)
        const firstValue = firstOptionValue(rawList);

        const current = nextInputs[field.key];
        const opts = toSelectOptions(rawList);
        const currentExistsInOptions = opts.some(opt => comparableOption(opt.value) === comparableOption(current));

        if (current === undefined || current === null || current === '' || !currentExistsInOptions) {
          nextInputs[field.key] = firstValue;
          isChanged = true;
        }
      });
      return isChanged ? nextInputs : prev;
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeContextData, section.fields]);

  // A dynamic dropdown whose value is not among its current options takes the first option, or
  // empties when there are none, so the displayed value and the stored value agree.
  const dynamicSelectState = section.fields
    .filter((f) => f.type === 'dynamicSelect')
    .map((f) => JSON.stringify([f.key, safeInputs[f.key] ?? null, getOptionsForField(f, safeContextData, safeInputs).map((o) => (o && typeof o === 'object' ? o.value : o))]))
    .join('|');
  useEffect(() => {
    setInputs((prev) => {
      const current = prev || {};
      const next = { ...current };
      let isChanged = false;
      section.fields.forEach((field) => {
        if (field.type !== 'dynamicSelect') return;
        const values = getOptionsForField(field, safeContextData, current).map((o) => (o && typeof o === 'object' ? o.value : o));
        const value = current[field.key];
        if (values.some((v) => String(v) === String(value))) return;
        const replacement = values.length > 0 ? values[0] : '';
        if (value === undefined && replacement === '') return;
        if (value === replacement) return;
        next[field.key] = replacement;
        isChanged = true;
      });
      return isChanged ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicSelectState]);

  const handleCustomizableSelect = (field, value) => {
    const getAllValuesForInputKey = (inputKey) => {
      if (field?.getDynamicDataSource) {
        const options = field.getDynamicDataSource(inputs, contextData);
        setModalDynamicSrc((modalDynSrc) => ({ ...modalDynSrc, [field.key]: options }));
        return options;
      }
      return getListForInputKey(inputKey, safeContextData, field.dataSource);
    };

    if (value === "Customized") {
      // Get all available values
      const allValues = getAllValuesForInputKey(field.key);
      // Convert to array of keys/strings for Transfer component
      const allKeys = allValues.map(optionText);

      const isCurrentlyCustomized = selectionStates?.[field.selectionKey] === "Customized";
      if (!isCurrentlyCustomized) {
        // Set all items as selected (moved to right side) - this populates the Transfer component
        updateSelectedItems(field.key, allKeys);
        // Also update inputs with all values
        setInputs({ ...safeInputs, [field.key]: allKeys });
      }
      updateSelectionState(field.selectionKey, "Customized");
      updateModalState(field.modalKey, true);
      toggleAllSelected(field.key, false);
    } else {
      // "All" option - get all values and set them in inputs 
      const allValues = getAllValuesForInputKey(field.key);
      // Convert to array format if needed
      const allValuesArray = allValues.map(optionText);
      setInputs({ ...safeInputs, [field.key]: allValuesArray });
      // Clear selectedItems since we're using "All" (not managed via Transfer)
      updateSelectedItems(field.key, []);
      updateSelectionState(field.selectionKey, "All");
      updateModalState(field.modalKey, false);
      toggleAllSelected(field.key, true); // fix allSelected flag not triggering
    }
  };

  const fieldContext = {
    inputs: safeInputs,
    rawInputs: inputs,
    setInputs,
    isInputLocked,
    section,
    contextData: safeContextData,
    extraState,
    setExtraState,
    selectionStates,
    fieldErrors,
    updateModalState,
    handleCustomizableSelect,
    openCustomMaterial: (type) => {
      setCustomMaterialType(type);
      setShowCustomMaterialModal(true);
    },
    openBounds: setBoundsModalField,
  };

  const renderField = (field) => {
    if (field.conditionalDisplay && !field.conditionalDisplay(extraState, safeInputs)) return null;

    // A field may resolve its type from the inputs (plate girder switches between number and
    // customizable on Customized vs Optimized design type).
    const effectiveType = typeof field.conditionalType === 'function'
      ? field.conditionalType(safeInputs)
      : field.type;

    const FieldComponent = fieldComponentFor(effectiveType, field.key);
    return FieldComponent ? <FieldComponent field={field} ctx={fieldContext} /> : null;
  };

  return (
    <div className="bg-white dark:bg-osdag-dark-color/90 border-2 border-osdag-green rounded-xl mb-5 mx-4 shadow-sm relative pt-4">
      <h3 className="text-base font-bold text-osdag-text-primary dark:text-white bg-white dark:bg-osdag-dark-color px-1 absolute -top-4 left-4">
        {section.title}
      </h3>
      <div className="flex flex-col w-full p-4 pt-2">
        {section.fields.map((field, index) => {
          // Entire label+input row is hidden if conditionalDisplay fails
          if (field.conditionalDisplay && !field.conditionalDisplay(extraState, safeInputs)) return null;
          return (
            <div key={index}>
              <div className="flex w-full justify-between items-center mb-3">
                <h4 className="w-[40%] text-sm font-medium text-osdag-text-primary dark:text-white">
                  {stripRequiredMark(field.label)}{field.required !== false && field.type !== 'image' ? ' *' : ''}
                </h4>
                {renderField(field)}
              </div>
              {hasError(field) && (
                <p
                  id={errorIdFor(field)}
                  data-testid={errorIdFor(field)}
                  className="text-red-600 text-xs -mt-2 mb-3 ml-[40%]"
                >
                  {fieldErrors[field.key]}
                </p>
              )}
              {(field.type === 'connectivitySelect' || field.type === 'endPlateSelect') && fieldImage(field) && (
                <div className="flex justify-center">
                  <img
                    src={fieldImage(field)}
                    alt="Connection type"
                    className="w-[150px] h-[100px] object-contain"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showCustomMaterialModal && (
        <CustomMaterialModal
          showModal={showCustomMaterialModal}
          setShowModal={setShowCustomMaterialModal}
          setInputValues={setInputs}
          inputValues={safeInputs}
          type={customMaterialType}
          materialList={safeContextData.materialList || []}
          onRefetchModuleOptions={onRefetchModuleOptions}
        />
      )}
      {boundsModalField && (
        <Modal
          open={!!boundsModalField}
          title={`Set Optimization Bounds - ${stripRequiredMark(boundsModalField.label)?.trim()}`}
          onCancel={() => setBoundsModalField(null)}
          onOk={() => setBoundsModalField(null)}
          okText="Done"
          width={420}
          className="[&_.ant-modal-header]:bg-transparent [&_.ant-modal-close]:right-4"
        >
          <div className="flex flex-col gap-3 py-2">
            {[
              { suffix: 'lb', label: 'Lower Bound (mm)' },
              { suffix: 'ub', label: 'Upper Bound (mm)' },
              { suffix: 'inc', label: 'Increment (mm)' },
            ].map(({ suffix, label }) => {
              const boundKey = `${boundsModalField.key}_${suffix}`;
              return (
                <div key={suffix} className="flex items-center justify-between">
                  <span className="text-sm w-1/2">{label}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={safeInputs[boundKey] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setInputs({ ...safeInputs, [boundKey]: val });
                    }}
                    placeholder={label}
                    className="w-[45%] h-9 border border-gray-400 rounded-md px-3 text-sm focus:border-osdag-green focus:ring-2 focus:ring-osdag-green/20 outline-none"
                  />
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
};
