
import { validateRequiredFields } from '../../shared/utils/validation';
import {
  CONN_CFBW,
  CONN_CWBW,
  KEY_AXIAL,
  KEY_CONN,
  KEY_CONNECTOR_MATERIAL,
  KEY_D,
  KEY_DISP_BCENDPLATE,
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
  KEY_SUPTNGSEC,
  KEY_SUPTNGSEC_MATERIAL,
  KEY_TYP,
  KEY_WELD_TYPE,
} from "../../../constants/generated/coreKeys";
export const beamToColumnEndPlateConfig = {
  sessionName: "Beam to Column End Plate Connection",
  designType: KEY_DISP_BCENDPLATE,
  cameraKey: KEY_DISP_BCENDPLATE,
  cadOptions: ["Model", "Beam", "Column", "EndPlate"],
  
  defaultInputs: {
    bolt_hole_type: "Standard",
    bolt_diameter: [],
    bolt_grade: [],
    bolt_slip_factor: "0.3",
    bolt_tension_type: "Pre-tensioned",
    bolt_type: "Bearing Bolt",
    connectivity: CONN_CFBW,
    plate_thickness: [],
    connector_material: "E 165 (Fe 290)",
    design_method: "Limit State Design",
    detailing_corr_status: "No",
    detailing_edge_type: "Rolled, machine-flame cut, sawn and planed",
    detailing_gap: "10",
    load_axial: "0",
    load_moment: "2",
    load_shear: "2",
    material: "E 165 (Fe 290)",
    beam_section: "JB 150",
    column_section: "HB 150",
    supported_material: "E 165 (Fe 290)",
    supporting_material: "E 165 (Fe 290)",
    module: KEY_DISP_BCENDPLATE,
    weld_fab: "Shop Weld",
    weld_material_grade: "410",
    weld_type: "Groove Weld",
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
    const requiredCheck = validateRequiredFields(beamToColumnEndPlateConfig.inputSections, inputs, extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;

    if (!inputs.beam_section || 
        inputs.beam_section === "Select Section" || 
        inputs.load_shear === "") {
      return { isValid: false, message: "Please input all the fields" };
    }
    return { isValid: true };
  },
  buildSubmissionParams: (inputs, allSelected, lists, extraData) => {
    return {
      [KEY_DP_BOLT_HOLE_TYPE]: inputs.bolt_hole_type,
      [KEY_D]: allSelected.bolt_diameter ? lists.boltDiameterList : inputs.bolt_diameter,
      [KEY_GRD]: allSelected.bolt_grade ? lists.propertyClassList : inputs.bolt_grade,
      [KEY_DP_BOLT_SLIP_FACTOR]: inputs.bolt_slip_factor,
      [KEY_DP_BOLT_TYPE]: inputs.bolt_tension_type,
      [KEY_TYP]: inputs.bolt_type.replaceAll("_", " "),
      [KEY_CONN]: inputs.connectivity,
      [KEY_ENDPLATE_TYPE]: extraData?.selectedOption || "Flushed - Reversible Moment",
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
      [KEY_SUPTDSEC]: inputs.beam_section,
      [KEY_SUPTDSEC_MATERIAL]: inputs.supported_material,
      [KEY_SUPTNGSEC]: inputs.column_section,
      [KEY_SUPTNGSEC_MATERIAL]: inputs.supporting_material,
      [KEY_DP_WELD_FAB]: inputs.weld_fab,
      [KEY_DP_WELD_MATERIAL_G_O]: inputs.weld_material_grade,
      [KEY_WELD_TYPE]: inputs.weld_type,
      [KEY_MODULE]: KEY_DISP_BCENDPLATE,
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
            { value: CONN_CFBW, label: CONN_CFBW },
            { value: CONN_CWBW, label: CONN_CWBW }
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
          key: "column_section",
          label: "Column Section",
          type: "select",
          options: "columnList",
          required: true
        },
        {
          key: "beam_section",
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
            { value: "Bearing_Bolt", label: "Bearing Bolt" },
            { value: "Friction_Grip_Bolt", label: "Friction Grip Bolt" }
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
            { value: "Groove Weld", label: "Groove Weld" },
            { value: "Fillet Weld", label: "Fillet Weld" }
          ]
        }
      ]
    }
  ]
};
