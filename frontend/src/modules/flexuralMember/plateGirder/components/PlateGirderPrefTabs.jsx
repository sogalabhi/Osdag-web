import { useContext, useState } from "react";
import { Input, Select } from "antd";

import { ModuleContext } from "../../../../context/ModuleState";
import CustomMaterialModal from "../../../shared/components/CustomMaterialModal";
import {
  KEY_DISP_BOTTOM_Bflange_PG,
  KEY_DISP_BOTTOM_FLANGE_THICKNESS_PG,
  KEY_DISP_CLASS,
  KEY_DISP_DESIGN_LOAD,
  KEY_DISP_DIMENSIONS,
  KEY_DISP_EFFECTIVE_AREA_PARA,
  KEY_DISP_FU,
  KEY_DISP_FY,
  KEY_DISP_IntermediateStiffener,
  KEY_DISP_IntermediateStiffener_spacing,
  KEY_DISP_IntermediateStiffener_thickness,
  KEY_DISP_IS_IT_SYMMETRIC,
  KEY_DISP_LOAD,
  KEY_DISP_LongitudnalStiffener,
  KEY_DISP_LongitudnalStiffener_thickness,
  KEY_DISP_MATERIAL,
  KEY_DISP_MAX_DEFL,
  KEY_DISP_MECH_PROP,
  KEY_DISP_MEMBER_OPTIONS,
  KEY_DISP_MOD_OF_ELAST,
  KEY_DISP_MOD_OF_RIGID,
  KEY_DISP_OVERALL_DEPTH_PG,
  KEY_DISP_POISSON_RATIO,
  KEY_DISP_SEC_PROP,
  KEY_DISP_STR_TYPE,
  KEY_DISP_SUPPORTING_OPTIONS,
  KEY_DISP_TOP_Bflange_PG,
  KEY_DISP_TOP_FLANGE_THICKNESS_PG,
  KEY_DISP_TYPE,
  KEY_DISP_WEB_THICKNESS_PG,
  KEY_DISPP_LENGTH_OVERWRITE,
  KEY_ShearBuckling,
  KEY_WEB_BUCKLING,
} from "../../../../constants/generated/coreKeys";
import {
  PG_ALLOW_CLASS_OPTIONS,
  PG_DESIGN_LOAD_OPTIONS,
  PG_INTERMEDIATE_STIFFENER_OPTIONS,
  PG_LOADING_CONDITION_OPTIONS,
  PG_LONGITUDINAL_STIFFENER_OPTIONS,
  PG_SHEAR_BUCKLING_OPTIONS,
  PG_STIFFENER_THICKNESS_OPTIONS,
  PG_STRUCTURE_TYPE_OPTIONS,
  PG_SYMMETRY_OPTIONS,
  calculateMaxDeflection,
  coreSpelling,
  memberOptionsFor,
  supportingOptionsFor,
} from "../configs/plateGirderPrefOptions";

/**
 * The plate girder's Additional Inputs tabs, as its core lists them (`tab_list` of plate_girder.py):
 * Girder Properties, Optimisation, Stiffeners, Additional Girder Data and Deflection (the Design tab is
 * the shared one).
 *
 * The web keeps the stiffeners, the symmetry, the loading condition and the deflection criteria on the
 * main form (the Input Dock), where the request builder and the optimisation read them. Those rows are
 * shown here read only, with the core's options and the main form's value, so the value has one source
 * and cannot differ between the two places. What the dialog holds and saves is the girder material
 * (Member.Material), the Optimisation values the main form has not and the design method.
 */

const { Option } = Select;

const SELECT_STYLE = { width: "180px", height: "25px", fontSize: "12px" };
const READ_ONLY_STYLE = { color: "rgb(0 0 0 / 67%)", fontSize: "12px", fontWeight: "600" };

const DockNote = () => (
  <p className="pg-dock-note" style={{ fontSize: "12px", margin: "4px 0 8px" }}>
    Greyed values are set on the main form (Input Dock).
  </p>
);

const Row = ({ label, children }) => (
  <div className="input-cont">
    <h5>{label}</h5>
    <div>{children}</div>
  </div>
);

const ChoiceRow = ({ label, value, options, disabled, onSelect }) => (
  <Row label={label}>
    <Select disabled={disabled} style={SELECT_STYLE} value={value} onSelect={onSelect}>
      {options.map((option) => (
        <Option key={option} value={option}>
          {option}
        </Option>
      ))}
    </Select>
  </Row>
);

const TextRow = ({ label, value, readOnly, disabled, onChange }) => (
  <Row label={label}>
    <Input
      type="text"
      className="input-design-pref"
      value={value ?? ""}
      readOnly={readOnly}
      disabled={disabled}
      style={readOnly ? READ_ONLY_STYLE : undefined}
      onChange={onChange}
    />
  </Row>
);

