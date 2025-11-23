// ---------------------------------------------
// Osdag Web: Module Routing & UI Configuration
// ---------------------------------------------

export const MODULE_SUBMODULES = {
  Connections: [
    { key: "Shear", label: "Shear Connection" },
    { key: "Moment", label: "Moment Connection" },
    { key: "BasePlate", label: "Base Plate" },
    { key: "Truss", label: "Truss Connection" },
  ],
  TensionMember: [{ key: "Tension", label: "Tension Member" }],
  CompressionMember: [{ key: "Compression", label: "Compression Member" }],
  FlexureMember: [{ key: "Flexure", label: "Flexure Member" }],
  Compression: ["Axially-Loaded-Column"],
};

// ---------------------------------------------
// CONNECTIONS TAB CONTENT
// ---------------------------------------------
export const CONNECTIONS_TAB_CONTENT = {
  Shear: [
    {
      label: "Shear Connections",
      options: [
        { key: "FinPlateConnection", label: "Fin Plate", img: "shear_fin_plate_connec.svg" },
        { key: "CleatAngle", label: "Cleat Angle", img: "shear_fin_plate_connec.svg" },
        { key: "EndPlate", label: "End Plate", img: "shear_fin_plate_connec.svg" },
        { key: "SeatedAngle", label: "Seated Angle", img: "shear_fin_plate_connec.svg" },
      ],
    },
  ],
  Moment: [
    {
      label: "Beam to Beam Splice",
      options: [
        { key: "CoverPlateBolted", label: "Cover Plate Bolted", img: "shear_fin_plate_connec.svg" },
        { key: "CoverPlateWelded", label: "Cover Plate Welded", img: "shear_fin_plate_connec.svg" },
        { key: "EndPlate", label: "End Plate", img: "shear_fin_plate_connec.svg" },
      ],
    },
    {
      label: "Beam to Column Splice",
      options: [{ key: "EndPlate", label: "End Plate", img: "shear_fin_plate_connec.svg" }],
    },
    {
      label: "Column to Column Splice",
      options: [
        { key: "CoverPlateBolted", label: "Cover Plate Bolted", img: "shear_fin_plate_connec.svg" },
        { key: "CoverPlateWelded", label: "Cover Plate Welded", img: "shear_fin_plate_connec.svg" },
        { key: "EndPlate", label: "End Plate", img: "shear_fin_plate_connec.svg" },
      ],
    },
  ],
  BasePlate: [
    {
      label: "Base Plates",
      options: [{ key: "BasePlateConnection", label: "Base Plate Connection", img: "shear_fin_plate_connec.svg" }],
    },
  ],
  Truss: [{ label: "Truss Connections", options: [] }],
};

// ---------------------------------------------
// GENERIC (NON-CONNECTION) MODULES
// ---------------------------------------------
export const GENERIC_SUBMODULE_CONTENT = {
  Tension: [
    {
      label: "Tension Member",
      options: [
        { key: "BoltedToEndPlate", label: "Bolted to End Plate", img: "shear_fin_plate_connec.svg" },
        { key: "WeldedToEndPlate", label: "Welded to End Plate", img: "shear_fin_plate_connec.svg" },
      ],
    },
  ],
  Compression: [
    {
      label: "Compression Member",
      options: [
        { key: "StrutsInTrusses", label: "Struts in Trusses", img: "shear_fin_plate_connec.svg" },
        {
          key: "AxiallyLoadedColumn",
          label: "Axially Loaded Column",
          img: "CompressionMembers_ColumnsInFrames.png",
        },
      ],
    },
  ],
  Flexure: [
    {
      label: "Flexure Member",
      options: [
        { key: "SimplySupportedBeam", label: "Simply Supported Beam", img: "shear_fin_plate_connec.svg" },
        { key: "CantileverBeam", label: "Cantilever Beam", img: "shear_fin_plate_connec.svg" },
        { key: "PlateGirder", label: "Plate Girder", img: "shear_fin_plate_connec.svg" },
      ],
    },
  ],
};

// ---------------------------------------------
// ROUTE MAPPINGS (key → actual path)
// ---------------------------------------------
export const MODULE_ROUTES = {
  FinPlateConnection: "/design/connections/shear/fin_plate",
  CleatAngle: "/design/connections/shear/cleat_angle",
  EndPlate: "/design/connections/shear/end_plate",
  SeatedAngle: "/design/connections/shear/seatAngle",
  CoverPlateBolted: "/design/connections/beam-to-beam-splice/cover_plate_bolted",
  CoverPlateWelded: "/design/connections/beam-to-beam-splice/cover_plate_welded",
  BeamBeamEndPlate: "/design/connections/beam-to-beam-splice/end_plate",
  SimplySupportedBeam: "/design/flexure_member/simply_supported_beam",
  BoltedToEndPlate: "/design/tension-member/bolted_to_end_gusset",
  WeldedToEndPlate: "/design/tension-member/welded_to_end_gusset",
  BoltedToEndGusset: "/design/tension-member/bolted_to_end_gusset",
  BeamColumnEndPlate: "/design/connections/column-beam/end_plate",
  AxiallyLoadedColumn: "/design/compression_member/axial_column",
  "Axially-Loaded-Column": "/design/compression/axially-loaded-column",
};

// ---------------------------------------------
// FRIENDLY NAME TO MODULE KEY MAP
// ---------------------------------------------
export const MODULE_NAME_TO_KEY = {
  "Shear Connection - Fin Plate": "FinPlateConnection",
  "Shear Connection - End Plate": "EndPlate",
  "Shear Connection - Cleat Angle": "CleatAngle",
  "Shear Connection - Seated Angle": "SeatedAngle",
  // Tension Members
  "Tension Member Bolted Design": "BoltedToEndGusset",
  // Compression / other mappings
  "Compression Member - Axially Loaded Column": "AxiallyLoadedColumn",
  "Beam-to-Column End Plate Connection": "BeamColumnEndPlate",
};