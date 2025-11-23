import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectNameModal from '../components/ProjectNameModal';
import { isGuestUser } from '../../utils/auth';
import { MODULE_KEY_FIN_PLATE } from '../../constants/DesignKeys';

const MODULE_ROUTES = {
  fp: "/design/connections/shear/fin_plate",
  [MODULE_KEY_FIN_PLATE]: "/design/connections/shear/fin_plate",
  ca: "/design/connections/shear/cleat_angle",
  ep: "/design/connections/shear/end_plate",
  sa: "/design/connections/shear/seatAngle",
  cpb: "/design/connections/beam-to-beam-splice/cover_plate_bolted",
  cpw: "/design/connections/beam-to-beam-splice/cover_plate_welded",
  boltedtoendplate: "/design/tension-member/bolted_to_end_gusset",
  weldedtoendplate: "/design/tension-member/welded_to_end_gusset",
  bp: "/design/connections/base_plate",
};

const ModulesListCard = ({ items }) => {
  const navigate = useNavigate();
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);

  const getAccessToken = () => (
    localStorage.getItem('access') || localStorage.getItem('token') || ''
  );

  const handleModuleClick = (item) => {
    const route = MODULE_ROUTES[item.module_id];
    if (!route) return;
    if (isGuestUser()) {
      navigate(route);
      return;
    }
    setSelectedModule(item);
    setShowProjectModal(true);
  };

  const handleProjectModalConfirm = async (projectName) => {
    if (!selectedModule) return;
    try {
      const safeProjectName = (projectName || `${selectedModule.name} Project`).replace(/\s+/g, '_');
      const response = await fetch('http://localhost:8000/api/projects/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ name: safeProjectName, module: selectedModule.parent, submodule: selectedModule.module_id }),
      });
      const data = await response.json();
      const route = MODULE_ROUTES[selectedModule.module_id];
      if (response.ok && data.success && route) {
        navigate(`${route}?projectId=${encodeURIComponent(data.project_id)}`);
      } else if (route) {
        navigate(route);
      }
    } catch (_e) {
      const route = MODULE_ROUTES[selectedModule.module_id];
      if (route) navigate(route);
    } finally {
      setShowProjectModal(false);
      setSelectedModule(null);
    }
  };

  const handleProjectModalCancel = () => {
    setShowProjectModal(false);
    setSelectedModule(null);
  };

  const getIcon = () => (
    <div className="w-8 h-8 bg-osdag-green/10 rounded-lg flex items-center justify-center">
      <svg className="w-4 h-4 text-osdag-green" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
      </svg>
    </div>
  );

  return (
    <>
      {items.map((item, index) => (
        <div key={index} className="p-4 rounded-xl border transition-all duration-300 group bg-gray-50/50 dark:bg-gray-800/20 border-osdag-border dark:border-gray-700 hover:bg-osdag-green/20 hover:border-osdag-green/20 dark:hover:bg-osdag-green/20 hover:shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {getIcon()}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-item-text text-osdag-text-primary dark:text-white font-semibold">{item.name}</span>
                </div>
                {item.subtitle && (
                  <p className="text-subtitle text-osdag-text-secondary dark:text-gray-400 mb-2">{item.subtitle}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300 max-h-0 group-hover:max-h-20 overflow-hidden">
                  <button className="px-3 py-1.5 text-xs font-medium bg-osdag-green/10 text-osdag-green rounded-lg hover:bg-osdag-green/20 transition-colors" onClick={(e) => { e.stopPropagation(); handleModuleClick(item); }}>
                    Open
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      <ProjectNameModal
        visible={showProjectModal}
        onCancel={handleProjectModalCancel}
        onConfirm={handleProjectModalConfirm}
      />
    </>
  );
};

export default ModulesListCard;


