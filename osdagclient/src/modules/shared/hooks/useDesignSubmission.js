import { useEffect, useState } from "react";

/**
 * Action layer for design + CAD submission.
 * Encapsulates validation, submission pipeline, and related UI state.
 */
export const useDesignSubmission = (service, moduleConfig) => {
  const [designData, setDesignData] = useState({});
  const [designLogs, setDesignLogs] = useState([]);
  const [cadModelPaths, setCadModelPaths] = useState({});
  const [hoverDict, setHoverDict] = useState({});
  const [renderCadModel, setRenderCadModel] = useState(false);
  const [displayPDF, setDisplayPDF] = useState(false);

  const [output, setOutput] = useState(null);
  const [logs, setLogs] = useState(null);
  const [displayOutput, setDisplayOutput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [renderBoolean, setRenderBoolean] = useState(false);
  const [modelKey, setModelKey] = useState(0);
  const [isLoadingModalVisible, setIsLoadingModalVisible] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [screenshotTrigger, setScreenshotTrigger] = useState(false);

  const submitDesign = async ({ inputs, selectionStates, allSelected, moduleData, extraState }) => {
    console.log("[useDesignSubmission] submitDesign start", {
      designType: moduleConfig.designType,
      inputs,
      allSelected,
    });
    const { angleList, boltDiameterList, propertyClassList, thicknessList, channelList, weldSizeList } = moduleData;
    const validationResult = moduleConfig.validateInputs(
      inputs,
      extraState,
      { angleList, boltDiameterList, propertyClassList, thicknessList },
      selectionStates
    );
    if (!validationResult.isValid) {
      alert(validationResult.message);
      return;
    }

    let param = null;
    try {
      param = moduleConfig.buildSubmissionParams(
        inputs,
        allSelected,
        { boltDiameterList, propertyClassList, thicknessList, angleList, channelList, weldSizeList },
        extraState
      );
    } catch (err) {
      setIsLoadingModalVisible(false);
      setLoading(false);
      setLoadingStage("");
      alert("Error preparing submission parameters. See console for details.");
      console.error("buildSubmissionParams threw:", err);
      return;
    }

    setIsLoadingModalVisible(true);
    setLoadingStage("Generating design calculations...");

    try {
      const designResult = await service.createDesign(moduleConfig.designType, param);
      console.log("[useDesignSubmission] designResult", designResult);
      const designStatus = designResult?.status;
      const designBody = designResult?.body;
      const designSuccess =
        (designResult?.status === 200 || designResult?.status === 201) &&
        designBody?.success !== false &&
        designBody?.data;

      if (!designSuccess) {
        alert(designBody?.error || "Design failed. Please check inputs.");
        setLoading(false);
        setIsLoadingModalVisible(false);
        setLoadingStage("");
        return;
      }

      // Normalize design output once and set
      const formattedOutput = {};
      for (const [key, value] of Object.entries(designBody?.data || {})) {
        const label = value?.label ?? key;
        const val = value?.val ?? value?.value ?? value;
        if (val !== undefined && val !== null) {
          formattedOutput[key] = { label, val };
        }
      }

      const nextLogs = designBody.logs || [];
      setDesignData(designBody.data || {});
      setDesignLogs(nextLogs);
      setLogs(nextLogs);
      setOutput(formattedOutput);
      setDisplayOutput(true);

      setLoadingStage("Generating 3D model...");
      const cadResult = await service.createCADModel(moduleConfig.designType, param);
      console.log("[useDesignSubmission] CAD result", cadResult);
      if (cadResult?.success) {
        console.log('[useDesignSubmission] CAD success, files:', cadResult.files);
        // Normalize CAD keys to expected case
        const normalizedFiles = {};
        Object.entries(cadResult.files || {}).forEach(([key, value]) => {
          if (!key) return;
          const normKey = key.trim();
          const mapped =
            normKey === 'beam' ? 'Beam' :
            normKey === 'column' ? 'Column' :
            normKey === 'plate' ? 'Plate' :
            normKey;
          normalizedFiles[mapped] = value;
        });

        setCadModelPaths(cadResult.files || {});
        setHoverDict(cadResult.hover_dict || {});
        setRenderCadModel(true);
        setRenderBoolean(true);
        setDisplayOutput(true);
        setLoading(false);
        setModelKey((prev) => prev + 1);
        setIsLoadingModalVisible(false);
        setLoadingStage("");
      } else {
        setLoading(false);
        setIsLoadingModalVisible(false);
        setLoadingStage("");
        setRenderBoolean(false);
      }
    } catch (e) {
      setLoading(false);
      setIsLoadingModalVisible(false);
      setLoadingStage("");
      setRenderBoolean(false);
    }
  };

  const resetDesignState = () => {
    setDesignData({});
    setDesignLogs([]);
    setCadModelPaths({});
    setHoverDict({});
    setRenderCadModel(false);
    setRenderBoolean(false);
    setModelKey(0);
    setOutput(null);
    setLogs(null);
    setDisplayOutput(false);
    setLoading(false);
    setIsLoadingModalVisible(false);
    setLoadingStage("");
  };

  const clearDesignResults = () => {
    setDisplayOutput(false);
    setOutput(null);
    setLogs(null);
    setRenderBoolean(false);
    setModelKey((prev) => prev + 1);
    setLoading(false);
    setIsLoadingModalVisible(false);
    setLoadingStage("");
  };

  return {
    // submission
    submitDesign,
    // design state
    designData,
    designLogs,
    cadData: {
      paths: cadModelPaths,
      hover: hoverDict,
      render: renderCadModel,
    },
    displayPDF,
    setDisplayPDF,
    // derived/output
    output,
    logs,
    displayOutput,
    setDisplayOutput,
    // ui/flags
    loading,
    renderBoolean,
    modelKey,
    setModelKey,
    isLoadingModalVisible,
    setIsLoadingModalVisible,
    loadingStage,
    setLoadingStage,
    screenshotTrigger,
    setScreenshotTrigger,
    // helpers
    resetDesignState,
    clearDesignResults,
  };
};

