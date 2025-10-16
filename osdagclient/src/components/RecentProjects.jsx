import React from 'react';
import { Button, Popconfirm, message, Spin, Empty } from 'antd';
import { EyeOutlined, DeleteOutlined, ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { isGuestUser, getCurrentUserEmail } from '../utils/auth';
import { MODULE_KEY_FIN_PLATE, MODULE_DISPLAY_FIN_PLATE } from '../constants/DesignKeys';

const RecentProjects = ({ projects: projectsProp = [], loading: loadingProp = false, onDeleteProject }) => {
  const [projects, setProjects] = React.useState(projectsProp);
  const [loading, setLoading] = React.useState(loadingProp);
  const [deletingProject, setDeletingProject] = React.useState(null);
  const navigate = useNavigate();

  const BASE_URL = 'http://localhost:8000/api/';
  const SERVER_ROOT = BASE_URL.replace(/api\/?$/, '');

  const getAccessToken = () => {
    return (
      localStorage.getItem('access') ||
      localStorage.getItem('token') ||
      ''
    );
  };

  // Check if user is a guest
  const isGuest = isGuestUser();
  const userEmail = getCurrentUserEmail();

  React.useEffect(() => {
    if (isGuest) {
      setProjects([]);
      setLoading(false);
      return;
    }
    // If parent did not pass projects, fetch from API
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
        } catch (e) {
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
    if (onDeleteProject) {
      await onDeleteProject(projectId);
    }
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
        // Store project data in localStorage for the module to use
        localStorage.setItem('currentProject', JSON.stringify(data.project));

        // Navigate to the appropriate module with project name in URL
        const moduleRoutes = {
          // Short keys from SelectModulePage
          'fp': '/design/connections/shear/fin_plate',
          'ca': '/design/connections/shear/cleat_angle',
          'ep': '/design/connections/shear/end_plate',
          'sa': '/design/connections/shear/seatAngle',
          'cpb': '/design/connections/beam-to-beam-splice/cover_plate_bolted',
          'cpw': '/design/connections/beam-to-beam-splice/cover_plate_welded',
          'boltedtoendplate': '/design/tension-member/bolted_to_end_gusset',
          'ssb': '/design/FlexureMember/simply_supported_beam',
          // Legacy full names (keep for backward compatibility)
          [MODULE_KEY_FIN_PLATE]: '/design/connections/shear/fin_plate',
          'End-Plate-Connection': '/design/connections/shear/end_plate',
          'Cleat-Angle-Connection': '/design/connections/shear/cleat_angle',
          'Seated-Angle-Connection': '/design/connections/shear/seatAngle',
          'Cover-Plate-Bolted-Connection': '/design/connections/beam-to-beam-splice/cover_plate_bolted',
          'Cover-Plate-Welded-Connection': '/design/connections/beam-to-beam-splice/cover_plate_welded',
          'Beam-Beam-End-Plate-Connection': '/design/connections/beam-to-beam-splice/end_plate',
          'Beam-to-Column-End-Plate-Connection': '/design/connections/column-beam/end_plate',
          'Tension-Member-Bolted-Design': '/design/tension-member/bolted_to_end_gusset',
          'Simply-Supported-Beam': '/design/FlexureMember/simply_supported_beam'
        };

        const route = moduleRoutes[project.module_id];
        if (route) {
          // Navigate with project name in URL
          const projectNameForUrl = encodeURIComponent(project.name);
          navigate(`${route}/${projectNameForUrl}`);
        } else {
          message.error('Module route not found');
        }
      } else {
        message.error(data.error || 'Failed to load project');
      }
    } catch (error) {
      message.error('Failed to load project');
    }
  };

  const handleDownloadOsi = (project) => {
    try {
      const filePath = project.osi_file_path || '';
      const fileName = filePath.split('\\').pop().split('/').pop();
      if (!fileName) {
        message.error('No OSI file available');
        return;
      }
      const downloadUrl = `${SERVER_ROOT}user/obtain-input-file/?filename=${encodeURIComponent(fileName)}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      message.error('Failed to download OSI');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();

    // Strip time components for accurate whole day difference
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffTime = nowOnly - dateOnly;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getModuleDisplayName = (moduleId) => {
    const moduleNames = {
      // Short keys from SelectModulePage
      'fp': 'FinPlateConnection',
      'ca': 'Cleat Angle Connection',
      'ep': 'End Plate Connection',
      'sa': 'Seated Angle Connection',
      'cpb': 'Cover Plate Bolted',
      'cpw': 'Cover Plate Welded',
      'boltedtoendplate': 'Tension Member Bolted',
      'ssb': 'Simply Supported Beam',
      // Legacy full names (keep for backward compatibility)
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
  };

  const getProjectIcon = () => {
    return (
      <div className="w-8 h-8 bg-osdag-green/10 rounded-lg flex items-center justify-center">
        <span className="text-osdag-green font-semibold text-sm">L</span>
      </div>
    );
  };

  if (isGuest) {
    return (
      <div className="h-[400px] flex items-center justify-center text-center p-10 dark:text-white bg-white/50 dark:bg-white/70">
        <div className="text-lg max-w-xl mx-auto dark:text-black gap-y-10 ">
          <h1 className="text-4xl font-bold mb-4 dark:text-black">Guest Mode</h1>
          <p className="pb-4">
            Projects are not available in guest mode. Please sign up or log in to save and manage your projects.
          </p>
          <Link to="/" className="text-white mt-10 bg-osdag-green px-4 py-2 rounded-md">Login</Link>
        </div>

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
      <div className="text-center p-10  dark:text-white">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No recent projects"
        >
          <p className="text-gray-600 mb-4">
            Start designing to see your projects here
          </p>
        </Empty>
      </div>
    );
  }

  return (
    <div className=" dark:text-white rounded-2xl shadow-card hover:shadow-card-hover transition-shadow duration-200">
      <div className="p-6 border-b border-osdag-border dark:border-gray-700">
        <h2 className="text-card-title text-osdag-text-primary dark:text-white flex items-center">
          <ClockCircleOutlined className="mr-2" />
          Recent Projects
        </h2>
      </div>

      <div className="h-card-content overflow-y-auto scrollbar-thin">
        <div className="p-6 space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-4 rounded-xl border transition-all duration-300 cursor-pointer group bg-gray-50/50 dark:bg-gray-800/20 border-osdag-border dark:border-gray-700 hover:bg-osdag-green/20 hover:border-osdag-green/20 dark:hover:bg-osdag-green/20 hover:shadow-sm hover:pb-8"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getProjectIcon()}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-item-text text-osdag-text-primary dark:text-white font-semibold">
                        {project.name}
                      </span>
                    </div>

                    <p className="text-subtitle text-osdag-text-secondary dark:text-gray-400 mb-2">
                      Last modified: {formatDate(project.updated_at)} · Created: {new Date(project.created_at).toLocaleDateString()}
                    </p>

                    {/* Action buttons - show on hover */}
                    <div className="flex flex-wrap gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300 max-h-0 group-hover:max-h-20 overflow-hidden">
                      <Button
                        type="default"
                        size="small"
                        className="px-3 py-1.5 text-xs font-medium"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenProject(project);
                        }}
                      >
                        Open Project
                      </Button>
                      <Button
                        type="default"
                        size="small"
                        disabled
                        className="px-3 py-1.5 text-xs font-medium"
                        icon={<FileTextOutlined />}
                      >
                        Generate Report
                      </Button>
                      <Button
                        type="default"
                        size="small"
                        className="px-3 py-1.5 text-xs font-medium"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDownloadOsi(project);
                        }}
                      >
                        Download OSI
                      </Button>
                      <Popconfirm
                        title="Are you sure you want to delete this project?"
                        onConfirm={() => handleDeleteProject(project.id)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button
                          type="text"
                          icon={<DeleteOutlined />}
                          loading={deletingProject === project.id}
                          danger
                        >
                          Delete
                        </Button>
                      </Popconfirm>
                    </div>
                  </div>
                </div>
                <span className="text-subtitle text-osdag-text-muted dark:text-gray-500 ml-4 flex-shrink-0">
                  {formatDate(project.updated_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecentProjects; 