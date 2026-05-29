import { getModuleKeyMap } from "./osiMapperTracer";

/**
 * Normalizes flat OSI key-value dictionary into nested JSON format
 * e.g. { inputs: { dock: {...}, pref: {...} } }
 */
export function normalizeOsiPayload(flatObj, moduleConfig = null) {
  if (!flatObj || typeof flatObj !== "object") {
    return { dock: {}, pref: {} };
  }

  // If already nested under dock/pref, return it as-is
  if (flatObj.dock || flatObj.pref) {
    return {
      dock: flatObj.dock || {},
      pref: flatObj.pref || {}
    };
  }
  if (flatObj.inputs && (flatObj.inputs.dock || flatObj.inputs.pref)) {
    return {
      dock: flatObj.inputs.dock || {},
      pref: flatObj.inputs.pref || {}
    };
  }

  const keyMap = getModuleKeyMap(moduleConfig);
  const dock = {};
  const pref = {};

  Object.entries(flatObj).forEach(([key, value]) => {
    // 1. Group Pref. fields
    if (key.startsWith("Pref.")) {
      const prefKey = key.substring(5);
      pref[prefKey] = value;
    }
    // 2. Map via tracer keyMap
    else if (keyMap[key]) {
      dock[keyMap[key]] = value;
    }
    // 3. Fallback: string clean mapping
    else {
      // e.g. "Bolt.Bolt_Hole_Type" -> "bolt_hole_type"
      // Remove common prefix categories
      const cleanKey = key
        .replace(/^(Bolt|Connector|Design|Detailing|Load|Member|Weld)\./, "")
        .replace(/\./g, "_")
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .toLowerCase();
      
      // If moduleConfig.defaultInputs has it, map it
      if (moduleConfig?.defaultInputs && cleanKey in moduleConfig.defaultInputs) {
        dock[cleanKey] = value;
      } else {
        dock[cleanKey] = value;
      }
    }
  });

  // Handle Connectivity wildcard mapping
  const connectivity = flatObj["Connectivity *"] || flatObj["Connectivity"];
  if (connectivity) {
    dock.connectivity = String(connectivity).trim();
  }

  // Handle common designation sectional aliases
  const supportingDesc = flatObj["Member.Supporting_Section.Designation"] || flatObj["Supporting_Section.Designation"];
  if (supportingDesc) {
    dock.supporting_designation = supportingDesc;
    dock.column_section = supportingDesc;
    dock.member_designation = supportingDesc;
  }

  const supportedDesc = flatObj["Member.Supported_Section.Designation"] || flatObj["Supported_Section.Designation"];
  if (supportedDesc) {
    dock.supported_designation = supportedDesc;
    dock.beam_section = supportedDesc;
    if (!dock.member_designation) {
      dock.member_designation = supportedDesc;
    }
  }

  // Baseline fallbacks if designation is mapped directly to Designation
  const directDesc = flatObj["Member.Designation"] || flatObj["Designation"];
  if (directDesc) {
    dock.member_designation = directDesc;
  }

  return { dock, pref };
}
