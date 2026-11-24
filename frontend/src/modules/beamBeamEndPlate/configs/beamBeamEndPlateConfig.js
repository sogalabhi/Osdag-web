
import { validateRequiredFields } from '../../shared/utils/validation';
import { MATERIAL_CORE_KEYS, PREF_CORE_KEYS } from '../../shared/config/prefCoreKeys';
import {
  KEY_AXIAL,
  KEY_CONN,
  KEY_CONNECTOR_MATERIAL,
  KEY_D,
  KEY_DISP_BB_EP_SPLICE,
  KEY_DISP_CONN,
  KEY_DP_BOLT_HOLE_TYPE,
  KEY_DP_BOLT_SLIP_FACTOR,
  KEY_DP_BOLT_TYPE,
  KEY_DP_DESIGN_METHOD,
  KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
  KEY_DP_DETAILING_EDGE_TYPE,
  KEY_DP_DETAILING_GAP,
  KEY_DP_WELD_FAB,
  KEY_DP_WELD_MATERIAL_G_O,
  KEY_ENDPLATE_TYPE,
  KEY_GRD,
  KEY_MATERIAL,
  KEY_MODULE,
  KEY_MOMENT,
  KEY_PLATETHK,
  KEY_SHEAR,
  KEY_SUPTDSEC,
  KEY_SUPTDSEC_MATERIAL,
  KEY_TYP,
  KEY_WELD_TYPE,
} from "../../../constants/generated/coreKeys";
export const beamBeamEndPlateConfig = {
  sessionName: "Beam Beam End Plate Connection",
  designType: KEY_DISP_BB_EP_SPLICE,
  cameraKey: KEY_DISP_BB_EP_SPLICE,
  cadOptions: ["Model", "Beam", "EndPlate"],
  
  defaultInputs: {
    bolt_diameter: [],
    bolt_grade: [],
    bolt_type: "Bearing Bolt",
    connectivity: "Coplanar Tension-Compression Flange",
    plate_thickness: [],
    load_axial: "100",
    load_moment: "100",
    load_shear: "100",
    material: "E 250 (Fe 410 W)A",
    supported_designation: "WPB 900 X 300 X 291.46",
    module: KEY_DISP_BB_EP_SPLICE,
    weld_type: "Groove Weld",
  },

  // Every form field and the core key(s) it feeds; null for a field that feeds none.
  // The test in src/test/coreKeyMap.test.js checks this against what buildSubmissionParams sends.
  coreKeys: {
    ...PREF_CORE_KEYS,
    ...MATERIAL_CORE_KEYS,
    module: KEY_MODULE,
    // Sent twice: as Connectivity and under the display label "Connectivity *".
    connectivity: [KEY_CONN, KEY_DISP_CONN],
    bolt_diameter: KEY_D,
    bolt_grade: KEY_GRD,
    bolt_type: KEY_TYP,
    plate_thickness: KEY_PLATETHK,
    load_axial: KEY_AXIAL,
    load_moment: KEY_MOMENT,
    load_shear: KEY_SHEAR,
    weld_type: KEY_WELD_TYPE,
    // The end plate type is an option list read from extraState.selectedOption, not from inputs.
    endPlateType: KEY_ENDPLATE_TYPE,
    supported_designation: KEY_SUPTDSEC,
    // The dock material is Material. The Beam Section tab of Additional Inputs (supported_material) is the
    // supported section's material and the Connector tab (connector_material) is Connector.Material; both are
    // the spread's one-to-one rows, which default to the dock material.
  },

  modalConfig: [
    { key: "boltDiameter", inputKey: "bolt_diameter", dataSource: "boltDiameterList" },
    { key: "propertyClass", inputKey: "bolt_grade", dataSource: "propertyClassList" },
    { key: "plateThickness", inputKey: "plate_thickness", dataSource: "thicknessList" },
  ],

  selectionConfig: [
    { key: "boltDiameterSelect", inputKey: "bolt_diameter", defaultValue: "All" },
    { key: "propertyClassSelect", inputKey: "bolt_grade", defaultValue: "All" },
    { key: "thicknessSelect", inputKey: "plate_thickness", defaultValue: "All" },
  ],

  validateInputs: (inputs, extraState, _lists, selectionStates) => {
    const requiredCheck = validateRequiredFields(beamBeamEndPlateConfig.inputSections, inputs, extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;

    if (!inputs.supported_designation || 
        inputs.supported_designation === "Select Section" || 
        inputs.load_shear === "") {
      return { isValid: false, message: "Please input all the fields" };
    }
    return { isValid: true };
  },

  buildSubmissionParams: (inputs, allSelected, lists, extraData) => {
    const conn_map = {
      "Flushed - Reversible Moment": "Flushed - Reversible Moment",
      "Extended One Way - Irreversible Moment": "Extended One Way - Irreversible Moment",
      "Extended Both Ways - Reversible Moment": "Extended Both Ways - Reversible Moment",
    };

    return {
      [KEY_DP_BOLT_HOLE_TYPE]: inputs.bolt_hole_type,
      [KEY_D]: allSelected.bolt_diameter ? lists.boltDiameterList : inputs.bolt_diameter,
      [KEY_GRD]: allSelected.bolt_grade ? lists.propertyClassList : inputs.bolt_grade,
      [KEY_DP_BOLT_SLIP_FACTOR]: inputs.bolt_slip_factor,
      [KEY_DP_BOLT_TYPE]: inputs.bolt_tension_type,
      [KEY_TYP]: inputs.bolt_type.replaceAll("_", " "),
      "Connectivity *": inputs.connectivity,
      [KEY_CONN]: inputs.connectivity,
      [KEY_ENDPLATE_TYPE]: conn_map[extraData?.selectedOption] || "Flushed - Reversible Moment",
      [KEY_PLATETHK]: allSelected.plate_thickness 
        ? lists.thicknessList : inputs.plate_thickness,
      [KEY_CONNECTOR_MATERIAL]: inputs.connector_material,
      [KEY_DP_DESIGN_METHOD]: inputs.design_method,
      [KEY_DP_DETAILING_CORROSIVE_INFLUENCES]: inputs.detailing_corr_status,
      [KEY_DP_DETAILING_EDGE_TYPE]: inputs.detailing_edge_type,
      [KEY_DP_DETAILING_GAP]: inputs.detailing_gap,
      [KEY_AXIAL]: inputs.load_axial || "0",
      [KEY_MOMENT]: inputs.load_moment || "",
      [KEY_SHEAR]: inputs.load_shear || "",
      [KEY_MATERIAL]: inputs.material,
      [KEY_SUPTDSEC]: inputs.supported_designation,
      [KEY_SUPTDSEC_MATERIAL]: inputs.supported_material,
      [KEY_DP_WELD_FAB]: inputs.weld_fab,
      [KEY_DP_WELD_MATERIAL_G_O]: inputs.weld_material_grade,
      [KEY_WELD_TYPE]: inputs.weld_type,
    [KEY_MODULE]: KEY_DISP_BB_EP_SPLICE,
    };
  },

  inputSections: [
    {
      title: "Connecting Members",
      fields: [
        {
          key: "connectivity",
          label: "Connectivity",
          type: "select",
          options: [
            { value: "Coplanar Tension-Compression Flange", label: "Coplanar Tension-Compression Flange" },
            { value: "Coplanar Tension Flange", label: "Coplanar Tension Flange" },
            { value: "Coplanar Compression Flange", label: "Coplanar Compression Flange" }
          ]
        },
        {
          key: "endPlateType",
          label: "End Plate Type",
          type: "endPlateSelect",
          options: [
            "Flushed - Reversible Moment",
            "Extended One Way - Irreversible Moment",
            "Extended Both Ways - Reversible Moment",
          ]
        },
        {
          key: "supported_designation",
          label: "Beam Section",
          type: "select",
          options: "beamList",
          required: true
        },
        {
          key: "material",
          label: "Material",
          type: "select",
          options: "materialList",
          onChange: (value, inputs, setInputs, materialList) => {
            const material = materialList.find(item => item.id === value);
            setInputs({
              ...inputs,
              material: material.Grade,
              connector_material: material.Grade,
              supported_material: material.Grade,
            });
          }
        }
      ]
    },
    {
      title: "Factored Loads",
      fields: [
        { key: "load_shear", label: "Shear Force(kN)", type: "number", required: true },
        { key: "load_moment", label: "Bending Moment (kNm)", type: "number", required: true },
        { key: "load_axial", label: "Axial Force(kN)", type: "number", required: false }
      ]
    },
    {
      title: "Bolt",
      fields: [
        {
          key: "bolt_diameter",
          label: "Diameter(mm)",
          type: "customizable",
          selectionKey: "boltDiameterSelect",
          modalKey: "boltDiameter",
          dataSource: "boltDiameterList"
        },
        {
          key: "bolt_type",
          label: "Type",
          type: "select",
          options: [
            { value: "Bearing Bolt", label: "Bearing Bolt" },
            { value: "Friction Grip Bolt", label: "Friction Grip Bolt" }
          ]
        },
        {
          key: "bolt_grade",
          label: "Property Class",
          type: "customizable",
          selectionKey: "propertyClassSelect",
          modalKey: "propertyClass",
          dataSource: "propertyClassList"
        }
      ]
    },
    {
      title: "End Plate",
      fields: [
        {
          key: "plate_thickness",
          label: "Thickness(mm)",
          type: "customizable",
          selectionKey: "thicknessSelect",
          modalKey: "plateThickness",
          dataSource: "thicknessList"
        }
      ]
    },
    {
      title: "Weld",
      fields: [
        {
          key: "weld_type",
          label: "Type",
          type: "select",
          options: [
            { value: "Groove Weld", label: "Groove Weld" }
          ]
        }
      ]
    }
  ]
};