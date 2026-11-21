import { useContext, useState, useEffect, useMemo } from "react";
import { ModuleContext } from "../../../context/ModuleState";
import { Input, Select } from "antd";
import CustomMaterialModal from "./CustomMaterialModal";
import {
  KEY_DP_ANCHOR_BOLT_DESIGNATION_ICF,
  KEY_DP_ANCHOR_BOLT_DESIGNATION_OCF,
  KEY_DP_ANCHOR_BOLT_FRICTION,
  KEY_DP_ANCHOR_BOLT_GALVANIZED_ICF,
  KEY_DP_ANCHOR_BOLT_GALVANIZED_OCF,
  KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF,
  KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF,
  KEY_DP_ANCHOR_BOLT_LENGTH_ICF,
  KEY_DP_ANCHOR_BOLT_LENGTH_OCF,
  KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_ICF,
  KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_OCF,
  KEY_DP_ANCHOR_BOLT_TYPE_ICF,
  KEY_DP_ANCHOR_BOLT_TYPE_OCF,
} from "../../../constants/generated/coreKeys";

const { Option } = Select;

const readOnlyFontStyle = {
  color: "rgb(0 0 0 / 67%)",
  fontSize: "12px",
  fontWeight: "600",
};

const AnchorBoltSectionModal = ({
  designPrefInputs,
  setDesignPrefInputs,
  isInputLocked,
  materialList: materialsFromParent,
  suppressInitialMaterialDispatch = false,
}) => {
  const {
    manageDesignPreferences,
  } = useContext(ModuleContext);
  const materials = useMemo(() => materialsFromParent ?? [], [materialsFromParent]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (suppressInitialMaterialDispatch) return;
    const material = materials.filter(
      (value) => value.Grade === designPrefInputs.supporting_material
    );
    if (material[0]) {
      manageDesignPreferences("material_update", {
        materialType: "supporting",
        materialData: material[0],
      });
    }
  }, [suppressInitialMaterialDispatch, designPrefInputs.supporting_material, materials, manageDesignPreferences]);

  return (
    <>
      <div className="col-beam-cont">
        {/* Left Section */}
        <div className="col-left" style={{ width: "100%" }}>
          <h4>Inputs</h4>
          <div className="sub-container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            
            {/* OCF Section */}
            <div>
              <h4 style={{ marginBottom: "15px", borderBottom: "1px solid #ddd", paddingBottom: "5px" }}>
                Anchor Bolt Outside Column Flange
              </h4>

              <div className="input-cont">
                <h5>Designation</h5>
                <Input
                  type="text"
                  className="input-design-pref"
                  value={designPrefInputs[KEY_DP_ANCHOR_BOLT_DESIGNATION_OCF] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      [KEY_DP_ANCHOR_BOLT_DESIGNATION_OCF]: e.target.value,
                    })
                  }
                />
              </div>

              <div className="input-cont">
                <h5>Anchor Bolt Type</h5>
                <Input
                  type="text"
                  className="input-design-pref"
                  value={designPrefInputs[KEY_DP_ANCHOR_BOLT_TYPE_OCF] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      [KEY_DP_ANCHOR_BOLT_TYPE_OCF]: e.target.value,
                    })
                  }
                />
              </div>

              <div className="input-cont">
                <h5>Anchor Bolt Galvanized?</h5>
                <Select
                  disabled={isInputLocked}
                  style={{ width: "200px", height: "25px", fontSize: "12px" }}
                  value={designPrefInputs[KEY_DP_ANCHOR_BOLT_GALVANIZED_OCF] || "Yes"}
                  onSelect={(value) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      [KEY_DP_ANCHOR_BOLT_GALVANIZED_OCF]: value,
                    })
                  }
                >
                  <Option value="Yes">Yes</Option>
                  <Option value="No">No</Option>
                </Select>
              </div>

              <div className="input-cont" style={{ marginTop: "10px" }}>
                <h5>Anchor Bolt Hole Type</h5>
                <Select
                  disabled={isInputLocked}
                  style={{ width: "200px", height: "25px", fontSize: "12px" }}
                  value={designPrefInputs[KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF] || "Over-sized"}
                  onSelect={(value) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      [KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF]: value,
                    })
                  }
                >
                  <Option value="Standard">Standard</Option>
                  <Option value="Over-sized">Over-sized</Option>
                </Select>
              </div>

              <div className="input-cont" style={{ marginTop: "10px" }}>
                <h5>Total Length (mm)</h5>
                <Input
                  type="text"
                  className="input-design-pref"
                  value={designPrefInputs[KEY_DP_ANCHOR_BOLT_LENGTH_OCF] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9.-]/g, '');
                    const decimalCount = (val.match(/\./g) || []).length;
                    if (decimalCount > 1) {
                      const firstDecimalIdx = val.indexOf('.');
                      val = val.slice(0, firstDecimalIdx + 1) + val.slice(firstDecimalIdx + 1).replace(/\./g, '');
                    }
                    if (val.includes('-')) {
                      const isNegative = val.startsWith('-');
                      val = val.replace(/-/g, '');
                      if (isNegative) val = '-' + val;
                    }
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      [KEY_DP_ANCHOR_BOLT_LENGTH_OCF]: val,
                    });
                  }}
                  onKeyDown={(e) => {
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
                  }}
                />
              </div>

              <div className="input-cont">
                <h5>Material Grade, Fu (MPa)</h5>
                <Input
                  type="text"
                  className="input-design-pref"
                  value={designPrefInputs[KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_OCF] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9.-]/g, '');
                    const decimalCount = (val.match(/\./g) || []).length;
                    if (decimalCount > 1) {
                      const firstDecimalIdx = val.indexOf('.');
                      val = val.slice(0, firstDecimalIdx + 1) + val.slice(firstDecimalIdx + 1).replace(/\./g, '');
                    }
                    if (val.includes('-')) {
                      const isNegative = val.startsWith('-');
                      val = val.replace(/-/g, '');
                      if (isNegative) val = '-' + val;
                    }
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      [KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_OCF]: val,
                    });
                  }}
                  onKeyDown={(e) => {
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
                  }}
                />
              </div>
            </div>

            {/* ICF Section */}
            <div>
              <h4 style={{ marginBottom: "15px", borderBottom: "1px solid #ddd", paddingBottom: "5px" }}>
                Anchor Bolt Inside Column Flange
              </h4>

              <div className="input-cont">
                <h5>Designation</h5>
                <Input
                  type="text"
                  className="input-design-pref"
                  value={designPrefInputs[KEY_DP_ANCHOR_BOLT_DESIGNATION_ICF] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      [KEY_DP_ANCHOR_BOLT_DESIGNATION_ICF]: e.target.value,
                    })
                  }
                />
              </div>

              <div className="input-cont">
                <h5>Anchor Bolt Type</h5>
                <Input
                  type="text"
                  className="input-design-pref"
                  value={designPrefInputs[KEY_DP_ANCHOR_BOLT_TYPE_ICF] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      [KEY_DP_ANCHOR_BOLT_TYPE_ICF]: e.target.value,
                    })
                  }
                />
              </div>

              <div className="input-cont">
                <h5>Anchor Bolt Galvanized?</h5>
                <Select
                  disabled={isInputLocked}
                  style={{ width: "200px", height: "25px", fontSize: "12px" }}
                  value={designPrefInputs[KEY_DP_ANCHOR_BOLT_GALVANIZED_ICF] || "Yes"}
                  onSelect={(value) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      [KEY_DP_ANCHOR_BOLT_GALVANIZED_ICF]: value,
                    })
                  }
                >
                  <Option value="Yes">Yes</Option>
                  <Option value="No">No</Option>
                </Select>
              </div>

              <div className="input-cont" style={{ marginTop: "10px" }}>
                <h5>Anchor Bolt Hole Type</h5>
                <Select
                  disabled={isInputLocked}
                  style={{ width: "200px", height: "25px", fontSize: "12px" }}
                  value={designPrefInputs[KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF] || "Over-sized"}
                  onSelect={(value) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      [KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF]: value,
                    })
                  }
                >
                  <Option value="Standard">Standard</Option>
                  <Option value="Over-sized">Over-sized</Option>
                </Select>
              </div>

              <div className="input-cont" style={{ marginTop: "10px" }}>
                <h5>Total Length (mm)</h5>
                <Input
                  type="text"
                  className="input-design-pref"
                  value={designPrefInputs[KEY_DP_ANCHOR_BOLT_LENGTH_ICF] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9.-]/g, '');
                    const decimalCount = (val.match(/\./g) || []).length;
                    if (decimalCount > 1) {
                      const firstDecimalIdx = val.indexOf('.');
                      val = val.slice(0, firstDecimalIdx + 1) + val.slice(firstDecimalIdx + 1).replace(/\./g, '');
                    }
                    if (val.includes('-')) {
                      const isNegative = val.startsWith('-');
                      val = val.replace(/-/g, '');
                      if (isNegative) val = '-' + val;
                    }
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      [KEY_DP_ANCHOR_BOLT_LENGTH_ICF]: val,
                    });
                  }}
                  onKeyDown={(e) => {
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
                  }}
                />
              </div>

              <div className="input-cont">
                <h5>Material Grade, Fu (MPa)</h5>
                <Input
                  type="text"
                  className="input-design-pref"
                  value={designPrefInputs[KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_ICF] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9.-]/g, '');
                    const decimalCount = (val.match(/\./g) || []).length;
                    if (decimalCount > 1) {
                      const firstDecimalIdx = val.indexOf('.');
                      val = val.slice(0, firstDecimalIdx + 1) + val.slice(firstDecimalIdx + 1).replace(/\./g, '');
                    }
                    if (val.includes('-')) {
                      const isNegative = val.startsWith('-');
                      val = val.replace(/-/g, '');
                      if (isNegative) val = '-' + val;
                    }
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      [KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_ICF]: val,
                    });
                  }}
                  onKeyDown={(e) => {
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
                  }}
                />
              </div>
            </div>

          </div>

          {/* General Section */}
          <div className="sub-container" style={{ marginTop: "20px" }}>
            <h4 style={{ marginBottom: "15px", borderBottom: "1px solid #ddd", paddingBottom: "5px" }}>
              General
            </h4>
            <div className="input-cont">
              <h5>Friction Coefficient (between concrete and anchor bolt)</h5>
              <Input
                type="text"
                className="input-design-pref"
                value={designPrefInputs[KEY_DP_ANCHOR_BOLT_FRICTION] || ""}
                disabled={isInputLocked}
                style={readOnlyFontStyle}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^0-9.-]/g, '');
                  const decimalCount = (val.match(/\./g) || []).length;
                  if (decimalCount > 1) {
                    const firstDecimalIdx = val.indexOf('.');
                    val = val.slice(0, firstDecimalIdx + 1) + val.slice(firstDecimalIdx + 1).replace(/\./g, '');
                  }
                  if (val.includes('-')) {
                    const isNegative = val.startsWith('-');
                    val = val.replace(/-/g, '');
                    if (isNegative) val = '-' + val;
                  }
                  setDesignPrefInputs({
                    ...designPrefInputs,
                    [KEY_DP_ANCHOR_BOLT_FRICTION]: val,
                  });
                }}
                onKeyDown={(e) => {
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
                }}
              />
            </div>
          </div>

        </div>
      </div>

      <CustomMaterialModal
        showModal={showModal}
        setShowModal={setShowModal}
        setInputValues={setDesignPrefInputs}
        inputValues={designPrefInputs}
        type="supporting"
        materialList={materials}
      />
    </>
  );
};

export default AnchorBoltSectionModal;