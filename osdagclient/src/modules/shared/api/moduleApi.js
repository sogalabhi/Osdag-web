// API/business logic for module operations

export const BASE_URL = "http://127.0.0.1:8000/";

export const createDesign = async (param, module_id, onCADSuccess = null, dispatch) => {
  try {
    const url = `${BASE_URL}calculate-output/${module_id}`;
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(param),
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
  } catch (error) {
  }
};

export const createDesignReport = async (params, moduleId = null, inputValues = null, designStatus = true, logs = [], fetchCompanyLogo) => {
  const logoFullPath = params.companyLogo
    ? await fetchCompanyLogo(params.companyLogo, params.companyLogoName)
    : "";
  try {
    const sanitizedInputs = inputValues ? JSON.parse(JSON.stringify(inputValues)) : null;
    const sanitizedLogs = Array.isArray(logs) ? JSON.parse(JSON.stringify(logs)) : [];
    const normalizedModuleId = moduleId || null;

    const requestBody = {
      metadata: {
        ProfileSummary: {
          CompanyName: params.companyName,
          CompanyLogo: logoFullPath ? logoFullPath : "",
          "Group/TeamName": params.groupTeamName,
          Designer: params.designer,
        },
        ProjectTitle: params.projectTitle,
        Subtitle: params.subtitle,
        JobNumber: params.jobNumber,
        AdditionalComments: params.additionalComments,
        Client: params.client,
      },
      module_id: normalizedModuleId,
      input_values: sanitizedInputs,
      design_status: designStatus,
      logs: sanitizedLogs,
    };

    // Then stringify for sending
    const body = JSON.stringify(requestBody);

    const response = await fetch(`${BASE_URL}generate-report`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: body,
    });
    const jsonResponse = await response?.json();
    if (response.status == 201 && jsonResponse?.report_id) {
      // Download the PDF directly from backend without opening a new tab
      try {
        const pdfUrl = `${BASE_URL}getPDF?report_id=${jsonResponse.report_id}`;
        const pdfRes = await fetch(pdfUrl, {
          method: 'GET',
          mode: 'cors',
          credentials: 'include'
        });
        if (!pdfRes.ok) {
          throw new Error(`PDF fetch failed: ${pdfRes.status} ${pdfRes.statusText}`);
        }
        const blob = await pdfRes.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `osdag_report_${jsonResponse.report_id}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (e) {
        console.warn('PDF direct download failed, exposing report_id to caller.', e);
      }
      return { success: true, report_id: jsonResponse.report_id };
    }
    const errorMsg = jsonResponse?.message || 'Report generation failed';
    return { success: false, error: errorMsg };
  } catch (error) {
    return { success: false, error: error?.message || 'Network error' };
  }
};

export const getModuleData = async (moduleName) => {
  // ...implementation
};

export const getDesingPrefData = async (params) => {
  // ...implementation
};

export const populateModule = async (moduleKey, dispatch) => {
  const response = await fetch(`${BASE_URL}populate?moduleName=${moduleKey}`, {
    method: "GET",
    credentials: "include"
  });
  const data = await response.json();
  dispatch({ type: "SET_ALL_MODULE_DATA", payload: data });
};

export const designAndGenerateCad = async (moduleKey, inputParams, dispatch) => {
  let error = null;
  const designRes = await fetch(`${BASE_URL}calculate-output/${moduleKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputParams),
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
    if (cadRes.status === 201 && cadData.status === "success") {
      dispatch({ type: "SET_CAD_MODEL_PATHS", payload: cadData.files });
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