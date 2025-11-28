export const lapJointWeldedOutputConfig = {
    sections: {
        "Weld": [
            { key: "Weld.Type", label: "Type" },
            { key: "Weld.Size", label: "Size (mm)" },
            { key: "Weld.Strength", label: "Strength (N/mm2)" },
            { key: "Weld.EffLength", label: "Eff.Length (mm)" },
            { key: "Design For", label: "Design For" },
            { key: "Bolt.ConnLength", label: "Length of Connection (mm)" }
            // { key: "bolt.long_joint", label: "Long Joint Red.Factor" },
            // { key: "Weld.Strength_red", label: "Red.Strength(N/mm)" },
            // { key: "Weld.Stress", label: "Stress (N/mm" },
        ],
        "Cover Plate Details": [
            { key: "Utilisation Ratio", label: "Utilisation Ratio" },
            { key: "No Cover Plate", label: "No Cover Plate" },
            { key: "Width of Cover Plate", label: "Width of Cover Plate" },
            { key: "Length of Cover Plate", label: "Length of Cover Plate" },
            { key: "Thickness of Cover Plate", label: "Thickness of Cover Plate" },
            // { key: "PlateCapacityModal", label: "Capacity" },
        ],
    },

    modals: {
        // PlateCapacityModal: { type: "capacity", buttonText: "Plate Capacity" }
    },

    modalTypes: {
        // capacity: {
        //     title: "Capacity Details",
        //     width: "68%",
        //     layout: "capacity-complex",
        //     hasImage: true,
        //     note: "Representative image for Failure Pattern"
        // }
    },

    modalData: {
        // capacity: {
        //     PlateCapacityModal: [
        //         { key: "Plate.Yield", label: "Tension Yielding Capacity (kN)", section: "Failure due to Tension in Plate" },
        //         { key: "Plate.Rupture", label: "Tension Rupture Capacity (kN)", section: "Failure due to Tension in Plate" },
        //         { key: "Plate.BlockShear", label: "Block Shear Capacity (kN)", section: "Failure due to Block Shear in Plate" },
        //         { key: "Plate.Capacity", label: "Tension Capacity (kN)", section: "Overall Plate Capacity" },
        //     ]
        // }
    }
}; 