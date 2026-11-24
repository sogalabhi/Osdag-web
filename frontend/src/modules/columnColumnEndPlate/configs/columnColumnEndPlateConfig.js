import { validateRequiredFields } from '../../shared/utils/validation';
import { MATERIAL_CORE_KEYS, PREF_CORE_KEYS } from '../../shared/config/prefCoreKeys';
import {
  KEY_AXIAL,
  KEY_CONN,
  KEY_CONNECTOR_MATERIAL,
  KEY_D,
  KEY_DISP_COLUMNENDPLATE,
  KEY_DP_BOLT_HOLE_TYPE,
  KEY_DP_BOLT_SLIP_FACTOR,
  KEY_DP_BOLT_TYPE,
  KEY_DP_DESIGN_METHOD,
  KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
  KEY_DP_DETAILING_EDGE_TYPE,
  KEY_DP_DETAILING_GAP,
  KEY_DP_WELD_FAB,
  KEY_DP_WELD_MATERIAL_G_O,
  KEY_GRD,
  KEY_MATERIAL,
  KEY_MODULE,
  KEY_MOMENT,
  KEY_PLATETHK,
  KEY_SECSIZE,
  KEY_SEC_MATERIAL,
  KEY_SHEAR,
  KEY_SUPTDSEC,
  KEY_TYP,
  KEY_WELD_TYPE,
} from "../../../constants/generated/coreKeys";

export const columnColumnEndPlateConfig = {
  sessionName: "Column Column End Plate Connection",
  designType: KEY_DISP_COLUMNENDPLATE,
  cameraKey: "ColumnColumnEndPlate",
  cadOptions: ["Model", "Column", "EndPlate"],
  
  defaultInputs: {
    bolt_hole_type: "Standard",
    bolt_diameter: [],
    bolt_grade: [],
    bolt_slip_factor: "0.3",
    bolt_tension_type: "Non pre-tensioned",
    bolt_type: "Bearing Bolt",
    connectivity: "Flush End Plate",
    plate_thickness: [],
    connector_material: "E 250 (Fe 410 W)A",
    design_method: "Limit State Design",
    detailing_corr_status: "No",
    detailing_edge_type: "Sheared or hand flame cut",
    detailing_gap: "0",
    load_axial: "100",
    load_moment: "100",
    load_shear: "100",
    material: "E 250 (Fe 410 W)A",
    supported_designation: "UC 305 x 305 x 118",
    supporting_material: "E 250 (Fe 410 W)A",
    module: KEY_DISP_COLUMNENDPLATE,
    weld_fab: "Shop Weld",
    weld_material_grade: "410",
    weld_type: "Groove Weld",
  },

  // Every form field and the core key(s) it feeds; null for a field that feeds none.
  // The test in src/test/coreKeyMap.test.js checks this against what buildSubmissionParams sends.
  coreKeys: {
    ...PREF_CORE_KEYS,
    ...MATERIAL_CORE_KEYS,
    module: KEY_MODULE,
    connectivity: KEY_CONN,
    bolt_diameter: KEY_D,
    bolt_grade: KEY_GRD,
    bolt_type: KEY_TYP,
    plate_thickness: KEY_PLATETHK,
    load_axial: KEY_AXIAL,
    load_moment: KEY_MOMENT,
    load_shear: KEY_SHEAR,
    weld_type: KEY_WELD_TYPE,
    // One column section is sent as both the section size and the supported section.
    supported_designation: [KEY_SECSIZE, KEY_SUPTDSEC],
    // The dock material is Material. The Column Section tab of Additional Inputs (supporting_material) is the
    // column's material, Member.Material; the Connector tab (connector_material) is Connector.Material.
    supporting_material: KEY_SEC_MATERIAL,
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
    const requiredCheck = validateRequiredFields(columnColumnEndPlateConfig.inputSections, inputs, extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;

    if (!inputs.supported_designation || 
        inputs.supported_designation === "Select Section" || 
        inputs.load_shear === "") {
      return { isValid: false, message: "Please input all the fields" };
    }
    return { isValid: true };
  },

  buildSubmissionParams: (inputs, allSelected, lists) => {

    return {
      [KEY_SECSIZE]: inputs.supported_designation,
      [KEY_SEC_MATERIAL]: inputs.supporting_material,
      [KEY_DP_BOLT_HOLE_TYPE]: inputs.bolt_hole_type,
      [KEY_D]: allSelected.bolt_diameter ? lists.boltDiameterList : inputs.bolt_diameter,
      [KEY_GRD]: allSelected.bolt_grade ? lists.propertyClassList : inputs.bolt_grade,
      [KEY_DP_BOLT_SLIP_FACTOR]: inputs.bolt_slip_factor,
      [KEY_DP_BOLT_TYPE]: inputs.bolt_tension_type,
      [KEY_TYP]: inputs.bolt_type.replaceAll("_", " "),
      [KEY_CONN]: inputs.connectivity,
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
      [KEY_DP_WELD_FAB]: inputs.weld_fab,
      [KEY_DP_WELD_MATERIAL_G_O]: inputs.weld_material_grade,
      [KEY_WELD_TYPE]: inputs.weld_type,
      [KEY_MODULE]: KEY_DISP_COLUMNENDPLATE,
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
            { value: "Flush End Plate", label: "Flush End Plate" },
            { value: "Extended Both Ways", label: "Extended Both Ways" }
          ]
        },
        {
          key: "supported_designation",
          label: "Column Section",
          type: "select",
          options: "columnList",
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
              supporting_material: material.Grade,
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
    }
  ]
};