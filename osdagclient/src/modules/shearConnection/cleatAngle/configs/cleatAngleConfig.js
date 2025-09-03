export const seatAngleConfig = {
  // --- Basic session and routing information ---
  sessionName: "Seat Angle Connection",
  routePath: "/design/connections/shear/seat_angle",
  designType: "Seat-Angle-Connection",
  cameraKey: "SeatAngle",
  cadOptions: ["Model", "Beam", "Column", "SeatAngle", "TopAngle"],

  // --- Default values for the input fields ---
  // NOTE: Section defaults (e.g., beam_section) are empty.
  // They should be set dynamically after fetching API data to ensure they exist in the list.
  defaultInputs: {
    connectivity: "Beam-Beam", // Default connectivity
    column_section: "",
    beam_section: "",
    primary_beam: "",
    secondary_beam: "",
    load_shear: "20",
    connector_material: "E 250 (Fe 410 W)A",
    bolt_type: "Bearing_Bolt",

    // Default selections for customizable fields (initially empty)
    bolt_diameter: [],
    bolt_grade: [],
    seat_section: [],
    top_section: [],

    // Common defaults that might be shared across modules
    design_method: "Limit State Design",
    module: "Seat Angle Connection",
  },

  // --- Configuration for modal pop-ups (Customized selections) ---
  modalConfig: [
    { key: "boltDiameter", inputKey: "bolt_diameter", dataSource: "boltDiameterList" },
    { key: "propertyClass", inputKey: "bolt_grade", dataSource: "propertyClassList" },
    { key: "seatSection", inputKey: "seat_section", dataSource: "angleList" },
    { key: "topSection", inputKey: "top_section", dataSource: "topAngleList" },
  ],

  // --- Configuration for the "All" / "Customized" dropdowns ---
  selectionConfig: [
    { key: "boltDiameterSelect", inputKey: "bolt_diameter", defaultValue: "All" },
    { key: "propertyClassSelect", inputKey: "bolt_grade", defaultValue: "All" },
    { key: "connectorAngleSelect", inputKey: "seat_section", defaultValue: "All" },
    { key: "connectorTopSelect", inputKey: "top_section", defaultValue: "All" },
  ],

  // --- Input validation logic ---
  validateInputs: (inputs, extraState) => {
    const connectivity = extraState?.selectedOption || inputs.connectivity;
    if (connectivity === "Beam-Beam") {
      if (!inputs.primary_beam || !inputs.secondary_beam) {
        return { isValid: false, message: "Please select both primary and secondary beam sections." };
      }
    } else { // Covers "Column Flange-Beam-Web" and "Column Web-Beam-Web"
      if (!inputs.beam_section || !inputs.column_section) {
        return { isValid: false, message: "Please select all required sections." };
      }
    }
    return { isValid: true };
  },

  // --- Function to build the final API submission payload ---
  buildSubmissionParams: (inputs, allSelected, lists, extraState) => {
    const conn_map = {
      "Column Flange-Beam-Web": "Column Flange-Beam Web",
      "Column Web-Beam-Web": "Column Web-Beam Web",
      "Beam-Beam": "Beam-Beam",
    };
    const connectivity = extraState?.selectedOption || inputs.connectivity;
    
    return {
      "Connectivity": conn_map[connectivity],
      "Module": inputs.module,
      "Design.Design_Method": inputs.design_method,

      // Member sections based on connectivity
      "Member.Supporting_Section.Designation": connectivity === "Beam-Beam" ? inputs.primary_beam : inputs.column_section,
      "Member.Supported_Section.Designation": connectivity === "Beam-Beam" ? inputs.secondary_beam : inputs.beam_section,
      
      "Load.Shear": inputs.load_shear || "",
      "Connector.Material": inputs.connector_material,

      // Bolt parameters
      "Bolt.Diameter": allSelected.bolt_diameter ? lists.boltDiameterList : inputs.bolt_diameter,
      "Bolt.Grade": allSelected.bolt_grade ? lists.propertyClassList : inputs.bolt_grade,
      "Bolt.Type": inputs.bolt_type,

      // Angle section parameters
      "Connector.SeatAngle.Section_List": allSelected.seat_section ? lists.angleList : inputs.seat_section,
      "Connector.TopAngle.Section_List": allSelected.top_section ? lists.topAngleList : inputs.top_section,
    };
  },

  // --- UI structure definition, mapping directly to the JSX component ---
  inputSections: [
    {
      title: "Connecting Members",
      fields: [
        { key: "connectivity", label: "Connectivity", type: "connectivitySelect", options: "connectivityList" },
        // Conditional fields for Beam-Beam connectivity
        { key: "primary_beam", label: "Primary Beam*", type: "select", options: "beamList", conditionalDisplay: (extraState) => extraState?.selectedOption === "Beam-Beam" },
        { key: "secondary_beam", label: "Secondary Beam*", type: "select", options: "beamList", conditionalDisplay: (extraState) => extraState?.selectedOption === "Beam-Beam" },
        // Conditional fields for Column-Beam connectivity
        { key: "column_section", label: "Column Section*", type: "select", options: "columnList", conditionalDisplay: (extraState) => extraState?.selectedOption !== "Beam-Beam" },
        { key: "beam_section", label: "Beam Section*", type: "select", options: "beamList", conditionalDisplay: (extraState) => extraState?.selectedOption !== "Beam-Beam" },
        // Material selection
        {
          key: "connector_material", label: "Material", type: "select", options: "materialList",
          onChange: (value, inputs, setInputs, materialList, setShowModal) => {
            if (value === -1) {
              setShowModal(true);
              return;
            }
            const material = materialList.find((item) => item.id === value);
            if (material) {
              setInputs({ ...inputs, connector_material: material.Grade });
            }
          },
        },
      ],
    },
    {
      title: "Factored Loads",
      fields: [
        { key: "load_shear", label: "Shear Force(kN)", type: "number" },
      ],
    },
    {
      title: "Bolt",
      fields: [
        { key: "bolt_diameter", label: "Diameter(mm)", type: "customizable", selectionKey: "boltDiameterSelect", modalKey: "boltDiameter" },
        { key: "bolt_type", label: "Type", type: "select", options: [{value: "Bearing_Bolt", label: "Bearing Bolt"}, {value: "Friction_Grip_Bolt", label: "Friction Grip Bolt"}] },
        { key: "bolt_grade", label: "Property Class", type: "customizable", selectionKey: "propertyClassSelect", modalKey: "propertyClass" },
      ],
    },
    {
      title: "Angle Section",
      fields: [
        { key: "seat_section", label: "Seat section*", type: "customizable", selectionKey: "connectorAngleSelect", modalKey: "seatSection" },
        { key: "top_section", label: "Top section*", type: "customizable", selectionKey: "connectorTopSelect", modalKey: "topSection" },
      ],
    },
  ],
};