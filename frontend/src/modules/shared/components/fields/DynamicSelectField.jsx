import Select from 'react-select';
import { getOptionsForField, toSelectOptions } from '../../utils/fieldOptionUtils';
import { selectBaseProps } from './common';

/**
 * A dropdown whose options come from the field's `getOptions(inputs, contextData)`.
 */
export const DynamicSelectField = ({ field, ctx }) => {
  const { rawInputs, setInputs, isInputLocked, contextData, fieldErrors } = ctx;
  const options = toSelectOptions(getOptionsForField(field, contextData, ctx.inputs));
  const value = options.find((opt) => String(opt.value) === String(rawInputs[field.key]));
  return (
    <Select
      {...selectBaseProps(field, fieldErrors)}
      options={options}
      value={value}
      isDisabled={isInputLocked}
      onChange={(selected) => setInputs({ ...rawInputs, [field.key]: selected.value })}
      menuPortalTarget={document.body}
      isSearchable={false}
    />
  );
};
