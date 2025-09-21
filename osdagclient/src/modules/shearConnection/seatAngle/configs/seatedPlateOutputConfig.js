export const seatedAngleOutputConfig = {
  // --- Defines the sections and fields on the main output panel ---
  sections: {
    "Bolt": [
      { key: "Bolt.Diameter", label: "Diameter (mm)" },
      { key: "Bolt.Grade_Provided", label: "Property Class" },
      { key: "Bolt.number", label: "Number of Bolts" },
      { key: "Bolt.Shear", label: "Shear Capacity (kN)" },
      { key: "Bolt.Bearing", label: "Bearing Capacity (kN)" },
      { key: "Bolt.Betalg", label: "β<sub>lg</sub>" },
      { key: "Bolt.Capacity", label: "Bolt Value (kN)" },
      { key: "Bolt.Force (kN)", label: "Bolt Shear Force (kN)" },
    ],
    "Seated Angle Connection": [
      { key: "SeatedAngle.Designation", label: "Designation" },
      { key: "TopAngle.Width", label: "Width (mm)" },
      { key: "CapacityModal", label: "Capacity Details" },
      { key: "SpacingModal_Seated_col", label: "On Column" },
      { key: "SpacingModal_Seated_beam", label: "On Beam" },
    ],
    "Top Angle": [
      { key: "TopAngle.Designation", label: "Designation" },
      { key: "TopAngle.Width", label: "Width (mm)" },
      { key: "CapacityModal_Top_col", label: "On Column" },
      { key: "CapacityModal_Top_beam", label: "On Beam" },
    ],
  },

  // --- Maps the modal trigger keys from 'sections' to a modal type and button text ---
  modals: {
    SpacingModal_Seated_col: { type: "spacing", buttonText: "On Column" },
    SpacingModal_Seated_beam: { type: "spacing", buttonText: "On Beam" },
    CapacityModal: { type: "capacity", buttonText: "Capacity Details" },
    CapacityModal_Top_col: { type: "capacity", buttonText: "On Column" },
    CapacityModal_Top_beam: { type: "capacity", buttonText: "On Beam" },
  },

  // --- Defines the properties of each type of modal ---
  modalTypes: {
    spacing: {
      title: "Spacing Details",
      width: "68%",
      layout: "two-column",
      hasImage: true,
      note: "Note: Representative image for Spacing Details - 3 x 3 pattern considered",
    },
    capacity: {
      title: "Capacity Details",
      width: "30%",
      layout: "single-column-list",
      hasImage: false,
      note: null,
    },
  },

  // --- Contains the data to be displayed inside each specific modal ---
  modalData: {
    spacing: {
      SpacingModal_Seated_col: [
        { key: "Bolt.Rows_seated_col", label: "Rows of Bolts" },
        { key: "Bolt.Cols_seated_col", label: "Columns of Bolts" },
        { key: "Bolt.EndDist_seated_col", label: "End Distance (mm)" },
        { key: "Central Gauge (mm)", label: "Moment Capacity (kNm)" },
        { key: "Bolt.Gauge_seated_col", label: "Gauge Distance (mm)" },
        { key: "Bolt.EdgeDist_seated_col", label: "Edge Distance (mm)" },
      ],
      SpacingModal_Seated_beam: [
        { key: "Bolt.Rows_seated_beam", label: "Rows of Bolts" },
        { key: "Bolt.Cols_seated_beam", label: "Columns of Bolts" },
        { key: "Bolt.EndDist_seated_beam", label: "End Distance (mm)" },
        { key: "Bolt.Gauge_seated_beam", label: "Gauge Distance (mm)" },
        { key: "Bolt.EdgeDist_seated_beam", label: "Edge Distance (mm)" },
      ],
    },
    capacity: {
      CapacityModal: [
        { key: "Plate.ShearDemand", label: "Shear Demand (kN)" },
        { key: "Plate.Shear", label: "Shear Yielding Capacity (kN)" },
        { key: "Plate.MomDemand", label: "Moment Demand (kNm)" },
        { key: "Plate.MomCapacity", label: "Moment Capacity (kNm)" },
      ],
      CapacityModal_Top_col: [
        { key: "Bolt.Rows_top_col", label: "Rows of Bolts" },
        { key: "Bolt.Cols_top_col", label: "Columns of Bolts" },
        { key: "Bolt.EndDist_top_col", label: "End Distance (mm)" },
        { key: "Bolt.Gauge_top_col", label: "Gauge Distance (mm)" },
        { key: "Bolt.EdgeDist_top_col", label: "Edge Distance (mm)" },
      ],
      CapacityModal_Top_beam: [
        { key: "Bolt.Rows_top_beam", label: "Rows of Bolts" },
        { key: "Bolt.Cols_top_beam", label: "Columns of Bolts" },
        { key: "Bolt.EndDist_top_beam", label: "End Distance (mm)" },
        { key: "Bolt.Gauge_top_beam", label: "Gauge Distance (mm)" },
        { key: "Bolt.EdgeDist_top_beam", label: "Edge Distance (mm)" },
      ],
    },
  },
};