import React, { useEffect, useState } from 'react';
import ProjectCard from './ProjectCard';
import RecentProjects from '../../components/RecentProjects';
// import { recentModules } from '../data/mockData'; // Remove mockData import
import { isGuestUser, getCurrentUserEmail, getAccessToken } from '../../utils/auth';
import { MODULE_KEY_FIN_PLATE, MODULE_DISPLAY_FIN_PLATE } from '../../constants/DesignKeys';

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
      const url = `http://localhost:8000/api/projects/`;
      const token = getAccessToken();
      console.log('[fetchRecentProjects] using access token (first 20 chars):', (token || '').slice(0, 20));
      const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      } else {
        console.log('[fetchRecentProjects] failed with response:', data);
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
      await fetch(`http://localhost:8000/api/projects/${projectId}/`, {
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
      'fp': 'FinPlateConnection',
      'ca': 'Cleat Angle Connection',
      'ep': 'End Plate Connection',
      'sa': 'Seated Angle Connection',
      'cpb': 'Cover Plate Bolted',
      'cpw': 'Cover Plate Welded',
      'boltedtoendplate': 'Tension Member Bolted',
      'ssb': 'Simply Supported Beam',
      'pg': 'Plate Girder',
      [MODULE_KEY_FIN_PLATE]: MODULE_DISPLAY_FIN_PLATE,
      'End-Plate-Connection': 'End Plate Connection',
      'Cleat-Angle-Connection': 'Cleat Angle Connection',
      'Seated-Angle-Connection': 'Seated Angle Connection',
      'Cover-Plate-Bolted-Connection': 'Cover Plate Bolted',
      'Cover-Plate-Welded-Connection': 'Cover Plate Welded',
      'Beam-Beam-End-Plate-Connection': 'Beam-Beam End Plate',
      'Beam-to-Column-End-Plate-Connection': 'Beam-Column End Plate',
      'Tension-Member-Bolted-Design': 'Tension Member Bolted',
      'Simply-Supported-Beam': 'Simply Supported Beam'
    };
    return moduleNames[moduleId] || moduleId;
  }

  return (
    <div className=" flex-1 px-12 pb-6">
      <div className="max-w-7xl mx-auto h-full">
        <div className={`grid grid-cols-1 ${isGuest ? 'xl:grid-cols-1' : 'xl:grid-cols-2'} gap-8 h-full`}>
          {/* Recent Projects Card */}
          <div className=" rounded-lg shadow-sm  p-6">
            <RecentProjects projects={projects} loading={loading} onDeleteProject={handleDeleteProject} />
          </div>
          
          {/* Recently used Modules Card - Hidden for guests */}
          {!isGuest && (
            <ProjectCard 
              title="Recently used Modules"
              items={recentModules}
              type="module"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MainContent; 