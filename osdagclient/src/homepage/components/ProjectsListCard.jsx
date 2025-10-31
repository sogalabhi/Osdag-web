import React from 'react';
import { Button, Popconfirm, message, Spin, Empty } from 'antd';
import { ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { isGuestUser, getCurrentUserEmail } from '../../utils/auth';
import { MODULE_KEY_FIN_PLATE, MODULE_DISPLAY_FIN_PLATE } from '../../constants/DesignKeys';

const ProjectsListCard = ({ projects: projectsProp = [], loading: loadingProp = false, onDeleteProject }) => {
  const [projects, setProjects] = React.useState(projectsProp);
  const [loading, setLoading] = React.useState(loadingProp);
  const [deletingProject, setDeletingProject] = React.useState(null);
  const navigate = useNavigate();

  const BASE_URL = 'http://localhost:8000/api/';

  const getAccessToken = () => (
    localStorage.getItem('access') || localStorage.getItem('token') || ''
  );

  const isGuest = isGuestUser();
  const userEmail = getCurrentUserEmail();

  React.useEffect(() => {
    if (isGuest) {
      setProjects([]);
      setLoading(false);
      return;
    }
    if (!projectsProp || projectsProp.length === 0) {
      const fetchRecentProjects = async () => {
        setLoading(true);
        try {
          const res = await fetch(`${BASE_URL}projects/`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAccessToken()}`,
            },
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setProjects(data.projects || []);
          } else {
            message.error(data.error || 'Failed to load projects');
          }
        } catch (_e) {
          message.error('Failed to load projects');
        } finally {
          setLoading(false);
        }
      };
      fetchRecentProjects();
    } else {
      setProjects(projectsProp);
      setLoading(loadingProp);
    }
  }, [isGuest, projectsProp, loadingProp]);

  const handleDeleteProject = async (projectId) => {
    setDeletingProject(projectId);
    if (onDeleteProject) await onDeleteProject(projectId);
    setDeletingProject(null);
  };

  const handleOpenProject = async (project) => {
    try {
      const response = await fetch(`${BASE_URL}projects/${project.id}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        const moduleRoutes = {
          fp: '/design/connections/shear/fin_plate',
          ca: '/design/connections/shear/cleat_angle',
          ep: '/design/connections/shear/end_plate',
          sa: '/design/connections/shear/seatAngle',
          cpb: '/design/connections/beam-to-beam-splice/cover_plate_bolted',
          cpw: '/design/connections/beam-to-beam-splice/cover_plate_welded',
          boltedtoendplate: '/design/tension-member/bolted_to_end_gusset',
          ssb: '/design/FlexureMember/simply_supported_beam',
          [MODULE_KEY_FIN_PLATE]: '/design/connections/shear/fin_plate',
          'End-Plate-Connection': '/design/connections/shear/end_plate',
          'Cleat-Angle-Connection': '/design/connections/shear/cleat_angle',
          'Seated-Angle-Connection': '/design/connections/shear/seatAngle',
          'Cover-Plate-Bolted-Connection': '/design/connections/beam-to-beam-splice/cover_plate_bolted',
          'Cover-Plate-Welded-Connection': '/design/connections/beam-to-beam-splice/cover_plate_welded',
          'Beam-Beam-End-Plate-Connection': '/design/connections/beam-to-beam-splice/end_plate',
          'Beam-to-Column-End-Plate-Connection': '/design/connections/column-beam/end_plate',
          'Tension-Member-Bolted-Design': '/design/tension-member/bolted_to_end_gusset',
          'Simply-Supported-Beam': '/design/FlexureMember/simply_supported_beam',
        };
        const route = moduleRoutes[project.module_id];
        if (route) {
          navigate(`${route}?projectId=${encodeURIComponent(project.id)}`);
        } else {
          message.error('Module route not found');
        }
      } else {
        message.error(data.error || 'Failed to load project');
      }
    } catch (_e) {
      message.error('Failed to load project');
    }
  };

  const handleDownloadOsi = async (project) => {
    try {
      const detailRes = await fetch(`${BASE_URL}projects/${project.id}/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAccessToken()}` },
      });
      const detail = await detailRes.json();
      if (!detailRes.ok || !detail.success) {
        message.error('Failed to load project');
        return;
      }
      const inputs = detail.project?.inputs_json || {};
      const module_id = detail.project?.submodule || detail.project?.module || 'FinPlateConnection';

      const saveRes = await fetch(`${BASE_URL}save-osi-from-inputs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ name: project.name, module_id, inputs, inline: true }),
      });
      const data = await saveRes.json();
      if (!saveRes.ok || !data.success || !data.content_base64) {
        message.error(data.error || 'Failed to prepare OSI');
        return;
      }

      const binaryString = atob(data.content_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename || `${project.name}.osi`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (_e) {
      message.error('Failed to download OSI');
    }
  };

  if (isGuest) {
    return (
      <div className="text-center p-10">
        <Empty description="Projects are not available in guest mode" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center p-10">
        <Spin size="large" />
        <div className="mt-4 dark:text-white">Loading recent projects...</div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center p-10 dark:text-white">
        <Empty description="No recent projects" />
        <p className="text-gray-600 mb-4">Start designing to see your projects here</p>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getProjectIcon = () => (
    <div className="w-8 h-8 bg-osdag-green/10 rounded-lg flex items-center justify-center">
      <span className="text-osdag-green font-semibold text-sm">L</span>
    </div>
  );

  return (
    <>
      {projects.map((project) => (
        <div key={project.id} className="p-4 rounded-xl border transition-all duration-300 cursor-pointer group bg-gray-50/50 dark:bg-gray-800/20 border-osdag-border dark:border-gray-700 hover:bg-osdag-green/20 hover:border-osdag-green/20 dark:hover:bg-osdag-green/20 hover:shadow-sm hover:pb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {getProjectIcon()}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-item-text text-osdag-text-primary dark:text-white font-semibold">{project.name}</span>
                </div>
                <p className="text-subtitle text-osdag-text-secondary dark:text-gray-400 mb-2">
                  Last modified: {formatDate(project.updated_at)} · Created: {formatDate(project.created_at)}
                </p>
                <div className="flex flex-wrap gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300 max-h-0 group-hover:max-h-20 overflow-hidden">
                  <Button type="default" size="small" className="px-3 py-1.5 text-xs font-medium" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenProject(project); }}>Open Project</Button>
                  <Button type="default" size="small" disabled className="px-3 py-1.5 text-xs font-medium" icon={<FileTextOutlined />}>Generate Report</Button>
                  <Button type="default" size="small" className="px-3 py-1.5 text-xs font-medium" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownloadOsi(project); }}>Download OSI</Button>
                  <Popconfirm title="Are you sure you want to delete this project?" onConfirm={() => handleDeleteProject(project.id)} okText="Yes" cancelText="No">
                    <Button type="text" danger>Delete</Button>
                  </Popconfirm>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default ProjectsListCard;


