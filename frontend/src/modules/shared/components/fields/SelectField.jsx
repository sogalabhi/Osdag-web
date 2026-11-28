import Select from 'react-select';
import { getOptionsForField, toSelectOptions, comparableOption } from '../../utils/fieldOptionUtils';
import { selectBaseProps } from './common';

/**
 * A dropdown over the field's options. A field with a `selectionKey` shows "All" until it is
 * customized, then a multi-select over the same options.
 */
export const SelectField = ({ field, ctx }) => {
  const { inputs, setInputs, isInputLocked, section, contextData, selectionStates, fieldErrors, openCustomMaterial } = ctx;
  const base = selectBaseProps(field, fieldErrors);
  const rawList = getOptionsForField(field, contextData, inputs);
  const options = toSelectOptions(rawList);

  if (field.selectionKey) {
    if (selectionStates?.[field.selectionKey] !== 'Customized') {
      return (
        <Select
          {...base}
          value={{ label: "All", value: "All" }}
          isDisabled={true}
          isSearchable={false}
        />
      );
    }
    const currentValue = (Array.isArray(inputs[field.key]) ? inputs[field.key] : [])
      .map((val) => ({ value: val, label: val }));

    return (
      <Select
        {...base}
        isMulti
        options={options}
        value={currentValue}
        isDisabled={isInputLocked}
        isSearchable={false}
        onChange={(selectedOptions) => {
          const newValues = selectedOptions.map((opt) => opt.value);
          setInputs({ ...inputs, [field.key]: newValues });
        }}
        menuPortalTarget={document.body}
      />
    );
  }

  if (!rawList || rawList.length === 0) {
    return (
      <Select
        {...base}
        isDisabled={true}
        placeholder="No data available"
        isSearchable={false}
      />
    );
  }

  // Same comparison as the default-option check of the input section, so a value it accepts is also shown.
  const value = options.find((opt) => comparableOption(opt.value) === comparableOption(inputs[field.key]));

  return (
    <Select
      {...base}
      options={options}
      value={value}
      isDisabled={isInputLocked}
      isSearchable={false}
      onChange={(selected) => {
        // `customMaterial` names the kind of material the field holds ('connector', 'supported', 'supporting').
        if (field.customMaterial && selected.value === 'Custom') {
          openCustomMaterial(field.customMaterial);
          return;
        }
        const nextInputs = { ...inputs, [field.key]: selected.value };
        // A dynamic dropdown that names this field in `resetsWith` takes the first option of its
        // new list whenever the user picks a value here.
        section.fields.forEach((dependent) => {
          if (dependent.type !== 'dynamicSelect' || dependent.resetsWith !== field.key) return;
          const values = getOptionsForField(dependent, contextData, nextInputs).map((o) => (o && typeof o === 'object' ? o.value : o));
          nextInputs[dependent.key] = values.length > 0 ? values[0] : '';
        });
        setInputs(nextInputs);
      }}
      menuPortalTarget={document.body}
    />
  );
};
