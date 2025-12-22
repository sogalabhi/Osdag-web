/**
 * View-to-Part Mapping Configuration
 * Maps CAD view options to which parts should be displayed
 */

// Default view-to-part mappings
export const DEFAULT_VIEW_MAPPINGS = {
  "Model": "all",  // Show all parts when Model is selected
  "Beam": ["Beam"],
  "Column": ["Column"],
  // Plate view should show both Plate and Bolt/Bolts (for Fin Plate connections)
  "Plate": ["Plate", "Bolt", "Bolts"],
  "Connector": ["Connector", "cleatAngle", "SeatedAngle", "EndPlate"],
  "CleatAngle": ["cleatAngle"],
  "SeatedAngle": ["SeatedAngle"],
  "EndPlate": ["EndPlate"],
  "Member": ["Member"],
  "CoverPlate": ["CoverPlate", "Cover Plate"],
};

/**
 * Create a view mapper function that checks if a part should be shown
 * @param {object} moduleCadConfig - Optional module-specific CAD config
 * @returns {function} Function that takes (partName, activeViews) and returns boolean
 */
export const createViewMapper = (moduleCadConfig = null) => {
  // Use module-specific mappings if provided, otherwise use defaults
  const viewMappings = moduleCadConfig?.viewMappings || DEFAULT_VIEW_MAPPINGS;
  
  return (partName, activeViews) => {
    // If Model is selected, show all parts
    if (activeViews.includes("Model")) {
      return true;
    }
    
    // Check each active view
    for (const view of activeViews) {
      const mappedParts = viewMappings[view];
      
      // If mapping is "all", show everything
      if (mappedParts === "all") {
        return true;
      }
      
      // If mapping is an array, check if partName matches
      if (Array.isArray(mappedParts)) {
        // Exact match
        if (mappedParts.includes(partName)) {
          return true;
        }
        
        // Case-insensitive match
        const lowerPartName = partName?.toLowerCase();
        if (mappedParts.some(p => p?.toLowerCase() === lowerPartName)) {
          return true;
        }
        
        // Partial match (e.g., "Plate" matches "EndPlate")
        if (mappedParts.some(p => {
          const lowerP = p?.toLowerCase();
          return lowerPartName?.includes(lowerP) || lowerP?.includes(lowerPartName);
        })) {
          return true;
        }
      }
    }
    
    return false;
  };
};

/**
 * Get view options for a module
 * @param {object} moduleCadConfig - Module-specific CAD config
 * @param {object} moduleConfig - Full module config (for fallback)
 * @returns {array} Array of view option strings
 */
export const getViewOptions = (moduleCadConfig = null, moduleConfig = null) => {
  // Check module-specific CAD config first
  if (moduleCadConfig?.viewOptions) {
    return moduleCadConfig.viewOptions;
  }
  
  // Fallback to moduleConfig.cadOptions
  if (moduleConfig?.cadOptions) {
    return moduleConfig.cadOptions;
  }
  
  // Default fallback
  return ["Model", "Beam", "Connector"];
};

