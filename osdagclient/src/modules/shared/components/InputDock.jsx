import React, { useState } from 'react';
import Select from 'react-select';
import { InputSection } from "./InputSection"; // Assuming this is already a component
import Designsvg from "../../../assets/Designsvg.svg";
import Resetsvg from "../../../assets/Resetsvg.svg";
import ArrowDownsvg from "../../../assets/ArrowDownsvg.svg";

/**
 * @description Renders the entire left-side input dock, including section selection and action buttons.
 */
export const InputDock = ({
  moduleConfig,
  inputs,
  setInputs,
  // ... other props needed by InputSection
  contextData,
  extraState,
  setExtraState,
  onSubmit,
  onReset,
  setDesignPrefModalStatus
}) => {
  const [selectedSection, setSelectedSection] = useState("Section Details");
  const [showResetButton, setShowResetButton] = useState(false);

  const handleSectionChange = (option) => {
    setSelectedSection(option.value);
    if (option.value === "Design Preferences") {
      setDesignPrefModalStatus(true);
    }
  };

  return (
    <div className="InputDock">
      <div className="flex justify-between inputRow">
        <span>Input Dock</span>
        <Select
          value={{ value: selectedSection, label: selectedSection }}
          onChange={handleSectionChange}
          options={[
            { value: "Section Details", label: "Section Details" },
            { value: "Design Preferences", label: "Design Preferences" },
            { value: "Additional Inputs", label: "Additional Inputs" }
          ]}
          classNamePrefix="section-select"
          isSearchable={false}
        />
      </div>

      <div className="subMainBody scroll-data">
        {selectedSection !== "Additional Inputs" &&
          moduleConfig.inputSections.map((section, index) => (
            <InputSection
              key={index}
              section={section}
              inputs={inputs}
              setInputs={setInputs}
              contextData={contextData}
              extraState={extraState}
              setExtraState={setExtraState}
              // ... pass down other necessary props
            />
          ))}
        {selectedSection === "Additional Inputs" && (
            <p>Additional Inputs Content</p>
        )}
      </div>

      <div className="inputdock-btn">
        <button onClick={onSubmit}>
          <img src={Designsvg} alt="Design" /> Design
        </button>
        <button className="arrow-down-btn" onClick={() => setShowResetButton(!showResetButton)}>
          <img src={ArrowDownsvg} alt="Toggle Reset" className={`arrow-icon ${showResetButton ? "rotated" : ""}`} />
        </button>
        {showResetButton && (
          <button onClick={onReset} className="reset-btn">
            <img src={Resetsvg} alt="Reset" /> Reset
          </button>
        )}
      </div>
    </div>
  );
};