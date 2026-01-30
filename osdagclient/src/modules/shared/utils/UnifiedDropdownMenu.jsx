/* eslint-disable react/prop-types */
import React from "react";
import { useRef, useState, useEffect } from "react";
import { useEngineeringService } from "../hooks/useEngineeringService";
import { MODULE_KEY_FIN_PLATE } from '../../../constants/DesignKeys';
import { message } from 'antd';
import { apiBase } from "../../../api";

// Module-specific configurations
const MODULE_CONFIGS = {
  [MODULE_KEY_FIN_PLATE]: {
    connectivityField: "Connectivity",
    connectivityMap: {
      "Column Flange-Beam-Web": "Column Flange-Beam Web",
      "Column Web-Beam-Web": "Column Web-Beam Web",
      "Beam-Beam": "Beam-Beam",
    },
    connectivityMapInverse: {
      "Column Flange-Beam Web": "Column Flange-Beam-Web",
      "Column Web-Beam Web": "Column Web-Beam-Web",
      "Beam-Beam": "Beam-Beam",
    },
    fields: {
      memberSupported: "Member.Supported_Section.Designation",
      memberSupporting: "Member.Supporting_Section.Designation",
      plateThickness: "Connector.Plate.Thickness_List",
      angleList: "Connector.Angle_List",
      topAngleList: "Connector.Top_Angle_List",
    },
    conditionalLogic: (selectedOption, inputs) => {
      const connectivity = MODULE_CONFIGS[MODULE_KEY_FIN_PLATE].connectivityMap[selectedOption];
      if (connectivity === "Column Flange-Beam Web" || connectivity === "Column Web-Beam Web") {
        return {
          memberSupported: inputs.beam_section,
          memberSupporting: inputs.column_section,
        };
      } else {
        return {
          memberSupported: inputs.secondary_beam,
          memberSupporting: inputs.primary_beam,
        };
      }
    }
  },
  "Beam-to-Beam End Plate Connection": {
    connectivityField: "Connectivity",
    endPlateField: "EndPlateType",
    connectivityMap: {
      "Flushed - Reversible Moment": "Flushed - Reversible Moment",
      "Extended One Way - Irreversible Moment": "Extended One Way - Irreversible Moment",
      "Extended Both Ways - Reversible Moment": "Extended Both Ways - Reversible Moment",
    },
    fields: {
      memberDesignation: "Member.Supported_Section.Designation",
      memberMaterial: "Member.Supported_Section.Material",
      plateThickness: "Connector.Plate.Thickness_List",
      weldFab: "Weld.Fab",
      weldMaterial: "Weld.Material_Grade_OverWrite",
      weldType: "Weld.Type",
    }
  },
  "Beam-to-Beam Cover Plate Bolted Connection": {
    fields: {
      memberDesignation: "Member.Designation",
      memberMaterial: "Member.Material",
      flangePreferences: "Connector.Flange_Plate.Preferences",
      flangePlateThickness: "Connector.Flange_Plate.Thickness_list",
      webPlateThickness: "Connector.Web_Plate.Thickness_List",
    }
  }
};

