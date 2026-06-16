export const cleatAngleOutputConfig = {
  sections: {
    "Cleat Angle": [
      { key: "Cleat.Angle", label: "Cleat Angle Designation" },
      { key: "Plate.Height", label: "Height (mm)" },
      { key: "Cleat.Shear", label: "Shear Yielding Capacity (kN)" },
      { key: "Cleat.BlockShear", label: "Block Shear Capacity (kN)" },
      { key: "Cleat.MomDemand", label: "Moment Demand (kNm)" },
      { key: "Cleat.MomCapacity", label: "Moment Capacity (kNm)" },
      { key: "PlateCapacityModal_supported", label: "Plate Capacity Details" },
    ],
    Bolt: [
      { key: "Bolt.Diameter", label: "Diameter (mm)" },
      { key: "Bolt.Grade_Provided", label: "Property Class" },
    ],
    "Bolts on Supported Leg": [
      { key: "Bolt.Line", label: "Bolt Columns (nos)" },
      { key: "Bolt.OneLine", label: "Bolt Rows (nos)" },
      { key: "Bolt.Force (kN)", label: "Bolt Force (kN)" },
      { key: "Bolt.Capacity_sptd", label: "Bolt Value (kN)" },
      { key: "BoltCapSimpleModal_supported", label: "Bolt Capacity" },
      { key: "CapacityModal_supported", label: "Bolt Capacity Details" },
      { key: "SupportedSpacingModal", label: "Spacing" },
    ],
    "Bolts on Supporting Leg": [
      { key: "Cleat.Spting_leg.Line", label: "Bolt Columns (nos)" },
      { key: "Cleat.Spting_leg.OneLine", label: "Bolt Rows (nos)" },
      { key: "Cleat.Spting_leg.Force", label: "Bolt Force (kN)" },
      { key: "Bolt.Capacity_spting", label: "Bolt Value (kN)" },
      { key: "BoltCapSimpleModal_supporting", label: "Bolt Capacity" },
      { key: "CapacityModal_supporting", label: "Bolt Capacity Details" },
      { key: "SupportingSpacingModal", label: "Spacing" },
      { key: "PlateCapacityModal_supporting", label: "Plate Capacity Details" },
    ],
    "Section Details": [
      { key: "SectionCapacityModal", label: "Section Capacity" },
    ],
  },

  modals: {
    SupportedSpacingModal:         { type: "spacing",              buttonText: "Supported Spacing" },
    SupportingSpacingModal:        { type: "spacingSupporting",    buttonText: "Supporting Spacing" },
    CapacityModal_supported:       { type: "details",              buttonText: "Bolt Capacity Details" },
    CapacityModal_supporting:      { type: "detailsSupporting",    buttonText: "Bolt Capacity Details" },
    BoltCapSimpleModal_supported:  { type: "boltCapSimpleSptd",   buttonText: "Bolt Capacity" },
    BoltCapSimpleModal_supporting: { type: "boltCapSimpleSpting",  buttonText: "Bolt Capacity" },
    PlateCapacityModal_supported:  { type: "plateCapSptd",        buttonText: "Plate Capacity Details" },
    PlateCapacityModal_supporting: { type: "plateCapSpting",       buttonText: "Plate Capacity Details" },
    SectionCapacityModal:          { type: "sectionCap",           buttonText: "Section Capacity" },
  },

  modalTypes: {
    spacing: {
      title: "Supported Leg — Spacing Details",
      width: "68%",
      layout: "spacing-diagram",
      hasImage: true,
    },
    spacingSupporting: {
      title: "Supporting Leg — Spacing Details",
      width: "68%",
      layout: "spacing-diagram",
      hasImage: true,
    },
    details: {
      title: "Supported Leg — Bolt Capacity Details",
      width: "35%",
      layout: "single-column",
      hasImage: false,
    },
    detailsSupporting: {
      title: "Supporting Leg — Bolt Capacity Details",
      width: "35%",
      layout: "single-column",
      hasImage: false,
    },
    boltCapSimpleSptd: {
      title: "Supported Leg — Bolt Capacity",
      width: "35%",
      layout: "single-column",
      hasImage: false,
    },
    boltCapSimpleSpting: {
      title: "Supporting Leg — Bolt Capacity",
      width: "35%",
      layout: "single-column",
      hasImage: false,
    },
    plateCapSptd: {
      title: "Supported Leg — Plate Capacity Details",
      width: "35%",
      layout: "single-column",
      hasImage: false,
    },
    plateCapSpting: {
      title: "Supporting Leg — Plate Capacity Details",
      width: "35%",
      layout: "single-column",
      hasImage: false,
    },
    sectionCap: {
      title: "Section Capacity Details",
      width: "35%",
      layout: "single-column",
      hasImage: false,
    },
  },

  modalData: {
    spacing: {
      SupportedSpacingModal: {
        fields: [
          { key: "Bolt.Pitch_supported", label: "Pitch Distance (mm)" },
          { key: "Bolt.EndDist_supported", label: "End Distance (mm)" },
          { key: "Bolt.Gauge1_supported", label: "Gauge 1 Distance (mm)" },
          { key: "Bolt.Gauge2_supported", label: "Gauge 2 Distance (mm)" },
          { key: "Bolt.EdgeDist_supported", label: "Edge Distance (mm)" },
        ],
        diagram: {
          props: {
            plateWidth: 0,
            plateHeight: "Plate.Height",
            rows: "Bolt.OneLine",
            cols: "Bolt.Line",
            end: "Bolt.EndDist_supported",
            pitch: "Bolt.Pitch_supported",
            gauge: "Bolt.Gauge2_supported",
            edge: "Bolt.Gauge1_supported",
            holeDiameter: "Bolt.Diameter",
            angleDesignation: "Cleat.Angle",
            drawAngleThickness: "left",
          },
        },
      },
    },
    spacingSupporting: {
      SupportingSpacingModal: {
        fields: [
          { key: "Bolt.Pitch_supporting", label: "Pitch Distance (mm)" },
          { key: "Bolt.EndDist_supporting", label: "End Distance (mm)" },
          { key: "Bolt.Gauge1_supporting", label: "Gauge 1 Distance (mm)" },
          { key: "Bolt.Gauge2_supporting", label: "Gauge 2 (Pitch) Distance (mm)" },
          { key: "Bolt.EdgeDist_supporting", label: "Edge Distance (mm)" },
        ],
        diagram: {
          origin: "right",
          props: {
            plateWidth: 0,
            plateHeight: "Plate.Height",
            rows: "Cleat.Spting_leg.OneLine",
            cols: "Cleat.Spting_leg.Line",
            end: "Bolt.EndDist_supporting",
            pitch: "Bolt.Pitch_supporting",
            gauge: "Bolt.Gauge2_supporting",
            edge: "Bolt.Gauge1_supporting",
            holeDiameter: "Bolt.Diameter",
            angleDesignation: "Cleat.Angle",
            drawAngleThickness: "right",
          },
        },
      },
    },
    details: {
      CapacityModal_supported: [
        { key: "Bolt.Bearing_supported", label: "Bearing Capacity (kN)" },
        { key: "Bolt.Shear_supported", label: "Shear Capacity (kN)" },
        { key: "Bolt.Betalg_supported", label: "β<sub>lg</sub>" },
        { key: "Bolt.Betalj_supported", label: "β<sub>lj</sub>" },
        { key: "Bolt.Capacity_supported", label: "Bolt Value (kN)" },
        { key: "Bolt.Force (kN)_supported", label: "Bolt Shear Force (kN)" },
      ],
    },
    detailsSupporting: {
      CapacityModal_supporting: [
        { key: "Bolt.Bearing_supporting", label: "Bearing Capacity (kN)" },
        { key: "Bolt.Shear_supporting", label: "Shear Capacity (kN)" },
        { key: "Bolt.Betalg_supporting", label: "β<sub>lg</sub>" },
        { key: "Bolt.Betalj_supporting", label: "β<sub>lj</sub>" },
        { key: "Bolt.Capacity_supporting", label: "Bolt Value (kN)" },
        { key: "Bolt.Force (kN)_supporting", label: "Bolt Shear Force (kN)" },
      ],
    },
    boltCapSimpleSptd: {
      BoltCapSimpleModal_supported: [
        { key: "Bolt.Shear_bolt_sptd", label: "Shear Capacity (kN)" },
        { key: "Bolt.Bearing_bolt_sptd", label: "Bearing Capacity (kN)" },
        { key: "Bolt.Capacity_bolt_sptd", label: "Bolt Value (kN)" },
      ],
    },
    boltCapSimpleSpting: {
      BoltCapSimpleModal_supporting: [
        { key: "Bolt.Shear_bolt_spting", label: "Shear Capacity (kN)" },
        { key: "Bolt.Bearing_bolt_spting", label: "Bearing Capacity (kN)" },
        { key: "Bolt.Capacity_bolt_spting", label: "Bolt Value (kN)" },
      ],
    },
    plateCapSptd: {
      PlateCapacityModal_supported: [
        { key: "Plate.Shear_sptd_plate", label: "Shear Yielding Capacity (kN)" },
        { key: "Plate.Rupture_sptd_plate", label: "Shear Rupture Capacity (kN)" },
        { key: "Plate.BlockShear_sptd_plate", label: "Block Shear (Shear) (kN)" },
        { key: "Plate.TensionYield_sptd_plate", label: "Tension Yielding Capacity (kN)" },
        { key: "Plate.TensionRupture_sptd_plate", label: "Tension Rupture Capacity (kN)" },
        { key: "Plate.BlockShearAxial_sptd_plate", label: "Block Shear (Axial) (kN)" },
        { key: "Section.BlockShearAxial_sptd_plate", label: "Section Block Shear Capacity (kN)" },
      ],
    },
    plateCapSpting: {
      PlateCapacityModal_supporting: [
        { key: "Plate.Shear_spting_plate", label: "Shear Yielding Capacity (kN)" },
        { key: "Plate.Rupture_spting_plate", label: "Shear Rupture Capacity (kN)" },
        { key: "Plate.BlockShear_spting_plate", label: "Block Shear (Shear) (kN)" },
        { key: "Plate.TensionYield_spting_plate", label: "Tension Yielding Capacity (kN)" },
        { key: "Plate.TensionRupture_spting_plate", label: "Tension Rupture Capacity (kN)" },
        { key: "Plate.BlockShearAxial_spting_plate", label: "Block Shear (Axial) (kN)" },
      ],
    },
    sectionCap: {
      SectionCapacityModal: [
        { key: "Cleat.Shear_section", label: "Cleat Shear Yielding Capacity (kN)" },
        { key: "Cleat.BlockShear_section", label: "Cleat Block Shear Capacity (kN)" },
        { key: "Cleat.MomDemand_section", label: "Moment Demand (kNm)" },
        { key: "Cleat.MomCapacity_section", label: "Moment Capacity (kNm)" },
      ],
    },
  },
};
