/**
 * A picture chosen by the field's `imageSource(extraState, inputs)`, shown while its
 * `conditionalDisplay()` is true.
 */
export const ImageField = ({ field, ctx }) => {
  const { inputs, extraState } = ctx;
  return (
    <>
      {field.conditionalDisplay() && (
        <div className="flex justify-center">
          <img
            src={field.imageSource(extraState, inputs)}
            alt="Connection type"
            style={{ width: field.width || '100px', height: field.height || '100px', objectFit: 'contain' }}
          />
        </div>
      )}
    </>
  );
};
