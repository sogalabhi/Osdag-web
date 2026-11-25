import { Select } from "antd";
import { KEY_DISP_DP_DESIGN_BASE_PLATE, KEY_DP_DESIGN_BASE_PLATE } from "../../../constants/generated/coreKeys";
import { BASE_PLATE_ANALYSIS_OPTIONS, DESIGN_METHOD_OPTIONS } from "../config/prefOptions";

const { Option } = Select;

const SIMPLE_CONNECTION_MODULES = [
  "Butt Joint Bolted",
  "Butt Joint Welded",
  "Lap Joint Bolted",
  "Lap Joint Welded",
];

// The session name the Additional Inputs dialog is keyed by (basePlateConfig.sessionName).
const BASE_PLATE_MODULE = "Base Plate";

const DesignSectionModal = ({
  module,
  designPrefInputs,
  setDesignPrefInputs,
  isInputLocked,
}) => {
  const isSimpleConnection =
    module && SIMPLE_CONNECTION_MODULES.includes(module);
  // The base plate's Design tab has a second box, Base Plate Analysis (the desktop's design_values).
  const isBasePlate = module === BASE_PLATE_MODULE;

  return (
    <>
      <div className="Connector-col-beam-cont">
        <div>
          <h4>Inputs</h4>
          <div className="sub-container">
            {!isSimpleConnection && (
              <div className="input-cont">
                <h5>Design Method</h5>
                <div>
                  <Select
                    disabled={isInputLocked}
                    style={{ width: "132px", height: "25px", fontSize: "12px" }}
                    value={designPrefInputs.design_method}
                    onSelect={(value) =>
                      setDesignPrefInputs({
                        ...designPrefInputs,
                        design_method: value,
                      })
                    }
                  >
                    {DESIGN_METHOD_OPTIONS.map(({ value, disabled }) => (
                      <Option key={value} value={value} disabled={disabled}>
                        {value}
                      </Option>
                    ))}
                  </Select>
                </div>
              </div>
            )}
            {isBasePlate && (
              <div className="input-cont">
                <h5>{KEY_DISP_DP_DESIGN_BASE_PLATE}</h5>
                <div>
                  <Select
                    disabled={isInputLocked}
                    style={{ width: "132px", height: "25px", fontSize: "12px" }}
                    value={designPrefInputs[KEY_DP_DESIGN_BASE_PLATE]}
                    onSelect={(value) =>
                      setDesignPrefInputs({
                        ...designPrefInputs,
                        [KEY_DP_DESIGN_BASE_PLATE]: value,
                      })
                    }
                  >
                    {BASE_PLATE_ANALYSIS_OPTIONS.map((value) => (
                      <Option key={value} value={value}>
                        {value}
                      </Option>
                    ))}
                  </Select>
                </div>
              </div>
            )}
            {/* <div className="input-cont">
              <h5>Design For</h5>
              <div>
                <Select
                  disabled={isInputLocked}
                  style={{ width: "200px", height: "25px", fontSize: "12px" }}
                  value={designPrefInputs.design_for}
                  onSelect={(value) =>
                    setDesignPrefInputs({
                      ...designPrefInputs,
                      design_for: value,
                    })
                  }
                >
                  <Option value="Tension">Tension</Option>
                  <Option value="Compression">Compression</Option>
                </Select>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </>
  );
};

export default DesignSectionModal;

