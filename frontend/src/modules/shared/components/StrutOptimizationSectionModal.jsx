import { Input, Select } from "antd";
import {
  KEY_DISP_EFFECTIVE_AREA_PARA,
  KEY_DISP_GUSSET,
  KEY_DISP_LOAD,
  KEY_DISP_UR,
} from "../../../constants/generated/coreKeys";
import {
  STRUT_GUSSET_THICKNESS_OPTIONS,
  STRUT_PROFILE_OPPOSITE_SIDE,
  STRUT_PROFILE_SAME_SIDE,
  strutOptimizationDefaults,
  strutOptimizationLayout,
} from "../config/prefOptions";

const { Option } = Select;

/**
 * The Optimization tab of the welded strut: the rows the core's `optimization_tab_strut_design` lists for the section
 * profile (Allowable Utilization Ratio, Effective Area Parameter, the two buckling factors, the load type, the gusset
 * plate thickness of the back to back angles and the number of bolts), with its description. The design reads them from
 * the request (`Optimum.AllowUR`, `Effective.Area_Para`, ` Out_of_Plane`, ` In_Plane`, `Load.Type`,
 * `Connector.Plate.Thickness_List`, `Bolt.Number`).
 */

const ALLOWABLE_UR_TEXT = [
  "The Allowable Utilization Ratio (UR) is the maximum allowable value of the demand to capacity ratio for performing the design. The default value of this ratio is set at 1.0. The UR can be re-defined for any particular design session with a maximum allowable value of 1.0 and a minimum of 0.1.",
  "The Effective Area Parameter is the parameter used to define the reduction in the area of the section due to connection detailing and other such requirements. The default value of this parameter is set at 1.0, which means that the effective area is 100% of the gross area for Plastic, Compact and Semi-compact sections. For Slender sections, the initial area will be computed based on the recommendations in Fig.2B of The National Building Code (2016). The value of the parameter should be defined in terms of the effective area to be considered for design simulation after deducting the area lost. The maximum value of the parameter is 1.0 (effective area is 100% of the gross area) with a minimum value of 0.1.",
];

const BUCKLING_TEXT = {
  single: [
    "In the case of members of trusses, buckling in the plane perpendicular to the plane of the truss, Out of Plane, the effective length, KL shall be taken as the distance between the centres of intersection (Cl.7.2.4) of IS 800:2007.",
    "In the case of members of trusses, buckling in the plane of the truss, In Plane, the effective length, KL shall be taken as 0.7 to 1.0 times the distance between the centres of connections, depending on the degree of end restraint provided (Cl.7.2.4) of IS 800:2007.",
  ],
  sameSide: [
    "Double Angle Struts connected back to back on one side of a gusset or section",
    "The effective length, KL, in the plane perpendicular to that of the end gusset, Out of Plane, shall be taken as equal to the distance between centres of intersections (Cl.7.5.2.1) of IS 800:2007.",
    "The effective length, KL, in the plane of end gusset, In Plane, shall be taken as between 0.7 and 0.85 times the distance between intersections, depending on the degree of the restraint provided (Cl.7.5.2.1) of IS 800:2007.",
  ],
  oppositeSide: [
    "Double Angle Struts connected back to back, on opposite sides of the gusset",
    "The effective length, KL, in the plane perpendicular to that of the end gusset, Out of Plane, shall be taken as equal to the distance between centres of intersections (Cl.7.5.2.1) of IS 800:2007.",
    "The effective length, KL, in the plane of end gusset, In Plane, shall be taken as between 0.7 and 0.85 times the distance between intersections, depending on the degree of the restraint provided (Cl.7.5.2.1) of IS 800:2007.",
  ],
};

const bucklingText = (profile) =>
  profile === STRUT_PROFILE_SAME_SIDE
    ? BUCKLING_TEXT.sameSide
    : profile === STRUT_PROFILE_OPPOSITE_SIDE
      ? BUCKLING_TEXT.oppositeSide
      : BUCKLING_TEXT.single;

const StrutOptimizationSectionModal = ({ profile, designPrefInputs, setDesignPrefInputs, isInputLocked }) => {
  const layout = strutOptimizationLayout(profile);
  const defaults = strutOptimizationDefaults(profile);
  const set = (field, value) => setDesignPrefInputs({ ...designPrefInputs, [field]: value });
  const value = (field) => designPrefInputs[field] ?? defaults[field];

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

  const select = (field, label, options) => (
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
          {text("allow_ur", KEY_DISP_UR)}
          {text("effective_area_parameter", KEY_DISP_EFFECTIVE_AREA_PARA)}
        </div>
        <div className="sub-container">
          <h4>Type of Buckling</h4>
          {text("buckling_out_of_plane", "Out of Plane")}
          {text("buckling_in_plane", "In Plane")}
        </div>
        <div className="sub-container">
          {select("load_type", KEY_DISP_LOAD, layout.loadTypes)}
        </div>
        {layout.gusset && (
          <div className="sub-container">
            <h4>{KEY_DISP_GUSSET}</h4>
            {select("plate_thickness", "Thickness (mm)", STRUT_GUSSET_THICKNESS_OPTIONS)}
          </div>
        )}
        {layout.boltNumber && (
          <div className="sub-container">
            <h4>End Connection Details</h4>
            {text("bolt_number", "Number of Bolts")}
          </div>
        )}
      </div>

      <div>
        <h4>Description</h4>
        <div className="description-container">
          {ALLOWABLE_UR_TEXT.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {bucklingText(profile).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </div>
    </div>
  );
};

export default StrutOptimizationSectionModal;
