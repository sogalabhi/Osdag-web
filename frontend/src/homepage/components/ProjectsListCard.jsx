import React from 'react';
import { Button, Popconfirm, message, Spin, Empty } from 'antd';
import { DesignReportModal } from '../../modules/shared/components/DesignReportModal';
import { finPlateConfig } from '../../modules/shearConnection/finPlate/configs/finPlateConfig';
import { endPlateConfig } from '../../modules/shearConnection/endPlate/configs/endPlateConfig';
import { cleatAngleConfig } from '../../modules/shearConnection/cleatAngle/configs/cleatAngleConfig';
import { seatedAngleConfig } from '../../modules/shearConnection/seatAngle/configs/seatedAngleConfig';
import { coverPlateBoltedConfig } from '../../modules/coverPlateBolted/configs/coverPlateBoltedConfig';
import { coverPlateWeldedConfig } from '../../modules/coverPlateWelded/configs/coverPlateWeldedConfig';
import { beamBeamEndPlateConfig } from '../../modules/beamBeamEndPlate/configs/beamBeamEndPlateConfig';
import { beamToColumnEndPlateConfig } from '../../modules/beamToColumnEndPlate/configs/beamToColumnEndPlateConfig';
import { boltedToEndConfig } from '../../modules/TensionMembers/BoltedToEnd/configs/boltedToEndConfig';
import { simplySupportedBeamConfig } from '../../modules/flexuralMember/simplySupportedBeam/configs/simplySupportedBeamConfig';
import { purlinConfig } from '../../modules/flexuralMember/purlin/configs/purlinConfig';
import { onCantileverConfig } from '../../modules/flexuralMember/onCantilever/configs/onCantileverConfig';
import { lapJointWeldedConfig } from '../../modules/SimpleConnection/LapJointWelded/config/lapJointWeldedConfig';
import { lapJointBoltedConfig } from '../../modules/SimpleConnection/LapJointBolted/config/lapJointBoltedConfig';
import { buttJointWeldedConfig } from '../../modules/SimpleConnection/ButtJointWelded/config/buttJointWeldedConfig';
import { buttJointBoltedConfig } from '../../modules/SimpleConnection/ButtJointBolted/config/buttJointBoltedConfig';
import { ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { isGuestUser, getCurrentUserEmail } from '../../utils/auth';
import {
  MODULE_KEY_FIN_PLATE,
  MODULE_KEY_CLEAT_ANGLE,
  MODULE_KEY_END_PLATE,
  MODULE_KEY_SEAT_ANGLE,
  MODULE_KEY_BEAM_TO_BEAM_COVER_PLATE_BOLTED,
  MODULE_KEY_BEAM_TO_BEAM_COVER_PLATE_WELDED,
  MODULE_KEY_COVER_PLATE_BOLTED,
  MODULE_KEY_COVER_PLATE_WELDED,
  MODULE_KEY_BEAM_BEAM_END_PLATE_ALT,
  MODULE_KEY_BEAM_COLUMN_END_PLATE_ALT,
  MODULE_KEY_TENSION_BOLTED,
  MODULE_KEY_TENSION_WELDED,
  MODULE_KEY_SIMPLY_SUPPORTED_BEAM,
  MODULE_KEY_PURLIN,
  MODULE_KEY_ON_CANTILEVER_BEAM,
  MODULE_KEY_LAP_JOINT_WELDED,
  MODULE_KEY_LAP_JOINT_BOLTED,
  MODULE_KEY_BUTT_JOINT_WELDED,
  MODULE_KEY_BUTT_JOINT_BOLTED,
} from '../../constants/DesignKeys';
import { getProjectById } from "../../datasources/projectsDataSource";
import { saveOsiFromInputs } from "../../datasources/osiDataSource";
import { getModuleRoute } from "../../constants/moduleRoutes";
import ProjectActionButtons from './ProjectActionButtons';
import { normalizeModuleKey } from '../../constants/modules';

const normalizeModuleId = normalizeModuleKey;

const ProjectsListCard = ({ projects: projectsProp = [], loading: loadingProp = false, onDeleteProject }) => {
  const [projects, setProjects] = React.useState(projectsProp);
  const [loading, setLoading] = React.useState(loadingProp);
  const [deletingProject, setDeletingProject] = React.useState(null);
  const [reportProject, setReportProject] = React.useState(null);
  const [reportModalOpen, setReportModalOpen] = React.useState(false);
  const [designReportInputs, setDesignReportInputs] = React.useState({
    companyName: "Your company",
    groupTeamName: "Your team",
    designer: "You",
    projectTitle: "",
    subtitle: "",
    jobNumber: "1",
    client: "Someone else",
    additionalComments: "No comments",
    companyLogo: null,
    companyLogoName: "",
  });
  const [reportInputValues, setReportInputValues] = React.useState({});
  const [reportModuleId, setReportModuleId] = React.useState(null);
  const [reportModuleConfig, setReportModuleConfig] = React.useState(null);
  const [reportAllSelected, setReportAllSelected] = React.useState({});
  const [reportExtraState, setReportExtraState] = React.useState({});
  const navigate = useNavigate();

  const isGuest = isGuestUser();
  const userEmail = getCurrentUserEmail();

  React.useEffect(() => {
    if (isGuest) {
      setProjects([]);
      setLoading(false);
      return;
    }
    // If parent didn't provide projects, rely on MainContent's datasource-driven list
    if (projectsProp && projectsProp.length > 0) {
      setProjects(projectsProp);
      setLoading(loadingProp);
    } else {
      // No projects passed in and user is not guest: show empty state
      setProjects([]);
      setLoading(false);
    }
  }, [isGuest, projectsProp, loadingProp]);

  const handleDeleteProject = async (projectId) => {
    setDeletingProject(projectId);
    if (onDeleteProject) await onDeleteProject(projectId);
    setDeletingProject(null);
  };

  const handleGenerateReportClick = async (project) => {
    try {
      const detail = await fetchProjectDetail(project.id);
      setReportProject(project);
      setReportInputValues(detail?.inputs_json || {});
      const rawModId = detail?.submodule || detail?.module || MODULE_KEY_FIN_PLATE;
      const modId = normalizeModuleId(rawModId);
      setReportModuleId(modId);
      // Resolve moduleConfig to reuse DesignReportModal logic
      const resolver = {
        [MODULE_KEY_FIN_PLATE]: finPlateConfig,
        [MODULE_KEY_END_PLATE]: endPlateConfig,
        [MODULE_KEY_CLEAT_ANGLE]: cleatAngleConfig,
        [MODULE_KEY_SEAT_ANGLE]: seatedAngleConfig,
        [MODULE_KEY_BEAM_TO_BEAM_COVER_PLATE_BOLTED]: coverPlateBoltedConfig,
        [MODULE_KEY_BEAM_TO_BEAM_COVER_PLATE_WELDED]: coverPlateWeldedConfig,
        [MODULE_KEY_BEAM_BEAM_END_PLATE_ALT]: beamBeamEndPlateConfig,
        [MODULE_KEY_BEAM_COLUMN_END_PLATE_ALT]: beamToColumnEndPlateConfig,
        [MODULE_KEY_TENSION_BOLTED]: boltedToEndConfig,
        [MODULE_KEY_SIMPLY_SUPPORTED_BEAM]: simplySupportedBeamConfig,
        [MODULE_KEY_PURLIN]: purlinConfig,
        [MODULE_KEY_ON_CANTILEVER_BEAM]: onCantileverConfig,
        [MODULE_KEY_LAP_JOINT_WELDED]: lapJointWeldedConfig,
        [MODULE_KEY_LAP_JOINT_BOLTED]: lapJointBoltedConfig,
        [MODULE_KEY_BUTT_JOINT_WELDED]: buttJointWeldedConfig,
        [MODULE_KEY_BUTT_JOINT_BOLTED]: buttJointBoltedConfig,
      };
      const cfg = resolver[modId] || null;
      setReportModuleConfig(cfg);
      // allSelected: set all to false so saved arrays are used as-is
      if (cfg && Array.isArray(cfg.selectionConfig)) {
        const initSel = cfg.selectionConfig.reduce((acc, s) => { acc[s.inputKey] = false; return acc; }, {});
        setReportAllSelected(initSel);
      } else {
        setReportAllSelected({});
      }
      // extraState: carry connectivity for FinPlate (or default)
      const defaultConnectivity = 'Column Flange-Beam-Web';
      const selectedOption = (detail?.inputs_json && detail.inputs_json.connectivity) || defaultConnectivity;
      setReportExtraState({ selectedOption });
      setReportModalOpen(true);
    } catch (e) {
      message.error(e.message || 'Failed to load project');
    }
  };

  const fetchProjectDetail = async (projectId) => {
    const data = await getProjectById(projectId);
    if (!data.success) throw new Error(data.error || 'Failed to load project');
    return data.project;
  };

  const handleOpenProject = async (project) => {
    try {
      const data = await getProjectById(project.id);
      if (data.success) {
        const route = getModuleRoute(project.submodule);
        if (route) {
          navigate(`${route}/${project.id}`);
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
      const detailRes = await getProjectById(project.id);
      if (!detailRes.success) {
        message.error('Failed to load project');
        return;
      }
      const projectDetail = detailRes.project;
      const inputs = projectDetail?.inputs_json || {};
      const rawModuleId = projectDetail?.submodule || projectDetail?.module || MODULE_KEY_FIN_PLATE;
      const module_id = normalizeModuleId(rawModuleId);

      const resolver = {
        [MODULE_KEY_FIN_PLATE]: finPlateConfig,
        [MODULE_KEY_END_PLATE]: endPlateConfig,
        [MODULE_KEY_CLEAT_ANGLE]: cleatAngleConfig,
        [MODULE_KEY_SEAT_ANGLE]: seatedAngleConfig,
        [MODULE_KEY_BEAM_TO_BEAM_COVER_PLATE_BOLTED]: coverPlateBoltedConfig,
        [MODULE_KEY_BEAM_TO_BEAM_COVER_PLATE_WELDED]: coverPlateWeldedConfig,
        [MODULE_KEY_BEAM_BEAM_END_PLATE_ALT]: beamBeamEndPlateConfig,
        [MODULE_KEY_BEAM_COLUMN_END_PLATE_ALT]: beamToColumnEndPlateConfig,
        [MODULE_KEY_TENSION_BOLTED]: boltedToEndConfig,
        [MODULE_KEY_SIMPLY_SUPPORTED_BEAM]: simplySupportedBeamConfig,
        [MODULE_KEY_PURLIN]: purlinConfig,
        [MODULE_KEY_ON_CANTILEVER_BEAM]: onCantileverConfig,
        [MODULE_KEY_LAP_JOINT_WELDED]: lapJointWeldedConfig,
        [MODULE_KEY_LAP_JOINT_BOLTED]: lapJointBoltedConfig,
        [MODULE_KEY_BUTT_JOINT_WELDED]: buttJointWeldedConfig,
        [MODULE_KEY_BUTT_JOINT_BOLTED]: buttJointBoltedConfig,
      };
      const cfg = resolver[module_id] || null;

      const isNested = (inputs.dock || inputs.pref) || (inputs.inputs && (inputs.inputs.dock || inputs.inputs.pref));
      const dock = isNested ? (inputs.dock || inputs.inputs?.dock || {}) : inputs;
      const pref = isNested ? (inputs.pref || inputs.inputs?.pref || {}) : {};

      let flatInputs = {};
      if (cfg && typeof cfg.buildSubmissionParams === "function") {
        try {
          flatInputs = cfg.buildSubmissionParams(
            dock,
            {},
            {},
            { selectedOption: dock.connectivity }
          ) || {};
        } catch (e) {
          flatInputs = { ...dock };
        }
      } else {
        flatInputs = { ...dock };
      }

      Object.entries(pref).forEach(([key, val]) => {
        flatInputs[`Pref.${key}`] = val;
      });

      const data = await saveOsiFromInputs({
        name: project.name,
        moduleId: module_id,
        inputs: flatInputs,
        inline: true,
      });
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
                  <ProjectActionButtons
                    project={project}
                    onGenerateReport={handleGenerateReportClick}
                  />
                  <Popconfirm title="Are you sure you want to delete this project?" onConfirm={() => handleDeleteProject(project.id)} okText="Yes" cancelText="No">
                    <Button type="text" danger>Delete</Button>
                  </Popconfirm>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      <DesignReportModal
        isOpen={reportModalOpen}
        onCancel={() => { setReportModalOpen(false); setReportProject(null); }}
        onOk={() => { setReportModalOpen(false); setReportProject(null); }}
        designReportInputs={designReportInputs}
        setDesignReportInputs={setDesignReportInputs}
        output={{}} /* truthy to satisfy modal precondition */
        moduleId={reportModuleId}
        inputValues={reportInputValues}
        logs={[]}
        moduleConfig={reportModuleConfig}
        allSelected={reportAllSelected}
        extraState={reportExtraState}
      />
    </>
  );
};

export default ProjectsListCard;


