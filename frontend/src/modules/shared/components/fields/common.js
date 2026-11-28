const baseSelectStyles = {
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base) => ({
    ...base,
    minHeight: 35,
    lineHeight: '1',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  control: (base) => ({
    ...base,
    borderColor: '#000',
    '&:hover': {
      borderColor: '#91B014',
    },
  }),
  menu: (base) => ({
    ...base,
    minWidth: 'max-content',
  }),
};

export const errorIdFor = (field) => `field-error-${field.key}`;

/** Whether the field has an error message in `fieldErrors`. */
export const fieldHasError = (field, fieldErrors) => Boolean(field.key && fieldErrors[field.key]);

/**
 * The react-select props every field dropdown shares: the styles (a field with an error is outlined
 * in red), the accessibility attributes of an error, the class prefix and the width.
 */
export function selectBaseProps(field, fieldErrors) {
  const error = fieldHasError(field, fieldErrors);
  const styles = error
    ? {
        ...baseSelectStyles,
        control: (base, state) => ({
          ...baseSelectStyles.control(base, state),
          borderColor: '#c62828',
          '&:hover': { borderColor: '#c62828' },
        }),
      }
    : baseSelectStyles;
  return {
    styles,
    ...(error ? { 'aria-invalid': true, 'aria-errormessage': errorIdFor(field) } : {}),
    classNamePrefix: 'react-select',
    className: 'w-[60%]',
  };
}