function UnifiedDropdownMenu({
  label,
  dropdown,
  setDesignPrefModalStatus,
  inputs,
  allSelected,
  setInputs,
  setAllSelected = () => { },
  logs,
  setCreateDesignReportBool,
  setSaveInputFileName,
  triggerScreenshotCapture,
  selectedOption = null,
  setSelectedOption = () => { },
  // Note: moduleType and currentProjectId are kept for potential future use but currently unused
  boltDiameterList = [],
  propertyClassList = [],
  thicknessList = [],
  angleList = [],
  topAngleList = [],
  cadModelPaths = null, // Add cadModelPaths to check if CAD model exists
}) {
  const service = useEngineeringService();
  const BASE_URL = `${apiBase}`;


  const [isOpen, setIsOpen] = useState(false);
  const parentRef = useRef(null);

  // Get module configuration based on module name from inputs
  const getModuleConfig = () => {
    const moduleName = inputs?.module;
    return MODULE_CONFIGS[moduleName] || {};
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const loadInput = () => {
    let element = document.createElement("input");
    element.setAttribute("type", "file");
    element.accept = ".osi,application/json";
    element.style.display = "none";
    parentRef.current.appendChild(element);
    element.click();

    element.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      
      // Handle user cancellation
      if (!file) {
        // User cancelled file selection - silently return (expected behavior)
        if (parentRef.current && element && parentRef.current.contains(element)) {
          parentRef.current.removeChild(element);
        }
        return;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${BASE_URL}api/open-osi/`, {
          method: 'POST',
          // headers: {
          //   'Authorization': `Bearer ${getAccessToken()}`,
          // },
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.success) {
          // data.inputs follows the backend schema — pass through
          setInputs(data.inputs || {});
          // reset flags conservatively
          setAllSelected({});
          message.success('Input loaded from OSI');
        } else {
          message.error(data.error || 'Failed to open OSI file');
        }
      } catch (err) {
        console.error('Error loading OSI file:', err);
        message.error('Failed to open OSI file');
      } finally {
        // Ensure we remove the temporary input element after handling the file
        if (parentRef.current && element && parentRef.current.contains(element)) {
          parentRef.current.removeChild(element);
        }
      }
    });
  };

  const buildContentString = () => {
    if (!inputs || typeof inputs !== 'object') {
      return "";
    }

    let content = "";
    const moduleConfig = getModuleConfig();
    const moduleName = inputs?.module || "";

    // Basic bolt and connector fields with null checks
    content += `Bolt.Bolt_Hole_Type: ${inputs?.bolt_hole_type || ""}\n`;
    content += `Bolt.Diameter:\n${formatArrayForText(
      allSelected?.bolt_diameter ? boltDiameterList : (inputs?.bolt_diameter || [])
    )}\n`;
    content += `Bolt.Grade:\n${formatArrayForText(
      allSelected?.bolt_grade ? propertyClassList : (inputs?.bolt_grade || [])
    )}\n`;
    content += `Bolt.Slip_Factor: ${inputs?.bolt_slip_factor || ""}\n`;
    content += `Bolt.TensionType: ${inputs?.bolt_tension_type || ""}\n`;
    content += `Bolt.Type: ${inputs?.bolt_type?.replaceAll("_", " ") || ""}\n`;

    // Module-specific connectivity handling
    if (moduleName === MODULE_KEY_FIN_PLATE) {
      content += `Connectivity: ${moduleConfig.connectivityMap[selectedOption]}\n`;
    } else if (moduleName === "Beam-to-Beam End Plate Connection") {
      content += `Connectivity *: ${inputs.connectivity}\n`;
      content += `EndPlateType: ${moduleConfig.connectivityMap[selectedOption]}\n`;
    }

    content += `Connector.Material: ${inputs?.connector_material || ""}\n`;
    content += `Design.Design_Method: ${inputs?.design_method || ""}\n`;
    content += `Detailing.Corrosive_Influences: ${inputs?.detailing_corr_status || ""}\n`;
    content += `Detailing.Edge_type: ${inputs?.detailing_edge_type || ""}\n`;
    content += `Detailing.Gap: ${inputs?.detailing_gap || ""}\n`;
    content += `Load.Axial: ${inputs?.load_axial || ""}\n`;
    content += `Load.Shear: ${inputs?.load_shear || ""}\n`;

    if (inputs?.load_moment !== undefined) {
      content += `Load.Moment: ${inputs.load_moment || ""}\n`;
    }

    content += `Material: ${inputs?.material || inputs?.connector_material || ""}\n`;
    content += `Module: ${inputs?.module || ""}\n`;

    // Module-specific member designation handling with null checks
    if (moduleName === MODULE_KEY_FIN_PLATE && moduleConfig.conditionalLogic) {
      try {
        const memberData = moduleConfig.conditionalLogic(selectedOption, inputs);
        content += `Member.Supported_Section.Designation: ${memberData?.memberSupported || ""}\n`;
        content += `Member.Supported_Section.Material: ${inputs?.supported_material || ""}\n`;
        content += `Member.Supporting_Section.Designation: ${memberData?.memberSupporting || ""}\n`;
        content += `Member.Supporting_Section.Material: ${inputs?.supporting_material || ""}\n`;
      } catch (e) {
        // Skip if conditionalLogic fails
      }
    } else if (moduleName === "Beam-to-Beam End Plate Connection") {
      content += `Member.Supported_Section.Designation: ${inputs?.supported_designation || ""}\n`;
      content += `Member.Supported_Section.Material: ${inputs?.supported_material || ""}\n`;
    } else if (moduleName === "Beam-to-Beam Cover Plate Bolted Connection") {
      content += `Member.Designation: ${inputs?.member_designation || ""}\n`;
      content += `Member.Material: ${inputs?.member_material || ""}\n`;
      content += `Connector.Flange_Plate.Preferences: ${inputs?.flange_plate_preferences || ""}\n`;
    }

    // Weld information (not for cover plate bolted)
    if (moduleName !== "Beam-to-Beam Cover Plate Bolted Connection") {
      content += `Weld.Fab: ${inputs?.weld_fab || ""}\n`;
      content += `Weld.Material_Grade_OverWrite: ${inputs?.weld_material_grade || ""}\n`;
      if (inputs?.weld_type) {
        content += `Weld.Type: ${inputs.weld_type}\n`;
      }
    }

    // Thickness lists based on module with null checks
    if (inputs?.plate_thickness) {
      content += `Connector.Plate.Thickness_List:\n${formatArrayForText(
        allSelected?.plate_thickness ? thicknessList : inputs.plate_thickness
      )}\n`;
    }
    if (inputs?.flange_plate_thickness) {
      content += `Connector.Flange_Plate.Thickness_list:\n${formatArrayForText(
        allSelected?.flange_plate_thickness ? thicknessList : inputs.flange_plate_thickness
      )}\n`;
    }
    if (inputs?.web_plate_thickness) {
      content += `Connector.Web_Plate.Thickness_List:\n${formatArrayForText(
        allSelected?.web_plate_thickness ? thicknessList : inputs.web_plate_thickness
      )}\n`;
    }
    if (inputs?.angle_list) {
      content += `Connector.Angle_List:\n${formatArrayForText(
        allSelected?.angle_list ? angleList : inputs.angle_list
      )}\n`;
    }
    if (inputs?.topangle_list) {
      content += `Connector.Top_Angle_List:\n${formatArrayForText(
        allSelected?.topangle_list ? (topAngleList || angleList) : inputs.topangle_list
      )}\n`;
    }

    return content;
  };

  const downloadInput = () => {
    const content = buildContentString();
    let element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:application/json;charset=utf-8," + encodeURIComponent(content)
    );
    element.setAttribute("download", "input_osdag.osi");
    element.style.display = "none";
    parentRef.current.appendChild(element);
    element.click();
    parentRef.current.removeChild(element);
  };

  // Expand inputs for any multi-selects where "All" is selected so arrays are populated
  const expandAllSelectedInputs = (baseInputs) => {
    const keyToFullListMap = {
      bolt_diameter: boltDiameterList,
      bolt_grade: propertyClassList,
      plate_thickness: thicknessList,
      flange_plate_thickness: thicknessList,
      web_plate_thickness: thicknessList,
      angle_list: angleList,
      topangle_list: topAngleList || angleList,
      cleat_section: angleList,
    };
    const expanded = { ...baseInputs };
    Object.keys(keyToFullListMap).forEach((inputKey) => {
      if (allSelected?.[inputKey]) {
        const fullList = keyToFullListMap[inputKey] || [];
        // Normalize values to strings like the UI does
        expanded[inputKey] = Array.isArray(fullList)
          ? fullList.map((val) => {
            if (typeof val === 'object' && val !== null) {
              return val.value || val.Grade || String(val);
            }
            return String(val);
          })
          : [];
      }
    });
    return expanded;
  };

  const saveInput = async () => {
    // Validate inputs exists and is an object
    if (!inputs || typeof inputs !== 'object') {
      message.error('No inputs to save');
      return;
    }

    // Expand inputs for multi-select "All" selections
    const inputsForSave = expandAllSelectedInputs(inputs);

    // Determine module_id and projectName with defaults
    const module_id = inputs?.module || MODULE_KEY_FIN_PLATE;
    const projectName = inputs?.project_name || inputs?.name || 'project';

    try {
      // Call service to generate OSI file (inline=false for local download, no auth required)
      const result = await service.saveOSIFromInputs(projectName, module_id, inputsForSave, false);
      
      if (result.success && result.content_base64) {
        try {
          // Convert base64 to blob and download
          const binaryString = atob(result.content_base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = result.filename || `${projectName}.osi`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          message.success('OSI file downloaded successfully');
          setIsOpen(false);
        } catch (err) {
          console.error('Error downloading OSI file:', err);
          message.error('Failed to download OSI file');
        }
      } else {
        message.error(result.error || 'Failed to save OSI');
      }
    } catch (err) {
      console.error('Error saving inputs:', err);
      message.error('Failed to save OSI');
    }
  };

  const saveLogMessages = () => {
    if (!logs || logs.length === 0) {
      message.warning("No logs to save.");
      return;
    }

    const logsArr = [];

    for (const log of logs) {
      if (!log) continue;

      // Support multiple log shapes:
      // 1) Plain string logs
      // 2) Objects from CustomLogger: { message, type, timestamp }
      // 3) Legacy objects: { msg, type }
      if (typeof log === "string") {
        logsArr.push(log);
        continue;
      }

      const message = log.message ?? log.msg ?? "";
      const level = (log.type || log.level || "INFO").toString().toUpperCase();
      const timestamp = log.timestamp || "";

      if (!message) continue;

      // Format similar to previous desktop logs:
      // [INFO] === End Of Design === 2026-01-30 09:56:00
      const formatted = `[${level}] ${message}${timestamp ? ` ${timestamp}` : ""}`;
      logsArr.push(formatted);
    }

    const content = logsArr.join("\n");
    let element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(content)
    );
    element.setAttribute("download", "logs_osdag.txt");
    element.style.display = "none";
    parentRef.current.appendChild(element);
    element.click();
    parentRef.current.removeChild(element);
    message.success('Log file downloaded successfully');
  };

  const handleClick = (option) => {
    switch (option.name) {
      case "Load Input":
        loadInput();
        break;
      // case "Download Input":
      //   downloadInput();
      //   break;
      case "Save Input":
        saveInput();
        break;
      case "Save Log Messages":
        saveLogMessages();
        break;
      // case "Create Design Report":
      //   setCreateDesignReportBool(true);
      //   break;
      case "Save 3D Model":
        (async () => {
          // Check if CAD model exists
          if (!cadModelPaths || Object.keys(cadModelPaths).length === 0) {
            message.warning('No 3D model available. Please run a design calculation first to generate the CAD model.');
            return;
          }

          // Get available sections from cadModelPaths
          const availableSections = Object.keys(cadModelPaths).filter(key => cadModelPaths[key]);
          
          if (availableSections.length === 0) {
            message.warning('No CAD model sections available to download.');
            return;
          }

          // Check browser support for showSaveFilePicker
          if (!window.showSaveFilePicker) {
            message.error('File picker not supported in this browser. Please use a modern browser like Chrome or Edge.');
            return;
          }

          try {
            // Download all available sections as STL files
            // The base64 data in cadModelPaths is STL format
            for (const section of availableSections) {
              const base64Data = cadModelPaths[section];
              if (!base64Data) {
                console.warn(`No data available for section: ${section}`);
                continue;
              }

              try {
                // Base64 data might be prefixed with data URL, strip it if present
                const base64String = typeof base64Data === 'string' && base64Data.includes(',') 
                  ? base64Data.split(',')[1] 
                  : base64Data;
                
                const binaryString = atob(base64String);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                
                const blob = new Blob([bytes], { type: 'application/octet-stream' });
                
                // Create download link for each section
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${section.toLowerCase()}_model.stl`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                // Small delay between downloads to avoid browser blocking
                if (availableSections.indexOf(section) < availableSections.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 300));
                }
              } catch (decodeError) {
                console.error(`Error decoding base64 data for ${section}:`, decodeError);
                message.error(`Failed to decode CAD model data for ${section}: ${decodeError.message}`);
              }
            }
            
            message.success(`Downloaded ${availableSections.length} CAD model file(s): ${availableSections.join(', ')}`);
          } catch (error) {
            console.error('Save 3D model error:', error);
            message.error(`Failed to save 3D model: ${error.message || 'Unknown error'}`);
          }
        })();
        break;
      case "Save Cad Image":
        triggerScreenshotCapture();
        break;
      case "Design Preferences":
        setDesignPrefModalStatus(true);
        break;
      default:
        // Default value - ensure inputs is an object before spreading
        setInputs({
          ...(inputs || {}),
          // [inputKey]: option.name,
          graphicsOption: option.name,
        });
        break;
    }
  };

  // UTILITY FUNCTIONS
  const formatArrayForText = (arr) => {
    if (!arr || arr.length === 0) return "";
    let text = "";
    for (let i = 0; i < arr.length; i++) {
      if (i !== arr.length - 1) text += `- '${arr[i]}'\n`;
      else text += `- '${arr[i]}'`;
    }
    return text;
  };

  const getFormatedArrayFields = (arr, index) => {
    let res = [];
    for (let i = index + 1; i < arr.length; i++) {
      const line = arr[i].trim();
      if (!line.startsWith("-")) break;

      const match = line.match(/'([^']+)'/);
      if (match) {
        res.push(match[1]);
      }
    }
    return res;
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (parentRef.current && !parentRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("click", handleOutsideClick);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  return (
    <div className="relative flex justify-center items-center hover:bg-[#91b014] hover:text-white p-1" ref={parentRef}>
      <div
        className="font-medium  cursor-pointer"
        onClick={handleToggle}
      >
        {label}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 bg-white border border-[#ccc] border-t-0 min-w-[350px] z-[1]">
          {dropdown.map((option, index) => (
            <div
              className="flex w-full justify-between text-sm text-black hover:text-white hover:bg-osdag-green cursor-pointer p-1"
              key={index}
              onClick={() => handleClick(option)}
            >
              {option.name}
              {option.shortcut && (
                <span className="shortcut">{option.shortcut}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

  );
}

export default UnifiedDropdownMenu;
