/**
 * The values of the plate girder's Additional Inputs tabs, in the core's own spelling
 * (osdag_core/Common.py and the tab functions of design_type/member.py:
 * `optimization_tab_welded_plate_girder_design`, `Stiffener_design`, `girder_geometry`,
 * `deflection_values`, and `member_options_change` / `supp_options_change` / `max_defl_change` of
 * plate_girder.py). backend/apps/core/tests/test_plate_girder_pref_options.py reads this file and
 * compares every list with the core's.
 *
 * Several of these values are held by the web's main form (`PLATE_GIRDER_DOCK_FIELDS`); the dialog
 * (components/PlateGirderPrefTabs.jsx) shows them, read only, with these lists.
 */
import { KEY_DISP_SYM, KEY_DISP_UNSYM } from "../../../../constants/generated/coreKeys";

/** The main-form fields the dialog's read-only rows show, by tab. */
export const PLATE_GIRDER_DOCK_FIELDS = {
  Optimisation: ["loading_condition"],
  Stiffeners: [
    "intermediate_stiffener",
    "intermediate_stiffener_spacing",
    "longitudinal_stiffener",
    "intermediate_stiffener_thickness",
    "longitudinal_stiffener_thickness",
    "shear_buckling_option",
  ],
  "Additional Girder Data": ["symmetry"],
  Deflection: ["structure_type", "design_load", "member_options", "supporting_options"],
};

/** Optimum.Class: the core offers Yes and No. */
export const PG_ALLOW_CLASS_OPTIONS = ["Yes", "No"];

/** Loading.Condition (KEY_DISP_LOAD_list). */
export const PG_LOADING_CONDITION_OPTIONS = ["Normal", "Destabilizing"];

/** The Optimisation tab values the design reads, as `get_values_for_design_pref` gives them. */
export const PLATE_GIRDER_OPTIMISATION_DEFAULTS = {
  allowable_class: "Yes",
  effective_area_parameter: "1.0",
  length_overwrite: "NA",
};

/** IntermediateStiffener.Data. */
export const PG_INTERMEDIATE_STIFFENER_OPTIONS = ["Yes", "No"];

/** LongitudnalStiffener.Data. */
export const PG_LONGITUDINAL_STIFFENER_OPTIONS = ["No", "Yes and 1 stiffener", "Yes and 2 stiffeners"];

/** IntermediateStiffener.Thickness and LongitudnalStiffner.Thickness. */
export const PG_STIFFENER_THICKNESS_OPTIONS = ["All", "Customized"];

/** S.B.Methods (KEY_DISP_SB_Option). */
export const PG_SHEAR_BUCKLING_OPTIONS = ["Simple Post Critical", "Tension Field Test"];

/** Girder.Symmetry (KEY_DISP_SYMMETRIC_list). */
export const PG_SYMMETRY_OPTIONS = [KEY_DISP_SYM, KEY_DISP_UNSYM];

/** Structure.Type (KEY_DISP_STR_TYPE_list). */
export const PG_STRUCTURE_TYPE_OPTIONS = ["Highway Bridge", "Railway Bridge", "Industrial Structure", "Other Building"];

/** Design.Load (VALUE_DESIGN_LOAD_list). */
export const PG_DESIGN_LOAD_OPTIONS = [
  "Live load",
  "Dead load",
  "Crane Load(Manual operation)",
  "Crane load(Electric operation up to 50t)",
  "Crane load(Electric operation over 50t)",
];

/** Member.Options by structure type (VALUES_MEMBER_OPTIONS, `member_options_change`). */
export const PG_MEMBER_OPTIONS = {
  "Highway Bridge": ["Simple Span", "Cantilever Span"],
  "Railway Bridge": ["Simple Span", "Cantilever Span"],
  "Industrial Structure": ["Purlin and Girts", "Simple span", "Cantilever span", "Rafter Supporting", "Gantry"],
  "Other Building": ["Floor and roof", "Cantilever"],
};

/** Supporting.Options by member option (VALUES_SUPPORTING_OPTIONS_*, `supp_options_change`); others: Not Applicable. */
export const PG_SUPPORTING_OPTIONS = {
  "Purlin and Girts": ["Elastic cladding", "Brittle cladding"],
  "Simple span": ["Elastic cladding", "Brittle cladding"],
  "Cantilever span": ["Elastic cladding", "Brittle cladding"],
  "Rafter Supporting": ["Profiled Metal sheeting", "Plastered sheeting"],
  Gantry: ["Crane"],
  "Floor and roof": ["Elements not susceptible to cracking", "Element susceptible to cracking"],
  Cantilever: ["Elements not susceptible to cracking", "Element susceptible to cracking"],
};
export const PG_SUPPORTING_OPTIONS_DEFAULT = ["Not Applicable"];

