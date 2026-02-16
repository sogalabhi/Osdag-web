import React, { useEffect, useState } from 'react';
import DashboardSectionCard from './DashboardSectionCard';
import ProjectsListCard from './ProjectsListCard';
import ModulesListCard from './ModulesListCard';
import { isGuestUser, getCurrentUserEmail, getAccessToken } from '../../utils/auth';
import {
  MODULE_KEY_FIN_PLATE,
  MODULE_DISPLAY_FIN_PLATE,
  MODULE_KEY_SEAT_ANGLE,
  MODULE_DISPLAY_SEAT_ANGLE,
  MODULE_KEY_CLEAT_ANGLE,
  MODULE_DISPLAY_CLEAT_ANGLE,
  MODULE_KEY_END_PLATE,
  MODULE_DISPLAY_END_PLATE,
  MODULE_KEY_BEAM_COLUMN_END_PLATE,
  MODULE_KEY_BEAM_BEAM_END_PLATE,
  MODULE_KEY_BEAM_TO_BEAM_COVER_PLATE_BOLTED,
  MODULE_KEY_BEAM_TO_BEAM_COVER_PLATE_WELDED,
  MODULE_KEY_TENSION_BOLTED,
  MODULE_KEY_TENSION_WELDED,
  MODULE_KEY_SIMPLY_SUPPORTED_BEAM,
} from '../../constants/DesignKeys';
import { apiBase } from "../../api";

const MainContent = () => {
  const isGuest = isGuestUser();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const userEmail = getCurrentUserEmail();

  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    fetchRecentProjects();
    // eslint-disable-next-line
  }, [isGuest]);

  const fetchRecentProjects = async () => {
    setLoading(true);
    try {
      // const url = `http://localhost:8000/api/projects/`;
      const url = `${apiBase}api/projects/`;
      const token = getAccessToken();
      const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      } else {
      }
    } catch (e) {
      // handle error
    }
    setLoading(false);
  };

  // Add a handler to delete a project and refresh the list
  const handleDeleteProject = async (projectId) => {
    try {
      const token = getAccessToken();
      await fetch(`${apiBase}api/projects/${projectId}/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      // Refresh the list after deletion
      fetchRecentProjects();
    } catch (e) {
      // handle error
    }
  };

  // Filter to most recent project per unique module_id
  const uniqueModulesMap = {};
  projects.forEach((project) => {
    if (
      !uniqueModulesMap[project.module_id] ||
      new Date(project.updated_at || project.created_at) > new Date(uniqueModulesMap[project.module_id].updated_at || uniqueModulesMap[project.module_id].created_at)
    ) {
      uniqueModulesMap[project.module_id] = project;
    }
  });
  const recentModules = Object.values(uniqueModulesMap).map(project => ({
    name: getModuleDisplayName(project.module_id),
    description: project.name,
    date: project.updated_at ? new Date(project.updated_at).toLocaleDateString() : '',
    module_id: project.module_id,
    project_id: project.id,
  }));

  function getModuleDisplayName(moduleId) {
    const moduleNames = {
      fp: MODULE_DISPLAY_FIN_PLATE,
      ca: MODULE_DISPLAY_CLEAT_ANGLE,
      ep: 'End Plate Connection',
      sa: MODULE_DISPLAY_SEAT_ANGLE,
      cpb: 'Cover Plate Bolted',
      cpw: 'Cover Plate Welded',
      boltedtoendplate: 'Tension Member Bolted',
      ssb: 'Simply Supported Beam',
      pg: 'Plate Girder',
      [MODULE_KEY_FIN_PLATE]: MODULE_DISPLAY_FIN_PLATE,
      [MODULE_KEY_CLEAT_ANGLE]: MODULE_DISPLAY_CLEAT_ANGLE,
      [MODULE_KEY_END_PLATE]: MODULE_DISPLAY_END_PLATE,
      [MODULE_KEY_SEAT_ANGLE]: MODULE_DISPLAY_SEAT_ANGLE,
      [MODULE_KEY_BEAM_TO_BEAM_COVER_PLATE_BOLTED]: 'Cover Plate Bolted',
      [MODULE_KEY_BEAM_TO_BEAM_COVER_PLATE_WELDED]: 'Cover Plate Welded',
      [MODULE_KEY_BEAM_BEAM_END_PLATE]: 'Beam-Beam End Plate',
      [MODULE_KEY_BEAM_COLUMN_END_PLATE]: 'Beam-Column End Plate',
      [MODULE_KEY_TENSION_BOLTED]: 'Tension Member Bolted',
      [MODULE_KEY_TENSION_WELDED]: 'Tension Member Welded',
      [MODULE_KEY_SIMPLY_SUPPORTED_BEAM]: 'Simply Supported Beam',
    };
    return moduleNames[moduleId] || moduleId;
  }

  return (
    <div className=" flex-1 px-12 pb-6">
      <div className="max-w-7xl mx-auto h-full">
        <div className={`flex flex-row gap-8 h-full`}>
          {/* Recent Projects */}
          <div className="flex-1">
            <DashboardSectionCard title="Recent Projects">
              <ProjectsListCard projects={projects} loading={loading} onDeleteProject={handleDeleteProject} />
            </DashboardSectionCard>
          </div>

          {/* Recently used Modules */}
          {isGuest ? null : (<div className="flex-1">
            <DashboardSectionCard title="Recently used Modules">
              <ModulesListCard items={recentModules} />
            </DashboardSectionCard>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainContent; 
