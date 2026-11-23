/**
 * Per-module config for Design Prefs (Additional Inputs) modal: tabs, initial tab, initial prefs, default prefs.
 * Keyed by module session name (e.g. "Butt Joint Bolted") or, for the shear connections, the module id.
 * Tab ids: 0 Column Section*, 1 Beam Section*, 2 Connector, 3 Bolt, 4 Weld, 5 Detailing, 6 Design.
 */

import {
  KEY_BASE_PLATE_MATERIAL,
  KEY_DISP_CLEATANGLE,
  KEY_DISP_SEATED_ANGLE,
  KEY_DP_ANCHOR_BOLT_DESIGNATION_ICF,
  KEY_DP_ANCHOR_BOLT_DESIGNATION_OCF,
  KEY_DP_ANCHOR_BOLT_FRICTION,
  KEY_DP_ANCHOR_BOLT_GALVANIZED_ICF,
  KEY_DP_ANCHOR_BOLT_GALVANIZED_OCF,
  KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF,
  KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF,
  KEY_DP_ANCHOR_BOLT_LENGTH_ICF,
  KEY_DP_ANCHOR_BOLT_LENGTH_OCF,
  KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_ICF,
  KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_OCF,
  KEY_DP_ANCHOR_BOLT_TYPE_ICF,
  KEY_DP_ANCHOR_BOLT_TYPE_OCF,
  KEY_DP_DESIGN_BASE_PLATE,
  KEY_DP_DESIGN_METHOD,
  KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
  KEY_DP_DETAILING_EDGE_TYPE,
  KEY_DP_WELD_FAB,
  KEY_DP_WELD_MATERIAL_G_O,
  KEY_ST_KEY_MATERIAL,
} from "../../../constants/generated/coreKeys";

const ALL_TABS = [
  { id: 0, name: "Column Section*" },
  { id: 1, name: "Beam Section*" },
  { id: 2, name: "Angle Section" },
  { id: 3, name: "Connector" },
  { id: 4, name: "Cleat Angle" },
  { id: 5, name: "Seated Angle Connection" },
  { id: 6, name: "Bolt" },
  { id: 7, name: "Base Plate" },
  { id: 8, name: "Stiffener/Shear Key" },
  { id: 9, name: "Anchor Bolt" },
  { id: 10, name: "Weld" },
  { id: 11, name: "Detailing" },
  { id: 12, name: "Optimization" },
  { id: 13, name: "Design" },
];

const DEFAULT_INITIAL_PREFS = (inputs) => ({
  supported_material: inputs.supported_material,
  supporting_material: inputs.supporting_material,
  connector_material: inputs.connector_material,
  bolt_tension_type: inputs.bolt_tension_type ?? "Pre-tensioned",
  bolt_hole_type: inputs.bolt_hole_type ?? "Standard",
  bolt_slip_factor: inputs.bolt_slip_factor ?? "0.2",
  weld_fab: inputs.weld_fab ?? "Shop weld",
  weld_material_grade: inputs.weld_material_grade || "290",
  detailing_edge_type: inputs.detailing_edge_type ?? "Sheared or hand flame cut",
  detailing_packing_plate: inputs.detailing_packing_plate ?? "Yes",
  detailing_gap: inputs.detailing_gap ?? "0",
  detailing_corr_status: inputs.detailing_corr_status ?? "No",
  design_method: inputs.design_method ?? "Limited State Design",
  design_for: inputs.design_for ?? "Tension",
});

