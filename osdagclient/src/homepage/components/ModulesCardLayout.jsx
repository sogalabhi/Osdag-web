import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUserEmail, isGuestUser, getAccessToken } from "../../utils/auth";
import ProjectNameModal from "./ProjectNameModal";

import {
  MODULE_SUBMODULES,
  CONNECTIONS_TAB_CONTENT,
  GENERIC_SUBMODULE_CONTENT,
  MODULE_ROUTES,
} from "../../constants/modules";

import SectionCards from "./SectionCards";

const TabbedModulePage = () => {
  const moduleName = window.location.pathname.split("/")[1];
  const navigate = useNavigate();

  const submodules = MODULE_SUBMODULES[moduleName] || [];
  const [activeSubmodule, setActiveSubmodule] = useState(submodules[0]?.key);

  const [selectedModule, setSelectedModule] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);

  useEffect(() => {
    setActiveSubmodule(submodules[0]?.key);
  }, [moduleName, submodules]);

  // Improved route resolver for EndPlate and moment cases
  const getRoute = (optionKey, sectionLabel) => {
    if (optionKey === "EndPlate") {
      if (activeSubmodule === "Moment") {
        switch (sectionLabel) {
          case "Beam to Beam Splice":
            return "/design/connections/beam-to-beam-splice/end_plate";
          case "Beam to Column Splice":
            return "/design/connections/column-beam/end_plate";
          default:
            return "/design/connections/beam-to-beam-splice/end_plate";
        }
      }
      return "/design/connections/shear/end_plate";
    }
    return MODULE_ROUTES[optionKey] || "";
  };

  const handleModuleClick = (optionKey, sectionLabel) => {
    const route = getRoute(optionKey, sectionLabel);

    if (isGuestUser()) {
      route && navigate(route);
      return;
    }

    if (route) {
      setSelectedModule({ key: optionKey, label: sectionLabel, route });
      setShowProjectModal(true);
    }
  };

  const handleProjectModalConfirm = async (projectName) => {
    if (!selectedModule) return;

    const safeProjectName = (projectName || `${selectedModule.label} Project`).replace(/\s+/g, "_");
    try {
      const token = getAccessToken();
      const response = await fetch("http://localhost:8000/api/projects/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: safeProjectName,
          module_id: selectedModule.key,
          module_name: selectedModule.label,
          user_email: getCurrentUserEmail(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        navigate(`${selectedModule.route}?projectId=${encodeURIComponent(data.project_id)}`);
      } else {
        navigate(selectedModule.route);
      }
    } catch {
      navigate(selectedModule.route);
    } finally {
      setShowProjectModal(false);
      setSelectedModule(null);
    }
  };

  const handleProjectModalCancel = () => {
    setShowProjectModal(false);
    setSelectedModule(null);
  };

  if (!moduleName || !MODULE_SUBMODULES[moduleName]) {
    return <div className="p-8">Module not found</div>;
  }

  const content =
    moduleName === "Connections"
      ? CONNECTIONS_TAB_CONTENT[activeSubmodule] || []
      : GENERIC_SUBMODULE_CONTENT[activeSubmodule] || [];

  return (
    <div className="w-full p-4 sm:p-8 dark:text-gray-300">
      {/* Submodules Tabs */}
      <div className="flex flex-col sm:flex-col md:flex-row lg:flex-row mb-8 gap-2">
        {submodules.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSubmodule(key)}
            className={`flex-shrink-0 flex-1 py-2 sm:py-3 text-base sm:text-lg font-semibold border-2 rounded-xl transition-colors duration-150 ${activeSubmodule === key
                ? "bg-osdag-green text-white dark:bg-osdag-dark-green dark:border-osdag-dark-green"
                : "border-osdag-border hover:bg-osdag-light-green/10 hover:text-osdag-green dark:bg-osdag-dark-color dark:text-gray-300 dark:hover:text-osdag-green"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Section Cards */}
      <div className="flex flex-col sm:flex-col md:flex-row lg:flex-row flex-wrap gap-4 justify-center md:justify-start">
        {content.map((section) => (
          <SectionCards
            key={section.label}
            section={section}
            onModuleClick={handleModuleClick}
          />
        ))}
      </div>

      {/* Project Modal */}
      <ProjectNameModal
        visible={showProjectModal}
        onConfirm={handleProjectModalConfirm}
        onCancel={handleProjectModalCancel}
        title="Name Your Project"
        message="Please give your project a name to save it for later access."
        moduleName={selectedModule ? selectedModule.label : ""}
        defaultValue=""
        confirmText="Create Project"
      />
    </div>
  );

};

export default TabbedModulePage;
