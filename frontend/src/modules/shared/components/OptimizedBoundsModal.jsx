import React from "react";
import { Modal } from "antd";

export const OptimizedBoundsModal = ({
  isOpen,
  fieldLabel,
  values,
  onChange,
  onCancel,
  onSave,
}) => {
  const safeValues = values || { lb: "", ub: "", inc: "" };

  return (
    <Modal
      width={window.innerWidth < 768 ? "90%" : 420}
      open={isOpen}
      onCancel={onCancel}
      onOk={onSave}
      centered
      styles={{
        body: {
          textAlign: "center",
          padding: "0px 0px !important",
          boxSizing: "content-box",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        },
      }}
    >
      <div style={{ background: "transparent", fontWeight: "bold" }}>
        {fieldLabel ? `Set Bounds - ${fieldLabel}` : "Set Bounds"}
      </div>
      <div className="grid gap-4 bg-white p-5 rounded-lg w-[300px] shadow-lg">
        <div className="grid grid-cols-3 w-full">
          <div className="grid text-left content-center">Lower Bounds</div>
          <input
            type="number"
            value={String(safeValues.lb ?? "")}
            onChange={(e) => onChange({ ...safeValues, lb: e.target.value })}
            className="grid col-start-2 col-end-4 h-9 border border-gray-400 rounded-md px-3 text-sm focus:border-osdag-green focus:ring-2 focus:ring-osdag-green/20 outline-none"
          />
        </div>
        <div className="grid justify-between grid-cols-3">
          <div className="grid text-left content-center">Upper Bounds</div>
          <input
            type="number"
            value={String(safeValues.ub ?? "")}
            onChange={(e) => onChange({ ...safeValues, ub: e.target.value })}
            className="grid col-start-2 col-end-4 h-9 border border-gray-400 rounded-md px-3 text-sm focus:border-osdag-green focus:ring-2 focus:ring-osdag-green/20 outline-none"
          />
        </div>
        <div className="grid justify-between grid-cols-3">
          <div className="grid text-left content-center">Increment</div>
          <input
            type="number"
            value={String(safeValues.inc ?? "")}
            onChange={(e) => onChange({ ...safeValues, inc: e.target.value })}
            className="grid col-start-2 col-end-4 h-9 border border-gray-400 rounded-md px-3 text-sm focus:border-osdag-green focus:ring-2 focus:ring-osdag-green/20 outline-none"
          />
        </div>
      </div>
    </Modal>
  );
};

