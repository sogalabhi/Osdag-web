import React from 'react';
import { Button, message } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { MODULE_ROUTES } from '../../constants/modules';
import { getProjectById } from "../../datasources/projectsDataSource";
import { saveOsiFromInputs } from "../../datasources/osiDataSource";
import { getModuleRoute } from "../../constants/moduleRoutes";


const ProjectActionButtons = ({
  project,
  onActionComplete,
  showDelete = false,
  onDelete,
  onGenerateReport,
}) => {
  const navigate = useNavigate();

  const handleOpenProject = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const route = MODULE_ROUTES[project.routeKey] || getModuleRoute(project.module_id);
    if (route) {
      navigate(`${route}/${project.id}`);
      if (onActionComplete) onActionComplete();
    } else {
      message.error('Module route not found');
    }
  };

  const handleGenerateReport = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onGenerateReport) {
      onGenerateReport(project);
      return;
    }
    const route = MODULE_ROUTES[project.routeKey] || getModuleRoute(project.module_id);
    if (route) {
      navigate(`${route}/${project.id}?action=report`);
      if (onActionComplete) onActionComplete();
    } else {
      message.error('Module route not found');
    }
  };

  const handleDownloadOsi = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const detailRes = await getProjectById(project.id);
      if (!detailRes.success) {
        message.error('Failed to load project');
        return;
      }
      const projectDetail = detailRes.project;
      const inputs = projectDetail?.inputs_json || {};
      const module_id = projectDetail?.submodule || projectDetail?.module || project.module_id;
      const data = await saveOsiFromInputs({ name: project.name, moduleId: module_id, inputs, inline: true });
      if (!data.success || !data.content_base64) {
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

  return (
    <>
      <Button type="default" size="small" className="px-3 py-1.5 text-xs font-medium" onClick={handleOpenProject}>
        Open Project
      </Button>
      <Button type="default" size="small" className="px-3 py-1.5 text-xs font-medium" icon={<FileTextOutlined />} onClick={handleGenerateReport}>
        Generate Report
      </Button>
      <Button type="default" size="small" className="px-3 py-1.5 text-xs font-medium" onClick={handleDownloadOsi}>
        Download OSI
      </Button>
    </>
  );
};

export default ProjectActionButtons;
