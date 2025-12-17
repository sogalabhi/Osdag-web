import { createContext, useReducer, useState, useEffect, useCallback } from "react";
import ModuleReducer from "./ModuleReducer";

// crypto packages
import { decode as base64_decode, encode as base64_encode } from "base-64";
import { MODULE_KEY_FIN_PLATE, MODULE_DISPLAY_FIN_PLATE } from '../constants/DesignKeys';
import { createDesign as apiCreateDesign, createDesignReport as apiCreateDesignReport, populateModule } from '../modules/shared/api/moduleApi';
import { apiBase } from "../api";

/* 
    ######################################################### 
    # Author : Atharva Pingale ( FOSSEE Summer Fellow '23 ) # 
    # Simplified ModuleContext - 8 Core Functions Only      #
    ######################################################### 
*/

//initial state
let initialValue = {
  error_msg: "",
  currentModuleName: "",

  // Common fields for all modules
  materialList: [],
  boltDiameterList: [],
  thicknessList: [],
  propertyClassList: [],
  boltTypeList: [],

  // Structural elements
  beamList: [],
  columnList: [],
  connectivityList: [],
  coverPlateList: [],

  // Angle-specific (cleat angle, seated angle)
  angleList: [],
  topAngleList: [],

  // Tension member specific
  sectionProfileList: [],
  channelList: [],

  // Welded connection specific
  weldTypes: [],
  weldFab: [],
  weldSizeList: [],

  // End plate specific
  endPlateTypeList: [],

  // Session variables removed for multi-module support
  designLogs: [],
  designData: {},
  renderCadModel: false,
  cadModelPaths: {}, //stores cad files path
  hoverDict: {},
  displayPDF: false,
  report_id: "",
  blobUrl: "",
  designPrefData: {},
  conn_material_details: [],
  supported_material_details: [],
  supporting_material_details: [],
  design_pref_defaults: {
    supported_material: "E 165 (Fe 290)",
    supporting_material: "E 165 (Fe 290)",
    connector_material: "E 250 (Fe 410 W)A",
    bolt_tension_type: "Pre-tensioned",
    bolt_hole_type: "Standard",
    bolt_slip_factor: "0.3",
    weld_fab: "Shop Weld",
    weld_material_grade: "410",
    detailing_edge_type: "Rolled, machine-flame cut, sawn and planed",
    detailing_gap: "10",
    detailing_corr_status: "No",
    design_method: "Limit State Design",
  },
};

// const BASE_URL = "http://127.0.0.1:8000/";
const BASE_URL = `${apiBase}`;

//create context
export const ModuleContext = createContext(initialValue);

