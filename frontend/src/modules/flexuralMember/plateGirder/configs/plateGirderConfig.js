
import ISECTION from "../../../../assets/ISection.png";

import { validateRequiredFields } from '../../../shared/utils/validation';
import { MATERIAL_CORE_KEYS, PREF_CORE_KEYS } from "../../../shared/config/prefCoreKeys";
import {
  KEY_ALLOW_CLASS,
  KEY_BENDING_MOMENT_SHAPE,
  KEY_BOTTOM_Bflange_PG,
  KEY_BOTTOM_FLANGE_THICKNESS_PG,
  KEY_DESIGN_LOAD,
  KEY_DESIGN_TYPE_FLEXURE,
  KEY_DISP_IS_IT_SYMMETRIC,
  KEY_DISP_PLATE_GIRDER_WELDED,
  KEY_DP_DESIGN_METHOD,
  KEY_EFFECTIVE_AREA_PARA,
  KEY_IntermediateStiffener,
  KEY_IntermediateStiffener_spacing,
  KEY_IntermediateStiffener_thickness,
  KEY_LENGTH,
  KEY_LENGTH_OVERWRITE,
  KEY_LOAD,
  KEY_LongitudnalStiffener,
  KEY_LongitudnalStiffener_thickness,
  KEY_MATERIAL,
  KEY_MAX_DEFL,
  KEY_MEMBER_OPTIONS,
  KEY_MODULE,
  KEY_MOMENT,
  KEY_OVERALL_DEPTH_PG,
  KEY_OVERALL_DEPTH_PG_TYPE,
  KEY_SEC_MATERIAL,
  KEY_SHEAR,
  KEY_STR_TYPE,
  KEY_SUPPORTING_OPTIONS,
  KEY_SUPPORT_WIDTH,
  KEY_ShearBucklingOption,
  KEY_TOP_Bflange_PG,
  KEY_TOP_FLANGE_THICKNESS_PG,
  KEY_TORSIONAL_RES,
  KEY_WARPING_RES,
  KEY_WEB_PHILOSOPHY,
  KEY_WEB_THICKNESS_PG,
} from "../../../../constants/generated/coreKeys";
import {
  WEB_BOTTOMFLANGE_WIDTH_INC,
  WEB_BOTTOMFLANGE_WIDTH_LB,
  WEB_BOTTOMFLANGE_WIDTH_UB,
  WEB_DESIGN_INTERMEDIATESTIFFENER_THICKNESS_VALUES,
  WEB_DESIGN_LONGITUDNALSTIFFENER_THICKNESS_VALUES,
  WEB_TOPFLANGE_WIDTH_INC,
  WEB_TOPFLANGE_WIDTH_LB,
  WEB_TOPFLANGE_WIDTH_UB,
  WEB_TOTAL_DEPTH_INC,
  WEB_TOTAL_DEPTH_LB,
  WEB_TOTAL_DEPTH_UB,
} from "../../../../constants/generated/webKeys";
import { prefText } from "../../../shared/utils/prefValue";
import { calculateMaxDeflection, memberOptionsFor, supportingOptionsFor } from "./plateGirderPrefOptions";
import { applyFieldLists } from "../../../shared/utils/fieldLists";

const asOptions = (values) => values.map((value) => ({ value, label: value }));

/** Member Options narrow by Structure Type (the core's member_options_change). */
const getMemberOptionsList = (structureType) => asOptions(memberOptionsFor(structureType));

/** Supporting Options narrow by Structure Type + Member Options (the core's supp_options_change, IS 800:2007 Table 6). */
const getSupportingOptionsList = (structureType, memberOption) => asOptions(supportingOptionsFor(structureType, memberOption));