/** A main-form value, shown read only in the core's spelling. */
const DockChoice = ({ label, inputs, field, options }) => (
  <ChoiceRow label={label} value={coreSpelling(field, inputs?.[field])} options={options} disabled />
);

const DockText = ({ label, value }) => <TextRow label={label} value={value} readOnly />;

const firstOf = (value) => (Array.isArray(value) ? value[0] : value);

/** The yield strength the core shows for a thickness (Material(grade, thickness) in the core). */
const fyFor = (row, thickness) => {
  if (!row) return "";
  if (thickness < 20) return row.Yield_Stress_less_than_20;
  if (thickness <= 40) return row.Yield_Stress_between_20_and_neg40;
  return row.Yield_Stress_greater_than_40;
};

/**
 * The strengths a `Cus_<fy 0-20>_<fy 20-40>_<fy >40>_<fu>` grade names, as the backend reads them for a guest
 * (`osdag_overrides`); null for any other name.
 */
const customGradeRow = (grade) => {
  const match = /^Cus_(\d+(?:\.\d+)?)_(\d+(?:\.\d+)?)_(\d+(?:\.\d+)?)_(\d+(?:\.\d+)?)$/.exec(grade || "");
  if (!match) return null;
  const [, fy20, fy2040, fy40, fu] = match;
  return { Grade: grade, Yield_Stress_less_than_20: fy20, Yield_Stress_between_20_and_neg40: fy2040, Yield_Stress_greater_than_40: fy40, Ultimate_Tensile_Stress: fu };
};

/** The dropdown entry that opens the custom material dialog, as on the dock and the other section tabs. */
const CUSTOM_MATERIAL_OPTION = "Custom";

/**
 * The section properties the core computes for the girder from its dimensions (Label_12..Label_23 of
 * `tab_girder_sec`), as the sync answers them for the supporting role in the catalog's column names.
 * The core computes them in mm (the desktop labels them in cm).
 */
const GIRDER_SECTION_PROPERTIES = [
  ["Mass", "Mass, M (kg/m)"],
  ["Area", "Sectional Area, a (mm²)"],
  ["Iz", "2nd Moment of Area, Iz (mm⁴)"],
  ["Iy", "2nd Moment of Area, Iy (mm⁴)"],
  ["rz", "Radius of Gyration, rz (mm)"],
  ["ry", "Radius of Gyration, ry (mm)"],
  ["Zz", "Elastic Modulus, Zz (mm³)"],
  ["Zy", "Elastic Modulus, Zy (mm³)"],
  ["Zpz", "Plastic Modulus, Zpz (mm³)"],
  ["Zpy", "Plastic Modulus, Zpy (mm³)"],
  ["It", "Torsion Constant, It (mm⁴)"],
  ["Iw", "Warping Constant, Iw (mm⁶)"],
];