//provider component
export const ModuleProvider = ({ children }) => {
  const [state, dispatch] = useReducer(ModuleReducer, initialValue);
  const [projectSaveCallback, setProjectSaveCallback] = useState(null);

  // ===================================================================
  // SIMPLIFIED CONTEXT API - 8 CORE FUNCTIONS ONLY
  // ===================================================================
  // ===================================================================
  // 1. POPULATE - Universal Module Data Fetcher
  // ===================================================================

  /**
   * Universal function to get all module data in one API call
   * Replaces: getConnectivityList, getColumnBeamMaterialList, getBeamMaterialList, 
   *          getBoltDiameterList, getThicknessList, getPropertyClassList, etc.
   * @param {string} moduleName - Module identifier (e.g., 'FinPlateConnection')
   * @param {Object} options - Optional parameters
   * @param {string} options.connectivity - Connection type filter
   * @param {Object} options.filters - Additional filters for data
   */
  const getModuleData = useCallback(async (moduleName, options = {}) => {
    try {

      if (!moduleName) {
        dispatch({ type: "SET_ERR_MSG", payload: "Module name is required" });
        return { success: false, error: "Module name is required" };
      }

      // Set current module
      dispatch({ type: "SET_CURRENT_MODULE_NAME", payload: moduleName });

      // Map shear modules to new options endpoint
      const SHEAR_SLUGS = {
        FinPlateConnection: 'fin-plate',
        CleatAngleConnection: 'cleat-angle',
        EndPlateConnection: 'end-plate',
        SeatedAngleConnection: 'seated-angle',
      };
      const SIMPLE_SLUGS = {
        'ButtJointBolted': 'butt-joint-bolted',
        'ButtJointWelded': 'butt-joint-welded',
        'LapJointBolted': 'lap-joint-bolted',
        'LapJointWelded': 'lap-joint-welded',
      };
      // Unified slug map to align with /api/modules/{slug}/... endpoints
      const MODULE_SLUGS = {
        // Shear
        FinPlateConnection: 'shear-connection/fin-plate',
        CleatAngleConnection: 'shear-connection/cleat-angle',
        EndPlateConnection: 'shear-connection/end-plate',
        SeatedAngleConnection: 'shear-connection/seated-angle',
        // Moment
        CoverPlateBolted: 'moment-connection/beam-beam-cover-plate-bolted',
        'Beam-to-Beam-Cover-Plate-Bolted-Connection': 'moment-connection/beam-beam-cover-plate-bolted',
        'Cover-Plate-Bolted-Connection': 'moment-connection/beam-beam-cover-plate-bolted',
        CoverPlateWelded: 'moment-connection/beam-beam-cover-plate-welded',
        'Beam-to-Beam-Cover-Plate-Welded-Connection': 'moment-connection/beam-beam-cover-plate-welded',
        'Cover-Plate-Welded-Connection': 'moment-connection/beam-beam-cover-plate-welded',
        BeamBeamEndPlate: 'moment-connection/beam-beam-end-plate',
        'Beam-Beam-End-Plate-Connection': 'moment-connection/beam-beam-end-plate',
        BeamColumnEndPlate: 'moment-connection/beam-column-end-plate',
        'Beam-to-Column-End-Plate-Connection': 'moment-connection/beam-column-end-plate',
        CCCoverPlateBolted: 'moment-connection/column-column-cover-plate-bolted',
        ColumnCoverPlateBolted: 'moment-connection/column-column-cover-plate-bolted',
        'Column-to-Column-Cover-Plate-Bolted-Connection': 'moment-connection/column-column-cover-plate-bolted',
        CCCoverPlateWelded: 'moment-connection/column-column-cover-plate-welded',
        'Column-to-Column-Cover-Plate-Welded-Connection': 'moment-connection/column-column-cover-plate-welded',
        CCEndPlate: 'moment-connection/column-column-end-plate',
        'Column-to-Column-End-Plate-Connection': 'moment-connection/column-column-end-plate',
        // Simple
        ButtJointBolted: 'simple-connection/butt-joint-bolted',
        ButtJointWelded: 'simple-connection/butt-joint-welded',
        LapJointBolted: 'simple-connection/lap-joint-bolted',
        LapJointWelded: 'simple-connection/lap-joint-welded',
        // Tension
        'Tension-Member-Bolted-Design': 'tension-member/bolted',
        'Tension-Member-Welded-Design': 'tension-member/welded',
        BoltedToEndGusset: 'tension-member/bolted',
        WeldedToEndGusset: 'tension-member/welded',
      };

      const getSlug = (key) => MODULE_SLUGS[key] || key;
      const email = localStorage.getItem("email");
      const slug = getSlug(moduleName);

      let url = `${BASE_URL}api/modules/${slug}/options/`;
      const params = new URLSearchParams();
      if (options.connectivity) params.append("connectivity", options.connectivity);
      if (email) params.append("email", email);
      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const response = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      // Dispatch comprehensive data update
      dispatch({ type: "SET_ALL_MODULE_DATA", payload: data });

      return { success: true, data };
    } catch (error) {
      dispatch({ type: "SET_ERR_MSG", payload: "Failed to load module data" });
      return { success: false, error: error.message };
    }
  }, [dispatch]);

  /**
   * Get connectivity-specific data for a module
   * @param {string} moduleName - Module identifier
   */
  const getConnectivityData = useCallback(async (moduleName) => {
    return await getModuleData(moduleName, { connectivity: null });
  }, [getModuleData]);

  /**
   * Manage custom materials - add, update, remove, or sync with cache
   * Replaces: addCustomMaterialToDB, updateMaterialListFromCaches
   * @param {string} action - 'add', 'update', 'remove', 'sync'
   * @param {Object} data - Material data or parameters
   */
  const manageCustomMaterials = useCallback(async (action, data = {}) => {
    try {

      switch (action) {
        case 'add': {
          const { grade, inputs, connectivity, type } = data;
          const email = localStorage.getItem("email");

          const response = await fetch(`${BASE_URL}api/materialDetails/`, {
            method: "POST",
            mode: "cors",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: email,
              materialName: grade,
              fy_20: parseInt(inputs.fy_20),
              fy_20_40: parseInt(inputs.fy_20_40),
              fy_40: parseInt(inputs.fy_40),
              fu: parseInt(inputs.fu),
            }),
          });

          const result = await response.json();

          // Refresh module data to include the new material
          if (connectivity) {
            await getModuleData(state.currentModuleName, { connectivity });
          } else {
            await getModuleData(state.currentModuleName);
          }

          return { success: true, message: "Material added successfully", data: result };
        }

        case 'sync': {
          const cachedMaterials = JSON.parse(localStorage.getItem("osdag-custom-materials") || "[]");
          if (cachedMaterials.length > 0) {
            dispatch({ type: "UPDATE_MATERIAL_FROM_CACHES", payload: cachedMaterials });
          }
          return { success: true, message: "Materials synced from cache" };
        }

        case 'update': {
          const { materialType, materialData } = data;
          if (materialType === "connector") {
            dispatch({ type: "SAVE_CM_DETAILS", payload: [materialData] });
          } else if (materialType === "supported") {
            dispatch({ type: "SAVE_SDM_DETAILS", payload: [materialData] });
          } else if (materialType === "supporting") {
            dispatch({ type: "SAVE_STM_DETAILS", payload: [materialData] });
          }
          return { success: true, message: "Material details updated" };
        }

        default:
          return { success: false, error: "Invalid action specified" };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [getModuleData, dispatch, state.currentModuleName]);

  // ===================================================================
  // 2. CALCULATE - Design Computation
  // ===================================================================

  /**
   * Create design calculation
   * Uses external API function for consistency
   */
  const createDesign = useCallback((param, module_id, onCADSuccess = null) => {
    return apiCreateDesign(param, module_id, onCADSuccess, dispatch);
  }, [dispatch]);

  // ===================================================================
  // 3. CAD - 3D Model Generation and Download
  // ===================================================================

  /**
   * Create 3D CAD model from input data
   * @param {Object} inputData - Design input values
   * @param {string} moduleId - Module identifier
   * @param {Function} onCADSuccess - Success callback function
   */
  const createCADModel = useCallback(async (inputData, moduleId, onCADSuccess = null) => {
    console.log('[cadissue] createCADModel CALLED');
    console.log('[cadissue] moduleId:', moduleId);
    console.log('[cadissue] inputData keys:', inputData ? Object.keys(inputData) : 'N/A');
    try {

      console.log('[ModuleState] Making fetch request to:', `${BASE_URL}api/design/cad`);
      const response = await fetch(`${BASE_URL}api/design/cad`, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          module_id: moduleId,
          input_values: inputData
        }),
      });



      const data = await response.json();

      // Log the API response to debug CAD files and hover_dict
      console.log('[cadissue] CAD API Response status:', response.status);
      console.log('[cadissue] CAD API Response keys:', Object.keys(data));
      console.log('[cadissue] CAD files keys:', data.files ? Object.keys(data.files) : 'NO files');
      if (data.files) {
        console.log('[cadissue] CAD files has Model:', !!data.files.Model);
        console.log('[cadissue] CAD files has Beam:', !!data.files.Beam);
        console.log('[cadissue] CAD files has CoverPlate:', !!data.files.CoverPlate);
        console.log('[cadissue] CAD files has Plate:', !!data.files.Plate);
      }
      console.log('[cadissue] hover_dict keys:', data.hover_dict && typeof data.hover_dict === 'object' ? Object.keys(data.hover_dict) : 'NO hover_dict');

      if (!response.ok) {
        let message = data.message || "CAD generation failed";

        // eslint-disable-next-line no-alert
        alert(message + " " + response.status);
        throw new Error(`CAD generation failed: ${response.status} ${response.statusText}`);
      }

      if (response.status === 201 && data.status === "success") {

        // Store CAD data and trigger rendering
        dispatch({ type: "SET_CAD_MODEL_PATHS", payload: data.files });

        // Log before dispatching hover_dict
        console.log('[cadissue] Before dispatch - data.hover_dict:', data.hover_dict);
        if (data.hover_dict) {
          console.log('[cadissue] Dispatching SET_HOVER_DICT with keys:', Object.keys(data.hover_dict || {}));
          dispatch({ type: "SET_HOVER_DICT", payload: data.hover_dict });
        } else {
          console.warn('[ModuleState] data.hover_dict is missing or empty!');
        }
        dispatch({ type: "SET_RENDER_CAD_MODEL_BOOLEAN", payload: true });

        // Execute success callback if provided
        if (onCADSuccess && typeof onCADSuccess === 'function') {
          try {
            await onCADSuccess();
          } catch (error) {
          }
        }

        return { success: true, files: data.files };
      } else {
        throw new Error(`CAD generation failed: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ [ModuleState] createCADModel ERROR:', error);
      console.error('[ModuleState] Error message:', error.message);
      console.error('[ModuleState] Error stack:', error.stack);
      dispatch({ type: "SET_RENDER_CAD_MODEL_BOOLEAN", payload: false });
      return { success: false, error: error.message };
    }
  }, [dispatch]);

  /**
   * Download CAD model in specified format
   * @param {string} format - File format (e.g., 'step', 'iges', 'stl')
   */
  const downloadCADModel = useCallback(async (format) => {
    try {

      const response = await fetch(`${BASE_URL}api/design/downloadCad/`, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: format,
          section: "Model",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CAD file: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      return { success: true, blob };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  // ===================================================================
  // 4. REPORTS - Generate and Download Reports
  // ===================================================================

  /**
   * Generate reports (PDF, CSV, etc.) with unified interface
   * @param {string} type - Report type ('pdf', 'csv')
   * @param {Object} params - Report parameters
   */
  const generateReport = useCallback(async (type, params = {}) => {
    try {

      switch (type.toLowerCase()) {
        case 'pdf': {
          return { success: false, error: 'Legacy PDF endpoint removed. Use the in-app report modal (generate-initial → parse-sections → customize).' };
        }

        case 'csv': {
          const response = await fetch(`${BASE_URL}api/save-csv`, {
            method: "GET",
            mode: "cors",
            credentials: "include",
          });

          const result = await response.json();
          return { success: true, data: result };
        }

        case 'design_report': {
          return { success: false, error: 'Legacy design-report flow removed. Use the in-app report modal.' };
        }

        default:
          throw new Error(`Unsupported report type: ${type}`);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  /**
   * Upload company logo for reports
   * @param {File} companyLogo - Logo file
   * @param {string} companyLogoName - Logo filename
   */
  const uploadCompanyLogo = useCallback(async (companyLogo, companyLogoName) => {
    try {

      // Store in localStorage for caching
      if (companyLogo && companyLogoName) {
        const existingLogos = JSON.parse(localStorage.getItem("companyLogo") || "[]");
        const existingNames = JSON.parse(localStorage.getItem("companyLogoName") || "[]");

        existingLogos.push(base64_encode(companyLogo));
        existingNames.push(base64_encode(companyLogoName));

        localStorage.setItem("companyLogo", JSON.stringify(existingLogos));
        localStorage.setItem("companyLogoName", JSON.stringify(existingNames));
      }

      // Upload to server
      const formData = new FormData();
      formData.append("file", companyLogo, companyLogoName);

      const response = await fetch(`${BASE_URL}api/company-logo/`, {
        method: "POST",
        mode: "cors",
        credentials: "include",
        body: formData,
      });

      if (response.status === 201) {
        const result = await response.json();
        return { success: true, logoPath: result.logoFullPath };
      } else {
        throw new Error(`Logo upload failed: ${response.status}`);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  // ===================================================================
  // 5. DESIGN PREFERENCES - Manage Design Settings
  // ===================================================================

  /**
   * Manage design preferences and material properties
   * @param {string} action - Action type ('get', 'update', 'material_update')
   * @param {Object} params - Action parameters
   */
  const manageDesignPreferences = useCallback(async (action, params = {}) => {
    try {

      switch (action) {
        case 'get': {
          const { supported_section, supporting_section, connectivity } = params;
          let url = `${BASE_URL}api/design-preferences/?`;

          if (supported_section) url += `supported_section=${encodeURIComponent(supported_section)}&`;
          if (supporting_section) url += `supporting_section=${encodeURIComponent(supporting_section)}&`;
          if (connectivity) url += `connectivity=${encodeURIComponent(connectivity)}`;

          const response = await fetch(url, {
            method: "GET",
            mode: "cors",
            credentials: "include",
          });

          const data = await response.json();
          dispatch({ type: "SAVE_DESIGN_PREF_DATA", payload: data });

          return { success: true, data };
        }

        case 'material_update': {
          const { materialType, materialData } = params;

          if (materialType === "connector") {
            dispatch({ type: "SAVE_CM_DETAILS", payload: [materialData] });
          } else if (materialType === "supported") {
            dispatch({ type: "SAVE_SDM_DETAILS", payload: [materialData] });
          } else if (materialType === "supporting") {
            dispatch({ type: "SAVE_STM_DETAILS", payload: [materialData] });
          }

          return { success: true, message: "Material details updated" };
        }

        case 'section_update': {
          const { id, materialValue } = params;

          if (id === 1) {
            dispatch({ type: "UPDATE_SUPPORTING_ST_DATA", payload: materialValue });
          } else if (id === 2) {
            dispatch({ type: "UPDATE_SUPPORTED_ST_DATA", payload: materialValue });
          }

          return { success: true, message: "Section data updated" };
        }

        default:
          throw new Error(`Unsupported preference action: ${action}`);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [dispatch]);

  // ===================================================================
  // UTILITY FUNCTIONS
  // ===================================================================

  /**
   * Reset module state to initial values
   */
  const resetModuleState = useCallback(() => {
    dispatch({ type: "RESET_MODULE_STATE" });
  }, [dispatch]);

  // useEffect(() => {
  //   // Initialize with FinPlate module for backward compatibility
  //   populateModule(MODULE_KEY_FIN_PLATE, dispatch);
  // }, []);

  return (
    <ModuleContext.Provider
      value={{
        // ===================================================================
        // STATE VARIABLES (unchanged for compatibility)
        // ===================================================================
        // Common fields for all modules
        materialList: state.materialList,
        coverPlateList: state.coverPlateList,
        weldSizeList: state.weldSizeList,
        currentModuleName: state.currentModuleName,
        boltDiameterList: state.boltDiameterList,
        thicknessList: state.thicknessList,
        propertyClassList: state.propertyClassList,
        boltTypeList: state.boltTypeList,

        // Structural elements
        beamList: state.beamList,
        columnList: state.columnList,
        connectivityList: state.connectivityList,

        // Angle-specific (cleat angle, seated angle)
        angleList: state.angleList,
        topAngleList: state.topAngleList,

        // Tension member specific
        sectionProfileList: state.sectionProfileList,
        channelList: state.channelList,
        sectionDesignation: state.sectionDesignation,

        // Welded connection specific
        weldTypes: state.weldTypes,
        weldFab: state.weldFab,

        // End plate specific
        endPlateTypeList: state.endPlateTypeList,

        // Session-related state
        error_msg: state.error_msg,
        designData: state.designData,
        designLogs: state.designLogs,
        renderCadModel: state.renderCadModel,
        cadModelPaths: state.cadModelPaths,
        hoverDict: state.hoverDict,  // CAD model hover tooltip data
        displayPDF: state.displayPDF,
        blobUrl: state.blobUrl,
        designPrefData: state.designPrefData,
        conn_material_details: state.conn_material_details,
        supported_material_details: state.supported_material_details,
        supporting_material_details: state.supporting_material_details,
        design_pref_defaults: state.design_pref_defaults,

        // ===================================================================
        // SIMPLIFIED API - 8 CORE FUNCTIONS ONLY
        // ===================================================================

        // 1. POPULATE (3 functions)
        getModuleData,              // Universal data fetcher - replaces 12+ functions
        getConnectivityData,        // Connectivity-specific data
        manageCustomMaterials,      // Custom material operations

        // 2. CALCULATE (1 function) 
        createDesign,               // Design calculation

        // 3. CAD (2 functions)
        createCADModel,             // Generate 3D model
        downloadCADModel,           // Download CAD file

        // 4. REPORTS (1 function)
        generateReport,             // Generate PDF/CSV/design reports

        // 5. PREFERENCES (1 function)
        manageDesignPreferences,    // Design settings and material properties

        // UTILITY
        resetModuleState,           // Reset state
        dispatch,                   // Direct dispatch access for advanced usage

        // ===================================================================
        // LEGACY COMPATIBILITY FUNCTIONS (DEPRECATED - WILL BE REMOVED)
        // ===================================================================
        // ⚠️  WARNING: These functions are deprecated and will be removed in v2.0
        // ⚠️  Use the 8 core functions above for all new development
        // ⚠️  These exist only for backward compatibility with existing components

        // 🚫 DEPRECATED: Use getModuleData() instead
        getConnectivityList: (moduleName) => {
          console.warn('🚫 DEPRECATED: getConnectivityList() - Use getModuleData() instead');
          return getConnectivityData(moduleName);
        },
        getBoltDiameterList: (moduleName) => {
          console.warn('🚫 DEPRECATED: getBoltDiameterList() - Use getModuleData() instead');
          return getModuleData(moduleName);
        },
        getThicknessList: (moduleName) => {
          console.warn('🚫 DEPRECATED: getThicknessList() - Use getModuleData() instead');
          return getModuleData(moduleName);
        },
        getPropertyClassList: (moduleName) => {
          console.warn('🚫 DEPRECATED: getPropertyClassList() - Use getModuleData() instead');
          return getModuleData(moduleName);
        },

        // 🚫 DEPRECATED: Use manageCustomMaterials() instead
        addCustomMaterialToDB: (grade, inputs, connectivity, type) => {
          console.warn('🚫 DEPRECATED: addCustomMaterialToDB() - Use manageCustomMaterials("add", {...}) instead');
          return manageCustomMaterials('add', { grade, inputs, connectivity, type });
        },
        updateMaterialListFromCaches: () => {
          console.warn('🚫 DEPRECATED: updateMaterialListFromCaches() - Use manageCustomMaterials("sync") instead');
          return manageCustomMaterials('sync');
        },

        // 🚫 DEPRECATED: Use manageDesignPreferences() instead
        getDesingPrefData: (params) => {
          console.warn('🚫 DEPRECATED: getDesingPrefData() - Use manageDesignPreferences("get", params) instead');
          return manageDesignPreferences('get', params);
        },
        getSupportedData: (params) => {
          console.warn('🚫 DEPRECATED: getSupportedData() - Use manageDesignPreferences("get", {...}) instead');
          return manageDesignPreferences('get', { supported_section: params.supported_section });
        },
        getMaterialDetails: (param) => {
          console.warn('🚫 DEPRECATED: getMaterialDetails() - Use manageDesignPreferences("material_update", {...}) instead');
          return manageDesignPreferences('material_update', { materialType: param.type, materialData: param.data });
        },
        updateSourceAndMechType: (id, materialValue) => {
          console.warn('🚫 DEPRECATED: updateSourceAndMechType() - Use manageDesignPreferences("section_update", {...}) instead');
          return manageDesignPreferences('section_update', { id, materialValue });
        },

        // 🚫 DEPRECATED: Use generateReport() instead
        createDesignReport: (params, moduleId, inputValues, designStatus, logs) => {
          console.warn('🚫 DEPRECATED: createDesignReport() - Use generateReport("design_report", {...}) instead');
          return generateReport('design_report', { ...params, moduleId, inputValues, designStatus, logs });
        },
      }}
    >
      {children}
    </ModuleContext.Provider>
  );
};
