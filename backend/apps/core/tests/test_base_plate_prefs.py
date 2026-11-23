"""
The base plate adapter takes the Additional Inputs the web saves and hands them to the core.

A pref that is not in the request keeps the adapter's own default; one that is in the request
reaches the core module's design preference attributes.
"""
import json
from pathlib import Path

from apps.modules.base_plate import adapter
from osdag_core.Common import (
    KEY_BASE_PLATE_MATERIAL,
    KEY_DP_ANCHOR_BOLT_FRICTION,
    KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF,
    KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF,
    KEY_DP_DESIGN_BASE_PLATE,
    KEY_DP_DESIGN_METHOD,
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DETAILING_EDGE_TYPE,
    KEY_DP_FAB_FIELD,
    KEY_DP_WELD_FAB,
    KEY_DP_WELD_MATERIAL_G_O,
    KEY_SEC_MATERIAL,
    KEY_ST_KEY_MATERIAL,
)

FIXTURE = (
    Path(__file__).resolve().parent
    / "fixtures" / "design_inputs" / "base_plate" / "defaults-all__welded-column-base.json"
)


def _inputs():
    with open(FIXTURE, encoding="utf-8") as fh:
        return json.load(fh)["inputs"]


def test_unsaved_prefs_keep_the_adapter_defaults():
    module = adapter.create_from_input(_inputs())
    assert module.dp_column_material == "E 250 (Fe 410 W)A"
    assert module.dp_bp_material == "E 250 (Fe 410 W)A"
    assert module.dp_stif_key_material == "E 250 (Fe 410 W)A"
    assert module.dp_anchor_hole_out == "Over-sized"
    assert module.dp_anchor_friction == 0.30
    assert module.dp_weld_fab == "Shop Weld"
    assert module.dp_weld_fu_overwrite == 410.0
    assert module.dp_detail_edge_type == "b - Machine flame cut"
    assert module.dp_detail_is_corrosive == "No"


def test_saved_prefs_reach_the_core_module():
    prefs = {
        KEY_SEC_MATERIAL: "E 350 (Fe 490)",
        KEY_BASE_PLATE_MATERIAL: "E 300 (Fe 440)",
        KEY_ST_KEY_MATERIAL: "E 410 (Fe 540)",
        KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF: "Standard",
        KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF: "Standard",
        KEY_DP_ANCHOR_BOLT_FRICTION: "0.45",
        KEY_DP_WELD_FAB: KEY_DP_FAB_FIELD,
        KEY_DP_WELD_MATERIAL_G_O: "490",
        KEY_DP_DETAILING_EDGE_TYPE: "Sheared or hand flame cut",
        KEY_DP_DETAILING_CORROSIVE_INFLUENCES: "Yes",
        KEY_DP_DESIGN_METHOD: "Limit State Design",
        KEY_DP_DESIGN_BASE_PLATE: "Effective Area Method",
    }
    module = adapter.create_from_input({**_inputs(), **prefs})
    assert module.dp_column_material == "E 350 (Fe 490)"
    assert module.dp_bp_material == "E 300 (Fe 440)"
    assert module.dp_stif_key_material == "E 410 (Fe 540)"
    assert module.dp_anchor_hole_out == "Standard"
    assert module.dp_anchor_hole_in == "Standard"
    assert module.dp_anchor_friction == 0.45
    assert module.dp_weld_fab == KEY_DP_FAB_FIELD
    assert module.dp_weld_fu_overwrite == 490.0
    assert module.dp_detail_edge_type == "Sheared or hand flame cut"
    assert module.dp_detail_is_corrosive == "Yes"
