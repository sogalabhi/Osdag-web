
import ISECTION from "../../../../assets/ISection.png";
import ErrorImg from "../../../../assets/notSelected.png";
import {
  KEY_MODULE, KEY_MATERIAL, KEY_LENGTH, KEY_SHEAR, KEY_MOMENT,
  KEY_TORSIONAL_RES, KEY_WARPING_RES, KEY_ALLOW_CLASS, KEY_EFFECTIVE_AREA_PARA,
  KEY_LENGTH_OVERWRITE, KEY_DP_DESIGN_METHOD
} from "../../../../constants/DesignKeys";

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
  routePath: "/design/flexure/plate_girder",
  designType: "Plate-Girder",
  cameraKey: "FlexuralMember",
  cadOptions: ["Model", "Girder"],

  defaultInputs: {
    module: "Plate-Girder",
    material: "E 250 (Fe 410 W)A",
    design_type: "Customized", // "Customized" or "Optimized"
    total_depth: "1300", // Required for Customized
    web_thickness: ["20"], // List of standard thicknesses
    top_flange_width: "350", // Required for Customized
    top_flange_thickness: ["40"], // List
    bottom_flange_width: "350", // Required for Customized
    bottom_flange_thickness: ["40"], // List
    // Member Properties (from PDF notes: 20.0 m = 20000 mm)
    member_length: "20000", // in mm (backend expects m, but we'll convert)
    // Loads (from PDF notes)
    bending_moment: "4275",
    shear_force: "877.5",
    bending_moment_shape: "Uniform Loading with pinned-pinned support",
    // Support & Restraints (from PDF notes: "compression flange is restrained", "web is to be made Thick")
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
    // Additional
    symmetry: "Symmetrical",
    // Deflection
    structure_type: "Highway Bridge",
    design_load: "Live load",
    member_options: "Simple Span",
    supporting_options: "NA",
    max_deflection: "Span/600",
    // Optimization bounds (only used when Optimized)
    total_depth_lb: "",
    total_depth_ub: "",
    total_depth_inc: "",
    top_flange_width_lb: "",
    top_flange_width_ub: "",
    top_flange_width_inc: "",
    bottom_flange_width_lb: "",
    bottom_flange_width_ub: "",
    bottom_flange_width_inc: "",
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
    { key: "intermediateStiffenerThicknessSelect", inputKey: "intermediate_stiffener_thickness_val", defaultValue: "Standard" },
    { key: "longitudinalStiffenerThicknessSelect", inputKey: "longitudinal_stiffener_thickness_val", defaultValue: "Standard" },
  ],

  // Helper function to get section image
  getSectionImage: (profile) => {
    // Plate girder is always a welded I-section
    return ISECTION;
  },

  validateInputs: (inputs) => {
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

  buildSubmissionParams: (inputs, allSelected, lists, extraState) => {
    const getArrayParam = (allSelectedFlag, fullList, selectedList) => {
      if (allSelectedFlag) {
        return fullList.filter(item => item !== "All" && item !== "Select Section");
      }
      if (Array.isArray(selectedList)) {
        return selectedList.filter(item => item !== "All" && item !== "Select Section");
      }
      return [selectedList].filter(item => item !== "All" && item !== "Select Section");
    };

    // Convert member_length from mm to m (backend expects m)
    const memberLengthM = inputs.member_length ? (parseFloat(inputs.member_length) / 1000).toString() : "5";

    // Get thickness lists
    const webThicknessList = getArrayParam(
      allSelected.web_thickness,
      lists.thicknessList || [],
      inputs.web_thickness
    );
    const topFlangeThicknessList = getArrayParam(
      allSelected.top_flange_thickness,
      lists.thicknessList || [],
      inputs.top_flange_thickness
    );
    const bottomFlangeThicknessList = getArrayParam(
      allSelected.bottom_flange_thickness,
      lists.thicknessList || [],
      inputs.bottom_flange_thickness
    );

    // Build base params - using exact backend key strings
    // const params = {
    //   "Module": "Plate-Girder",
    //   "Material": String(inputs.material || "E 250 (Fe 410 W)A"),
    //   "Member.Length": memberLengthM,
    //   "Loading.Condition": String(inputs.loading_condition || "Normal"),
    //   "Load.Shear": String(inputs.shear_force || "0"),
    //   "Load.Moment": String(inputs.bending_moment || "0"),
    //   "Total.Design_Type": String(inputs.design_type || "Customized"),
    //   "Web.Thickness": webThicknessList.length > 0 ? webThicknessList : ["6"],
    //   "TopFlange.Thickness": topFlangeThicknessList.length > 0 ? topFlangeThicknessList : ["6"],
    //   "BottomFlange.Thickness": bottomFlangeThicknessList.length > 0 ? bottomFlangeThicknessList : ["6"],
    //   "Design.Design_Type_Flexure": String(inputs.support_type || "Major Laterally Supported"),
    //   "Loading.Bending_Moment_Shape": String(inputs.bending_moment_shape || "Uniform Loading with pinned-pinned support"),
    //   "Design.Torsional_Restraint": String(inputs.torsional_restraint || "Fully Restrained"),
    //   "Design.Warping_Restraint": String(inputs.warping_restraint || "Both flanges fully restrained"),
    //   "Design.Max_Deflection": String(inputs.max_deflection || "L/250"),
    //   "Design.Allow_Class": String(inputs.allowable_class || "Plastic"),
    //   "Design.Web_Philosophy": String(inputs.web_philosophy || "Thick Web without ITS"),
    //   "Design.Support_Width": String(inputs.support_width || "100"),
    //   "Design.IntermediateStiffener.Spacing": String(inputs.intermediate_stiffener_spacing || "NA"),
    //   "Design.IntermediateStiffener.Thickness": String(inputs.intermediate_stiffener_thickness || "Standard"),
    //   "Design.LongitudnalStiffener": String(inputs.longitudinal_stiffener || "No"),
    //   "Design.LongitudnalStiffener.Thickness": String(inputs.longitudinal_stiffener_thickness || "Standard"),
    //   "Design.Design_Method": String(inputs.design_method || "Limit State Design"),
    //   "Design.Effective_Area_Parameter": String(inputs.effective_area_parameter || "1.0"),
    //   "Design.Length_Overwrite": String(inputs.length_overwrite || "NA"),
    // };

    const params = {
        // --- Basic Module Info ---
        "Module": "Plate-Girder",
        "Material": String(inputs.material || "E 250 (Fe 410 W)A"),
        "Member.Length": memberLengthM,
        
        // --- Loads ---
        "Loading.Condition": String(inputs.loading_condition || "Normal"),
        "Load.Shear": String(inputs.shear_force || "0"),
        "Load.Moment": String(inputs.bending_moment || "0"),
        "Loading.Bending_Moment_Shape": String(inputs.bending_moment_shape || "Uniform Loading with pinned-pinned support"),
      
        // --- Design Type ---
        "Total.Design_Type": String(inputs.design_type || "Customized"),
      
        // --- Thicknesses (Must be Arrays) ---
        "Web.Thickness": webThicknessList.length > 0 ? webThicknessList : ["6"],
        "TopFlange.Thickness": topFlangeThicknessList.length > 0 ? topFlangeThicknessList : ["6"],
        "BottomFlange.Thickness": bottomFlangeThicknessList.length > 0 ? bottomFlangeThicknessList : ["6"],
      
        // --- Design Preferences ---
        "Design.Design_Type_Flexure": String(inputs.support_type || "Major Laterally Supported"),
        "Design.Torsional_Restraint": String(inputs.torsional_restraint || "Fully Restrained"),
        "Design.Warping_Restraint": String(inputs.warping_restraint || "Both flanges fully restrained"),
        "Design.Max_Deflection": String(inputs.max_deflection || "Span/600"),
        "Structure.Type": String(inputs.structure_type || "Highway Bridge"),
        "Design.Load": String(inputs.design_load || "Live load"),
        "Member.Options": String(inputs.member_options || "Simple Span"),
        "Supporting.Options": String(inputs.supporting_options || "NA"),
        "Design.Allow_Class": String(inputs.allowable_class || "Plastic"),
        "Design.Web_Philosophy": String(inputs.web_philosophy || "Thick Web without ITS"),
        "Design.Support_Width": String(inputs.support_width || "100"),
        "Design.Design_Method": String(inputs.design_method || "Limit State Design"),
        "Design.Effective_Area_Parameter": String(inputs.effective_area_parameter || "1.0"),
        "Design.Length_Overwrite": String(inputs.length_overwrite || "NA"),
        "Design.ShearBucklingOption": String(inputs.shear_buckling_option || "Simple Post Critical"),
      
        // --- Stiffener Settings ---
        "Design.IntermediateStiffener.Spacing": String(inputs.intermediate_stiffener_spacing || "NA"),
        "Design.IntermediateStiffener.Thickness": String(inputs.intermediate_stiffener_thickness || "Standard"),
        "Design.LongitudnalStiffener": String(inputs.longitudinal_stiffener || "No"),
        "Design.LongitudnalStiffener.Thickness": String(inputs.longitudinal_stiffener_thickness || "Standard")
      };

    // Add design type specific params
    if (inputs.design_type === "Customized") {
      params["Total.Depth"] = String(inputs.total_depth || "500");
      params["Topflange.Width"] = String(inputs.top_flange_width || "200");
      params["Bottomflange.Width"] = String(inputs.bottom_flange_width || "200");
    } else if (inputs.design_type === "Optimized") {
      // For optimized, these are not required in set_input_values but we set defaults
      params["Total.Depth"] = "1";
      params["Topflange.Width"] = "1";
      params["Bottomflange.Width"] = "1";
      
      // Add optimization bounds if provided
      if (inputs.total_depth_lb && inputs.total_depth_ub) {
        params["Total.Depth_lb"] = String(inputs.total_depth_lb);
        params["Total.Depth_ub"] = String(inputs.total_depth_ub);
        if (inputs.total_depth_inc) {
          params["Total.Depth_inc"] = String(inputs.total_depth_inc);
        }
      }
      if (inputs.top_flange_width_lb && inputs.top_flange_width_ub) {
        params["Topflange.Width_lb"] = String(inputs.top_flange_width_lb);
        params["Topflange.Width_ub"] = String(inputs.top_flange_width_ub);
        if (inputs.top_flange_width_inc) {
          params["Topflange.Width_inc"] = String(inputs.top_flange_width_inc);
        }
      }
      if (inputs.bottom_flange_width_lb && inputs.bottom_flange_width_ub) {
        params["Bottomflange.Width_lb"] = String(inputs.bottom_flange_width_lb);
        params["Bottomflange.Width_ub"] = String(inputs.bottom_flange_width_ub);
        if (inputs.bottom_flange_width_inc) {
          params["Bottomflange.Width_inc"] = String(inputs.bottom_flange_width_inc);
        }
      }
    }

    // Add customized thickness values if provided
    if (inputs.intermediate_stiffener_thickness === "Customized" && 
        Array.isArray(inputs.intermediate_stiffener_thickness_val) && 
        inputs.intermediate_stiffener_thickness_val.length > 0) {
      params["Design.IntermediateStiffener.Thickness_Values"] = inputs.intermediate_stiffener_thickness_val;
    }
    if (inputs.longitudinal_stiffener_thickness === "Customized" && 
        Array.isArray(inputs.longitudinal_stiffener_thickness_val) && 
        inputs.longitudinal_stiffener_thickness_val.length > 0) {
      params["Design.LongitudnalStiffener.Thickness_Values"] = inputs.longitudinal_stiffener_thickness_val;
    }

    return params;
  },
  isOptimized: (inputs) => inputs.design_type === "Optimized",
  inputSections: [
    {
      title: "Basic Properties",
      fields: [
        {
          key: "material",
          label: "Material*",
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
          label: "Design Type*",
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
          key: "member_length",
          label: "Span Length (mm)*",
          type: "number",
          validation: "positive_number",
          placeholder: "Enter span length in mm"
        }
      ]
    },
    {
      title: "Section Dimensions",
      conditionalDisplay: (inputs) => inputs.design_type === "Customized",
      fields: [
        {
          key: "total_depth",
          label: "Total Depth (mm)*",
          type: "optimized_number",
          validation: "positive_number",
          placeholder: "Enter total depth",
        },
        {
          key: "web_thickness",
          label: "Web Thickness (mm)*",
          type: "customizable",
          selectionKey: "webThicknessSelect",
          modalKey: "webThickness",
          options: "thicknessList",
          defaultValue: ["6"]
        },
        {
          key: "top_flange_width",
          label: "Top Flange Width (mm)*",
          type: "optimized_number",
          validation: "positive_number",
          placeholder: "Enter top flange width"
        },
        {
          key: "top_flange_thickness",
          label: "Top Flange Thickness (mm)*",
          type: "customizable",
          selectionKey: "topFlangeThicknessSelect",
          modalKey: "topFlangeThickness",
          options: "thicknessList",
          defaultValue: ["6"]
        },
        {
          key: "bottom_flange_width",
          label: "Bottom Flange Width (mm)*",
          type: "optimized_number",
          validation: "positive_number",
          placeholder: "Enter bottom flange width"
        },
        {
          key: "bottom_flange_thickness",
          label: "Bottom Flange Thickness (mm)*",
          type: "customizable",
          selectionKey: "bottomFlangeThicknessSelect",
          modalKey: "bottomFlangeThickness",
          options: "thicknessList",
          defaultValue: ["6"]
        }
      ]
    },
    {
      title: "Optimization Bounds",
      conditionalDisplay: (inputs) => inputs.design_type === "Optimized",
      fields: [
        {
          key: "total_depth",
          label: "Total Depth (mm)",
          type: "optimized_number",
          placeholder: "Set bounds for total depth",
        },
        {
          key: "top_flange_width",
          label: "Top Flange Width (mm)",
          type: "optimized_number",
          placeholder: "Set bounds for top flange width",
        },
        {
          key: "bottom_flange_width",
          label: "Bottom Flange Width (mm)",
          type: "optimized_number",
          placeholder: "Set bounds for bottom flange width",
        },
      ],
    },
    {
      title: "Loads",
      fields: [
        {
          key: "bending_moment",
          label: "Bending Moment (kNm)*",
          type: "number",
          validation: "positive_number",
          placeholder: "Enter bending moment"
        },
        {
          key: "shear_force",
          label: "Shear Force (kN)*",
          type: "number",
          validation: "number",
          placeholder: "Enter shear force"
        },
        {
          key: "bending_moment_shape",
          label: "Bending Moment Shape*",
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
    },
    {
      title: "Support & Restraints",
      fields: [
        {
          key: "support_type",
          label: "Support Type*",
          type: "select",
          options: [
            { value: "Major Laterally Supported", label: "Major Laterally Supported" },
            { value: "Major Laterally Unsupported", label: "Major Laterally Unsupported" }
          ],
          defaultValue: "Major Laterally Supported"
        },
        {
          key: "support_width",
          label: "Support Width (mm)*",
          type: "number",
          validation: "positive_number",
          placeholder: "Enter support width"
        },
        {
          key: "web_philosophy",
          label: "Web Philosophy*",
          type: "select",
          options: [
            { value: "Thick Web without ITS", label: "Thick Web without ITS" },
            { value: "Thin Web with ITS", label: "Thin Web with ITS" }
          ],
          defaultValue: "Thick Web without ITS"
        },
        {
          key: "torsional_restraint",
          label: "Torsional Restraint*",
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
          label: "Warping Restraint*",
          type: "select",
          options: [
            { value: "Both flanges fully restrained", label: "Both flanges fully restrained" },
            { value: "Compression flange fully restrained", label: "Compression flange fully restrained" },
            { value: "Compression flange partially restrained", label: "Compression flange partially restrained" },
            { value: "Warping not restrained in both flanges", label: "Warping not restrained in both flanges" }
          ],
          defaultValue: "Both flanges fully restrained"
        }
      ]
    },
    {
      title: "Design Preferences",
      fields: [
        {
          key: "design_method",
          label: "Design Method",
          type: "select",
          options: [
            { value: "Limit State Design", label: "Limit State Design" }
          ],
          defaultValue: "Limit State Design"
        },
        {
          key: "allowable_class",
          label: "Allowable Class",
          type: "select",
          options: [
            { value: "Plastic", label: "Plastic" },
            { value: "Compact", label: "Compact" },
            { value: "Semi-Compact", label: "Semi-Compact" },
            { value: "Slender", label: "Slender" }
          ],
          defaultValue: "Plastic"
        },
        {
          key: "effective_area_parameter",
          label: "Effective Area Parameter",
          type: "number",
          defaultValue: "1.0",
          placeholder: "Enter effective area parameter"
        },
        {
          key: "length_overwrite",
          label: "Length Overwrite",
          type: "select",
          options: [
            { value: "NA", label: "NA" }
          ],
          defaultValue: "NA"
        },
        {
          key: "loading_condition",
          label: "Loading Condition",
          type: "select",
          options: [
            { value: "Normal", label: "Normal" },
            { value: "Crane Load(Manual operation)", label: "Crane Load(Manual operation)" },
            { value: "Crane load(Electric operation up to 50t)", label: "Crane load(Electric operation up to 50t)" },
            { value: "Crane load(Electric operation over 50t)", label: "Crane load(Electric operation over 50t)" }
          ],
          defaultValue: "Normal"
        },
        {
          key: "structure_type",
          label: "Structure Type",
          type: "select",
          options: [
            { value: "Highway Bridge", label: "Highway Bridge" },
            { value: "Railway Bridge", label: "Railway Bridge" },
            { value: "Industrial Structure", label: "Industrial Structure" },
            { value: "Other Building", label: "Other Building" }
          ],
          defaultValue: "Highway Bridge",
          // ARCHITECTURAL NOTE: Dynamic logic duplicated from backend for instant UI updates
          // Backend source: plate_girder.py:member_options_change() and supp_options_change()
          // See calculateMaxDeflection() comment above for rationale
          onChange: (value, inputs, setInputs) => {
            // Update member_options based on structure_type
            let memberOptions = [];
            if (value === "Highway Bridge" || value === "Railway Bridge") {
              memberOptions = ["Simple Span", "Cantilever Span"];
            } else if (value === "Industrial Structure") {
              memberOptions = ["Purlin and Girts", "Simple span", "Cantilever span", "Rafter Supporting", "Gantry"];
            } else if (value === "Other Building") {
              memberOptions = ["Floor and roof", "Cantilever"];
            }
            
            const newMemberOption = memberOptions.length > 0 ? memberOptions[0] : "NA";
            
            // Update supporting_options based on new member_option
            let supportingOptions = [];
            if (["Purlin and Girts", "Simple span", "Cantilever span"].includes(newMemberOption)) {
              supportingOptions = ["Elastic cladding", "Brittle cladding"];
            } else if (newMemberOption === "Rafter Supporting") {
              supportingOptions = ["Profiled Metal sheeting", "Plastered sheeting"];
            } else if (newMemberOption === "Gantry") {
              supportingOptions = ["Crane"];
            } else if (["Floor and roof", "Cantilever"].includes(newMemberOption)) {
              supportingOptions = ["Elements not susceptible to cracking", "Element susceptible to cracking"];
            } else {
              supportingOptions = ["NA"];
            }
            
            const newSupportingOption = supportingOptions.length > 0 ? supportingOptions[0] : "NA";
            
            // Recalculate max_deflection
            const maxDefl = calculateMaxDeflection(
              value,
              inputs.design_load || "Live load",
              newMemberOption,
              newSupportingOption
            );
            
            // Reset member_options and supporting_options when structure_type changes
            setInputs({
              ...inputs,
              structure_type: value,
              member_options: newMemberOption,
              supporting_options: newSupportingOption,
              max_deflection: maxDefl
            });
          }
        },
        {
          key: "design_load",
          label: "Design Load",
          type: "select",
          options: [
            { value: "Live load", label: "Live load" },
            { value: "Dead load", label: "Dead load" },
            { value: "Crane Load(Manual operation)", label: "Crane Load(Manual operation)" },
            { value: "Crane load(Electric operation up to 50t)", label: "Crane load(Electric operation up to 50t)" },
            { value: "Crane load(Electric operation over 50t)", label: "Crane load(Electric operation over 50t)" }
          ],
          defaultValue: "Live load",
          // ARCHITECTURAL NOTE: Dynamic logic duplicated from backend for instant UI updates
          // Backend source: plate_girder.py:max_defl_change() (lines 249-308)
          onChange: (value, inputs, setInputs) => {
            // Recalculate max_deflection when design_load changes
            const maxDefl = calculateMaxDeflection(
              inputs.structure_type || "Highway Bridge",
              value,
              inputs.member_options || "Simple Span",
              inputs.supporting_options || "NA"
            );
            setInputs({
              ...inputs,
              design_load: value,
              max_deflection: maxDefl
            });
          }
        },
        {
          key: "member_options",
          label: "Member Options",
          type: "dynamicSelect",
          // ARCHITECTURAL NOTE: Dynamic options logic duplicated from backend
          // Backend source: plate_girder.py:member_options_change() (lines 229-235)
          // Maps structure_type -> member_options array
          getOptions: (inputs) => {
            const structureType = inputs.structure_type || "Highway Bridge";
            let options = [];
            if (structureType === "Highway Bridge" || structureType === "Railway Bridge") {
              options = ["Simple Span", "Cantilever Span"];
            } else if (structureType === "Industrial Structure") {
              options = ["Purlin and Girts", "Simple span", "Cantilever span", "Rafter Supporting", "Gantry"];
            } else if (structureType === "Other Building") {
              options = ["Floor and roof", "Cantilever"];
            }
            return options.map(opt => ({ value: opt, label: opt }));
          },
          defaultValue: "Simple Span",
          // ARCHITECTURAL NOTE: Dynamic logic duplicated from backend for instant UI updates
          // Backend source: plate_girder.py:supp_options_change() (lines 237-247)
          onChange: (value, inputs, setInputs) => {
            // Update supporting_options based on member_options
            let supportingOptions = [];
            if (["Purlin and Girts", "Simple span", "Cantilever span"].includes(value)) {
              supportingOptions = ["Elastic cladding", "Brittle cladding"];
            } else if (value === "Rafter Supporting") {
              supportingOptions = ["Profiled Metal sheeting", "Plastered sheeting"];
            } else if (value === "Gantry") {
              supportingOptions = ["Crane"];
            } else if (["Floor and roof", "Cantilever"].includes(value)) {
              supportingOptions = ["Elements not susceptible to cracking", "Element susceptible to cracking"];
            } else {
              supportingOptions = ["NA"];
            }
            
            // Recalculate max_deflection when member_options changes
            const maxDefl = calculateMaxDeflection(
              inputs.structure_type || "Highway Bridge",
              inputs.design_load || "Live load",
              value,
              supportingOptions.length > 0 ? supportingOptions[0] : "NA"
            );
            
            setInputs({
              ...inputs,
              member_options: value,
              supporting_options: supportingOptions.length > 0 ? supportingOptions[0] : "NA",
              max_deflection: maxDefl
            });
          }
        },
        {
          key: "supporting_options",
          label: "Supporting Options",
          type: "dynamicSelect",
          // ARCHITECTURAL NOTE: Dynamic options logic duplicated from backend
          // Backend source: plate_girder.py:supp_options_change() (lines 237-247)
          // Maps member_options -> supporting_options array
          getOptions: (inputs) => {
            const memberOption = inputs.member_options || "Simple Span";
            let options = [];
            if (["Purlin and Girts", "Simple span", "Cantilever span"].includes(memberOption)) {
              options = ["Elastic cladding", "Brittle cladding"];
            } else if (memberOption === "Rafter Supporting") {
              options = ["Profiled Metal sheeting", "Plastered sheeting"];
            } else if (memberOption === "Gantry") {
              options = ["Crane"];
            } else if (["Floor and roof", "Cantilever"].includes(memberOption)) {
              options = ["Elements not susceptible to cracking", "Element susceptible to cracking"];
            } else {
              options = ["NA"];
            }
            return options.map(opt => ({ value: opt, label: opt }));
          },
          defaultValue: "NA",
          // ARCHITECTURAL NOTE: Dynamic logic duplicated from backend for instant UI updates
          // Backend source: plate_girder.py:max_defl_change() (lines 249-308)
          onChange: (value, inputs, setInputs) => {
            // Recalculate max_deflection when supporting_options changes
            const maxDefl = calculateMaxDeflection(
              inputs.structure_type || "Highway Bridge",
              inputs.design_load || "Live load",
              inputs.member_options || "Simple Span",
              value
            );
            setInputs({
              ...inputs,
              supporting_options: value,
              max_deflection: maxDefl
            });
          }
        },
        {
          key: "max_deflection",
          label: "Maximum Deflection",
          type: "select",
          options: [
            { value: "Span/600", label: "Span/600" },
            { value: "Span/800", label: "Span/800" },
            { value: "Span/400", label: "Span/400" },
            { value: "Span/300", label: "Span/300" },
            { value: "Span/360", label: "Span/360" },
            { value: "Span/150", label: "Span/150" },
            { value: "Span/180", label: "Span/180" },
            { value: "Span/240", label: "Span/240" },
            { value: "Span/120", label: "Span/120" },
            { value: "Span/500", label: "Span/500" },
            { value: "Span/750", label: "Span/750" },
            { value: "Span/1000", label: "Span/1000" }
          ],
          defaultValue: "Span/600"
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
          type: "number",
          conditionalDisplay: (inputs) => inputs.intermediate_stiffener === "Yes",
          placeholder: "Enter spacing"
        },
        {
          key: "intermediate_stiffener_thickness",
          label: "Intermediate Stiffener Thickness",
          type: "select",
          modalKey: "intermediateStiffenerThicknessValues",
          customizableInputKey: "intermediate_stiffener_thickness_val",
          customizableOptions: "thicknessList",
          options: [
            { value: "Standard", label: "Standard" },
            { value: "Customized", label: "Customized" }
          ],
          defaultValue: "Standard"
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
          modalKey: "longitudinalStiffenerThicknessValues",
          customizableInputKey: "longitudinal_stiffener_thickness_val",
          customizableOptions: "thicknessList",
          options: [
            { value: "Standard", label: "Standard" },
            { value: "Customized", label: "Customized" }
          ],
          defaultValue: "Standard"
        },
        {
          key: "shear_buckling_option",
          label: "Shear Buckling Option",
          type: "select",
          options: [
            { value: "Simple Post Critical", label: "Simple Post Critical" },
            { value: "Tension Field", label: "Tension Field" }
          ],
          defaultValue: "Simple Post Critical"
        }
      ]
    },
    {
      title: "Additional Properties",
      fields: [
        {
          key: "symmetry",
          label: "Symmetry",
          type: "select",
          options: [
            { value: "Symmetrical", label: "Symmetrical" },
            { value: "Unsymmetrical", label: "Unsymmetrical" }
          ],
          defaultValue: "Symmetrical"
        }
      ]
    }
  ],
};


