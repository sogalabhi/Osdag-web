/**
 * Single source of truth for module data list keys and input-key → list-key mapping.
 * Used by useModuleData, contextData, useModuleForm, and InputSection.
 */

export const MODULE_DATA_LIST_KEYS = [
  'beamList',
  'columnList',
  'connectivityList',
  'materialList',
  'boltDiameterList',
  'thicknessList',
  'propertyClassList',
  'angleList',
  'boltTypeList',
  'sectionProfileList',
  'channelList',
  'sectionDesignation',
  'hollowSectionDesignation',
  'endConditionList',
  'profileList',
  'coverPlateList',
  'weldSizeList',
  'anchorDiameterList',
  'anchorGradeList',
  'footingGradeList',
  'weldTypeList',
  'anchorTypeList',
];

/**
 * Maps input keys (form field names) to contextData list keys for "All" expansion and customizable data source.
 */
export const INPUT_KEY_TO_LIST = {
  bolt_diameter: 'boltDiameterList',
  bolt_grade: 'propertyClassList',
  plate_thickness: 'thicknessList',
  flange_plate_thickness: 'thicknessList',
  web_plate_thickness: 'thicknessList',
  angle_list: 'angleList',
  topangle_list: 'angleList',
  cleat_section: 'angleList',
  weld_size: 'weldSizeList',
  member_designation: 'sectionDesignation',
  anchor_diameter_ocf: 'anchorDiameterList',
  anchor_grade_ocf: 'anchorGradeList',
  anchor_diameter_icf: 'anchorDiameterList',
  anchor_grade_icf: 'anchorGradeList',
  web_thickness: 'thicknessList',
  top_flange_thickness: 'thicknessList',
  bottom_flange_thickness: 'thicknessList',
};
