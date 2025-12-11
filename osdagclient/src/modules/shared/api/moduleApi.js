// API/business logic for module operations

export const BASE_URL = "http://127.0.0.1:8000/";

// Map backend module ids to new shear-connection slugs
const SHEAR_SLUGS = {
  FinPlateConnection: 'fin-plate',
  CleatAngleConnection: 'cleat-angle',
  EndPlateConnection: 'end-plate',
  SeatedAngleConnection: 'seated-angle',
};

const getShearSlug = (moduleKey) => SHEAR_SLUGS[moduleKey] || moduleKey;

export const createDesign = async (param, module_id, onCADSuccess = null, dispatch) => {
  try {
    const slug = getShearSlug(module_id);
    const isShear = SHEAR_SLUGS.hasOwnProperty(module_id);
    const url = isShear
      ? `${BASE_URL}api/modules/shear-connection/${slug}/design/`
      : `${BASE_URL}calculate-output/${module_id}`;
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "include",
      // New shear endpoint expects {inputs: {...}} but accepts raw dict; send both for safety
      body: JSON.stringify(isShear ? { inputs: param } : param),
    });
    const jsonResponse = await response?.json();

    if (dispatch) {
      dispatch({ type: "SET_DESIGN_DATA_AND_LOGS", payload: jsonResponse });
    }

    if (response.status == 201 && jsonResponse?.data && Object.keys(jsonResponse.data).length > 0) {
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
  const SHEAR_SLUGS = {
    FinPlateConnection: 'fin-plate',
    CleatAngleConnection: 'cleat-angle',
    EndPlateConnection: 'end-plate',
    SeatedAngleConnection: 'seated-angle',
  };
  const isShear = Object.prototype.hasOwnProperty.call(SHEAR_SLUGS, moduleKey);
  const slug = SHEAR_SLUGS[moduleKey] || moduleKey;
  const email = localStorage.getItem("email");
  const url = isShear
    ? `${BASE_URL}api/modules/shear-connection/${slug}/options/${email ? `?email=${encodeURIComponent(email)}` : ''}`
    : `${BASE_URL}populate?moduleName=${moduleKey}${email ? `&email=${encodeURIComponent(email)}` : ''}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include"
  });
  const data = await response.json();
  dispatch({ type: "SET_ALL_MODULE_DATA", payload: data });
};

export const designAndGenerateCad = async (moduleKey, inputParams, dispatch) => {
  let error = null;
  const slug = getShearSlug(moduleKey);
  const isShear = SHEAR_SLUGS.hasOwnProperty(moduleKey);
  const designUrl = isShear
    ? `${BASE_URL}api/modules/shear-connection/${slug}/design/`
    : `${BASE_URL}calculate-output/${moduleKey}`;
  const designRes = await fetch(designUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isShear ? { inputs: inputParams } : inputParams),
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
    // CAD endpoint remains legacy for now; reuse moduleKey as-is
    const cadRes = await fetch(`${BASE_URL}design/cad/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module_id: moduleKey, input_values: inputParams }),
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