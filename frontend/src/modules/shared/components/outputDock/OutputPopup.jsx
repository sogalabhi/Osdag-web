import { useState } from "react";
import { apiBase } from "../../../../api";
import LabelText from "./LabelText";
import OutputDialog from "./OutputDialog";
import { hasDialog } from "./dialogDrawings";
import { arrangePopup } from "./popupLayout";

// Read-only value box, the same look as the dock's.
const PopupValue = ({ value }) => (
  <div
    title={value || undefined}
    className="w-28 min-h-8 border border-gray-400 rounded-md px-2 py-1 text-sm flex items-center break-words whitespace-normal text-gray-800"
  >
    {value}
  </div>
);

const imageUrl = (src) => (src ? `${apiBase.replace(/\/$/, "")}${src}` : null);

/**
 * One popup image with its caption. Sized from the engine's width and height, and scaled down
 * to fit a narrow screen. An image the server cannot provide leaves an empty white box.
 */
const PopupImage = ({ image }) => {
  const [failed, setFailed] = useState(false);
  const url = imageUrl(image.src);
  const box = {
    width: image.width,
    maxWidth: "100%",
    aspectRatio: `${image.width} / ${image.height}`,
  };
  return (
    <figure className="m-0 flex flex-col items-center gap-1" style={{ maxWidth: "100%" }}>
      {url && !failed ? (
        <img
          src={url}
          alt={image.caption || ""}
          style={{ ...box, height: "auto", objectFit: "fill", backgroundColor: "white" }}
          onError={() => setFailed(true)}
        />
      ) : (
        <div style={{ ...box, backgroundColor: "white" }} />
      )}
      {image.caption && (
        <figcaption className="text-xs text-center text-gray-800">{image.caption}</figcaption>
      )}
    </figure>
  );
};

export const OutputPopup = ({ rows, error, dialog }) => {
  if (error) {
    return <p className="text-sm text-gray-800">The details of this design could not be loaded.</p>;
  }
  // A button the desktop opens a drawing dialog for; any other shows the popup rows.
  if (hasDialog(dialog)) return <OutputDialog dialog={dialog} />;
  const { notes, blocks } = arrangePopup(rows);
  return (
    <div className="flex flex-col gap-3" data-output-popup>
      {notes.map((text, index) => (
        <p key={index} className="m-0 text-sm text-gray-800">
          Note: <LabelText>{text}</LabelText>
        </p>
      ))}
      {blocks.map((block, index) => {
        const images = [...(block.image ? [block.image] : []), ...block.images];
        return (
          <section key={index} className={index > 0 ? "border-t border-gray-300 pt-3" : ""}>
            {block.title && (
              <h4 className="m-0 mb-2 text-sm font-bold text-osdag-text-primary">
                <LabelText>{block.title}</LabelText>
              </h4>
            )}
            <div className="flex flex-wrap gap-4 items-start">
              <div className="flex flex-col gap-2 flex-1 min-w-[16rem]">
                {block.fields.map((field, fieldIndex) => (
                  <div
                    key={`${field.key}-${fieldIndex}`}
                    className="flex items-center justify-between gap-3"
                    data-output-key={field.key}
                  >
                    <span className="text-sm text-osdag-text-primary">
                      <LabelText>{field.label}</LabelText>
                    </span>
                    {field.type === "field" && <PopupValue value={field.value} />}
                  </div>
                ))}
              </div>
              {images.length > 0 && (
                <div className="flex flex-col items-center gap-3 max-w-full">
                  {images.map((image, imageIndex) => (
                    <PopupImage key={imageIndex} image={image} />
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default OutputPopup;
