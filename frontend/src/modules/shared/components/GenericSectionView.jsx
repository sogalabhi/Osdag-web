import React, { useContext, useState, useEffect } from "react";
import { ModuleContext } from "../../../context/ModuleState";
import { Input, Select } from "antd";
import { STEEL_CONSTANTS, UNIT_LABELS } from "../constants/engineering";
import CustomSectionModal from "./CustomSectionModal";
import SectionTabToolbar from "./SectionTabToolbar";

const { Option } = Select;

const readOnlyFontStyle = {
  color: "rgb(0 0 0 / 67%)",
  fontSize: "12px",
  fontWeight: "600",
};

/**
 * GenericSectionView - A unified view for section details (Beam, Column, Angle, etc.)
 * This replaces the redundant *SectionModal.jsx components in the shared directory.
 */
const GenericSectionView = ({
  sectionData,        // supportingSectionData or supportedSectionData
  designPrefInputs,
  setDesignPrefInputs,
  isInputLocked,
  inputs,             // Base inputs from parent
  materialList = [],
  isGuest,
  onRefetchModuleOptions,
  suppressInitialMaterialDispatch = false,
  sectionType,        // 'supporting' or 'supported'
  sectionTableName,   // 'Beams', 'Columns', 'Angles', etc.
  displayConfig,      // Configuration for fields and image
  onClearSection      // Callback to clear parent state if needed
}) => {
  const { manageDesignPreferences, [sectionType === 'supporting' ? 'supporting_material_details' : 'supported_material_details']: materialDetails } = useContext(ModuleContext);
  const [showModal, setShowModal] = useState(false);

  // Safety check for sectionData
  const safeSectionData = sectionData || {};

  const materialKey = sectionType === 'supporting' ? 'supporting_material' : 'supported_material';

  useEffect(() => {
    if (suppressInitialMaterialDispatch) return;
    const material = materialList.find((v) => v.Grade === designPrefInputs[materialKey]);
    if (material) {
      manageDesignPreferences("material_update", {
        materialType: sectionType,
        materialData: material,
      });
    }
  }, [suppressInitialMaterialDispatch, designPrefInputs[materialKey], materialList, sectionType]);

  const handleMaterialChange = (value) => {
    if (value === -1) {
      setShowModal(true);
      return;
    }
    const material = materialList.find((item) => item.Grade === value);
    if (!material) return;
    
    setDesignPrefInputs({
      ...designPrefInputs,
      [materialKey]: material.Grade,
    });

    manageDesignPreferences("material_update", {
      materialType: sectionType,
      materialData: material,
    });
  };

  const handleClearSectionTab = () => {
    onClearSection?.();
    setDesignPrefInputs((prev) => ({
      ...prev,
      [materialKey]:
        inputs?.[materialKey] ??
        inputs?.connector_material ??
        inputs?.material ??
        prev[materialKey],
    }));
  };

  const renderField = (label, value, unit = "", options = null) => (
    <div className="input-cont">
      <h5>{label}{unit ? `, ${unit}` : ""}</h5>
      {options ? (
        <Select
          disabled={isInputLocked}
          style={{ width: "132px", height: "25px", fontSize: "12px" }}
          value={value}
          onSelect={options.onSelect}
        >
          {options.items.map((opt, idx) => (
            <Option key={idx} value={opt}>{opt}</Option>
          ))}
        </Select>
      ) : (
        <Input
          type="text"
          className="input-design-pref"
          value={value ?? 0}
          disabled
          style={readOnlyFontStyle}
        />
      )}
    </div>
  );

  const materialInfo = materialDetails?.[0] || {};

  return (
    <>
      <div className="col-beam-cont">
        {/* Left Section: Mechanical Properties */}
        <div className="col-left">
          <div className="input-cont">
            <h5>Designation</h5>
            <Input
              type="text"
              className="input-design-pref"
              value={inputs?.[displayConfig.designationKey] || ""}
              style={readOnlyFontStyle}
            />
          </div>
          
          <div className="sub-container">
            <h4>Mechanical Properties</h4>
            <div className="input-cont">
              <h5>Material *</h5>
              <Select
                disabled={isInputLocked}
                style={{ width: "134px", height: "25px", fontSize: "12px" }}
                value={designPrefInputs[materialKey] || ""}
                onSelect={handleMaterialChange}
              >
                {materialList.map((item, index) => (
                  <Option key={index} value={item.Grade}>{item.Grade}</Option>
                ))}
              </Select>
            </div>

            {renderField("Ultimate Strength", materialInfo.Ultimate_Tensile_Stress, UNIT_LABELS.FU)}
            {renderField("Yield Strength", materialInfo.Yield_Stress_greater_than_40, UNIT_LABELS.FY)}
            {renderField("Modulus of Elasticity", STEEL_CONSTANTS.E, UNIT_LABELS.E)}
            {renderField("Modulus of Rigidity", STEEL_CONSTANTS.G, UNIT_LABELS.G)}
            {renderField("Poisson's Ratio", STEEL_CONSTANTS.POISSON_RATIO)}
            {renderField(`Thermal Expansion Coefficient (x10^-6 / C)`, STEEL_CONSTANTS.THERMAL_EXPANSION)}
            
            {displayConfig.showType && renderField("Type", safeSectionData.Type || "Rolled", "", {
              items: ["Rolled", "Welded"],
              onSelect: (val) => {} // Usually readonly in these modals but Select used for UI
            })}
            
            {renderField("Source", safeSectionData.Source || "IS808 Rev")}
          </div>
        </div>

        {/* Middle Section: Dimensions & Section Properties */}
        <div className="col-middle">
          <div className="sub-container">
            <h4>Dimensions</h4>
            {displayConfig.dimensions.map(field => 
              renderField(field.label, safeSectionData[field.key], field.unit || UNIT_LABELS.DIMENSION)
            )}

            <h4>Section Properties</h4>
            {displayConfig.properties.middle.map(field => 
              renderField(field.label, safeSectionData[field.key], field.unit)
            )}
          </div>
        </div>

        {/* Right Section: Image & More Section Properties */}
        <div className="col-right">
          <div className="section-image">
            <img
              src={displayConfig.image}
              alt="Section Diagram"
              style={{ width: "100%", maxWidth: "320px" }}
            />
          </div>

          <div className="sub-container" style={{ width: "310px" }}>
            <h4>Section Properties</h4>
            {displayConfig.properties.right.map(field => 
              renderField(field.label, safeSectionData[field.key], field.unit)
            )}
          </div>
        </div>
      </div>

      <SectionTabToolbar
        sectionTable={sectionTableName}
        isInputLocked={isInputLocked}
        isGuest={isGuest}
        onRefetchModuleOptions={onRefetchModuleOptions}
        onClearTab={handleClearSectionTab}
      />

      <CustomSectionModal
        showModal={showModal}
        setShowModal={setShowModal}
        setInputValues={setDesignPrefInputs}
        inputValues={designPrefInputs}
        type={sectionType}
        materialList={materialList}
        onRefetchModuleOptions={onRefetchModuleOptions}
      />
    </>
  );
};

export default GenericSectionView;
