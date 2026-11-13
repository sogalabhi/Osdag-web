import React, { useState } from 'react';
import { Modal } from 'antd';
import LabelText from "./outputDock/LabelText";
import { OutputPopup } from "./outputDock/OutputPopup";
import { dialogWidth, hasDialog } from "./outputDock/dialogDrawings";
import { widestPopupImage } from "./outputDock/popupLayout";
import { useViewport } from "../hooks/useViewport";

// Read-only value box styled like input (transparent bg, grey border).
// min-h instead of a fixed h so long values wrap and grow the box
// instead of clipping or spilling outside it.
const ValueBox = ({ value }) => {
  const display = value !== undefined && value !== null && value !== '' ? String(value) : ' ';
  return (
    <div className="w-[45%]">
      <div
        title={display !== ' ' ? display : undefined}
        className="w-full min-h-9 border border-gray-400 rounded-md px-3 py-1.5 text-sm flex items-center break-words whitespace-normal bg-transparent dark:bg-transparent text-gray-800 dark:text-gray-100"
      >
        {display}
      </div>
    </div>
  );
};

const POPUP_MIN_WIDTH = 480;

/**
 * The output dock, drawn from the engine's output list (see `output_layout` in the design
 * result). `layout` is the list of sections: [{ title, visible, items }], where an item is a
 * read-only field or a button that opens a popup. The buttons work only when `buttonsEnabled`.
 */
export const BaseOutputDock = React.memo(({
  layout,
  buttonsEnabled = false,
  handleCreateDesignReport,
  saveOutput,
}) => {
  const { isMobile } = useViewport();
  const [openButton, setOpenButton] = useState(null);

  const renderItem = (item) => {
    if (!item.visible) return null;
    return (
      <div
        key={item.key}
        data-output-key={item.key}
        className="flex w-full justify-between items-center mb-3"
      >
        <h4 className="w-[55%] text-sm font-medium text-osdag-text-primary dark:text-white">
          <LabelText>{item.label}</LabelText>
        </h4>
        {item.type === "button" ? (
          <div className="w-[45%]">
            <input
              type="button"
              className="w-full h-9 border border-gray-400 rounded-md px-3 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-500 cursor-pointer text-gray-800 dark:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              value={item.button_text}
              disabled={!buttonsEnabled}
              onClick={() => setOpenButton(item)}
            />
          </div>
        ) : (
          <ValueBox value={item.value} />
        )}
      </div>
    );
  };

  const popupWidth = isMobile
    ? "95%"
    : hasDialog(openButton?.dialog)
      ? dialogWidth(openButton.dialog)
      : Math.max(POPUP_MIN_WIDTH, 380 + widestPopupImage(openButton?.popup));

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        <div className="p-2">
          <p className="ml-2 p-1 inline-block bg-osdag-green text-white rounded">Output Dock</p>
        </div>
        <div className="flex-1 overflow-y-auto subMainBody scroll-data min-h-0 pb-20">
          {(layout || []).map((section, index) => {
            if (!section.visible) return null;
            // A title with no fields is only a heading for the groups after it.
            if (section.items.length === 0) {
              return (
                <h3 key={index} data-output-section={section.title} className="mx-4 mb-5 text-base font-bold text-black dark:text-white">
                  <LabelText>{section.title}</LabelText>
                </h3>
              );
            }
            return (
              <div key={index} className="cards" data-output-section={section.title}>
                <h3 className="text-black dark:text-white"><LabelText>{section.title}</LabelText></h3>
                <div className="component-grid">
                  {section.items.map(renderItem)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions - sticky at bottom; scroll area has padding so last content is not hidden */}
        {(handleCreateDesignReport || saveOutput) && (
          <div className="sticky bottom-0 flex-shrink-0 z-10 bg-white dark:bg-osdag-dark-color border-t border-gray-200 dark:border-gray-700 flex items-center w-full gap-x-4 px-5 py-2">
            {handleCreateDesignReport && (
              <button
                onClick={handleCreateDesignReport}
                className="flex flex-1 items-center justify-center gap-x-2 bg-osdag-green text-white text-sm font-semibold px-3 py-2.5 rounded-lg shadow-md duration-200 hover:bg-osdag-dark-green whitespace-nowrap"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#FFFFFF" className="flex-shrink-0">
                  <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h168q13-36 43.5-58t68.5-22q38 0 68.5 22t43.5 58h168q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm80-80h280v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Zm200-190q13 0 21.5-8.5T510-820q0-13-8.5-21.5T480-850q-13 0-21.5 8.5T450-820q0 13 8.5 21.5T480-790ZM200-200v-560 560Z" />
                </svg>
                Generate Report
              </button>
            )}
            {saveOutput && (
              <button
                onClick={saveOutput}
                className="flex flex-1 items-center justify-center gap-x-2 bg-osdag-green text-white text-sm font-semibold px-3 py-2.5 rounded-lg shadow-md duration-200 hover:bg-osdag-dark-green whitespace-nowrap"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#FFFFFF" className="flex-shrink-0">
                  <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" />
                </svg>
                Save Output
              </button>
            )}
          </div>
        )}
      </div>

      {/* Popup of the pressed button */}
      <Modal
        open={!!openButton}
        onCancel={() => setOpenButton(null)}
        footer={null}
        width={popupWidth}
        style={{ maxWidth: "calc(100vw - 16px)" }}
        title={openButton?.popup_title}
        className="[&_.ant-modal-header]:bg-transparent [&_.ant-modal-close]:right-4"
        destroyOnHidden
      >
        {openButton && <OutputPopup rows={openButton.popup} error={openButton.error} dialog={openButton.dialog} />}
      </Modal>
    </>
  );
});
BaseOutputDock.displayName = "BaseOutputDock";
