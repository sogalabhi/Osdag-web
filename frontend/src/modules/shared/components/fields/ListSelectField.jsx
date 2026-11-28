import Select from 'react-select';
import { getOptionsForField, toSelectOptions } from '../../utils/fieldOptionUtils';
import { selectBaseProps } from './common';

/**
 * The module list a connectivity or end plate field falls back to when it declares no options.
 */
const FALLBACK_LIST = {
  connectivitySelect: 'connectivityList',
  endPlateSelect: 'endPlateList',
};

/**
 * A dropdown for the connectivity or the end plate type. Choosing a value stores it, clears the
 * output and runs the field's `onChange(value, context)`.
 */
export const ListSelectField = ({ field, ctx }) => {
  const { inputs, setInputs, isInputLocked, contextData, extraState, setExtraState, fieldErrors } = ctx;
  let list = getOptionsForField(field, contextData, inputs);
  if (!list || list.length === 0) {
    list = contextData[FALLBACK_LIST[field.type]] || [];
  }
  const options = toSelectOptions(list);
  const value = options.find((opt) => String(opt.value) === String(inputs[field.key])) || options[0] || null;
  return (
    <Select
      {...selectBaseProps(field, fieldErrors)}
      options={options}
      value={value}
      isDisabled={isInputLocked}
      isSearchable={false}
      onChange={(selected) => {
        const val = selected.value;
        setInputs((prev) => ({ ...prev, [field.key]: val, output: null }));
        if (typeof field.onChange === "function") {
          field.onChange(val, { inputs, setInputs, contextData, extraState, setExtraState });
        }
      }}
      menuPortalTarget={document.body}
    />
  );
};
