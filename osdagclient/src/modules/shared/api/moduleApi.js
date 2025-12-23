// API/business logic for module operations

// export const BASE_URL = "http://127.0.0.1:8000/";
import { apiBase } from "../../../api";
export const BASE_URL = `${apiBase}`;

// Single map of all modules -> slugs with parent path prefix
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

const getSlug = (moduleKey) => MODULE_SLUGS[moduleKey] || moduleKey;

export const createDesign = async (param, module_id, onCADSuccess = null, dispatch) => {
  try {
    const slug = getSlug(module_id);
    const url = `${BASE_URL}api/modules/${slug}/design/`;
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "include",
      // New endpoints expect {inputs: {...}}
      body: JSON.stringify({ inputs: param }),
    });
    const jsonResponse = await response?.json();

    if (dispatch) {
      dispatch({ type: "SET_DESIGN_DATA_AND_LOGS", payload: jsonResponse });
    }

    const hasData = jsonResponse?.data && Object.keys(jsonResponse.data || {}).length > 0;
    const isSuccess = response.ok && jsonResponse?.success !== false && (hasData || Array.isArray(jsonResponse));

    if (isSuccess) {
      if (onCADSuccess && typeof onCADSuccess === 'function') {
        onCADSuccess(jsonResponse.data, jsonResponse.logs);
      }
    } else if (response.status == 400) {
      dispatch && dispatch({ type: "SET_RENDER_CAD_MODEL_BOOLEAN", payload: false });
    } else {
    }
    return { status: response.status, body: jsonResponse };
  } catch (error) {
    return { status: 500, body: { success: false, error: error?.message || 'Design request failed' } };
  }
};

// Deprecated: legacy design-report flow removed. Use the 3-step flow in DesignReportModal instead.
export const createDesignReport = async () => {
  return { success: false, error: 'Legacy design-report flow removed. Use generate-initial/parse-sections/customize.' };
};

export const getModuleData = async (moduleName) => {
  // ...implementation
};

export const getDesingPrefData = async (params) => {
  // ...implementation
};

export const populateModule = async (moduleKey, dispatch) => {
  const slug = getSlug(moduleKey);
  const email = localStorage.getItem("email");
  const url = `${BASE_URL}api/modules/${slug}/options/${email ? `?email=${encodeURIComponent(email)}` : ''}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include"
  });
  const data = await response.json();
  dispatch({ type: "SET_ALL_MODULE_DATA", payload: data });
};

export const designAndGenerateCad = async (moduleKey, inputParams, dispatch) => {
  let error = null;
  const designUrl = `${BASE_URL}api/modules/${getSlug(moduleKey)}/design/`;
  const designRes = await fetch(designUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: inputParams }),
    credentials: "include"
  });
  const designData = await designRes.json();
  // Always dispatch with { data, logs } structure
  const payload = {
    data: designData.data || designData,
    logs: designData.logs || []
  };
  dispatch({
    type: "SET_DESIGN_DATA_AND_LOGS",
    payload
  });
  if (designRes.status === 201 && (designData.data || designData)) {
    // Use new CAD endpoint pattern: /api/modules/{slug}/cad/
    const cadSlug = getSlug(moduleKey);
    const cadUrl = `${BASE_URL}api/modules/${cadSlug}/cad/`;
    
    const cadRes = await fetch(cadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: inputParams }),
      credentials: "include"
    });
    // CAD-specific: simple alert on 500
    if (cadRes.status === 500) {
      let message = "Server error (500)";
      try {
        const body = await cadRes.json();
        message = body?.message || message;
      } catch (_) {
        try {
          const text = await cadRes.text();
          if (text) message = text;
        } catch (_) {}
      }
      // eslint-disable-next-line no-alert
      alert(message);
      return { design: designData, cad: null, error: message };
    }
    const cadData = await cadRes.json();
    
    // Log the API response to debug hover_dict
    console.log('=== [moduleApi] CAD API Response ===');
    console.log('[moduleApi] Response status:', cadRes.status);
    console.log('[moduleApi] Response data keys:', Object.keys(cadData));
    console.log('[moduleApi] cadData.hover_dict:', cadData.hover_dict);
    console.log('[moduleApi] cadData.hover_dict type:', typeof cadData.hover_dict);
    if (cadData.hover_dict && typeof cadData.hover_dict === 'object') {
      console.log('[moduleApi] hover_dict keys:', Object.keys(cadData.hover_dict));
      console.log('[moduleApi] hover_dict entries:', Object.entries(cadData.hover_dict));
      console.log('[moduleApi] hover_dict JSON:', JSON.stringify(cadData.hover_dict, null, 2));
    }
    
    if (cadRes.status === 201 && cadData.status === "success") {
      dispatch({ type: "SET_CAD_MODEL_PATHS", payload: cadData.files });
      
      // Log before dispatching hover_dict
      console.log('[moduleApi] Before dispatch - cadData.hover_dict:', cadData.hover_dict);
      if (cadData.hover_dict) {
        console.log('[moduleApi] Dispatching SET_HOVER_DICT with:', cadData.hover_dict);
        dispatch({ type: "SET_HOVER_DICT", payload: cadData.hover_dict });
      } else {
        console.warn('[moduleApi] cadData.hover_dict is missing or empty!');
      }
      
      dispatch({ type: "SET_RENDER_CAD_MODEL_BOOLEAN", payload: true });
      return { design: designData, cad: cadData, error: null };
    } else {
      dispatch({ type: "SET_RENDER_CAD_MODEL_BOOLEAN", payload: false });
      error = cadData?.message || "CAD generation failed.";
      return { design: designData, cad: null, error };
    }
  } else {
    dispatch({ type: "SET_RENDER_CAD_MODEL_BOOLEAN", payload: false });
    error = designData?.message || "Design calculation failed.";
    return { design: null, cad: null, error };
  }
}; 
