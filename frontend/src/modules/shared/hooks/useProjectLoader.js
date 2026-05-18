import { useEffect, useRef } from "react";
import { message } from "antd";
import { useAuth } from "../../../context/AuthContext";

export const useProjectLoader = ({
  projectIdFromUrl,
  service,
  moduleConfig,
  navigate,
  location,
  setInputs,
  setDesignPrefOverrides,
  loadSavedOutputs,
  resetModuleState,
  clearDesignResults,
  resetDocks,
  setIsDesignComplete,
  setShowOptionsContainer,
  setIsInputLocked,
  designCompletedRef,
  resetFormState,
}) => {
  // Use 'undefined' so it doesn't falsely match a 'null' base route on first mount
  const lastLoadedProjectIdRef = useRef(undefined);
  const { user, loading } = useAuth();

  const callbacksRef = useRef({
    setInputs,
    setDesignPrefOverrides,
    loadSavedOutputs,
    resetModuleState,
    clearDesignResults,
    resetDocks,
    setIsDesignComplete,
    setShowOptionsContainer,
    setIsInputLocked,
    resetFormState,
    service,
    moduleConfig,
    navigate,
    location
  });

  useEffect(() => {
    callbacksRef.current = {
      setInputs,
      setDesignPrefOverrides,
      loadSavedOutputs,
      resetModuleState,
      clearDesignResults,
      resetDocks,
      setIsDesignComplete,
      setShowOptionsContainer,
      setIsInputLocked,
      resetFormState,
      service,
      moduleConfig,
      navigate,
      location
    };
  });

  useEffect(() => {
    return () => {
      lastLoadedProjectIdRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const projectId = projectIdFromUrl || null;

    if (lastLoadedProjectIdRef.current === projectId) {
      return;
    }

    lastLoadedProjectIdRef.current = projectId;

    if (!projectId) {
      console.info('[EngineeringModule] No project ID in URL: resetting form to defaults');
      callbacksRef.current.resetFormState();
      return;
    }

    if (!user) {
      console.info('[EngineeringModule] Guest mode detected with project ID: skipping project loading');
      return;
    }

    const abortController = new AbortController();

    const loadProject = async () => {
      try {
        callbacksRef.current.resetModuleState();
        callbacksRef.current.clearDesignResults();
        callbacksRef.current.setIsDesignComplete(false);
        callbacksRef.current.resetDocks("RESET");
        callbacksRef.current.setShowOptionsContainer(false);
        callbacksRef.current.setIsInputLocked(false);
        designCompletedRef.current = false;

        const result = await callbacksRef.current.service.getProject(projectId, { signal: abortController.signal });
        if (abortController.signal.aborted) return;
        
        if (!result.success || !result.project) {
          lastLoadedProjectIdRef.current = undefined;
          message.warning('Project not found.');
          return;
        }

        if (result.project.inputs_json) {
          try {
            const savedInputs = result.project.inputs_json;
            if (
              savedInputs &&
              typeof savedInputs === "object" &&
              Object.prototype.hasOwnProperty.call(savedInputs, "dock")
            ) {
              callbacksRef.current.setInputs({
                ...(callbacksRef.current.moduleConfig?.defaultInputs || {}),
                ...(savedInputs.dock || {}),
              });
              callbacksRef.current.setDesignPrefOverrides(savedInputs.pref || {});
            } else {
              callbacksRef.current.setInputs({
                ...(callbacksRef.current.moduleConfig?.defaultInputs || {}),
                ...(savedInputs || {}),
              });
              callbacksRef.current.setDesignPrefOverrides({});
            }
          } catch (err) {
            console.error('[EngineeringModule] Error parsing inputs_json:', err);
            message.error('Failed to parse saved project inputs.');
          }
        }
        if (result.project.outputs_json) {
          try {
            callbacksRef.current.loadSavedOutputs(result.project.outputs_json);
          } catch (err) {
            console.error('[EngineeringModule] Error loading saved outputs:', err);
            message.error('Failed to load saved project outputs.');
          }
        }

        const currentPathname = callbacksRef.current.location.pathname;
        const pathEndsWithId = currentPathname.endsWith(`/${projectId}`);
        const hasQueryProjectId = new URLSearchParams(callbacksRef.current.location.search).get('projectId') != null;
        if (!pathEndsWithId && hasQueryProjectId && callbacksRef.current.moduleConfig.routePath) {
          const basePath = callbacksRef.current.moduleConfig.routePath.replace(/\/$/, '');
          callbacksRef.current.navigate(`${basePath}/${projectId}`, { replace: true });
        }
      } catch (_e) {
        if (abortController.signal.aborted) return;
        lastLoadedProjectIdRef.current = undefined;
        console.error('[EngineeringModule] Error loading project:', _e);
        message.warning('Cannot load project. Redirecting to module base.');

        const basePath = callbacksRef.current.moduleConfig.routePath || '/home';
        callbacksRef.current.navigate(basePath, { replace: true });
      }
    };

    loadProject();

    return () => {
      abortController.abort();
    };

  }, [projectIdFromUrl, user, loading]);
};
