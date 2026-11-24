import { Input, Select } from "antd";
import {
  ALLOW_CLASS_OPTIONS,
  FLEXURE_OPTIMIZATION_DEFAULTS,
  LOADING_CONDITION_OPTIONS,
} from "../config/prefOptions";

const { Option } = Select;

/**
 * The Optimization tab of the simply supported and the cantilever beam: the five values the core's
 * `optimization_tab_flexure_design` lists (Semi-compact sections, Effective Area Parameter, Loading
 * Condition, Effective Length Parameter, Bearing Length), with its description. The design reads all
 * five from the request (`Optimum.Class`, `Effective.Area_Para`, `Loading.Condition`, `Length.Overwrite`,
 * `Bearing.Length`).
 */

// Effective length tables of the core description (OPTIMIZATION_TABLE_UI2 and OPTIMIZATION_TABLE_UI in Common.py).
const SIMPLY_SUPPORTED_TABLE = {
  title: "Effective Length for Simply Supported Beams",
  head: [["Sl No.", "Conditions of Restraint Supports", "Loading Condition"], ["", "Torsional Restraint", "Warping Restraint", "Normal", "Destabilizing"]],
  rows: [
    ["(i)", "Fully restrained", "Both flanges fully restrained", "0.7 L", "0.85 L"],
    ["(ii)", "Fully restrained", "Compression flange fully restrained", "0.75 L", "0.9 L"],
    ["(iii)", "Fully restrained", "Both flanges fully restrained", "0.8 L", "0.95 L"],
    ["(iv)", "Fully restrained", "Both flanges fully restrained", "0.85 L", "1.0 L"],
    ["(v)", "Fully restrained", "Warping not restrained in both flanges", "1.0 L", "1.2 L"],
    ["(vi)", "Partially restrained by bottom flange support connection", "Warping not restrained in both flanges", "1.0 + 2 D", "1.2 L + 2 D"],
    ["(vii)", "Partially restrained by bottom flange bearing support", "Warping not restrained in both flanges", "1.2 L + 2 D", "1.4 L + 2 D"],
  ],
};

const CANTILEVER_TOPS = ["Free", "Lateral restraint to top flange", "Torsional restraint", "Lateral and Torsional restraint"];
const CANTILEVER_TABLE = {
  title: "Effective Length for Cantilever Beams",
  head: [["Sl No.", "Conditions of Restraint", "Loading Condition"], ["", "Support", "Top", "Normal", "Destabilizing"]],
  groups: [
    ["(i)", "Continous, with lateral restraint to top flange", [["3.0 L", "7.5 L"], ["2.7 L", "7.5 L"], ["2.4 L", "4.5 L"], ["2.1 L", "3.6 L"]]],
    ["(ii)", "Continous, with partial torsional restraint", [["2.0 L", "5.0 L"], ["1.8 L", "5.0 L"], ["1.6 L", "3.0 L"], ["1.4 L", "2.4 L"]]],
    ["(iii)", "Continous, with lateral and torsional restraint", [["1.0 L", "2.5 L"], ["0.9 L", "2.5 L"], ["0.8 L", "1.5 L"], ["0.7 L", "1.2 L"]]],
    ["(iv)", "Restrained laterally, torsionally and against rotation", [["0.8 L", "1.4 L"], ["0.7 L", "1.4 L"], ["0.6 L", "0.6 L"], ["0.5 L", "0.5 L"]]],
  ],
};

const EffectiveLengthTable = ({ cantilever }) => {
  const table = cantilever ? CANTILEVER_TABLE : SIMPLY_SUPPORTED_TABLE;
  return (
    <div className="table-container">
      <table className="desc-table">
        <thead>
          <tr><th colSpan={5}>{table.title}</th></tr>
          <tr>
            <th rowSpan="2">{table.head[0][0]}</th>
            <th colSpan="2">{table.head[0][1]}</th>
            <th colSpan="2">{table.head[0][2]}</th>
          </tr>
          <tr>
            {table.head[1].slice(1).map((label) => <th key={label}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {cantilever
            ? table.groups.flatMap(([number, support, loads]) =>
                loads.map(([normal, destabilizing], index) => (
                  <tr key={`${number}-${index}`}>
                    {index === 0 && <td rowSpan={loads.length}>{number}</td>}
                    {index === 0 && <td rowSpan={loads.length}>{support}</td>}
                    <td>{CANTILEVER_TOPS[index]}</td>
                    <td>{normal}</td>
                    <td>{destabilizing}</td>
                  </tr>
                )),
              )
            : table.rows.map((row) => (
                <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>
              ))}
        </tbody>
      </table>
    </div>
  );
};

const FlexureOptimizationSectionModal = ({ cantilever = false, designPrefInputs, setDesignPrefInputs, isInputLocked }) => {
  const set = (field, value) => setDesignPrefInputs({ ...designPrefInputs, [field]: value });
  const value = (field) => designPrefInputs[field] ?? FLEXURE_OPTIMIZATION_DEFAULTS[field];

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

  const choice = (field, label, options) => (
    <div className="input-cont">
      <h5>{label}</h5>
      <div>
        <Select
          disabled={isInputLocked}
          style={{ width: "134px", height: "25px", fontSize: "12px" }}
          value={value(field)}
          onSelect={(selected) => set(field, selected)}
        >
          {options.map((option) => <Option key={option} value={option}>{option}</Option>)}
        </Select>
      </div>
    </div>
  );

  return (
    <div className="Connector-col-beam-cont">
      <div className="col-left">
        <div className="sub-container">
          <h4>Inputs</h4>
          {text("effective_area_parameter", "Effective Area Parameter")}
          {choice("allowable_class", "Semi-compact sections", ALLOW_CLASS_OPTIONS)}
          {choice("loading_condition", "Loading Condition", LOADING_CONDITION_OPTIONS)}
          {text("length_overwrite", "Effective Length Parameter")}
          {text("bearing_length", "Bearing Length (mm)")}
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
            <b>The Effective Area Parameter</b> is the parameter used to define the reduction in the area of the section due
            to connection detailing and other such requirements. The default value of this parameter is set at 1.0, which
            means that the effective area is 100% of the gross area for Plastic, Compact and Semi-compact sections. For
            Slender sections, the initial area will be computed based on the recommendations in Fig.2B of The National
            Building Code (2016). The value of the parameter should be defined in terms of the effective area to be
            considered for design simulation after deducting the area lost. The maximum value of the parameter is 1.0
            (effective area is 100% of the gross area) with a minimum value of 0.1.
          </p>
          <p>
            <b>The Effective Length</b> is the parameter to <b>Overwrite</b> the Length multiplier. The default value of
            this ratio is set at <b>NA</b>. The value can be re-defined for any particular design session with a minimum of
            0.1. If invalid value given then it is set to NA or 1.0.
          </p>
          <p>
            {cantilever
              ? "For cantilever beams of overall depth D and span length L, the effective length LLT is given by below Table"
              : "For simply supported beams of overall depth D and span length L, the effective length LLT is given by below Table"}
          </p>
          <EffectiveLengthTable cantilever={cantilever} />
          <p>
            <b>The Bearing Length Parameter</b> is the length of Bearing stiffener provided for webs. The default value of
            this parameter is set at <b>NA</b>. If invalid value given then it is set to NA.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FlexureOptimizationSectionModal;
