import ANGLES from "../../../../assets/TensionMember/Angles.png";
import BACK_TO_BACK_ANGLES from "../../../../assets/TensionMember/back_back_angles.png";
import STAR_ANGLES from "../../../../assets/TensionMember/star_angles.png";
import CHANNELS from "../../../../assets/TensionMember/Channels.png";
import ErrorImg from "../../../../assets/notSelected.png";
import {
    KEY_MODULE, KEY_SEC_PROFILE, KEY_LOCATION, KEY_SECSIZE, KEY_MATERIAL,
    KEY_LENGTH, KEY_AXIAL, KEY_D, KEY_TYP, KEY_GRD, KEY_DP_BOLT_HOLE_TYPE,
    KEY_DP_BOLT_SLIP_FACTOR, KEY_CONNECTOR_MATERIAL, KEY_DP_DETAILING_EDGE_TYPE,
    KEY_DP_DETAILING_GAP, KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DESIGN_METHOD, KEY_PLATETHK, KEY_SEC_MATERIAL
} from "../../../../constants/DesignKeys";

export const weldedToEndConfig = {
    sessionName: "Tension Member Welded Design",
    routePath: "/design/tension-member/welded_to_end_gusset",
    designType: "Tension-Member-Welded-Design",
    cameraKey: "TensionMember",
    cadOptions: ["Model", "Member", "Plate", "Endplate"],

    defaultInputs: {
        bolt_diameter: [],
        bolt_grade: [],
        bolt_type: "Bearing Bolt",
        connector_material: "E 250 (Fe 410 W)A",
        section_profile: "Back to Back Angles",
        location: "Long Leg",
        length: "1250",
        axial_force: "60",
        module: "Tension Member Bolted Design",
        plate_thickness: [],
        section_designation: [],
        material: "E 250 (Fe 410 W)A",
        bolt_hole_type: "Standard",
        bolt_slip_factor: "0.3",
        member_designation: "All",
        detailing_edge_type: "Rolled, machine-flame cut, sawn and planed",
        detailing_gap: "10",
        detailing_corr_status: "No",
        design_method: "Limit State Design",
    },

    modalConfig: [
        { key: "boltDiameter", inputKey: "bolt_diameter", dataSource: "boltDiameterList" },
        { key: "propertyClass", inputKey: "bolt_grade", dataSource: "propertyClassList" },
        { key: "plateThickness", inputKey: "plate_thickness", dataSource: "thicknessList" },
        { key: "sectionDesignation", inputKey: "section_designation", dataSource: null }, // Dynamic data source handled in EngineeringModule
    ],

    selectionConfig: [
        { key: "boltDiameterSelect", inputKey: "bolt_diameter", defaultValue: "All" },
        { key: "propertyClassSelect", inputKey: "bolt_grade", defaultValue: "All" },
        { key: "thicknessSelect", inputKey: "plate_thickness", defaultValue: "All" },
        { key: "sectionDesignationSelect", inputKey: "section_designation", defaultValue: "All" },
    ],

    // Helper function to get section image based on profile
    getSectionImage: (profile) => {
        switch (profile) {
            case "Angles":
                return ANGLES;
            case "Back to Back Angles":
                return BACK_TO_BACK_ANGLES;
            case "Star Angles":
                return STAR_ANGLES;
            case "Channels":
                return CHANNELS;
            default:
                return ErrorImg;
        }
    },

    // Helper function to get location options based on profile
    getLocationOptions: (profile) => {
        if (profile && profile.includes("Angle")) {
            return [
                { value: "Long Leg", label: "Long Leg" },
                { value: "Short Leg", label: "Short Leg" }
            ];
        }
        return [{ value: "Web", label: "Web" }];
    },

    // Helper function to get section list based on profile
    getDynamicSectionList: (profile, angleList, channelList) => {
        // if (profile && profile.includes("Angle")) {
        //     return angleList || [];
        // }
        // return channelList || [];

        // Until the section designations are returned from the backend, the list is hardcoded
        return ['20 x 20 x 3', '20 x 20 x 4', '25 x 25 x 3', '25 x 25 x 4', '25 x 25 x 5', '30 x 30 x 3', '30 x 30 x 4',
            '30 x 30 x 5', '35 x 35 x 3', '35 x 35 x 4', '35 x 35 x 5', '35 x 35 x 6', '40 x 40 x 3', '40 x 40 x 4',
            '40 x 40 x 5', '40 x 40 x 6', '45 x 45 x 3', '45 x 45 x 4', '45 x 45 x 5', '45 x 45 x 6', '50 x 50 x 3',
            '50 x 50 x 4', '50 x 50 x 5', '50 x 50 x 6', '55 x 55 x 4', '55 x 55 x 5', '55 x 55 x 6', '55 x 55 x 8',
            '60 x 60 x 4', '60 x 60 x 5', '60 x 60 x 6', '60 x 60 x 8', '65 x 65 x 4', '65 x 65 x 5', '65 x 65 x 6',
            '65 x 65 x 8', '70 x 70 x 5', '70 x 70 x 6', '70 x 70 x 8', '70 x 70 x 10', '75 x 75 x 5', '75 x 75 x 6',
            '75 x 75 x 8', '75 x 75 x 10', '80 x 80 x 6', '80 x 80 x 8', '80 x 80 x 10', '80 x 80 x 12', '90 x 90 x 6',
            '90 x 90 x 8', '90 x 90 x 10', '90 x 90 x 12', '100 x 100 x 6', '100 x 100 x 8', '100 x 100 x 10', '100 x 100 x 12',
            '110 x 110 x 8', '110 x 110 x 10', '110 x 110 x 12', '110 x 110 x 16', '130 x 130 x 8', '130 x130 x 10', '130 x130 x 12',
            '130 x130 x 16', '150 x 150 x 10', '150 x 150 x 12', '150 x 150 x 16', '150 x 150 x 20', '200 x 200 x 12', '200 x 200 x 16',
            '200 x 200 x 20', '200 x 200 x 25', '50 x 50 x 7', '50 x 50 x 8', '55 x 55 x 10', '60 x 60 x 10', '65 x 65 x 10', '70 x 70 x 7', '100 x 100 x 7', '100 x 100 x 15', '120 x 120 x 8', '120 x 120 x 10', '120 x 120 x 12', '120 x 120 x 15', '130 x 130 x 9', '150 x 150 x 15', '150 x 150 x 18', '180 x 180 x 15', '180 x 180 x 18', '180 x 180 x 20', '200 x 200 x 24', '30 x 20 x 3', '30 x 20 x 4', '30 x 20 x 5', '40 x 25 x 3', '40 x 25 x 4', '40 x 25 x 5', '40 x 25 x 6', '45 x 30 x 3', '45 x 30 x 4', '45 x 30 x 5', '45 x 30 x 6', '50 x 30 x 3', '50 x 30 x 4', '50 x 30 x 5', '50 x 30 x 6', '60 x 40 x 5', '60 x 40 x 6', '60 x 40 x 8', '65 x 45 x 5', '65 x 45 x 6', '65 x 45 x 8', '70 x 45 x 5', '70 x 45 x 6', '70 x 45 x 8', '70 x 45 x 10', '75 x 50 x 5', '75 x 50 x 6', '75 x 50 x 8', '75 x 50 x 10', '80 x 50 x 5', '80 x 50 x 6', '80 x 50 x 8', '80 x 50 x 10', '90 x 60 x 6', '90 x 60 x 8', '90 x 60 x 10', '90 x 60 x 12', '100 x 65 x 6', '100 x 65 x 8', '100 x 65 x 10', '100 x 75 x 6', '100 x 75 x 8', '100 x 75 x 10', '100 x 75 x 12', '125 x 75 x 6', '125 x 75 x 8', '125 x 75 x 10', '125 x 95 x 6', '125 x 95 x 8', '125 x 95 x 10', '125 x 95 x 12', '150 x 115 x 8', '150 x 115 x 10', '150 x 115 x 12', '150 x 115 x 16', '200 x 100 x 10', '200 x 100 x 12', '200 x 100 x 16', '200 x 150 x 10', '200 x 150 x 12', '200 x 150 x 16', '200 x 150 x 20', '40 x 20 x 3', '40 x 20 x 4', '40 x 20 x 5', '60 x 30 x 5', '60 x 30 x 6', '60 x 40 x 7', '65 x 50 x 5', '65 x 50 x 6', '65 x 50 x 7', '65 x 50 x 8', '70 x 50 x 5', '70 x 50 x 6', '70 x 50 x 7', '70 x 50 x 8', '75 x 50 x 7', '80 x 40 x 5', '80 x 40 x 6', '80 x 40 x 7', '80 x 40 x 8', '80 x 60 x 6', '80 x 60 x 7', '80 x 60 x 8', '90 x 65 x 6', '90 x 65 x 7', '90 x 65 x 8', '90 x 65 x 10', '100 x 50 x 6', '100 x 50 x 7', '100 x 50 x 8', '100 x 50 x 10', '100 x 65 x 7', '120 x 80 x 8', '120 x 80 x 10', '120 x 80 x 12', '125 x 75 x 12', '135 x 65 x 8', '135 x 65 x 10', '135 x 65 x 12', '150 x 75 x 9', '150 x 75 x 15', '150 x 90 x 10', '150 x 90 x 12', '150 x 90 x 15', '200 x 100 x 15', '200 x 150 x 15', '200 x 150 x 18'];

    },

    validateInputs: (inputs) => {
        if (!inputs.section_designation ||
            !inputs.length ||
            !inputs.axial_force ||
            inputs.section_designation === "Select Section") {
            return { isValid: false, message: "Please input all the required fields" };
        }
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

        const dynamicSectionList = weldedToEndConfig.getDynamicSectionList(
            inputs.section_profile,
            lists.angleList,
            lists.channelList
        );

        return {
            [KEY_CONNECTOR_MATERIAL]: String(inputs.connector_material),
            [KEY_MATERIAL]: String(inputs.material),
            [KEY_SEC_MATERIAL]: String(inputs.material),
            [KEY_DP_DESIGN_METHOD]: String(inputs.design_method),
            [KEY_DP_DETAILING_CORROSIVE_INFLUENCES]: String(inputs.detailing_corr_status),
            [KEY_DP_DETAILING_EDGE_TYPE]: String(inputs.detailing_edge_type),
            [KEY_DP_DETAILING_GAP]: String(inputs.detailing_gap),
            [KEY_AXIAL]: String(inputs.axial_force),
            [KEY_SECSIZE]: dynamicSectionList,
            [KEY_LENGTH]: String(inputs.length),
            [KEY_SEC_PROFILE]: String(inputs.section_profile),
            [KEY_LOCATION]: String(inputs.location),
            [KEY_MODULE]: "Tension-Member-Welded-Design",
            [KEY_PLATETHK]: getArrayParam(allSelected.plate_thickness, lists.thicknessList, inputs.plate_thickness),
        };
    },

    inputSections: [
        {
            title: "Connecting Members",
            fields: [
                {
                    key: "section_profile",
                    label: "Section Profile*",
                    type: "sectionProfileList",
                    onChange: (value, inputs, setInputs, contextData, extraState, setExtraState) => {
                        // Update image and reset section designation when profile changes
                        const imageSource = weldedToEndConfig.getSectionImage(value);
                        setExtraState({
                            ...extraState,
                            selectedProfile: value,
                            imageSource: imageSource
                        });
                        setInputs({
                            ...inputs,
                            section_profile: value,
                            section_designation: [], // Reset section designation
                            location: weldedToEndConfig.getLocationOptions(value)[0]?.value || "Long Leg"
                        });
                    }
                },
                {
                    key: "profile_image",
                    label: "",
                    type: "image",
                    conditionalDisplay: () => true,
                    imageSource: (extraState) => extraState?.imageSource || BACK_TO_BACK_ANGLES,
                    height: "100px",
                    width: "100px"
                },
                {
                    key: "location",
                    label: "Conn_Location *",
                    type: "dynamicSelect",
                    getOptions: (inputs, extraState) => {
                        return weldedToEndConfig.getLocationOptions(inputs.section_profile);
                    }
                },
                {
                    key: "section_designation",
                    label: "Section Designation*",
                    type: "customizable",
                    selectionKey: "sectionDesignationSelect",
                    modalKey: "sectionDesignation",
                    getDynamicDataSource: (inputs, contextData) => {
                        return weldedToEndConfig.getDynamicSectionList(
                            inputs.section_profile,
                            contextData.angleList,
                            contextData.channelList
                        );
                    }
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
                    key: "length",
                    label: "Length (mm) *",
                    type: "number"
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
            title: "Plate",
            fields: [
                {
                    key: "plate_thickness",
                    label: "Thickness (mm)",
                    type: "customizable",
                    selectionKey: "thicknessSelect",
                    modalKey: "plateThickness",
                    dataSource: "thicknessList"
                }
            ]
        }
    ]
}; 