// Utility functions for module operations
import { getMenuShortcutLabel } from "../../../constants/shortcuts";

export const convertToCSV = (data) => {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const csvData = keys.map((key, index) => {
    const escapedValue = values[index].toString().replace(/"/g, '\"');
    return `"${key}","${escapedValue}"`;
  });
  return csvData.join("\n");
};

export const menuItems = [
  {
    label: "File",
    dropdown: [
      { name: "Create Project", shortcut: getMenuShortcutLabel("Create Project") },
      { name: "Load Input", shortcut: getMenuShortcutLabel("Load Input") },
      { name: "Download Osi" },
      // { name: "Download Input", shortcut: "Alt+D" },
      { name: "Save Log Messages" },
      { name: "Create Design Report", shortcut: getMenuShortcutLabel("Create Design Report") },
      {
        name: "Save 3D Model",
        shortcut: getMenuShortcutLabel("Save 3D Model"),
        options: ["Export BREP", "Export STL", "Export STEP", "Export IGS", "Export IFC"],
      },      
      { name: "Save Cad Image" },
      { name: "Quit" }
    ],
  },
  // {
  //  label: "Edit",
  //  dropdown: [{ name: "Design Preferences", shortcut: "Alt+P" }],
  // },
  {
    label: "Graphics",
    dropdown: [
      { name: "Zoom In", shortcut: getMenuShortcutLabel("Zoom In") },
      { name: "Zoom Out", shortcut: getMenuShortcutLabel("Zoom Out") },
      { name: "Pan" },
      { name: "Rotate 3D Model" },
      { name: "Show front view", shortcut: getMenuShortcutLabel("Show front view") },
      { name: "Show top view", shortcut: getMenuShortcutLabel("Show top view") },
      { name: "Show side view", shortcut: getMenuShortcutLabel("Show side view") },
      { name: "Model" },
      { name: "Beam" },
      { name: "Column" },
      { name: "Seated Angle" },
      { name: "Change Background" },
      { name: "Open Optimization Graph", shortcut: "Alt+G" }
    ],
  },
  {
    label: "Database",
    dropdown: [
      { name: "Download Inputs CSV" },
      { name: "Download Outputs CSV" },
      { name: "Download Inputs OSI" },
      { name: "Download Database", options: ["Column", "Beam", "Angle", "Channel"] },
      { name: "Reset", shortcut: getMenuShortcutLabel("Reset") },
    ],
  },
  {
    label: "Help",
    dropdown: [
      { name: "Video Tutorials" },
      { name: "Design Examples" },
      { name: "Ask us a question" },
      { name: "About Osdag" }
    ],
  },
];