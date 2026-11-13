import PlateFractureDiagram from "../diagrams/PlateFractureDiagram";
import LabelText from "./LabelText";
import { DIALOGS, FRACTURES } from "./dialogDrawings";

const Fields = ({ fields }) => (
  <>
    {fields.map((field, index) => (
      <div key={index} className="flex items-baseline justify-between gap-3 py-0.5 text-sm text-osdag-text-primary">
        <span>
          <LabelText>{field.label}</LabelText>
        </span>
        <span className="font-bold text-right">{field.value}</span>
      </div>
    ))}
  </>
);

const hasPanel = (dialog) => !!dialog.note || !!dialog.footnote || dialog.sections.length > 0;

const LeftPanel = ({ dialog }) => (
  <div className="flex flex-col gap-1 min-w-[14rem] flex-1">
    {dialog.note && (
      <p className="m-0 mb-2 text-base whitespace-pre-line text-gray-800">Note: {dialog.note}</p>
    )}
    {dialog.sections.map((section, index) => (
      <div key={index} className="flex flex-col">
        {section.title && (
          <h4 className="m-0 mt-3 mb-1 text-sm font-bold text-osdag-text-primary">{section.title}</h4>
        )}
        <Fields fields={section.fields} />
      </div>
    ))}
    {dialog.footnote && <p className="m-0 mt-2 text-xs italic text-gray-700">{dialog.footnote}</p>}
  </div>
);

// Drawings keep their own light background, as the popup images do, so they read in both themes.
const Drawing = ({ title, children }) => (
  <figure className="m-0 flex flex-col gap-1 min-w-0">
    {title && <figcaption className="text-sm font-bold text-osdag-text-primary">{title}</figcaption>}
    <div className="flex justify-center rounded-md border border-gray-300 bg-white p-2 overflow-x-auto">{children}</div>
  </figure>
);

const FractureCards = ({ dialog }) => {
  const { patterns, subject } = FRACTURES[dialog.id];
  const { values } = dialog;
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: patterns }, (_, index) => index + 1).map((pattern) => (
        <section
          key={pattern}
          className="flex flex-wrap gap-4 items-center rounded-md border border-gray-300 p-3"
        >
          <div className="flex flex-col gap-1 flex-1 min-w-[14rem]">
            <h4 className="m-0 mb-1 text-sm font-bold text-osdag-text-primary">
              {`Failure Pattern ${pattern} – Tension in ${subject}`}
            </h4>
            {dialog.sections.map((section, index) => (
              <Fields key={index} fields={section.fields} />
            ))}
          </div>
          <div className="flex justify-center rounded-md border border-gray-300 bg-white p-2 flex-1 min-w-[14rem]">
            <PlateFractureDiagram
              rows={values.rows}
              cols={values.cols}
              orientation={values.orientation}
              variant={values.variant}
              pattern={pattern}
              className="w-full max-w-[340px]"
            />
          </div>
        </section>
      ))}
    </div>
  );
};

/** One dialog: its left panel next to its drawings, or the cards of a fracture dialog. */
export const OutputDialog = ({ dialog }) => {
  if (dialog.id in FRACTURES) return <FractureCards dialog={dialog} />;
  const drawings = DIALOGS[dialog.id](dialog.values);
  return (
    <div className="flex flex-wrap gap-4 items-start" data-output-dialog={dialog.id}>
      {hasPanel(dialog) && <LeftPanel dialog={dialog} />}
      <div className="flex flex-col gap-3 flex-[2] min-w-[18rem]">
        {drawings.map((drawing, index) => (
          <Drawing key={index} title={drawing.title}>
            {drawing.node}
          </Drawing>
        ))}
      </div>
    </div>
  );
};

export default OutputDialog;
