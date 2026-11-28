import Select from 'react-select';
import { getOptionsForField, toSelectOptions } from '../../utils/fieldOptionUtils';
import { selectBaseProps } from './common';

/**
 * A dropdown of section profiles. Choosing one stores it, empties the fields named in the field's
 * `resets`, records it as the selected profile and runs the field's `onChange(value, context)`.
 */
export const SectionProfileListField = ({ field, ctx }) => {
  const { inputs, setInputs, isInputLocked, contextData, extraState, setExtraState, fieldErrors } = ctx;
  const options = toSelectOptions(getOptionsForField(field, contextData, inputs));
  const currentValue = inputs[field.key] || field.defaultValue;
  const value = options.find((opt) => String(opt.value) === String(currentValue));
  return (
    <Select
      {...selectBaseProps(field, fieldErrors)}
      options={options}
      value={value}
      isDisabled={isInputLocked}
      onChange={(selected) => {
        const val = selected.value;
        setInputs((prev) => ({
          ...prev,
          [field.key]: val,
          // `resets` lists the fields a new choice here empties
          ...Object.fromEntries((field.resets || []).map((key) => [key, []])),
        }));
        setExtraState((prev) => ({
          ...prev,
          selectedProfile: val,
        }));
        if (typeof field.onChange === "function") {
          field.onChange(val, { inputs, setInputs, contextData, extraState, setExtraState });
        }
      }}
      menuPortalTarget={document.body}
      isSearchable={false}
    />
  );
};
