import React, { useContext, useState, useEffect } from "react";
import { ModuleContext } from "../../../context/ModuleState";
import { Input, Select } from "antd";
import CustomMaterialModal from "./CustomMaterialModal";

const { Option } = Select;

const readOnlyFontStyle = {
  color: "rgb(0 0 0 / 67%)",
  fontSize: "12px",
  fontWeight: "600",
};

const AnchorBoltSectionModal = ({
  supportingSectionData,
  designPrefInputs,
  setDesignPrefInputs,
  isInputLocked,
  materialList: materialsFromParent,
  suppressInitialMaterialDispatch = false,
}) => {
  const {
    manageDesignPreferences,
  } = useContext(ModuleContext);
  const materials = materialsFromParent ?? [];
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
  }, [suppressInitialMaterialDispatch]);

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
                  value={designPrefInputs["DesignPreferences.Anchor_Bolt.OCF.Designation"] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      "DesignPreferences.Anchor_Bolt.OCF.Designation": e.target.value,
                    })
                  }
                />
              </div>

              <div className="input-cont">
                <h5>Anchor Bolt Type</h5>
                <Input
                  type="text"
                  className="input-design-pref"
                  value={designPrefInputs["DesignPreferences.Anchor_Bolt.OCF.Type"] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      "DesignPreferences.Anchor_Bolt.OCF.Type": e.target.value,
                    })
                  }
                />
              </div>

              <div className="input-cont">
                <h5>Anchor Bolt Galvanized?</h5>
                <Select
                  disabled={isInputLocked}
                  style={{ width: "200px", height: "25px", fontSize: "12px" }}
                  value={designPrefInputs["DesignPreferences.Anchor_Bolt.OCF.Galvanized"] || "Yes"}
                  onSelect={(value) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      "DesignPreferences.Anchor_Bolt.OCF.Galvanized": value,
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
                  value={designPrefInputs["DesignPreferences.Anchor_Bolt.OCF.Bolt_Hole_Type"] || "Over-sized"}
                  onSelect={(value) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      "DesignPreferences.Anchor_Bolt.OCF.Bolt_Hole_Type": value,
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
                  value={designPrefInputs["DesignPreferences.Anchor_Bolt.OCF.Length"] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      "DesignPreferences.Anchor_Bolt.OCF.Length": e.target.value,
                    })
                  }
                />
              </div>

              <div className="input-cont">
                <h5>Material Grade, Fu (MPa)</h5>
                <Input
                  type="text"
                  className="input-design-pref"
                  value={designPrefInputs["DesignPreferences.Anchor_Bolt.OCF.Material_Grade_OverWrite"] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      "DesignPreferences.Anchor_Bolt.OCF.Material_Grade_OverWrite": e.target.value,
                    })
                  }
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
                  value={designPrefInputs["DesignPreferences.Anchor_Bolt.ICF.Designation"] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      "DesignPreferences.Anchor_Bolt.ICF.Designation": e.target.value,
                    })
                  }
                />
              </div>

              <div className="input-cont">
                <h5>Anchor Bolt Type</h5>
                <Input
                  type="text"
                  className="input-design-pref"
                  value={designPrefInputs["DesignPreferences.Anchor_Bolt.ICF.Type"] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      "DesignPreferences.Anchor_Bolt.ICF.Type": e.target.value,
                    })
                  }
                />
              </div>

              <div className="input-cont">
                <h5>Anchor Bolt Galvanized?</h5>
                <Select
                  disabled={isInputLocked}
                  style={{ width: "200px", height: "25px", fontSize: "12px" }}
                  value={designPrefInputs["DesignPreferences.Anchor_Bolt.ICF.Galvanized"] || "Yes"}
                  onSelect={(value) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      "DesignPreferences.Anchor_Bolt.ICF.Galvanized": value,
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
                  value={designPrefInputs["DesignPreferences.Anchor_Bolt.ICF.Bolt_Hole_Type"] || "Over-sized"}
                  onSelect={(value) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      "DesignPreferences.Anchor_Bolt.ICF.Bolt_Hole_Type": value,
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
                  value={designPrefInputs["DesignPreferences.Anchor_Bolt.ICF.Length"] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      "DesignPreferences.Anchor_Bolt.ICF.Length": e.target.value,
                    })
                  }
                />
              </div>

              <div className="input-cont">
                <h5>Material Grade, Fu (MPa)</h5>
                <Input
                  type="text"
                  className="input-design-pref"
                  value={designPrefInputs["DesignPreferences.Anchor_Bolt.ICF.Material_Grade_OverWrite"] || ""}
                  disabled={isInputLocked}
                  style={readOnlyFontStyle}
                  onChange={(e) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      "DesignPreferences.Anchor_Bolt.ICF.Material_Grade_OverWrite": e.target.value,
                    })
                  }
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
                value={designPrefInputs["DesignPreferences.Anchor_Bolt.Friction_coefficient"] || ""}
                disabled={isInputLocked}
                style={readOnlyFontStyle}
                onChange={(e) =>
                  setDesignPrefInputs({
                    ...designPrefInputs,
                    "DesignPreferences.Anchor_Bolt.Friction_coefficient": e.target.value,
                  })
                }
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