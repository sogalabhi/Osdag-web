import { NumberField } from './NumericField';

/**
 * A number box that becomes a "Set Bounds" button when the input named by the field's `optimizedBy`
 * has the value it names; the button opens the lower bound, upper bound and increment dialog.
 */
export const OptimizedNumberField = ({ field, ctx }) => {
  const { inputs, isInputLocked, openBounds } = ctx;
  const isOptimized = Boolean(field.optimizedBy) && inputs[field.optimizedBy.key] === field.optimizedBy.value;
  if (!isOptimized) {
    return <NumberField field={field} ctx={ctx} />;
  }
  const lb = inputs[`${field.key}_lb`];
  const ub = inputs[`${field.key}_ub`];
  const boundsSet = lb !== undefined && lb !== '' && ub !== undefined && ub !== '';
  return (
    <div className="w-[60%]">
      <button
        type="button"
        disabled={isInputLocked}
        onClick={() => openBounds(field)}
        className="w-full h-9 border border-gray-400 rounded-md px-3 text-sm bg-white hover:border-osdag-green hover:text-osdag-green transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {boundsSet ? `Bounds: ${lb} - ${ub}` : 'Set Bounds'}
      </button>
    </div>
  );
};
