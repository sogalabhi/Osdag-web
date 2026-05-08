import { useEffect, useRef } from "react";
import { message } from "antd";
import { isGuestUser } from "../../../utils/auth";

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
}) => {
  const lastLoadedProjectIdRef = useRef(null);

  useEffect(() => {
    if (isGuestUser()) {
      console.info('[EngineeringModule] Guest mode detected: skipping project loading');
      return;
    }

    const projectId = projectIdFromUrl;
    if (!projectId || Number.isNaN(projectId)) {
      console.info('[EngineeringModule] No project ID in URL: user can work without project');
      lastLoadedProjectIdRef.current = null;
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
              setInputs(savedInputs.dock || {});
              setDesignPrefOverrides(savedInputs.pref || {});
            } else {
              setInputs(savedInputs || {});
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
  }, [projectIdFromUrl, service, moduleConfig, navigate, location.pathname, location.search, setInputs, setDesignPrefOverrides, loadSavedOutputs, resetModuleState, clearDesignResults, resetDocks, setIsDesignComplete, setShowOptionsContainer, setIsInputLocked, designCompletedRef]);
};