/** Girder Properties: the girder material (saved), its strengths, the girder's dimensions (main form) and section properties. */
export const GirderPropertiesTab = ({
  inputs,
  designPrefInputs,
  setDesignPrefInputs,
  isInputLocked,
  materialList,
  sectionData,
  onRefetchModuleOptions,
}) => {
  const { supporting_material_details: synced } = useContext(ModuleContext) ?? {};
  const [showCustomMaterial, setShowCustomMaterial] = useState(false);
  const materials = materialList ?? [];
  const grade = designPrefInputs.girder_material;
  const row =
    materials.find((item) => item.Grade === grade) ?? (synced?.[0]?.Grade === grade ? synced[0] : null) ?? customGradeRow(grade);
  // The core reads Fy for the web thickness (20 mm when it has none).
  const webThickness = Number(firstOf(inputs?.web_thickness)) || 20;
  const optimized = inputs?.design_type === "Optimized";
  const dimension = (field) => (optimized && !field.endsWith("thickness") ? "Optimized" : String(firstOf(inputs?.[field]) ?? ""));
  const property = (column) => (optimized ? "Optimized" : String(sectionData?.[column] ?? ""));

  return (
    <div className="Connector-col-beam-cont">
      <div className="col-left">
        <div className="sub-container">
          <h4>{KEY_DISP_MECH_PROP}</h4>
          <ChoiceRow
            label={KEY_DISP_MATERIAL}
            value={grade || ""}
            options={[...materials.map((item) => item.Grade), CUSTOM_MATERIAL_OPTION]}
            disabled={isInputLocked}
            onSelect={(value) => {
              if (value === CUSTOM_MATERIAL_OPTION) {
                setShowCustomMaterial(true);
                return;
              }
              setDesignPrefInputs({ ...designPrefInputs, girder_material: value });
            }}
          />
          <DockText label={KEY_DISP_FU} value={row ? String(row.Ultimate_Tensile_Stress) : ""} />
          <DockText label={KEY_DISP_FY} value={row ? String(fyFor(row, webThickness)) : ""} />
          <DockText label={KEY_DISP_MOD_OF_ELAST} value="200" />
          <DockText label={KEY_DISP_MOD_OF_RIGID} value="76.9" />
          <DockText label={KEY_DISP_POISSON_RATIO} value="0.3" />
          <DockText label="Thermal Expansion Coefficient (x10⁻⁶/°C)" value="12" />
          <ChoiceRow label={KEY_DISP_TYPE} value="Welded" options={["Welded"]} disabled />
        </div>
      </div>
      <div className="col-left">
        <div className="sub-container">
          <h4>{KEY_DISP_DIMENSIONS}</h4>
          <DockNote />
          <DockText label={KEY_DISP_OVERALL_DEPTH_PG} value={dimension("total_depth")} />
          <DockText label={KEY_DISP_WEB_THICKNESS_PG} value={dimension("web_thickness")} />
          <DockText label={KEY_DISP_TOP_Bflange_PG} value={dimension("top_flange_width")} />
          <DockText label={KEY_DISP_TOP_FLANGE_THICKNESS_PG} value={dimension("top_flange_thickness")} />
          <DockText label={KEY_DISP_BOTTOM_Bflange_PG} value={dimension("bottom_flange_width")} />
          <DockText label={KEY_DISP_BOTTOM_FLANGE_THICKNESS_PG} value={dimension("bottom_flange_thickness")} />
        </div>
      </div>
      <div className="col-left">
        <div className="sub-container">
          <h4>{KEY_DISP_SEC_PROP}</h4>
          {GIRDER_SECTION_PROPERTIES.map(([column, label]) => (
            <DockText key={column} label={label} value={property(column)} />
          ))}
        </div>
      </div>
      <CustomMaterialModal
        showModal={showCustomMaterial}
        setShowModal={setShowCustomMaterial}
        setInputValues={setDesignPrefInputs}
        inputValues={designPrefInputs}
        type="supporting"
        field="girder_material"
        materialList={materials}
        onRefetchModuleOptions={onRefetchModuleOptions}
      />
    </div>
  );
};

/** Optimisation: Effective Area Parameter, Semi-compact sections, Loading Condition (main form), Effective Length Parameter. */
export const GirderOptimisationTab = ({ inputs, designPrefInputs, setDesignPrefInputs, isInputLocked }) => {
  const set = (field, value) => setDesignPrefInputs({ ...designPrefInputs, [field]: value });
  return (
    <div className="Connector-col-beam-cont">
      <div className="col-left">
        <div className="sub-container">
          <h4>Inputs</h4>
          <DockNote />
          <TextRow
            label={KEY_DISP_EFFECTIVE_AREA_PARA}
            value={designPrefInputs.effective_area_parameter}
            disabled={isInputLocked}
            onChange={(e) => set("effective_area_parameter", e.target.value)}
          />
          <ChoiceRow
            label={KEY_DISP_CLASS}
            value={designPrefInputs.allowable_class}
            options={PG_ALLOW_CLASS_OPTIONS}
            disabled={isInputLocked}
            onSelect={(value) => set("allowable_class", value)}
          />
          <DockChoice label={KEY_DISP_LOAD} inputs={inputs} field="loading_condition" options={PG_LOADING_CONDITION_OPTIONS} />
          <TextRow
            label={KEY_DISPP_LENGTH_OVERWRITE}
            value={designPrefInputs.length_overwrite}
            disabled={isInputLocked}
            onChange={(e) => set("length_overwrite", e.target.value)}
          />
        </div>
      </div>
      <div>
        <h4>Description</h4>
        <div className="description-container">
          <p>
            <b>Effective Area Parameter</b> is the parameter used to define the reduction in the area of the section due to
            connection detailing and other such requirements. The default value of this parameter is set at <b>1.0</b>, which
            means that the effective area is 100% of the gross area for Plastic, Compact and Semi-compact sections.
          </p>
          <p>
            For <b>Slender sections</b>, the initial area will be computed based on the recommendations in Fig.2B of the
            National Building Code (2016). The value of the parameter should be defined in terms of the effective area to be
            considered for design simulation after deducting the area lost.
          </p>
          <p>
            The maximum value of the parameter is <b>1.0</b> (effective area is 100% of the gross area) with a minimum value
            of <b>0.1</b>.
          </p>
          <p>
            <b>Effective Length</b> is the parameter used to <b>overwrite the length multiplier</b>. The default value of this
            ratio is set at <b>NA</b>. The value can be re-defined for any particular design session with a minimum of{" "}
            <b>0.1</b>. If an invalid value is given, it is set to <b>NA</b> or <b>1.0</b>.
          </p>
        </div>
      </div>
    </div>
  );
};

