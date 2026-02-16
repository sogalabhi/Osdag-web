import { useEffect, useState } from "react";

/**
 * Data layer for engineering modules.
 * Fetches dropdown/static lists for the given design type.
 */
export const useModuleData = (getModuleData, designType) => {
  const [moduleData, setModuleData] = useState({
    beamList: [],
    columnList: [],
    connectivityList: [],
    materialList: [],
    boltDiameterList: [],
    thicknessList: [],
    propertyClassList: [],
    angleList: [],
    boltTypeList: [],
    sectionProfileList: [],
    channelList: [],
    sectionDesignation: [],
    profileList: [],
    coverPlateList: [],
    weldSizeList: [],
    anchorDiameterList: [],
    anchorGradeList: [],
    footingGradeList: [],
    weldTypeList: [],
    anchorTypeList: [],
  });

  useEffect(() => {
    const loadModuleData = async () => {
      if (!designType) return;
      try {
        const result = await getModuleData(designType);
        if (result && result.success && result.data) {
          const data = result.data || {};
          // Support both snake_case and camelCase API payloads
          const pick = (camel, snake) => data[camel] ?? data[snake] ?? [];
          setModuleData({
            beamList:          pick('beamList',          'beam_list'),
            columnList:        pick('columnList',        'column_list'),
            connectivityList:  pick('connectivityList',  'connectivity_list'),
            materialList:      pick('materialList',      'material_list'),
            boltDiameterList:  pick('boltDiameterList',  'bolt_diameter_list'),
            thicknessList:     pick('thicknessList',     'thickness_list'),
            propertyClassList: pick('propertyClassList', 'property_class_list'),
            angleList:         pick('angleList',         'angle_list'),
            boltTypeList:      pick('boltTypeList',      'bolt_type_list'),
            sectionProfileList:pick('sectionProfileList','section_profile_list'),
            channelList:       pick('channelList',       'channel_list'),
            sectionDesignation:pick('sectionDesignation','section_designation'),
            profileList:         pick('profileList',         'profile_list'),
            coverPlateList:    pick('coverPlateList',    'cover_plate_list'),
            weldSizeList:      pick('weldSizeList',      'weld_size_list'),
            anchorDiameterList:pick('anchorDiameterList','anchor_diameter_list'),
            anchorGradeList:   pick('anchorGradeList',   'anchor_grade_list'),
            footingGradeList:  pick('footingGradeList',  'footing_grade_list'),
            weldTypeList:      pick('weldTypeList',      'weld_type_list'),
            anchorTypeList:    pick('anchorTypeList',    'anchor_type_list'),
          });
        }
      } catch (error) {
        console.error("Failed to load module data:", error);
      }
    };

    loadModuleData();
  }, [designType, getModuleData]);

  return moduleData;
};