export const plateGirderConfig = {
  sessionName: "Plate Girder Design",
  designType: KEY_DISP_PLATE_GIRDER_WELDED,
  cameraKey: "FlexuralMember",
  cadOptions: ["Model", "Web", "Top Flange", "Bottom Flange", "Stiffeners"],

  defaultInputs: {
    module: KEY_DISP_PLATE_GIRDER_WELDED,
    material: "E 250 (Fe 410 W)A",
    design_type: "Customized", // "Customized" or "Optimized"
    total_depth: "1300", // Required for Customized
    web_thickness: ["20"], // List of standard thicknesses
    top_flange_width: "350", // Required for Customized
    top_flange_thickness: ["40"], // List
    bottom_flange_width: "350", // Required for Customized
    bottom_flange_thickness: ["40"], // List
    // Length in mm, matching desktop KEY_DISP_LENGTH = 'Length (mm) *'
    member_length: "20000", // in mm, sent to backend as-is (no conversion)
    bending_moment: "2000",
    shear_force: "400",
    bending_moment_shape: "Uniform Loading with pinned-pinned support",
    support_type: "Major Laterally Supported",
    support_width: "300",
    web_philosophy: "Thick Web without ITS",
    torsional_restraint: "Fully Restrained",
    warping_restraint: "Both flanges fully restrained",
    // Design Preferences defaults
    loading_condition: "Normal",
    // Stiffeners
    intermediate_stiffener: "No",
    intermediate_stiffener_spacing: "NA",
    intermediate_stiffener_thickness: "Standard",
    intermediate_stiffener_thickness_val: [], // Will be populated
    longitudinal_stiffener: "No",
    longitudinal_stiffener_thickness: "Standard",
    longitudinal_stiffener_thickness_val: [], // Will be populated
    shear_buckling_option: "Simple Post Critical",
    // Additional
    symmetry: "Symmetrical",
    // Deflection
    structure_type: "Highway Bridge",
    design_load: "Live load",
    member_options: "Simple Span",
    supporting_options: "Not Applicable",
    max_deflection: "Span/600",
    // Optimization bounds (only used when Optimized)
    total_depth_lb: "200",
    total_depth_ub: "2000",
    total_depth_inc: "25",
    top_flange_width_lb: "100",
    top_flange_width_ub: "1000",
    top_flange_width_inc: "10",
    bottom_flange_width_lb: "100",
    bottom_flange_width_ub: "1000",
    bottom_flange_width_inc: "10",
  },

  // Core keys the builder computes from several fields; a file's value is never read back into them.
  computedCoreKeys: [KEY_MAX_DEFL],

  // Every form field and the core key(s) it feeds; null for a field that feeds none.
  // The test in src/test/coreKeyMap.test.js checks this against what buildSubmissionParams sends.
  coreKeys: {
    ...PREF_CORE_KEYS,
    ...MATERIAL_CORE_KEYS,
    module: KEY_MODULE,
    material: KEY_MATERIAL,
    // The Girder Properties tab of Additional Inputs (the dock Material until it is saved). The design reads
    // the dock Material; the request builder does not send this one.
    girder_material: KEY_SEC_MATERIAL,
    design_type: KEY_OVERALL_DEPTH_PG_TYPE,
    // Customized sends the typed value; Optimized sends "1" and the lb/ub/inc bounds below.
    total_depth: KEY_OVERALL_DEPTH_PG,
    top_flange_width: KEY_TOP_Bflange_PG,
    bottom_flange_width: KEY_BOTTOM_Bflange_PG,
    web_thickness: KEY_WEB_THICKNESS_PG,
    top_flange_thickness: KEY_TOP_FLANGE_THICKNESS_PG,
    bottom_flange_thickness: KEY_BOTTOM_FLANGE_THICKNESS_PG,
    // Reshaped by parseFloat before sending, so the tracer cannot see it.
    member_length: KEY_LENGTH,
    bending_moment: KEY_MOMENT,
    shear_force: KEY_SHEAR,
    bending_moment_shape: KEY_BENDING_MOMENT_SHAPE,
    support_type: KEY_DESIGN_TYPE_FLEXURE,
    support_width: KEY_SUPPORT_WIDTH,
    web_philosophy: KEY_WEB_PHILOSOPHY,
    torsional_restraint: KEY_TORSIONAL_RES,
    warping_restraint: KEY_WARPING_RES,
    allowable_class: KEY_ALLOW_CLASS,
    effective_area_parameter: KEY_EFFECTIVE_AREA_PARA,
    length_overwrite: KEY_LENGTH_OVERWRITE,
    loading_condition: KEY_LOAD,
    shear_buckling_option: KEY_ShearBucklingOption,
    // The builder sends this under the bare "Symmetry" name, which is KEY_DISP_IS_IT_SYMMETRIC.
    symmetry: KEY_DISP_IS_IT_SYMMETRIC,
    intermediate_stiffener: KEY_IntermediateStiffener,
    intermediate_stiffener_spacing: KEY_IntermediateStiffener_spacing,
    intermediate_stiffener_thickness: KEY_IntermediateStiffener_thickness,
    intermediate_stiffener_thickness_val: WEB_DESIGN_INTERMEDIATESTIFFENER_THICKNESS_VALUES,
    longitudinal_stiffener: KEY_LongitudnalStiffener,
    longitudinal_stiffener_thickness: KEY_LongitudnalStiffener_thickness,
    longitudinal_stiffener_thickness_val: WEB_DESIGN_LONGITUDNALSTIFFENER_THICKNESS_VALUES,
    // Deflection criteria: the first four also feed the computed Deflection.Max (calculateMaxDeflection).
    structure_type: [KEY_STR_TYPE, KEY_MAX_DEFL],
    design_load: [KEY_DESIGN_LOAD, KEY_MAX_DEFL],
    member_options: [KEY_MEMBER_OPTIONS, KEY_MAX_DEFL],
    supporting_options: [KEY_SUPPORTING_OPTIONS, KEY_MAX_DEFL],
    // A leftover default: the builder recomputes Deflection.Max and never reads this value.
    max_deflection: null,
    // Optimized-only bounds, sent as strings.
    total_depth_lb: WEB_TOTAL_DEPTH_LB,
    total_depth_ub: WEB_TOTAL_DEPTH_UB,
    total_depth_inc: WEB_TOTAL_DEPTH_INC,
    top_flange_width_lb: WEB_TOPFLANGE_WIDTH_LB,
    top_flange_width_ub: WEB_TOPFLANGE_WIDTH_UB,
    top_flange_width_inc: WEB_TOPFLANGE_WIDTH_INC,
    bottom_flange_width_lb: WEB_BOTTOMFLANGE_WIDTH_LB,
    bottom_flange_width_ub: WEB_BOTTOMFLANGE_WIDTH_UB,
    bottom_flange_width_inc: WEB_BOTTOMFLANGE_WIDTH_INC,
  },

  // Helper function to get section image
  getSectionImage: () => {
    // Plate girder is always a welded I-section
    return ISECTION;
  },

  validateInputs: (inputs, extraState, _lists, selectionStates) => {
    const requiredCheck = validateRequiredFields(plateGirderConfig.inputSections, inputs, extraState, selectionStates);
    if (!requiredCheck.isValid) return requiredCheck;

    // Basic validation
    if (!inputs.material || !inputs.member_length || !inputs.shear_force || 
        !inputs.bending_moment || !inputs.design_type) {
      return { isValid: false, message: "Please input all the required fields" };
    }

    // Validate numeric inputs
    if (isNaN(parseFloat(inputs.member_length)) || parseFloat(inputs.member_length) <= 0) {
      return { isValid: false, message: "Member length must be a positive number" };
    }
    if (isNaN(parseFloat(inputs.shear_force))) {
      return { isValid: false, message: "Shear force must be a valid number" };
    }
    if (isNaN(parseFloat(inputs.bending_moment)) || parseFloat(inputs.bending_moment) <= 0) {
      return { isValid: false, message: "Bending moment must be a positive number" };
    }

    // For Customized design type, validate required dimensions
    if (inputs.design_type === "Customized") {
      if (!inputs.total_depth || isNaN(parseFloat(inputs.total_depth)) || parseFloat(inputs.total_depth) <= 0) {
        return { isValid: false, message: "Total depth must be a positive number for Customized design" };
      }
      if (!inputs.top_flange_width || isNaN(parseFloat(inputs.top_flange_width)) || parseFloat(inputs.top_flange_width) <= 0) {
        return { isValid: false, message: "Top flange width must be a positive number for Customized design" };
      }
      if (!inputs.bottom_flange_width || isNaN(parseFloat(inputs.bottom_flange_width)) || parseFloat(inputs.bottom_flange_width) <= 0) {
        return { isValid: false, message: "Bottom flange width must be a positive number for Customized design" };
      }
      if (!inputs.web_thickness || (Array.isArray(inputs.web_thickness) && inputs.web_thickness.length === 0)) {
        return { isValid: false, message: "Web thickness is required" };
      }
      if (!inputs.top_flange_thickness || (Array.isArray(inputs.top_flange_thickness) && inputs.top_flange_thickness.length === 0)) {
        return { isValid: false, message: "Top flange thickness is required" };
      }
      if (!inputs.bottom_flange_thickness || (Array.isArray(inputs.bottom_flange_thickness) && inputs.bottom_flange_thickness.length === 0)) {
        return { isValid: false, message: "Bottom flange thickness is required" };
      }
    }

    return { isValid: true };
  },

  buildSubmissionParams: (inputs, allSelected, lists) => {
    const getArrayParam = (allSelectedFlag, fullList, selectedList) => {
      if (allSelectedFlag) {
        return fullList.filter(item => item !== "All" && item !== "Select Section");
      }
      if (Array.isArray(selectedList)) {
        return selectedList.filter(item => item !== "All" && item !== "Select Section");
      }
      return [selectedList].filter(item => item !== "All" && item !== "Select Section");
    };

    // Member length is in mm and sent to backend as-is (matches desktop KEY_LENGTH contract).
    const memberLength = inputs.member_length ? String(parseFloat(inputs.member_length)) : "5000";

    // For Customized design with number inputs, use the direct value
    // For Optimized design with customizable inputs, use getArrayParam
    let webThicknessList, topFlangeThicknessList, bottomFlangeThicknessList;
    
    if (inputs.design_type === "Customized") {
      // Direct values for Customized (user entered specific numbers)
      webThicknessList = inputs.web_thickness ? [String(inputs.web_thickness)] : ["6"];
      topFlangeThicknessList = inputs.top_flange_thickness ? [String(inputs.top_flange_thickness)] : ["6"];
      bottomFlangeThicknessList = inputs.bottom_flange_thickness ? [String(inputs.bottom_flange_thickness)] : ["6"];
    } else {
      // Use getArrayParam for Optimized (All/Customized selection)
      webThicknessList = getArrayParam(
        allSelected.web_thickness,
        lists.thicknessList || [],
        inputs.web_thickness
      );
      topFlangeThicknessList = getArrayParam(
        allSelected.top_flange_thickness,
        lists.thicknessList || [],
        inputs.top_flange_thickness
      );
      bottomFlangeThicknessList = getArrayParam(
        allSelected.bottom_flange_thickness,
        lists.thicknessList || [],
        inputs.bottom_flange_thickness
      );
    }

    // Backend validation expects thickness to ALWAYS be List[str]
    // Backend's _thickness_val() function handles conversion:
    // - Customized: extracts first element as string
    // - Optimized: uses full array
    const webThickness = webThicknessList.length > 0 ? webThicknessList : ["6"];
    const topFlangeThickness = topFlangeThicknessList.length > 0 ? topFlangeThicknessList : ["6"];
    const bottomFlangeThickness = bottomFlangeThicknessList.length > 0 ? bottomFlangeThicknessList : ["6"];

    const params = {
        // --- Basic Module Info ---
        [KEY_MODULE]: KEY_DISP_PLATE_GIRDER_WELDED,
        [KEY_MATERIAL]: String(inputs.material || "E 250 (Fe 410 W)A"),
        [KEY_LENGTH]: memberLength,
        
        // --- Loads ---
        [KEY_LOAD]: String(inputs.loading_condition || "Normal"),
        [KEY_SHEAR]: String(inputs.shear_force || "0"),
        [KEY_MOMENT]: String(inputs.bending_moment || "0"),
        [KEY_BENDING_MOMENT_SHAPE]: String(inputs.bending_moment_shape || "Uniform Loading with pinned-pinned support"),
      
        // --- Design Type ---
        [KEY_OVERALL_DEPTH_PG_TYPE]: String(inputs.design_type || "Customized"),
      
        // --- Thicknesses (String for Customized, Array for Optimized) ---
        [KEY_WEB_THICKNESS_PG]: webThickness,
        [KEY_TOP_FLANGE_THICKNESS_PG]: topFlangeThickness,
        [KEY_BOTTOM_FLANGE_THICKNESS_PG]: bottomFlangeThickness,
      
        // --- Design Preferences ---
        [KEY_DESIGN_TYPE_FLEXURE]: String(inputs.support_type || "Major Laterally Supported"),
        [KEY_TORSIONAL_RES]: String(inputs.torsional_restraint || "Fully Restrained"),
        [KEY_WARPING_RES]: String(inputs.warping_restraint || "Both flanges fully restrained"),
        // Deflection.Max is a desktop-side auto-computed (not directly
        // user-editable) field, derived from Structure Type/Design Load/
        // Member Options/Supporting Options (plate_girder.py:max_defl_change).
        // Compute it fresh here rather than trusting a possibly-stale
        // inputs.max_deflection so it always matches the user's actual
        // Deflection Criteria selections.
        [KEY_MAX_DEFL]: calculateMaxDeflection(
          inputs.structure_type || "Highway Bridge",
          inputs.design_load || "Live load",
          inputs.member_options || "Simple Span",
          inputs.supporting_options || "Not Applicable"
        ),
        // The desktop keeps the structure type in its file; Deflection.Max alone cannot give it back.
        [KEY_STR_TYPE]: String(inputs.structure_type || "Highway Bridge"),
        [KEY_DESIGN_LOAD]: String(inputs.design_load || "Live load"),
        [KEY_MEMBER_OPTIONS]: String(inputs.member_options || "Simple Span"),
        [KEY_SUPPORTING_OPTIONS]: String(inputs.supporting_options || "NA"),
        [KEY_ALLOW_CLASS]: prefText(inputs.allowable_class),
        [KEY_WEB_PHILOSOPHY]: String(inputs.web_philosophy || "Thick Web without ITS"),
        [KEY_SUPPORT_WIDTH]: String(inputs.support_width || "100"),
        [KEY_DP_DESIGN_METHOD]: prefText(inputs.design_method),
        [KEY_EFFECTIVE_AREA_PARA]: prefText(inputs.effective_area_parameter),
        [KEY_LENGTH_OVERWRITE]: prefText(inputs.length_overwrite),
        [KEY_ShearBucklingOption]: String(inputs.shear_buckling_option || "Simple Post Critical"),
      
        // --- Stiffener Settings ---
        [KEY_IntermediateStiffener]: String(inputs.intermediate_stiffener || "No"),
        [KEY_IntermediateStiffener_spacing]: String(inputs.intermediate_stiffener_spacing || "NA"),
        [KEY_IntermediateStiffener_thickness]: String(inputs.intermediate_stiffener_thickness || "Standard"),
        [KEY_LongitudnalStiffener]: String(inputs.longitudinal_stiffener || "No"),
        [KEY_LongitudnalStiffener_thickness]: String(inputs.longitudinal_stiffener_thickness || "Standard"),
        
        // --- Additional Girder Data ---
        "Symmetry": String(inputs.symmetry || "Symmetrical")
      };

    // Add design type specific params
    if (inputs.design_type === "Customized") {
      params[KEY_OVERALL_DEPTH_PG] = String(inputs.total_depth || "500");
      params[KEY_TOP_Bflange_PG] = String(inputs.top_flange_width || "200");
      params[KEY_BOTTOM_Bflange_PG] = String(inputs.bottom_flange_width || "200");
    } else if (inputs.design_type === "Optimized") {
      // For optimized, these are not required in set_input_values but we set defaults
      params[KEY_OVERALL_DEPTH_PG] = "1";
      params[KEY_TOP_Bflange_PG] = "1";
      params[KEY_BOTTOM_Bflange_PG] = "1";
      
      // Add optimization bounds if provided
      if (inputs.total_depth_lb && inputs.total_depth_ub) {
        params[WEB_TOTAL_DEPTH_LB] = String(inputs.total_depth_lb);
        params[WEB_TOTAL_DEPTH_UB] = String(inputs.total_depth_ub);
        if (inputs.total_depth_inc) {
          params[WEB_TOTAL_DEPTH_INC] = String(inputs.total_depth_inc);
        }
      }
      if (inputs.top_flange_width_lb && inputs.top_flange_width_ub) {
        params[WEB_TOPFLANGE_WIDTH_LB] = String(inputs.top_flange_width_lb);
        params[WEB_TOPFLANGE_WIDTH_UB] = String(inputs.top_flange_width_ub);
        if (inputs.top_flange_width_inc) {
          params[WEB_TOPFLANGE_WIDTH_INC] = String(inputs.top_flange_width_inc);
        }
      }
      if (inputs.bottom_flange_width_lb && inputs.bottom_flange_width_ub) {
        params[WEB_BOTTOMFLANGE_WIDTH_LB] = String(inputs.bottom_flange_width_lb);
        params[WEB_BOTTOMFLANGE_WIDTH_UB] = String(inputs.bottom_flange_width_ub);
        if (inputs.bottom_flange_width_inc) {
          params[WEB_BOTTOMFLANGE_WIDTH_INC] = String(inputs.bottom_flange_width_inc);
        }
      }
    }

    // Add customized thickness values if provided
    if (inputs.intermediate_stiffener_thickness === "Customized" && 
        Array.isArray(inputs.intermediate_stiffener_thickness_val) && 
        inputs.intermediate_stiffener_thickness_val.length > 0) {
      params[WEB_DESIGN_INTERMEDIATESTIFFENER_THICKNESS_VALUES] = inputs.intermediate_stiffener_thickness_val;
    }
    if (inputs.longitudinal_stiffener_thickness === "Customized" && 
        Array.isArray(inputs.longitudinal_stiffener_thickness_val) && 
        inputs.longitudinal_stiffener_thickness_val.length > 0) {
      params[WEB_DESIGN_LONGITUDNALSTIFFENER_THICKNESS_VALUES] = inputs.longitudinal_stiffener_thickness_val;
    }

    return params;
  },
  isOptimized: (inputs) => inputs.design_type === "Optimized",
  inputSections: [
    {
      title: "Section Details",
      fields: [
        {
          key: "module",
          label: "Module",
          type: "text",
          defaultValue: KEY_DISP_PLATE_GIRDER_WELDED,
          disabled: true
        },
        {
          key: "material", customMaterial: "connector",
          label: "Material",
          type: "select",
          options: "materialList",
        },
        {
          key: "design_type",
          label: "Design Type",
          type: "select",
          options: [
            { value: "Customized", label: "Customized" },
            { value: "Optimized", label: "Optimized" }
          ],
          defaultValue: "Customized",
        },
        {
          key: "total_depth",
          label: "Total Depth (mm)",
          type: "optimized_number",
          optimizedBy: { key: "design_type", value: "Optimized" },
          validation: "positive_number",
          placeholder: "Enter total depth"
        },
        {
          key: "web_thickness",
          label: "Web Thickness (mm)",
          type: "number", // Will be overridden by conditionalType
          selectionKey: "webThicknessSelect",
          modalKey: "webThickness",
          options: "thicknessList",
          dataSource: "thicknessList",
          defaultValue: "20",
          placeholder: "Enter web thickness",
          // For Customized design: show as number input (single value)
          // For Optimized design: show as customizable (All/Customized)
          conditionalType: (inputs) => inputs.design_type === "Optimized" ? "customizable" : "number"
        },
        {
          key: "top_flange_width",
          label: "Width of Top Flange (mm)",
          type: "optimized_number",
          optimizedBy: { key: "design_type", value: "Optimized" },
          validation: "positive_number",
          placeholder: "Enter top flange width"
        },
        {
          key: "top_flange_thickness",
          label: "Top Flange Thickness (mm)",
          type: "number",
          selectionKey: "topFlangeThicknessSelect",
          modalKey: "topFlangeThickness",
          options: "thicknessList",
          dataSource: "thicknessList",
          defaultValue: "40",
          placeholder: "Enter top flange thickness",
          conditionalType: (inputs) => inputs.design_type === "Optimized" ? "customizable" : "number"
        },
        {
          key: "bottom_flange_width",
          label: "Width of Bottom Flange (mm)",
          type: "optimized_number",
          optimizedBy: { key: "design_type", value: "Optimized" },
          validation: "positive_number",
          placeholder: "Enter bottom flange width"
        },
        {
          key: "bottom_flange_thickness",
          label: "Bottom Flange Thickness (mm)",
          type: "number",
          selectionKey: "bottomFlangeThicknessSelect",
          modalKey: "bottomFlangeThickness",
          options: "thicknessList",
          dataSource: "thicknessList",
          defaultValue: "40",
          placeholder: "Enter bottom flange thickness",
          conditionalType: (inputs) => inputs.design_type === "Optimized" ? "customizable" : "number"
        },
        {
          key: "member_length",
          label: "Length (mm)",
          type: "number",
          validation: "positive_number",
          placeholder: "Enter member length in mm",
          // Length is in mm and sent to the backend as-is (matches desktop 'Length (mm) *').
        }
      ]
    },
    {
      title: "Design Inputs",
      fields: [
        {
          key: "support_type",
          label: "Support Type",
          type: "select",
          options: [
            { value: "Major Laterally Supported", label: "Major Laterally Supported" },
            { value: "Major Laterally Unsupported", label: "Major Laterally Unsupported" }
          ],
          defaultValue: "Major Laterally Supported"
        },
        {
          key: "support_width",
          label: "Support Width (mm)",
          type: "number",
          validation: "positive_number",
          placeholder: "Enter support width"
        },
        {
          key: "web_philosophy",
          label: "Web Philosophy",
          type: "select",
          options: [
            { value: "Thick Web without ITS", label: "Thick Web without ITS" },
            { value: "Thin Web with ITS", label: "Thin Web with ITS" }
          ],
          defaultValue: "Thick Web without ITS"
        },
        {
          key: "torsional_restraint",
          label: "Torsional Restraint",
          type: "select",
          options: [
            { value: "Fully Restrained", label: "Fully Restrained" },
            { value: "Partially Restrained-support connection", label: "Partially Restrained-support connection" },
            { value: "Partially Restrained-bearing support", label: "Partially Restrained-bearing support" }
          ],
          defaultValue: "Fully Restrained"
        },
        {
          key: "warping_restraint",
          label: "Warping Restraint",
          type: "select",
          options: [
            { value: "Both flanges fully restrained", label: "Both flanges fully restrained" },
            { value: "Compression flange fully restrained", label: "Compression flange fully restrained" },
            { value: "Compression flange partially restrained", label: "Compression flange partially restrained" },
            { value: "Warping not restrained in both flanges", label: "Warping not restrained in both flanges" }
          ],
          defaultValue: "Both flanges fully restrained"
        },
        {
          key: "symmetry",
          label: "Girder Symmetry",
          type: "select",
          options: [
            { value: "Symmetrical", label: "Symmetrical" },
            { value: "Unsymmetrical", label: "Unsymmetrical" }
          ],
          defaultValue: "Symmetrical"
        },
        {
          key: "shear_buckling_option",
          label: "Shear Buckling Design Method",
          type: "select",
          options: [
            { value: "Simple Post Critical", label: "Simple Post Critical" },
            { value: "Tension Field Test", label: "Tension Field Test" }
          ],
          defaultValue: "Simple Post Critical"
        },
        {
          key: "loading_condition",
          label: "Loading Condition",
          type: "select",
          options: [
            { value: "Normal", label: "Normal" },
            { value: "Destabilizing", label: "Destabilizing" }
          ],
          defaultValue: "Normal"
        }
      ]
    },
    {
      title: "Stiffeners",
      fields: [
        {
          key: "intermediate_stiffener",
          label: "Intermediate Stiffener",
          type: "select",
          options: [
            { value: "No", label: "No" },
            { value: "Yes", label: "Yes" }
          ],
          defaultValue: "No"
        },
        {
          key: "intermediate_stiffener_spacing",
          label: "Intermediate Stiffener Spacing (mm)",
          type: "text",
          placeholder: "Leave as NA to auto-calculate per IS 800:2007",
          conditionalDisplay: (extraState, inputs) => inputs?.intermediate_stiffener === "Yes"
        },
        {
          key: "intermediate_stiffener_thickness",
          label: "Intermediate Stiffener Thickness",
          type: "select",
          options: [
            { value: "Standard", label: "Standard" },
            { value: "Customized", label: "Customized" }
          ],
          defaultValue: "Standard",
          conditionalDisplay: (extraState, inputs) => inputs?.intermediate_stiffener === "Yes"
        },
        {
          key: "intermediate_stiffener_thickness_val",
          label: "Intermediate Stiffener Thickness Values (mm)",
          type: "customizable",
          selectionKey: "intermediateStiffenerThicknessSelect",
          modalKey: "intermediateStiffenerThicknessValues",
          dataSource: "thicknessList",
          conditionalDisplay: (extraState, inputs) =>
            inputs?.intermediate_stiffener === "Yes" && inputs?.intermediate_stiffener_thickness === "Customized"
        },
        {
          key: "longitudinal_stiffener",
          label: "Longitudinal Stiffener",
          type: "select",
          options: [
            { value: "No", label: "No" },
            { value: "Yes and 1 stiffener", label: "Yes and 1 stiffener" },
            { value: "Yes and 2 stiffeners", label: "Yes and 2 stiffeners" }
          ],
          defaultValue: "No"
        },
        {
          key: "longitudinal_stiffener_thickness",
          label: "Longitudinal Stiffener Thickness",
          type: "select",
          options: [
            { value: "Standard", label: "Standard" },
            { value: "Customized", label: "Customized" }
          ],
          defaultValue: "Standard",
          conditionalDisplay: (extraState, inputs) => inputs?.longitudinal_stiffener !== "No"
        },
        {
          key: "longitudinal_stiffener_thickness_val",
          label: "Longitudinal Stiffener Thickness Values (mm)",
          type: "customizable",
          selectionKey: "longitudinalStiffenerThicknessSelect",
          modalKey: "longitudinalStiffenerThicknessValues",
          dataSource: "thicknessList",
          conditionalDisplay: (extraState, inputs) =>
            inputs?.longitudinal_stiffener !== "No" && inputs?.longitudinal_stiffener_thickness === "Customized"
        }
      ]
    },
    {
      title: "Deflection Criteria",
      fields: [
        {
          key: "structure_type",
          label: "Type of Structure",
          type: "select",
          options: [
            { value: "Highway Bridge", label: "Highway Bridge" },
            { value: "Railway Bridge", label: "Railway Bridge" },
            { value: "Industrial Structure", label: "Industrial Structure" },
            { value: "Other Building", label: "Other Building" }
          ],
          defaultValue: "Highway Bridge"
        },
        {
          key: "design_load",
          label: "Design Load",
          type: "select",
          options: [
            { value: "Live load", label: "Live load" },
            { value: "Dead load", label: "Dead load" },
            { value: "Crane Load(Manual operation)", label: "Crane Load (Manual operation)" },
            { value: "Crane load(Electric operation up to 50t)", label: "Crane load (Electric operation up to 50t)" },
            { value: "Crane load(Electric operation over 50t)", label: "Crane load (Electric operation over 50t)" }
          ],
          defaultValue: "Live load"
        },
        {
          key: "member_options",
          label: "Member Options",
          type: "dynamicSelect",
          getOptions: (inputs) => getMemberOptionsList(inputs.structure_type)
        },
        {
          key: "supporting_options",
          label: "Supporting Options",
          type: "dynamicSelect",
          getOptions: (inputs) => getSupportingOptionsList(inputs.structure_type, inputs.member_options)
        }
      ]
    },
    {
      title: "Factored Maximum Loads",
      fields: [
        {
          key: "bending_moment",
          label: "Moment (kNm)",
          type: "number",
          validation: "positive_number",
          placeholder: "Enter bending moment"
        },
        {
          key: "shear_force",
          label: "Shear (kN)",
          type: "number",
          validation: "number",
          placeholder: "Enter shear force"
        },
        {
          key: "bending_moment_shape",
          label: "Bending Moment Shape",
          type: "select",
          options: [
            { value: "Uniform Loading with pinned-pinned support", label: "Uniform Loading with pinned-pinned support" },
            { value: "Uniform Loading with fixed-fixed support", label: "Uniform Loading with fixed-fixed support" },
            { value: "Concentrate Load with pinned-pinned support", label: "Concentrate Load with pinned-pinned support" },
            { value: "Concentrate load with fixed-fixed support", label: "Concentrate load with fixed-fixed support" }
          ],
          defaultValue: "Uniform Loading with pinned-pinned support"
        }
      ]
    }
  ],
};

applyFieldLists(plateGirderConfig);