const thicknessList = (inputs, modeField, valuesField) =>
  inputs?.[modeField] === "Customized" && Array.isArray(inputs?.[valuesField]) && inputs[valuesField].length > 0
    ? inputs[valuesField].join(", ")
    : null;

/** Stiffeners: every row is a main-form value. */
export const StiffenersTab = ({ inputs }) => {
  const intermediateValues = thicknessList(inputs, "intermediate_stiffener_thickness", "intermediate_stiffener_thickness_val");
  const longitudinalValues = thicknessList(inputs, "longitudinal_stiffener_thickness", "longitudinal_stiffener_thickness_val");
  return (
    <div className="Connector-col-beam-cont">
      <div className="col-left">
        <div className="sub-container">
          <h4>Inputs</h4>
          <DockNote />
          <DockChoice label={KEY_DISP_IntermediateStiffener} inputs={inputs} field="intermediate_stiffener" options={PG_INTERMEDIATE_STIFFENER_OPTIONS} />
          <DockText label={KEY_DISP_IntermediateStiffener_spacing} value={inputs?.intermediate_stiffener_spacing} />
          <DockChoice label={KEY_DISP_LongitudnalStiffener} inputs={inputs} field="longitudinal_stiffener" options={PG_LONGITUDINAL_STIFFENER_OPTIONS} />
          <DockChoice
            label={KEY_DISP_IntermediateStiffener_thickness}
            inputs={inputs}
            field="intermediate_stiffener_thickness"
            options={PG_STIFFENER_THICKNESS_OPTIONS}
          />
          {intermediateValues && <DockText label="Intermediate Stiffener Thickness Values (mm)" value={intermediateValues} />}
          <DockChoice
            label={KEY_DISP_LongitudnalStiffener_thickness}
            inputs={inputs}
            field="longitudinal_stiffener_thickness"
            options={PG_STIFFENER_THICKNESS_OPTIONS}
          />
          {longitudinalValues && <DockText label="Longitudnal Stiffener Thickness Values (mm)" value={longitudinalValues} />}
          <h4>{KEY_WEB_BUCKLING}</h4>
          <DockChoice label={KEY_ShearBuckling.trim()} inputs={inputs} field="shear_buckling_option" options={PG_SHEAR_BUCKLING_OPTIONS} />
        </div>
      </div>
    </div>
  );
};

/** Additional Girder Data: the symmetry (main form). */
export const AdditionalGirderDataTab = ({ inputs }) => (
  <div className="Connector-col-beam-cont">
    <div className="col-left">
      <div className="sub-container">
        <h4>Inputs</h4>
        <DockNote />
        <DockChoice label={KEY_DISP_IS_IT_SYMMETRIC} inputs={inputs} field="symmetry" options={PG_SYMMETRY_OPTIONS} />
      </div>
    </div>
  </div>
);

/** Deflection: the criteria (main form) and the maximum deflection the request builder derives from them. */
export const DeflectionTab = ({ inputs }) => {
  const structureType = inputs?.structure_type;
  const maxDeflection = calculateMaxDeflection(
    structureType || "Highway Bridge",
    inputs?.design_load || "Live load",
    inputs?.member_options || "Simple Span",
    inputs?.supporting_options || "Not Applicable",
  );
  return (
    <div className="Connector-col-beam-cont">
      <div className="col-left">
        <div className="sub-container">
          <h4>Inputs</h4>
          <DockNote />
          <DockChoice label={KEY_DISP_STR_TYPE} inputs={inputs} field="structure_type" options={PG_STRUCTURE_TYPE_OPTIONS} />
          <DockChoice label={KEY_DISP_DESIGN_LOAD} inputs={inputs} field="design_load" options={PG_DESIGN_LOAD_OPTIONS} />
          <DockChoice label={KEY_DISP_MEMBER_OPTIONS} inputs={inputs} field="member_options" options={memberOptionsFor(structureType)} />
          <DockChoice
            label={KEY_DISP_SUPPORTING_OPTIONS}
            inputs={inputs}
            field="supporting_options"
            options={supportingOptionsFor(structureType, inputs?.member_options)}
          />
          <DockText label={KEY_DISP_MAX_DEFL} value={maxDeflection} />
        </div>
      </div>
    </div>
  );
};