/** The member options the core offers for a structure type. */
export const memberOptionsFor = (structureType) => PG_MEMBER_OPTIONS[structureType] ?? PG_MEMBER_OPTIONS["Highway Bridge"];

/**
 * The supporting options for a structure type and member option. The bridges' member options
 * ("Simple Span", "Cantilever Span") have none in the core: Not Applicable.
 */
export const supportingOptionsFor = (structureType, memberOption) => {
  if (structureType === "Highway Bridge" || structureType === "Railway Bridge") return PG_SUPPORTING_OPTIONS_DEFAULT;
  return PG_SUPPORTING_OPTIONS[memberOption] ?? PG_SUPPORTING_OPTIONS_DEFAULT;
};

/** VALUES_MAX_DEFL. */
const VALUES_MAX_DEFL = ["Span/600", "Span/800", "Span/400", "Span/300", "Span/360", "Span/150", "Span/180", "Span/240", "Span/120", "Span/500", "Span/750", "Span/1000"];

/**
 * Deflection.Max from Structure Type, Design Load, Member Options and Supporting Options, as the core's
 * `max_defl_change` (plate_girder.py) gives it. The core compares the design load with 'Live load' and
 * 'Dead load'; for a gantry it tests the same argument for 'Live load' and then for a crane load, so it
 * can never pick a crane limit: here a gantry takes its limit from the crane load chosen.
 */
export const calculateMaxDeflection = (structureType, designLoad, memberOption, supportingOption) => {
  if (structureType === "Highway Bridge" || structureType === "Railway Bridge") {
    if (designLoad === "Live load") return memberOption === "Simple Span" ? VALUES_MAX_DEFL[0] : VALUES_MAX_DEFL[2];
    if (designLoad === "Dead load") return VALUES_MAX_DEFL[1];
    return "NA";
  }
  if (structureType === "Other Building") {
    if (designLoad !== "Live load") return "NA";
    const notCracking = supportingOption === "Elements not susceptible to cracking";
    if (memberOption === "Floor and roof") return notCracking ? VALUES_MAX_DEFL[3] : VALUES_MAX_DEFL[4];
    return notCracking ? VALUES_MAX_DEFL[5] : VALUES_MAX_DEFL[6];
  }
  // Industrial Structure
  const elastic = supportingOption === "Elastic cladding";
  if (memberOption === "Purlin and Girts" && designLoad === "Live load") return elastic ? VALUES_MAX_DEFL[5] : VALUES_MAX_DEFL[6];
  if (memberOption === "Simple span" && designLoad === "Live load") return elastic ? VALUES_MAX_DEFL[7] : VALUES_MAX_DEFL[3];
  if (memberOption === "Cantilever span" && designLoad === "Live load") return elastic ? VALUES_MAX_DEFL[8] : VALUES_MAX_DEFL[5];
  if (memberOption === "Rafter Supporting" && designLoad === "Live load") {
    return supportingOption === "Profiled Metal sheeting" ? VALUES_MAX_DEFL[6] : VALUES_MAX_DEFL[7];
  }
  if (memberOption === "Gantry") {
    if (designLoad === "Crane Load(Manual operation)") return VALUES_MAX_DEFL[9];
    if (designLoad === "Crane load(Electric operation up to 50t)") return VALUES_MAX_DEFL[10];
    if (designLoad === "Crane load(Electric operation over 50t)") return VALUES_MAX_DEFL[11];
    return "NA";
  }
  return "NA";
};

/**
 * The main form keeps two values in its own spelling; the request builder and the adapter send the
 * core's (plate_girder/adapter.py maps the symmetry, and the core treats every stiffener thickness
 * choice but 'Customized' as the standard list). The dialog shows the core's spelling.
 */
const CORE_SPELLING = {
  symmetry: { Symmetrical: KEY_DISP_SYM, Unsymmetrical: KEY_DISP_UNSYM },
  intermediate_stiffener_thickness: { Standard: "All" },
  longitudinal_stiffener_thickness: { Standard: "All" },
};

/** A main-form value in the core's spelling. */
export const coreSpelling = (field, value) => CORE_SPELLING[field]?.[value] ?? value;
