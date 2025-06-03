export const createModuleConfig = (baseConfig) => {
  return {
    sessionName: baseConfig.sessionName,
    routePath: baseConfig.routePath,
    designType: baseConfig.designType,
    defaultInputs: { ...baseConfig.defaultInputs },
    modalConfig: [...baseConfig.modalConfig],
    selectionConfig: [...baseConfig.selectionConfig],
    validateInputs: baseConfig.validateInputs,
    buildSubmissionParams: baseConfig.buildSubmissionParams,
    inputSections: [...baseConfig.inputSections],
  };
};

export const mergeConfigs = (baseConfig, overrides) => {
  return {
    ...baseConfig,
    ...overrides,
    defaultInputs: { ...baseConfig.defaultInputs, ...overrides.defaultInputs },
    modalConfig: [...baseConfig.modalConfig, ...(overrides.modalConfig || [])],
    selectionConfig: [...baseConfig.selectionConfig, ...(overrides.selectionConfig || [])],
    inputSections: [...baseConfig.inputSections, ...(overrides.inputSections || [])],
  };
};

export const validateModuleConfig = (config) => {
  const requiredFields = [
    'sessionName',
    'routePath', 
    'designType',
    'defaultInputs',
    'modalConfig',
    'selectionConfig',
    'validateInputs',
    'buildSubmissionParams',
    'inputSections'
  ];

  const missing = requiredFields.filter(field => !config[field]);
  
  if (missing.length > 0) {
    throw new Error(`Module config missing required fields: ${missing.join(', ')}`);
  }

  return true;
};

export const menuItems = [
  {
    label: "File",
    dropdown: [
      { name: "Load Input", shortcut: "Ctrl+L" },
      { name: "Download Input", shortcut: "Ctrl+D" },
      { name: "Save Input", shortcut: "Alt+N" },
      { name: "Save Log Messages", shortcut: "Alt+M" },
      { name: "Create Design Report", shortcut: "Alt+C" },
      { name: "Save 3D Model", shortcut: "Alt+3" },
      { name: "Save Cad Image", shortcut: "Alt+1" },
    ],
  },
  {
    label: "Edit",
    dropdown: [{ name: "Design Preferences", shortcut: "Alt+P" }],
  },
  {
    label: "Graphics",
    dropdown: [
      { name: "Zoom In", shortcut: "Ctrl+I" },
      { name: "Zoom Out", shortcut: "Ctrl+O" },
      { name: "Pan", shortcut: "Ctrl+P" },
      { name: "Rotate 3D Model", shortcut: "Ctrl+R" },
      { name: "Model" },
      { name: "Beam" },
      { name: "Column" },
      { name: "FinePlate" },
      { name: "Change Background" },
    ],
  },
  {
    label: "Database",
    dropdown: [
      { name: "Downloads", options: ["Column", "Beam", "Angle", "Channel"] },
      { name: "Reset" },
    ],
  },
  {
    label: "Help",
    dropdown: [
      { name: "Video Tutorials" },
      { name: "Design Examples" },
      { name: "Ask us a question" },
      { name: "About Osdag" },
    ],
  },
];