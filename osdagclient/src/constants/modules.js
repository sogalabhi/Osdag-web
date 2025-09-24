// constants/modules.js
import coverPlateBolted from "../assets/ShearConnection/sc_fin_plate.png";
import coverPlateWelded from "../assets/ShearConnection/sc_fin_plate.png";
import endPlate from "../assets/ShearConnection/sc_fin_plate.png";

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
};

export const CONNECTIONS_TAB_CONTENT = {
    Shear: [
        {
            label: "Shear Connections",
            options: [
                { key: "FinPlateConnection", label: "Fin Plate", img: coverPlateBolted },
                { key: "CleatAngle", label: "Cleat Angle", img: endPlate },
                { key: "EndPlate", label: "End Plate", img: endPlate },
                { key: "SeatedAngle", label: "Seated Angle", img: endPlate },
            ],
        },
    ],
    Moment: [
        {
            label: "Beam to Beam Splice",
            options: [
                { key: "CoverPlateBolted", label: "Cover Plate Bolted", img: coverPlateBolted },
                { key: "CoverPlateWelded", label: "Cover Plate Welded", img: coverPlateWelded },
                { key: "EndPlate", label: "End Plate", img: endPlate },
            ],
        },
        {
            label: "Beam to Column Splice",
            options: [{ key: "EndPlate", label: "End Plate", img: endPlate }],
        },
        {
            label: "Column to Column Splice",
            options: [
                { key: "CoverPlateBolted", label: "Cover Plate Bolted", img: coverPlateBolted },
                { key: "CoverPlateWelded", label: "Cover Plate Welded", img: coverPlateWelded },
                { key: "EndPlate", label: "End Plate", img: endPlate },
            ],
        },
    ],
    BasePlate: [
        {
            label: "Base Plates",
            options: [{ key: "BasePlateConnection", label: "Base Plate Connection", img: endPlate }],
        },
    ],
    Truss: [{ label: "Truss Connections", options: [] }],
};

export const GENERIC_SUBMODULE_CONTENT = {
    Tension: [
        {
            label: "Tension Member",
            options: [
                { key: "BoltedToEndPlate", label: "Bolted to End Plate", img: coverPlateBolted },
                { key: "WeldedToEndPlate", label: "Welded to End Plate", img: coverPlateWelded },
            ],
        },
    ],
    Compression: [
        {
            label: "Compression Member",
            options: [{ key: "StrutsInTrusses", label: "Struts in Trusses", img: coverPlateBolted }],
        },
    ],
    Flexure: [
        {
            label: "Flexure Member",
            options: [
                { key: "SimplySupportedBeam", label: "Simply Supported Beam", img: endPlate },
                { key: "CantileverBeam", label: "Cantilever Beam", img: coverPlateBolted },
                { key: "PlateGirder", label: "Plate Girder", img: coverPlateBolted },
            ],
        },
    ],
};

export const MODULE_ROUTES = {
    FinPlate: "/design/connections/shear/fin_plate",
    CleatAngle: "/design/connections/shear/cleat_angle",
    EndPlate: "/design/connections/shear/end_plate",
    SeatedAngle: "/design/connections/shear/seated_angle",
    CoverPlateBolted: "/design/connections/beam-to-beam-splice/cover_plate_bolted",
    CoverPlateWelded: "/design/connections/beam-to-beam-splice/cover_plate_welded",
    BeamBeamEndPlate: "/design/connections/beam-to-beam-splice/end_plate",
    SimplySupportedBeam: "/design/flexure_member/simply_supported_beam",
    BoltedToEndGusset: "/design/tension-member/bolted_to_end_gusset",
    // Add other needed routes
};
