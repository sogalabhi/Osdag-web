export const buttJointBoltedOutputConfig = {
    sections: {
        "Bolt Details": [
            { key: "Bolt.Diameter", label: "Diameter (mm)" },
            { key: "Bolt.Grade_Provided", label: "Property Class" },
            { key: "Bolt.Type_Provided", label: "Type" },
            { key: "Bolt.Shear", label: "Shear Capacity (kN)" },
            { key: "Bolt.Bearing", label: "Bearing Capacity (kN)" },
            { key: "Bolt.Capacity", label: "Capacity (kN)" }
        ],
        "Bolt Design": [
            { key: "Bolt.number", label: "Number of Bolts" },
            { key: "PackingPlate thk", label: "Packing Plate Thickness (mm)" },
            { key: "Bolt.Rows", label: "Rows of Bolts" },
            { key: "Bolt.Cols", label: "Columns of Bolts" },
            { key: "Bolt.UtilizationRatio", label: "Utilisation Ratio" },
            { key: "Design For", label: "Design For" },
            { key: "Plate.BaseCapacity", label: "Base Metal Capacity (kN)" },
            { key: "Plate.BaseUtilization", label: "Base Metal Utilization" },
            { key: "Bolt.Utilization", label: "Bolt Utilization" },
            { key: "Bolt.ConnLength", label: "Length of Connection (mm)" },
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