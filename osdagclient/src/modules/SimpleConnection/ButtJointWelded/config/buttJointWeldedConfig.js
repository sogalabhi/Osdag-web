import {
    KEY_MODULE, KEY_MATERIAL, KEY_AXIAL, KEY_DP_DETAILING_EDGE_TYPE,
    KEY_PLATE1_THICKNESS, KEY_PLATE2_THICKNESS, KEY_PLATE_WIDTH, KEY_WELD_SIZE,
    KEY_COVER_PLATE, KEY_DISP_COVER_PLT, KEY_DP_DETAILING_PACKING_PLATE,
    KEY_DISP_WELD_SIZE, KEY_DISP_PLATE1_THICKNESS, KEY_DISP_PLATE_WIDTH,
    KEY_DISP_PLATE2_THICKNESS, KEY_DESIGN_FOR
} from "../../../../constants/DesignKeys";

export const buttJointWeldedConfig = {
    sessionName: "Butt Joint Welded",
    routePath: "/design/connections/simple/butt_joint_welded",
    designType: "Butt-Joint-Welded",
    cameraKey: "Connection",
    cadOptions: ["Model", "Plate", "Column"],

    defaultInputs: {
        axial_force: "60",
        module: "Butt Joint Welded",
        plate1_thickness: [],
        plate2_thickness: [],
        weld_size: [],
        plate_width: "200",
        material: "E 250 (Fe 410 W)A",
        detailing_edge_type: "Sheared or hand flame cut",
        cover_plate: "Single-Cover",
        design_for: "Tension",
    },

    modalConfig: [
        { key: "weldSelect", inputKey: "weld_size", dataSource: "weldSizeList" },
    ],

    selectionConfig: [
        { key: "weldSizeSelect", inputKey: "weld_size", defaultValue: "All" },

    ],

    validateInputs: (inputs) => {
        // if (!inputs.section_designation ||
        //     !inputs.length ||
        //     !inputs.axial_force ||
        //     inputs.section_designation === "Select Section") {
        //     return { isValid: false, message: "Please input all the required fields" };
        // }
        return { isValid: true };
    },

    buildSubmissionParams: (inputs, allSelected, lists, extraState) => {
        const getArrayParam = (allSelectedFlag, fullList, selectedList) => {
            if (allSelectedFlag) {
                // Exclude "All" if present in the list
                return fullList.filter(item => item !== "All");
            }
            // Ensure always array
            if (Array.isArray(selectedList)) {
                return selectedList.filter(item => item !== "All");
            }
            return [selectedList].filter(item => item !== "All");
        };

        return {
            [KEY_DP_DETAILING_EDGE_TYPE]: String(inputs.detailing_edge_type),
            [KEY_DP_DETAILING_PACKING_PLATE]: "No",
            [KEY_MODULE]: "Butt-Joint-Welded",
            [KEY_PLATE1_THICKNESS]: String(inputs.plate1_thickness),
            [KEY_PLATE2_THICKNESS]: String(inputs.plate2_thickness),
            [KEY_PLATE_WIDTH]: String(inputs.plate_width),
            [KEY_MATERIAL]: String(inputs.material),
            [KEY_COVER_PLATE]: String(inputs.cover_plate),
            [KEY_AXIAL]: String(inputs.axial_force),
            [KEY_WELD_SIZE]: getArrayParam(allSelected.weld_size, lists.weldSizeList, inputs.weld_size),
            [KEY_DESIGN_FOR]: String(inputs.design_for),
        };
    },

    inputSections: [
        {
            title: "Connecting Members",
            fields: [
                {
                    key: "plate1_thickness",
                    label: KEY_DISP_PLATE1_THICKNESS,
                    type: "select",
                    options: "thicknessList",
                    onChange: (value, inputs, setInputs, options) => {
                        setInputs({
                            ...inputs,
                            "plate1_thickness": value,
                        });
                    }
                },
                {
                    key: "plate2_thickness",
                    label: KEY_DISP_PLATE2_THICKNESS,
                    type: "select",
                    options: "thicknessList",
                    onChange: (value, inputs, setInputs, options) => {
                        setInputs({
                            ...inputs,
                            "plate2_thickness": value,
                        });
                    }
                },
                {
                    key: "plate_width",
                    label: KEY_DISP_PLATE_WIDTH,
                    type: "number"
                },

                {
                    key: "material",
                    label: "Material *",
                    type: "select",
                    options: "materialList",
                    onChange: (value, inputs, setInputs, materialList) => {
                        const material = materialList.find(item => item.id === value);
                        setInputs({
                            ...inputs,
                            material: material.Grade,
                            connector_material: material.Grade,
                        });
                    }
                },
                {
                    key: "cover_plate",
                    label: KEY_DISP_COVER_PLT,
                    type: "select",
                    options: 'coverPlateList',
                    onChange: (value, inputs, setInputs, options) => {
                        setInputs({
                            ...inputs,
                            "cover_plate": value,
                        });
                    }

                }
            ]
        },
        {
            title: "Factored Loads",
            fields: [
                { key: "axial_force", label: "Axial Force (kN)", type: "number" }
            ]
        },
        {
            title: "Weld",
            fields: [
                {
                    key: "weld_size",
                    label: KEY_DISP_WELD_SIZE,
                    type: "customizable",
                    selectionKey: "weldSizeSelect",
                    modalKey: "weldSelect",
                    dataSource: "weldSizeList"
                }
            ]
        }
    ]
}; 