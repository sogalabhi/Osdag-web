import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUserEmail, isGuestUser, getAccessToken, canCreateProjects } from "../../utils/auth";
import { message } from 'antd';
import ProjectNameModal from "./ProjectNameModal";

import {
  MODULE_SUBMODULES,
  CONNECTIONS_TAB_CONTENT,
  GENERIC_SUBMODULE_CONTENT,
  MODULE_ROUTES,
} from "../../constants/modules";

import SectionCards from "./SectionCards";
import { createProject } from "../../datasources/projectsDataSource";

const TabbedModulePage = () => {
  const moduleName = window.location.pathname.split("/")[1];
  const navigate = useNavigate();

  const submodules = MODULE_SUBMODULES[moduleName] || [];
  const [activeSubmodule, setActiveSubmodule] = useState(submodules[0]?.key);
  const [activeSubSubmodule, setActiveSubSubmodule] = useState("");
  const [selectedModule, setSelectedModule] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Update activeSubmodule when moduleName or submodules change
  useEffect(() => {
    setActiveSubmodule(submodules[0]?.key);
  }, [moduleName, submodules]);

  // Derive content based on activeSubmodule
  const content =
    moduleName === "Connections"
      ? CONNECTIONS_TAB_CONTENT[activeSubmodule] || []
      : GENERIC_SUBMODULE_CONTENT[activeSubmodule] || [];

  // Sync activeSubSubmodule to first section label when activeSubmodule or content changes
  useEffect(() => {
    const firstLabel = content[0]?.label || "";
    setActiveSubSubmodule(firstLabel);
  }, [activeSubmodule, content]);

  const handleModuleClick = (optionKey, sectionLabel) => {
    const route = MODULE_ROUTES[optionKey] || "";

    if (route) {
      navigate(route);
    }
  };

  const handleProjectModalConfirm = async (projectName) => {
    if (!selectedModule) return;

    // Check if user can create projects (guests and unverified users cannot)
    if (!canCreateProjects()) {
      if (isGuestUser()) {
        message.warning("Guest users cannot create projects. Please log in to create projects.");
      } else {
        message.error("Please verify your email to create projects. Check your inbox for the verification link.");
      }
      setShowProjectModal(false);
      setSelectedModule(null);
      return;
    }

    const safeProjectName = (projectName || `${selectedModule.label} Project`).replace(/\s+/g, "_");
    try {
      const payload = {
        name: safeProjectName,
        module_id: selectedModule.key,
        module_name: selectedModule.label,
        user_email: getCurrentUserEmail(),
      };
      const data = await createProject(payload);
      if (data.success) {
        navigate(`${selectedModule.route}/${data.project_id}`);
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

  // Filter content to show only the section matching activeSubSubmodule
  const filteredContent = content.filter((section) => section.label === activeSubSubmodule);

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

      {/* Sub-SubModules Tabs */}
      {/* {activeSubmodule === "Moment" && <div className="flex flex-col sm:flex-col md:flex-row lg:flex-row mb-8 gap-2">
        {content.map(({ label }) => (
          <button
            key={label}
            onClick={() => setActiveSubSubmodule(label)}
            className={`flex-shrink-0 flex-1 py-2 sm:py-3 text-base sm:text-lg font-semibold border-2 rounded-xl transition-colors duration-150 ${activeSubSubmodule === label
              ? "bg-osdag-green text-white dark:bg-osdag-dark-green dark:border-osdag-dark-green"
              : "border-osdag-border hover:bg-osdag-light-green/10 hover:text-osdag-green dark:bg-osdag-dark-color dark:text-gray-300 dark:hover:text-osdag-green"
              }`}
          >
            {label}
          </button>
        ))}
      </div>} */}
       {/* {activeSubmodule==="Moment" && (
        <div className="flex flex-col sm:flex-col md:flex-row lg:flex-row mb-8 gap-2">
          {content.map(({ label }) => (
            <div key={label} className="flex flex-col items-center">
              <button
                key={label}
                onClick={() => setActiveSubSubmodule(label)}
                className={`flex-shrink-0 flex-1 py-2 sm:py-3 text-base sm:text-lg font-semibold border-2 rounded-xl transition-colors duration-150 ${activeSubSubmodule === label
                  ? "bg-osdag-green text-white dark:bg-osdag-dark-green dark:border-osdag-dark-green"
                  : "border-osdag-border hover:bg-osdag-light-green/10 hover:text-osdag-green dark:bg-osdag-dark-color dark:text-gray-300 dark:hover:text-osdag-green"
                 }`}
            >
              {label}
            </button>
            {label === "PEB" && (
              <div
                style={{
                  marginTop: "6px",
                  padding: "4px 10px",
                  border: "1px solid #9ACD32",
                  backgroundColor: "#f3f7e6",
                  fontSize: "12px",
                  borderRadius: "2px",
                 }}
              >
               Under Development
              </div>
            )}
           </div>
        ))}

      </div>)} */}
       {activeSubmodule === "Moment" && (
          <div className="flex flex-row mb-8 gap-3">
            {content.map(({ label }) => (
              <button
                key={label}
                onClick={() => label !== "PEB" && setActiveSubSubmodule(label)}
                disabled={label === "PEB"}
                className={`flex-1 py-2 sm:py-3 text-base sm:text-lg font-semibold border rounded-md transition-colors duration-150
                ${
                  label === "PEB"
                  ? "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed"
                  : activeSubSubmodule === label
                  ? "bg-osdag-green text-white border-osdag-green"
                  : "text-black border-gray-300 hover:bg-osdag-light-green/20"
                  }`}
              >
                {label}
              </button>
            ))}
           </div>
          )}
      {/* Section Cards */}
      {selectedModule !== "Moment Connection" && (
        <div className="flex flex-col sm:flex-col md:flex-row lg:flex-row flex-wrap gap-4 justify-center md:justify-start">
          {filteredContent.map((section) => (
            <SectionCards key={section.label} section={section} onModuleClick={handleModuleClick} />
          ))}
        </div>
      )}

    </div>
  );
};

export default TabbedModulePage;
