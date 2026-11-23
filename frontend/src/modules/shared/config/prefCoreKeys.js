/**
 * Core keys for the form fields that mean the same thing in every module, stated once.
 * A module config spreads these into its `coreKeys` (see CORE_KEYS_README.md):
 *
 *   coreKeys: { ...PREF_CORE_KEYS, ...MATERIAL_CORE_KEYS, bolt_diameter: KEY_D, ... }
 *
 * Spreading the whole object is fine: a field the module does not have is never looked at.
 * A module that handles one of these fields differently lists its own entry after the spread.
 */
import {
  KEY_CONNECTOR_MATERIAL,
  KEY_DESIGN_FOR,
  KEY_DP_BOLT_HOLE_TYPE,
  KEY_DP_BOLT_SLIP_FACTOR,
  KEY_DP_BOLT_TYPE,
  KEY_DP_DESIGN_METHOD,
  KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
  KEY_DP_DETAILING_EDGE_TYPE,
  KEY_DP_DETAILING_GAP,
  KEY_DP_DETAILING_PACKING_PLATE,
  KEY_DP_WELD_FAB,
  KEY_DP_WELD_MATERIAL_G_O,
  KEY_MATERIAL,
  KEY_SUPTDSEC_MATERIAL,
  KEY_SUPTNGSEC_MATERIAL,
} from "../../../constants/generated/coreKeys";

/** The Additional Inputs fields (Bolt, Weld, Detailing and Design tabs). Same key in every module. */
export const PREF_CORE_KEYS = {
  bolt_tension_type: KEY_DP_BOLT_TYPE,
  bolt_hole_type: KEY_DP_BOLT_HOLE_TYPE,
  bolt_slip_factor: KEY_DP_BOLT_SLIP_FACTOR,
  weld_fab: KEY_DP_WELD_FAB,
  weld_material_grade: KEY_DP_WELD_MATERIAL_G_O,
  detailing_edge_type: KEY_DP_DETAILING_EDGE_TYPE,
  detailing_gap: KEY_DP_DETAILING_GAP,
  detailing_corr_status: KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
  detailing_packing_plate: KEY_DP_DETAILING_PACKING_PLATE,
  design_method: KEY_DP_DESIGN_METHOD,
  design_for: KEY_DESIGN_FOR,
};

/**
 * The material rows (dock dropdown and Additional Inputs material rows) in their plain
 * one-to-one meaning. These differ by module (the shear modules send `connector_material`
 * as both `Connector.Material` and `Material`; tension sends `material` as the section
 * material), so a module overrides the rows it handles differently, after the spread.
 */
export const MATERIAL_CORE_KEYS = {
  material: KEY_MATERIAL,
  connector_material: KEY_CONNECTOR_MATERIAL,
  supported_material: KEY_SUPTDSEC_MATERIAL,
  supporting_material: KEY_SUPTNGSEC_MATERIAL,
};
