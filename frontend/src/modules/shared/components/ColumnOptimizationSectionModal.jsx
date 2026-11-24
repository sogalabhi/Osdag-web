import { Input, Select } from "antd";
import { COLUMN_OPTIMIZATION_DEFAULTS, OPTIMIZATION_PARA_OPTIONS } from "../config/prefOptions";

const { Option } = Select;

/**
 * The Optimization tab of the axially loaded column: the three values the core's
 * `optimization_tab_column_design` lists (Allowable Utilization Ratio, Optimization Parameter,
 * Effective Area Parameter), with its description. The design reads all three from the request
 * (`Optimum.AllowUR`, `Optimum.Para`, `Effective.Area_Para`). The core's Section Definition and
 * Cost choices are commented out in its tab, so they are neither shown nor described here.
 */
const ColumnOptimizationSectionModal = ({ designPrefInputs, setDesignPrefInputs, isInputLocked }) => {
  const set = (field, value) => setDesignPrefInputs({ ...designPrefInputs, [field]: value });
  const value = (field) => designPrefInputs[field] ?? COLUMN_OPTIMIZATION_DEFAULTS[field];

  const text = (field, label) => (
    <div className="input-cont">
      <h5>{label}</h5>
      <Input
        disabled={isInputLocked}
        type="text"
        className="input-design-pref"
        value={value(field)}
        onChange={(e) => set(field, e.target.value)}
      />
    </div>
  );

  return (
    <div className="Connector-col-beam-cont">
      <div className="col-left">
        <div className="sub-container">
          <h4>Inputs</h4>
          {text("allow_ur", "Allowable Utilization Ratio (UR)")}
          <div className="input-cont">
            <h5>Optimization Parameter</h5>
            <div>
              <Select
                disabled={isInputLocked}
                style={{ width: "134px", height: "25px", fontSize: "12px" }}
                value={value("optimum_para")}
                onSelect={(selected) => set("optimum_para", selected)}
              >
                {OPTIMIZATION_PARA_OPTIONS.map((option) => <Option key={option} value={option}>{option}</Option>)}
              </Select>
            </div>
          </div>
          {text("effective_area_parameter", "Effective Area Parameter")}
        </div>
      </div>

      <div>
        <h4>Description</h4>
        <div className="description-container">
          <p>
            <b>The Allowable Utilization Ratio (UR)</b> is the maximum allowable value of the demand to capacity ratio for
            performing the design. The default value of this ratio is set at <b>1.0</b>. The UR can be re-defined for any
            particular design session with a maximum allowable value of 1.0 and a minimum of 0.1.
          </p>
          <p>
            <b>The Optimization Parameter</b> is the parameter used for selecting the most optimum section as the design
            output. The default parameter is set as the <b>Utilization Ratio (UR)</b>.
          </p>
          <p>
            <b>The Effective Area Parameter</b> is the parameter used to define the reduction in the area of the section due
            to connection detailing and other such requirements. The default value of this parameter is set at 1.0, which
            means that the effective area is 100% of the gross area for Plastic, Compact and Semi-compact sections. For
            Slender sections, the initial area will be computed based on the recommendations in Fig.2B of The National
            Building Code (2016). The value of the parameter should be defined in terms of the effective area to be
            considered for design simulation after deducting the area lost. The maximum value of the parameter is 1.0
            (effective area is 100% of the gross area) with a minimum value of 0.1.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ColumnOptimizationSectionModal;
