import { stripRequiredMark } from '../../utils/validation';
import { errorIdFor, fieldHasError } from './common';

/**
 * A text box. With `isNumeric` it keeps only digits, one decimal point and a leading minus sign.
 */
export const NumericInput = ({ field, ctx, isNumeric }) => {
  const { inputs, setInputs, isInputLocked, fieldErrors } = ctx;
  const error = fieldHasError(field, fieldErrors);
  return (
    <div className="w-[60%]">
      <input
        type="text"
        inputMode={isNumeric ? 'decimal' : 'text'}
        value={inputs[field.key] ?? ""}
        onChange={(e) => {
          let val = e.target.value;
          if (isNumeric) {
            val = val.replace(/[^0-9.-]/g, '');
            const decimalCount = (val.match(/\./g) || []).length;
            if (decimalCount > 1) {
              const firstDecimalIdx = val.indexOf('.');
              val = val.slice(0, firstDecimalIdx + 1) + val.slice(firstDecimalIdx + 1).replace(/\./g, '');
            }
            if (val.includes('-')) {
              const isNegative = val.startsWith('-');
              val = val.replace(/-/g, '');
              if (isNegative) {
                val = '-' + val;
              }
            }
          }
          setInputs({ ...inputs, [field.key]: val });
        }}
        onKeyDown={(e) => {
          if (isNumeric) {
            const allowedKeys = [
              'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
              'Home', 'End', 'ArrowLeft', 'ArrowRight', '.', '-'
            ];
            const isShortcut = (e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase());

            if (e.key === ' ') {
              e.preventDefault();
              return;
            }

            if (!allowedKeys.includes(e.key) && !isShortcut && isNaN(Number(e.key))) {
              e.preventDefault();
            }
          }
        }}
        placeholder={field.placeholder || `ex. ${stripRequiredMark(field.label)}`}
        disabled={field.disabled || isInputLocked}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorIdFor(field) : undefined}
        className={`w-full h-9 border ${error ? 'border-red-600' : 'border-gray-400'} rounded-md px-3 text-sm focus:border-osdag-green focus:ring-2 focus:ring-osdag-green/20 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70`}
      />
    </div>
  );
};

/** A number box. */
export const NumberField = ({ field, ctx }) => <NumericInput field={field} ctx={ctx} isNumeric />;

/** A text box; it filters like a number box when the field itself is declared a number. */
export const TextField = ({ field, ctx }) => (
  <NumericInput field={field} ctx={ctx} isNumeric={field.type === 'number'} />
);
