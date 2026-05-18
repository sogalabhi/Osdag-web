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
  const lastLoadedProjectIdRef = useRef(null);
  const { user, loading } = useAuth();

  useEffect(() => {
    // 1. Wait until Firebase Auth state is fully initialized.
    if (loading) return;

    const projectId = projectIdFromUrl;
    
    // 2. If there is no project ID in the URL, reset the form for BOTH guests and authenticated users.
    if (!projectId || Number.isNaN(projectId)) {
      console.info('[EngineeringModule] No project ID in URL: resetting form to defaults');
      resetFormState();
      lastLoadedProjectIdRef.current = null;
      return;
    }

    // 3. If there is a project ID in the URL but no authenticated user, skip loading (the Route Guard will redirect).
    if (!user) {
      console.info('[EngineeringModule] Guest mode detected with project ID: skipping project loading');
      return;
    }

    if (lastLoadedProjectIdRef.current === projectId) {
      return;
    }
    lastLoadedProjectIdRef.current = projectId;

    const abortController = new AbortController();

    const loadProject = async () => {
      try {
        resetModuleState();
        clearDesignResults();
        setIsDesignComplete(false);
        resetDocks("RESET");
        setShowOptionsContainer(false);
        setIsInputLocked(false);
        designCompletedRef.current = false;

        const result = await service.getProject(projectId, { signal: abortController.signal });
        if (abortController.signal.aborted) return;
        
        console.log('[EngineeringModule] Project loaded:', result);
        if (!result.success || !result.project) {
          lastLoadedProjectIdRef.current = null;
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
              setInputs((prev) => ({
                ...(moduleConfig?.defaultInputs || {}),
                ...(prev || {}),
                ...(savedInputs.dock || {}),
              }));
              setDesignPrefOverrides(savedInputs.pref || {});
            } else {
              setInputs((prev) => ({
                ...(moduleConfig?.defaultInputs || {}),
                ...(prev || {}),
                ...(savedInputs || {}),
              }));
              setDesignPrefOverrides({});
            }
          } catch (err) {
            console.error('[EngineeringModule] Error parsing inputs_json:', err);
            message.error('Failed to parse saved project inputs.');
          }
        }
        if (result.project.outputs_json) {
          try {
            loadSavedOutputs(result.project.outputs_json);
          } catch (err) {
            console.error('[EngineeringModule] Error loading saved outputs:', err);
            message.error('Failed to load saved project outputs.');
          }
        }

        const pathname = location.pathname;
        const pathEndsWithId = pathname.endsWith(`/${projectId}`);
        const hasQueryProjectId = new URLSearchParams(location.search).get('projectId') != null;
        if (!pathEndsWithId && hasQueryProjectId && moduleConfig.routePath) {
          const basePath = moduleConfig.routePath.replace(/\/$/, '');
          navigate(`${basePath}/${projectId}`, { replace: true });
        }
      } catch (_e) {
        if (abortController.signal.aborted) return;
        lastLoadedProjectIdRef.current = null;
        console.error('[EngineeringModule] Error loading project:', _e);
        message.warning('Cannot load project. Redirecting to module base.');

        const basePath = moduleConfig.routePath || '/home';
        navigate(basePath, { replace: true });
      }
    };

    loadProject();

    return () => {
      abortController.abort();
    };
  }, [projectIdFromUrl, service, moduleConfig, navigate, location.pathname, location.search, setInputs, setDesignPrefOverrides, loadSavedOutputs, resetModuleState, clearDesignResults, resetDocks, setIsDesignComplete, setShowOptionsContainer, setIsInputLocked, designCompletedRef, resetFormState, user, loading]);
};
