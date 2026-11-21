
import ISECTION from "../../../../assets/ISection.png";

import { validateRequiredFields } from '../../../shared/utils/validation';
import {
  KEY_ALLOW_CLASS,
  KEY_BENDING_MOMENT_SHAPE,
  KEY_BOTTOM_Bflange_PG,
  KEY_BOTTOM_FLANGE_THICKNESS_PG,
  KEY_DESIGN_LOAD,
  KEY_DESIGN_TYPE_FLEXURE,
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
  KEY_SHEAR,
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
// Plate Girder uses backend key strings directly (matching backend Common.py)

/**
 * Helper function to calculate max_deflection based on structure_type, design_load, member_options, supporting_options
 * 
 * ARCHITECTURAL NOTE: This logic is duplicated from backend (plate_girder.py:max_defl_change())
 * 
 * Why duplicate instead of calling backend API?
 * - Performance: Dropdown changes need instant UI updates (0ms latency vs 50-200ms API call)
 * - UX: Users expect immediate feedback when changing structure_type/member_options
 * - Offline capability: Works without network connection
 * 
 * Backend source: osdag_core/design_type/plate_girder/core/plate_girder.py:249-308
 * 
 * IMPORTANT: If backend logic changes, this function must be updated to match.
 * Consider adding automated tests to ensure frontend/backend logic stays in sync.
 */
/**
 * Member Options narrow by Structure Type, matching backend
 * plate_girder.py:member_options_change() / VALUES_MEMBER_OPTIONS.
 */
const getMemberOptionsList = (structureType) => {
  if (structureType === 'Industrial Structure') {
    return ['Purlin and Girts', 'Simple span', 'Cantilever span', 'Rafter Supporting', 'Gantry']
      .map((v) => ({ value: v, label: v }));
  }
  if (structureType === 'Other Building') {
    return ['Floor and roof', 'Cantilever'].map((v) => ({ value: v, label: v }));
  }
  // Highway Bridge / Railway Bridge (default)
  return ['Simple Span', 'Cantilever Span'].map((v) => ({ value: v, label: v }));
};

/**
 * Supporting Options narrow by Structure Type + Member Options, matching
 * backend plate_girder.py:supp_options_change() (IS 800:2007 Table 6).
 */
const getSupportingOptionsList = (structureType, memberOption) => {
  if (structureType === 'Highway Bridge' || structureType === 'Railway Bridge') {
    return [{ value: 'Not Applicable', label: 'Not Applicable' }];
  }
  const memberLower = String(memberOption || '').toLowerCase();
  if (['purlin and girts', 'simple span', 'cantilever span'].includes(memberLower)) {
    return ['Elastic cladding', 'Brittle cladding'].map((v) => ({ value: v, label: v }));
  }
  if (memberLower === 'rafter supporting') {
    return ['Profiled Metal sheeting', 'Plastered sheeting'].map((v) => ({ value: v, label: v }));
  }
  if (memberLower === 'gantry') {
    return [{ value: 'Crane', label: 'Crane' }];
  }
  if (['floor and roof', 'cantilever'].includes(memberLower)) {
    return ['Elements not susceptible to cracking', 'Element susceptible to cracking'].map((v) => ({ value: v, label: v }));
  }
  return [{ value: 'Not Applicable', label: 'Not Applicable' }];
};

const calculateMaxDeflection = (structureType, designLoad, memberOption, supportingOption) => {
  const VALUES_MAX_DEFL = ['Span/600', 'Span/800', 'Span/400', 'Span/300', 'Span/360', 'Span/150', 'Span/180', 'Span/240', 'Span/120', 'Span/500', 'Span/750', 'Span/1000'];
  
  if (structureType === 'Highway Bridge' || structureType === 'Railway Bridge') {
    if (memberOption === 'Simple Span') {
      if (designLoad === 'Live load') {
        return VALUES_MAX_DEFL[0]; // Span/600
      } else if (designLoad === 'Dead load') {
        return VALUES_MAX_DEFL[1]; // Span/800
      } else {
        return 'NA';
      }
    } else {
      if (designLoad === 'Live load') {
        return VALUES_MAX_DEFL[2]; // Span/400
      } else if (designLoad === 'Dead load') {
        return VALUES_MAX_DEFL[1]; // Span/800
      } else {
        return 'NA';
      }
    }
  } else if (structureType === 'Other Building') {
    if (designLoad === 'Live load') {
      if (memberOption === 'Floor and roof') {
        if (supportingOption === 'Elements not susceptible to cracking') {
          return VALUES_MAX_DEFL[3]; // Span/300
        } else {
          return VALUES_MAX_DEFL[4]; // Span/360
        }
      } else {
        if (supportingOption === 'Elements not susceptible to cracking') {
          return VALUES_MAX_DEFL[5]; // Span/150
        } else {
          return VALUES_MAX_DEFL[6]; // Span/180
        }
      }
    } else {
      return 'NA';
    }
  } else {
    // Industrial Structure
    if (memberOption === 'Purlin and Girts' && designLoad === 'Live load') {
      if (supportingOption === 'Elastic cladding') {
        return VALUES_MAX_DEFL[5]; // Span/150
      } else {
        return VALUES_MAX_DEFL[6]; // Span/180
      }
    } else if (memberOption === 'Simple span' && designLoad === 'Live load') {
      if (supportingOption === 'Elastic cladding') {
        return VALUES_MAX_DEFL[7]; // Span/240
      } else {
        return VALUES_MAX_DEFL[3]; // Span/300
      }
    } else if (memberOption === 'Cantilever span' && designLoad === 'Live load') {
      if (supportingOption === 'Elastic cladding') {
        return VALUES_MAX_DEFL[8]; // Span/120
      } else {
        return VALUES_MAX_DEFL[5]; // Span/150
      }
    } else if (memberOption === 'Rafter Supporting' && designLoad === 'Live load') {
      if (supportingOption === 'Profiled Metal sheeting') {
        return VALUES_MAX_DEFL[6]; // Span/180
      } else {
        return VALUES_MAX_DEFL[7]; // Span/240
      }
    } else if (memberOption === 'Gantry') {
      // Note: Backend has a logic bug (checks 'Live load' then crane loads on same arg[1])
      // Corrected logic: if Gantry, check designLoad for crane types directly
      if (designLoad === 'Crane Load(Manual operation)') {
        return VALUES_MAX_DEFL[9]; // Span/500
      } else if (designLoad === 'Crane load(Electric operation up to 50t)') {
        return VALUES_MAX_DEFL[10]; // Span/750
      } else if (designLoad === 'Crane load(Electric operation over 50t)') {
        return VALUES_MAX_DEFL[11]; // Span/1000
      } else {
        return 'NA';
      }
    } else {
      return 'NA';
    }
  }
};

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
    design_method: "Limit State Design",
    allowable_class: "Plastic",
    effective_area_parameter: "1.0",
    length_overwrite: "NA",
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

  modalConfig: [
    { key: "webThickness", inputKey: "web_thickness", dataSource: "thicknessList" },
    { key: "topFlangeThickness", inputKey: "top_flange_thickness", dataSource: "thicknessList" },
    { key: "bottomFlangeThickness", inputKey: "bottom_flange_thickness", dataSource: "thicknessList" },
    {
      key: "intermediateStiffenerThicknessValues",
      inputKey: "intermediate_stiffener_thickness_val",
      dataSource: "thicknessList",
      type: "thickness",
      title: "Intermediate Stiffener Thickness",
    },
    {
      key: "longitudinalStiffenerThicknessValues",
      inputKey: "longitudinal_stiffener_thickness_val",
      dataSource: "thicknessList",
      type: "thickness",
      title: "Longitudinal Stiffener Thickness",
    },
  ],

  selectionConfig: [
    { key: "webThicknessSelect", inputKey: "web_thickness", defaultValue: "All" },
    { key: "topFlangeThicknessSelect", inputKey: "top_flange_thickness", defaultValue: "All" },
    { key: "bottomFlangeThicknessSelect", inputKey: "bottom_flange_thickness", defaultValue: "All" },
    { key: "intermediateStiffenerThicknessSelect", inputKey: "intermediate_stiffener_thickness_val", defaultValue: "All" },
    { key: "longitudinalStiffenerThicknessSelect", inputKey: "longitudinal_stiffener_thickness_val", defaultValue: "All" },
  ],

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
        [KEY_DESIGN_LOAD]: String(inputs.design_load || "Live load"),
        [KEY_MEMBER_OPTIONS]: String(inputs.member_options || "Simple Span"),
        [KEY_SUPPORTING_OPTIONS]: String(inputs.supporting_options || "NA"),
        [KEY_ALLOW_CLASS]: String(inputs.allowable_class || "Plastic"),
        [KEY_WEB_PHILOSOPHY]: String(inputs.web_philosophy || "Thick Web without ITS"),
        [KEY_SUPPORT_WIDTH]: String(inputs.support_width || "100"),
        [KEY_DP_DESIGN_METHOD]: String(inputs.design_method || "Limit State Design"),
        [KEY_EFFECTIVE_AREA_PARA]: String(inputs.effective_area_parameter || "1.0"),
        [KEY_LENGTH_OVERWRITE]: String(inputs.length_overwrite || "NA"),
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
          key: "material",
          label: "Material",
          type: "select",
          options: "materialList",
          onChange: (value, inputs, setInputs, materialList) => {
            const material = materialList.find(item => item.id === value);
            if (material) {
              setInputs({
                ...inputs,
                material: material.Grade,
              });
            }
          }
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
          onChange: (value, inputs, setInputs) => {
            setInputs({
              ...inputs,
              design_type: value,
            });
          }
        },
        {
          key: "total_depth",
          label: "Total Depth (mm)",
          type: "optimized_number",
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