const DESIGN_PREF_CONFIG = {
  "Butt Joint Bolted": {
    tabIds: [6, 11],
    initialTabIndex: 6,
    getInitialPrefs: (inputs) => ({
      bolt_tension_type: inputs.bolt_tension_type ?? "Pre-tensioned",
      bolt_hole_type: inputs.bolt_hole_type ?? "Standard",
      bolt_slip_factor: inputs.bolt_slip_factor ?? "0.2",
      detailing_edge_type: inputs.detailing_edge_type ?? "Sheared or hand flame cut",
      detailing_packing_plate: inputs.detailing_packing_plate ?? "Yes",
      design_for: inputs.design_for ?? "Tension",
    }),
    getDefaultPrefs: () => ({
      bolt_tension_type: "Pre-tensioned",
      bolt_hole_type: "Standard",
      bolt_slip_factor: "0.2",
      detailing_edge_type: "Sheared or hand flame cut",
      detailing_packing_plate: "Yes",
      design_for: "Tension",
    }),
  },
  "Lap Joint Bolted": {
    tabIds: [6, 11],
    initialTabIndex: 6,
    getInitialPrefs: (inputs) => ({
      bolt_tension_type: inputs.bolt_tension_type ?? "Pre-tensioned",
      bolt_hole_type: inputs.bolt_hole_type ?? "Standard",
      bolt_slip_factor: inputs.bolt_slip_factor ?? "0.2",
      detailing_edge_type: inputs.detailing_edge_type ?? "Sheared or hand flame cut",
      design_for: inputs.design_for ?? "Tension",
    }),
    getDefaultPrefs: () => ({
      bolt_tension_type: "Pre-tensioned",
      bolt_hole_type: "Standard",
      bolt_slip_factor: "0.2",
      detailing_edge_type: "Sheared or hand flame cut",
      design_for: "Tension",
    }),
  },
  "Butt Joint Welded": {
    tabIds: [10, 11],
    initialTabIndex: 10,
    getInitialPrefs: (inputs) => ({
      weld_fab: inputs.weld_fab ?? "Shop weld",
      weld_material_grade: inputs.weld_material_grade || "290",
      detailing_edge_type: inputs.detailing_edge_type ?? "Sheared or hand flame cut",
      detailing_packing_plate: inputs.detailing_packing_plate ?? "Yes",
      design_for: inputs.design_for ?? "Tension",
    }),
    getDefaultPrefs: (inputs) => {
      const defs = {
        weld_fab: "Shop weld",
        weld_material_grade: inputs.weld_material_grade || "290",
        detailing_edge_type: "Sheared or hand flame cut",
        design_for: "Tension",
      };
      defs.detailing_packing_plate = "Yes";
      return defs;
    },
  },
  "Lap Joint Welded": {
    tabIds: [10, 11],
    initialTabIndex: 10,
    getInitialPrefs: (inputs) => ({
      weld_fab: inputs.weld_fab ?? "Shop weld",
      weld_material_grade: inputs.weld_material_grade || "290",
      detailing_edge_type: inputs.detailing_edge_type ?? "Sheared or hand flame cut",
      detailing_packing_plate: inputs.detailing_packing_plate,
      design_for: inputs.design_for ?? "Tension",
    }),
    getDefaultPrefs: (inputs) => {
      const defs = {
        weld_fab: "Shop weld",
        weld_material_grade: inputs.weld_material_grade || "290",
        detailing_edge_type: "Sheared or hand flame cut",
        design_for: "Tension",
      };
      return defs;
    },
  },
  "Column Cover Plate Bolted Connection": {
    tabIds: [0, 3, 6, 11, 13],
    initialTabIndex: 0,
    getInitialPrefs: (inputs) => ({
      // The Column Section tab shows the supporting material row.
      supporting_material: inputs.member_material ?? inputs.material,
      supported_material: inputs.member_material ?? inputs.material,
      connector_material: inputs.connector_material,
      bolt_tension_type: inputs.bolt_tension_type,
      bolt_hole_type: inputs.bolt_hole_type,
      bolt_slip_factor: inputs.bolt_slip_factor,
      detailing_edge_type: inputs.detailing_edge_type,
      detailing_gap: inputs.detailing_gap,
      detailing_corr_status: inputs.detailing_corr_status,
      design_method: inputs.design_method,
    }),
    getDefaultPrefs: (_inputs, _module, contextDefaults) => contextDefaults || {},
  },
  "Beam Cover Plate Bolted Connection": {
    tabIds: [1, 3, 6, 11, 13],
    initialTabIndex: 1,
    getInitialPrefs: (inputs) => ({
      supported_material: inputs.member_material ?? inputs.material,
      connector_material: inputs.connector_material,
      bolt_tension_type: inputs.bolt_tension_type,
      bolt_hole_type: inputs.bolt_hole_type,
      bolt_slip_factor: inputs.bolt_slip_factor,
      detailing_edge_type: inputs.detailing_edge_type,
      detailing_gap: inputs.detailing_gap,
      detailing_corr_status: inputs.detailing_corr_status,
      design_method: inputs.design_method,
    }),
    getDefaultPrefs: (_inputs, _module, contextDefaults) => contextDefaults || {},
  },
  "Column Cover Plate Welded Connection": {
    tabIds: [0, 3, 10, 11, 13],
    initialTabIndex: 0,
    getInitialPrefs: (inputs) => ({
      // This module sends Member.Material from the dock `material` (its member_material feeds nothing),
      // so that is the member's material. The Column Section tab shows the supporting material row.
      supporting_material: inputs.material,
      supported_material: inputs.material,
      connector_material: inputs.connector_material,
      weld_fab: inputs.weld_fab ?? "Shop Weld",
      weld_material_grade: inputs.weld_material_grade || inputs.weld_material_grade_overwrite || "290",
      detailing_edge_type: inputs.detailing_edge_type ?? "Sheared or hand flame cut",
      detailing_gap: inputs.detailing_gap ?? "3",
      detailing_corr_status: inputs.detailing_corr_status ?? "No",
      design_method: inputs.design_method ?? "Limit State Design",
    }),
    getDefaultPrefs: (_inputs, _module, contextDefaults) => contextDefaults || {},
  },
  "Beam Cover Plate Welded Connection": {
    tabIds: [1, 3, 10, 11, 13],
    initialTabIndex: 1,
    getInitialPrefs: (inputs) => ({
      supported_material: inputs.member_material ?? inputs.material,
      connector_material: inputs.connector_material,
      weld_fab: inputs.weld_fab ?? "Shop Weld",
      weld_material_grade: inputs.weld_material_grade || inputs.weld_material_grade_overwrite || "290",
      detailing_edge_type: inputs.detailing_edge_type ?? "Sheared or hand flame cut",
      detailing_gap: inputs.detailing_gap ?? "3",
      detailing_corr_status: inputs.detailing_corr_status ?? "No",
      design_method: inputs.design_method ?? "Limit State Design",
    }),
    getDefaultPrefs: (_inputs, _module, contextDefaults) => contextDefaults || {},
  },
  "Column Column End Plate Connection": {
    tabIds: [0, 3, 6, 10, 11, 13],
    initialTabIndex: 0,
    getInitialPrefs: (inputs) => ({
      supported_material: inputs.member_material ?? inputs.material,
      connector_material: inputs.connector_material,
      bolt_tension_type: inputs.bolt_tension_type,
      bolt_hole_type: inputs.bolt_hole_type,
      bolt_slip_factor: inputs.bolt_slip_factor,
      weld_fab: inputs.weld_fab ?? "Shop Weld",
      weld_material_grade: inputs.weld_material_grade || "410",
      detailing_edge_type: inputs.detailing_edge_type,
      detailing_gap: inputs.detailing_gap,
      detailing_corr_status: inputs.detailing_corr_status,
      design_method: inputs.design_method,
    }),
    getDefaultPrefs: (_inputs, _module, contextDefaults) => contextDefaults || {},
  },
  "Beam Beam End Plate Connection": {
    tabIds: [1, 3, 6, 10, 11, 13],
    initialTabIndex: 1,
    getInitialPrefs: (inputs) => ({
      supported_material: inputs.supported_material,
      connector_material: inputs.connector_material,
      bolt_tension_type: inputs.bolt_tension_type,
      bolt_hole_type: inputs.bolt_hole_type,
      bolt_slip_factor: inputs.bolt_slip_factor,
      weld_fab: inputs.weld_fab,
      weld_material_grade: inputs.weld_material_grade || "290",
      detailing_edge_type: inputs.detailing_edge_type,
      detailing_gap: inputs.detailing_gap,
      detailing_corr_status: inputs.detailing_corr_status,
      design_method: inputs.design_method,
    }),
    getDefaultPrefs: (_inputs, _module, contextDefaults) => contextDefaults || {},
  },
  "Beam to Column End Plate Connection": {
    tabIds: [0, 1, 3, 6, 10, 11, 13],
    initialTabIndex: 0,
    getInitialPrefs: (inputs) => ({
      supported_material: inputs.supported_material,
      connector_material: inputs.connector_material,
      bolt_tension_type: inputs.bolt_tension_type,
      bolt_hole_type: inputs.bolt_hole_type,
      bolt_slip_factor: inputs.bolt_slip_factor,
      weld_fab: inputs.weld_fab,
      weld_material_grade: inputs.weld_material_grade || "290",
      detailing_edge_type: inputs.detailing_edge_type,
      detailing_gap: inputs.detailing_gap,
      detailing_corr_status: inputs.detailing_corr_status,
      design_method: inputs.design_method,
    }),
    getDefaultPrefs: (_inputs, _module, contextDefaults) => contextDefaults || {},
  },
  "Base Plate": {
    tabIds: [0, 7, 8, 9, 10, 11, 13],
    initialTabIndex: 0,
    getInitialPrefs: (inputs) => ({
      supported_material: inputs.supported_material ?? inputs.member_material ?? inputs.material ?? "E 250 (Fe 410 W)A",
      connector_material: inputs.connector_material ?? inputs.member_material ?? inputs.material ?? "E 250 (Fe 410 W)A",
      bolt_tension_type: inputs.bolt_tension_type ?? "Pre-tensioned",
      bolt_hole_type: inputs.bolt_hole_type ?? "Standard",
      bolt_slip_factor: inputs.bolt_slip_factor ?? "0.3",
      weld_fab: inputs[KEY_DP_WELD_FAB] ?? inputs.weld_fab ?? "Shop Weld",
      weld_material_grade: inputs[KEY_DP_WELD_MATERIAL_G_O] || inputs.weld_material_grade || "290",
      detailing_edge_type: inputs[KEY_DP_DETAILING_EDGE_TYPE] ?? inputs.detailing_edge_type ?? "Sheared or hand flame cut",
      detailing_gap: inputs.detailing_gap ?? "10",
      detailing_corr_status: inputs[KEY_DP_DETAILING_CORROSIVE_INFLUENCES] ?? inputs.detailing_corr_status ?? "No",
      design_method: inputs[KEY_DP_DESIGN_METHOD] ?? inputs.design_method ?? "Limit State Design",

      // Anchor Bolt OCF
      [KEY_DP_ANCHOR_BOLT_DESIGNATION_OCF]: inputs[KEY_DP_ANCHOR_BOLT_DESIGNATION_OCF] ?? "",
      [KEY_DP_ANCHOR_BOLT_TYPE_OCF]: inputs[KEY_DP_ANCHOR_BOLT_TYPE_OCF] ?? "End Plate Type",
      [KEY_DP_ANCHOR_BOLT_GALVANIZED_OCF]: inputs[KEY_DP_ANCHOR_BOLT_GALVANIZED_OCF] ?? "Yes",
      [KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF]: inputs[KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF] ?? "Over-sized",
      [KEY_DP_ANCHOR_BOLT_LENGTH_OCF]: inputs[KEY_DP_ANCHOR_BOLT_LENGTH_OCF] ?? "300",
      [KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_OCF]: inputs[KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_OCF] ?? "0",

      // Anchor Bolt ICF
      [KEY_DP_ANCHOR_BOLT_DESIGNATION_ICF]: inputs[KEY_DP_ANCHOR_BOLT_DESIGNATION_ICF] ?? "",
      [KEY_DP_ANCHOR_BOLT_TYPE_ICF]: inputs[KEY_DP_ANCHOR_BOLT_TYPE_ICF] ?? "End Plate Type",
      [KEY_DP_ANCHOR_BOLT_GALVANIZED_ICF]: inputs[KEY_DP_ANCHOR_BOLT_GALVANIZED_ICF] ?? "Yes",
      [KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF]: inputs[KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF] ?? "Over-sized",
      [KEY_DP_ANCHOR_BOLT_LENGTH_ICF]: inputs[KEY_DP_ANCHOR_BOLT_LENGTH_ICF] ?? "300",
      [KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_ICF]: inputs[KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_ICF] ?? "0",

      // Anchor General
      [KEY_DP_ANCHOR_BOLT_FRICTION]: inputs[KEY_DP_ANCHOR_BOLT_FRICTION] ?? "0.30",

      // Base Plate & Stiffener materials
      [KEY_BASE_PLATE_MATERIAL]: inputs[KEY_BASE_PLATE_MATERIAL] ?? inputs.supporting_material ?? inputs.member_material ?? inputs.material ?? "E 250 (Fe 410 W)A",
      [KEY_ST_KEY_MATERIAL]: inputs[KEY_ST_KEY_MATERIAL] ?? inputs.supporting_material ?? inputs.member_material ?? inputs.material ?? "E 250 (Fe 410 W)A",

      // Other design keys
      [KEY_DP_DESIGN_BASE_PLATE]: inputs[KEY_DP_DESIGN_BASE_PLATE] ?? "Effective Area Method",
    }),
    getDefaultPrefs: (inputs) => ({
      supported_material: inputs.supported_material ?? inputs.member_material ?? inputs.material ?? "E 250 (Fe 410 W)A",
      connector_material: inputs.connector_material ?? inputs.member_material ?? inputs.material ?? "E 250 (Fe 410 W)A",
      bolt_tension_type: "Pre-tensioned",
      bolt_hole_type: "Standard",
      bolt_slip_factor: "0.3",
      weld_fab: "Shop Weld",
      weld_material_grade: "290",
      detailing_edge_type: "Sheared or hand flame cut",
      detailing_gap: "10",
      detailing_corr_status: "No",
      design_method: "Limit State Design",

      [KEY_DP_WELD_FAB]: "Shop Weld",
      [KEY_DP_WELD_MATERIAL_G_O]: "290",
      [KEY_DP_DETAILING_EDGE_TYPE]: "Sheared or hand flame cut",
      [KEY_DP_DETAILING_CORROSIVE_INFLUENCES]: "No",
      [KEY_DP_DESIGN_METHOD]: "Limit State Design",

      [KEY_DP_ANCHOR_BOLT_DESIGNATION_OCF]: "",
      [KEY_DP_ANCHOR_BOLT_TYPE_OCF]: "End Plate Type",
      [KEY_DP_ANCHOR_BOLT_GALVANIZED_OCF]: "Yes",
      [KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF]: "Over-sized",
      [KEY_DP_ANCHOR_BOLT_LENGTH_OCF]: "300",
      [KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_OCF]: "0",

      [KEY_DP_ANCHOR_BOLT_DESIGNATION_ICF]: "",
      [KEY_DP_ANCHOR_BOLT_TYPE_ICF]: "End Plate Type",
      [KEY_DP_ANCHOR_BOLT_GALVANIZED_ICF]: "Yes",
      [KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF]: "Over-sized",
      [KEY_DP_ANCHOR_BOLT_LENGTH_ICF]: "300",
      [KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_ICF]: "0",

      [KEY_DP_ANCHOR_BOLT_FRICTION]: "0.30",

      [KEY_BASE_PLATE_MATERIAL]: inputs.supporting_material ?? inputs.member_material ?? inputs.material ?? "E 250 (Fe 410 W)A",
      [KEY_ST_KEY_MATERIAL]: inputs.supporting_material ?? inputs.member_material ?? inputs.material ?? "E 250 (Fe 410 W)A",

      [KEY_DP_DESIGN_BASE_PLATE]: "Effective Area Method",
    }),
  },
  [KEY_DISP_CLEATANGLE]: {
    tabIds: [0, 1, 4, 6, 11, 13],
    initialTabIndex: 0,
    getInitialPrefs: (inputs) => ({
      supported_material: inputs.supported_material,
      supporting_material: inputs.supporting_material,
      connector_material: inputs.connector_material,
      bolt_tension_type: inputs.bolt_tension_type ?? "Pre-tensioned",
      bolt_hole_type: inputs.bolt_hole_type ?? "Standard",
      bolt_slip_factor: inputs.bolt_slip_factor ?? "0.2",
      weld_fab: inputs.weld_fab ?? "Shop weld",
      weld_material_grade: inputs.weld_material_grade || "290",
      detailing_edge_type: inputs.detailing_edge_type ?? "Sheared or hand flame cut",
      detailing_gap: inputs.detailing_gap ?? "10",
      detailing_corr_status: inputs.detailing_corr_status ?? "No",
      detailing_packing_plate: inputs.detailing_packing_plate,
      design_method: inputs.design_method ?? "Limited State Design",
      design_for: inputs.design_for ?? "Tension",
    }),
    getDefaultPrefs: (inputs) => ({
      supported_material: inputs.supported_material,
      supporting_material: inputs.supporting_material,
      connector_material: inputs.connector_material,
      bolt_tension_type: "Pre-tensioned",
      bolt_hole_type: "Standard",
      bolt_slip_factor: "0.2",
      weld_fab: "Shop weld",
      weld_material_grade: inputs.weld_material_grade || "290",
      detailing_edge_type: "Sheared or hand flame cut",
      detailing_gap: "0",
      detailing_corr_status: "No",
      design_method: "Limited State Design",
      design_for: "Tension",
    }),
  },
  "Tension Member Bolted Design":{
    tabIds: [2, 3, 6, 11, 13],
    initialTabIndex: 2,
    getInitialPrefs: (inputs) => ({
      supported_material: inputs.member_material ?? inputs.material,
      connector_material: inputs.connector_material,
      bolt_tension_type: inputs.bolt_tension_type,
      bolt_hole_type: inputs.bolt_hole_type,
      bolt_slip_factor: inputs.bolt_slip_factor,
      detailing_edge_type: inputs.detailing_edge_type,
      detailing_gap: inputs.detailing_gap,
      detailing_corr_status: inputs.detailing_corr_status,
      design_method: inputs.design_method,
    }),
    getDefaultPrefs: (_inputs, _module, contextDefaults) => contextDefaults || {},
  },
  "Tension Member Welded Design":{
    tabIds: [2, 3, 10, 11, 13],
    initialTabIndex: 2,
    getInitialPrefs: (inputs) => ({
      supported_material: inputs.member_material ?? inputs.material,
      connector_material: inputs.connector_material,
      weld_fab: inputs.weld_fab,
      weld_material_grade: inputs.weld_material_grade || "290",
      detailing_edge_type: inputs.detailing_edge_type,
      detailing_gap: inputs.detailing_gap,
      detailing_corr_status: inputs.detailing_corr_status,
      design_method: inputs.design_method,
    }),
    getDefaultPrefs: (_inputs, _module, contextDefaults) => contextDefaults || {},
  },
  "Axially Loaded Column": {
    tabIds: [0, 12, 13],
    initialTabIndex: 0,
    getInitialPrefs: (inputs) => ({
      supporting_material: inputs.supporting_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      supported_material: inputs.supported_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      connector_material: inputs.connector_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      design_method: inputs.design_method || "Limited State Design",
      allow_ur: inputs.allow_ur || "1.0",
      effective_area_parameter: inputs.effective_area_parameter || "1.0",
    }),
    getDefaultPrefs: (inputs) => ({
      supporting_material: inputs.supporting_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      supported_material: inputs.supported_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      connector_material: inputs.connector_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      design_method: "Limited State Design",
      allow_ur: "1.0",
      effective_area_parameter: "1.0",
    }),
  },
  "Struts Bolted to End Gusset":{
    tabIds: [2, 3, 6, 11, 13],
    initialTabIndex: 2,
    getInitialPrefs: (inputs) => ({
      supported_material: inputs.member_material ?? inputs.material,
      connector_material: inputs.connector_material,
      bolt_tension_type: inputs.bolt_tension_type,
      bolt_hole_type: inputs.bolt_hole_type,
      bolt_slip_factor: inputs.bolt_slip_factor,
      detailing_edge_type: inputs.detailing_edge_type,
      detailing_gap: inputs.detailing_gap,
      detailing_corr_status: inputs.detailing_corr_status,
      design_method: inputs.design_method,
    }),
    getDefaultPrefs: (_inputs, _module, contextDefaults) => contextDefaults || {},
  },
  "Struts Welded to End Gusset":{
    tabIds: [2, 3, 10, 11, 13],
    initialTabIndex: 2,
    getInitialPrefs: (inputs) => ({
      supported_material: inputs.member_material ?? inputs.material,
      connector_material: inputs.connector_material,
      weld_fab: inputs.weld_fab ?? "Shop weld",
      weld_material_grade: inputs.weld_material_grade || "290",
      detailing_edge_type: inputs.detailing_edge_type ?? "Sheared or hand flame cut",
      detailing_gap: inputs.detailing_gap ?? "0",
      detailing_corr_status: inputs.detailing_corr_status ?? "No",
      design_method: inputs.design_method ?? "Limited State Design",
    }),
    getDefaultPrefs: (_inputs, _module, contextDefaults) => contextDefaults || {},
  },
  "Simply Supported Beam Design":{
    tabIds: [0, 12, 13],
    initialTabIndex: 0,
    getInitialPrefs: (inputs) => ({
      supporting_material: inputs.supporting_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      supported_material: inputs.supported_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      connector_material: inputs.connector_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      bolt_tension_type: inputs.bolt_tension_type,
      bolt_hole_type: inputs.bolt_hole_type,
      bolt_slip_factor: inputs.bolt_slip_factor,
      detailing_edge_type: inputs.detailing_edge_type,
      detailing_gap: inputs.detailing_gap,
      detailing_corr_status: inputs.detailing_corr_status,
      design_method: inputs.design_method || "Limited State Design",
    }),
    getDefaultPrefs: (inputs) => ({
      supporting_material: inputs.supporting_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      supported_material: inputs.supported_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      connector_material: inputs.connector_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      bolt_tension_type: "Pre-tensioned",
      bolt_hole_type: "Standard",
      bolt_slip_factor: "0.2",
      detailing_edge_type: "Sheared or hand flame cut",
      detailing_gap: "0",
      detailing_corr_status: "No",
      design_method: "Limited State Design",
    }),
  },
  "On Cantilever Beam Design":{
    tabIds: [0, 12, 13],
    initialTabIndex: 0,
    getInitialPrefs: (inputs) => ({
      supporting_material: inputs.supporting_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      supported_material: inputs.supported_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      connector_material: inputs.connector_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      bolt_tension_type: inputs.bolt_tension_type,
      bolt_hole_type: inputs.bolt_hole_type,
      bolt_slip_factor: inputs.bolt_slip_factor,
      detailing_edge_type: inputs.detailing_edge_type,
      detailing_gap: inputs.detailing_gap,
      detailing_corr_status: inputs.detailing_corr_status,
      design_method: inputs.design_method || "Limited State Design",
    }),
    getDefaultPrefs: (inputs) => ({
      supporting_material: inputs.supporting_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      supported_material: inputs.supported_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      connector_material: inputs.connector_material || inputs.member_material || inputs.material || "E 250 (Fe 410 W)A",
      bolt_tension_type: "Pre-tensioned",
      bolt_hole_type: "Standard",
      bolt_slip_factor: "0.2",
      detailing_edge_type: "Sheared or hand flame cut",
      detailing_gap: "0",
      detailing_corr_status: "No",
      design_method: "Limited State Design",
    }),
  },
  [KEY_DISP_SEATED_ANGLE]: {
    tabIds: [0, 1, 5, 6, 11, 13],
    initialTabIndex: 0,
  
    getInitialPrefs: (inputs) => ({
      // Designation
      designation: inputs.designation || "50 x 50 x 3",

      // Material
      material: inputs.material || "E 165 (Fe 290)",
      supported_material: inputs.supported_material || "E 165 (Fe 290)",
      supporting_material: inputs.supporting_material || "E 165 (Fe 290)",

      // Mechanical Properties
      fu: inputs.fu || 290,
      fy: inputs.fy || 165,
      elastic_modulus: inputs.elastic_modulus || 200,
      shear_modulus: inputs.shear_modulus || 76.9,
      poisson_ratio: inputs.poisson_ratio || 0.3,
      thermal_coefficient: inputs.thermal_coefficient || 12,

      // Type & Source
      type: inputs.type || "Rolled",
      source: inputs.source || "IS808 Rev",

      // Dimensions
      long_leg: inputs.long_leg || 50,
      short_leg: inputs.short_leg || 50,
      thickness: inputs.thickness || 3,
      root_radius: inputs.root_radius || 6,
      toe_radius: inputs.toe_radius || 0,

      // Bolt
      bolt_hole_type: inputs.bolt_hole_type ?? "Standard",
      bolt_slip_factor: inputs.bolt_slip_factor ?? "0.3",
      bolt_tension_type: inputs.bolt_tension_type ?? "Pre-tensioned",

      // Detailing
      weld_fab: inputs.weld_fab ?? "Shop weld",
      weld_material_grade: inputs.weld_material_grade || "290",
      detailing_edge_type:
        inputs.detailing_edge_type ?? "Sheared or hand flame cut",
      detailing_packing_plate: inputs.detailing_packing_plate,
      detailing_gap: inputs.detailing_gap ?? "10",
      detailing_corr_status: inputs.detailing_corr_status ?? "No",

      // Design
      design_for: inputs.design_for ?? "Tension",
      design_method: inputs.design_method ?? "Limit State Design",
    }),

    getDefaultPrefs: (inputs) => ({
      designation: "50 x 50 x 3",
      material: "E 165 (Fe 290)",
      supported_material: "E 165 (Fe 290)",
      supporting_material: "E 165 (Fe 290)",

      fu: 290,
      fy: 165,
      elastic_modulus: 200,
      shear_modulus: 76.9,
      poisson_ratio: 0.3,
      thermal_coefficient: 12,

      type: "Rolled",
      source: "IS808 Rev",

      long_leg: 50,
      short_leg: 50,
      thickness: 3,
      root_radius: 6,
      toe_radius: 0,

      bolt_hole_type: "Standard",
      bolt_slip_factor: "0.3",
      bolt_tension_type: "Pre-tensioned",

      weld_fab: "Shop weld",
      weld_material_grade: inputs.weld_material_grade || "290",
      detailing_edge_type: "Sheared or hand flame cut",
      detailing_gap: "10",
      detailing_corr_status: "No",

      design_for: "Tension",
      design_method: "Limit State Design",
    }),
  },
};

const DEFAULT_CONFIG = {
  tabIds: [0, 1, 3, 6, 10, 11, 13],
  initialTabIndex: 0,
  getInitialPrefs: (inputs) => DEFAULT_INITIAL_PREFS(inputs),
  getDefaultPrefs: (_inputs, _module, contextDefaults) => contextDefaults || {},
};

/**
 * @param {string} module - Module session name (e.g. "Butt Joint Bolted", "Fin Plate Connection")
 * @returns Config with tabIds, initialTabIndex, getInitialPrefs, getDefaultPrefs
 */
export function getDesignPrefConfig(module) {
  return DESIGN_PREF_CONFIG[module] || DEFAULT_CONFIG;
}

export function getDesignPrefTabs(module) {
  const config = getDesignPrefConfig(module);
  return ALL_TABS.filter((tab) => config.tabIds.includes(tab.id));
}
