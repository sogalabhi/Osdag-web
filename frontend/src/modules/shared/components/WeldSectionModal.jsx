import { Select, Input } from "antd";
import GenericConfigView from "./GenericConfigView";

const { Option } = Select;

const SIMPLE_CONNECTION_WELD_MODULES = ["Butt Joint Welded", "Lap Joint Welded"];

const WeldSectionModal = ({
  module,
  designPrefInputs,
  setDesignPrefInputs,
  isInputLocked,
}) => {
  const isSimpleConnection =
    module && SIMPLE_CONNECTION_WELD_MODULES.includes(module);

  const Weld_text = `Shop weld takes a material safety factor of 1.25
Field weld takes a material safety factor of 1.5
(IS 800 - cl. 5. 4. 1 or Table 5)`;

  return (
    <GenericConfigView
      description={!isSimpleConnection ? Weld_text : null}
      descRows={25}
    >
      <div className="input-cont">
        <h5>{isSimpleConnection ? "Type" : "Type of Weld Fabrication"}</h5>
        <Select
          disabled={isInputLocked}
          style={{ width: "132px", height: "25px", fontSize: "12px" }}
          value={designPrefInputs.weld_fab}
          onSelect={(value) =>
            setDesignPrefInputs({ ...designPrefInputs, weld_fab: value })
          }
        >
          <Option value="Shop weld">
            {isSimpleConnection ? "Shop weld" : "Shop Weld"}
          </Option>
          <Option value="Field weld">
            {isSimpleConnection ? "Field weld" : "Field Weld"}
          </Option>
        </Select>
      </div>
      <div className="input-cont">
        <h5>Material Grade Overwrite, Fu (MPa)</h5>
        <Input
          disabled={isInputLocked}
          type="text"
          className="input-design-pref"
          value={designPrefInputs.weld_material_grade}
          onChange={(e) =>
            setDesignPrefInputs({
              ...designPrefInputs,
              weld_material_grade: e.target.value,
            })
          }
        />
      </div>
    </GenericConfigView>
  );
};

export default WeldSectionModal;
