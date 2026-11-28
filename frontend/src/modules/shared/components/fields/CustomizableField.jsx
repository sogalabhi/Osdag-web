import Select, { components } from 'react-select';
import { selectBaseProps } from './common';

const OPTIONS = [{ value: "All", label: "All" }, { value: "Customized", label: "Customized" }];

const CustomOption = (props) => {
  return (
    <components.Option {...props}>
      <div
        onClick={(e) => {
          if (props.innerProps.onClick) {
            props.innerProps.onClick(e);
          }
          if (props.data.value === 'Customized') {
            props.selectProps.onCustomizedClick(props.selectProps.field);
          }
        }}
        className="w-full h-full"
      >
        {props.children}
      </div>
    </components.Option>
  );
};

/**
 * A choice between "All" and "Customized" for a list. Choosing Customized, or clicking it again,
 * opens the field's selection dialog.
 */
export const CustomizableField = ({ field, ctx }) => {
  const { isInputLocked, selectionStates, fieldErrors, handleCustomizableSelect, updateModalState } = ctx;
  const value = OPTIONS.find((opt) => String(opt.value) === String(selectionStates?.[field.selectionKey] || "All"));
  return (
    <Select
      {...selectBaseProps(field, fieldErrors)}
      options={OPTIONS}
      value={value}
      isDisabled={isInputLocked}
      isSearchable={false}
      onChange={(selected) => handleCustomizableSelect(field, selected.value)}
      menuPortalTarget={document.body}
      components={{ Option: CustomOption }}
      onCustomizedClick={(f) => updateModalState(f.modalKey, true)}
      field={field}
    />
  );
};
