"""
``apps.core.design_dictionary``: the core's own Additional Inputs tables, and the port of the
desktop ``design_fn`` that uses them. No database is used.
"""
import ast
import importlib.util
from pathlib import Path

import pytest
from apps.core import design_dictionary as dd

from osdag_core import Common
from osdag_core.Common import (
    KEY_CONNECTOR_MATERIAL,
    KEY_DISP_FINPLATE,
    KEY_DISP_FLEXURE,
    KEY_DISP_TENSION_BOLTED,
    KEY_DP_BOLT_TYPE,
    KEY_DP_DETAILING_EDGE_TYPE,
    KEY_DP_WELD_MATERIAL_G_O,
    KEY_MATERIAL,
    KEY_SUPTDSEC_MATERIAL,
    KEY_SUPTNGSEC_MATERIAL,
)

BACKEND_DIR = Path(__file__).resolve().parents[3]
ROOT = BACKEND_DIR.parent
PURLIN = Common.KEY_DISP_FLEXURE4
GRADE = "E 250 (Fe 410 W)A"


def backend_module_ids():
    """Every MODULE_ID the web backend declares, as the desktop module name."""
    ids = set()
    for path in (BACKEND_DIR / "apps" / "modules").rglob("*.py"):
        for node in ast.parse(path.read_text(encoding="utf-8")).body:
            if isinstance(node, ast.Assign) and any(
                isinstance(t, ast.Name) and t.id == "MODULE_ID" for t in node.targets
            ):
                if isinstance(node.value, ast.Constant):
                    ids.add(node.value.value)
                elif isinstance(node.value, ast.Name):
                    ids.add(getattr(Common, node.value.id))
    return ids


def test_every_web_module_but_purlin_has_a_core_class():
    assert backend_module_ids() - {PURLIN} == set(dd.module_ids())


@pytest.mark.parametrize("module_id", dd.module_ids())
def test_core_class_is_the_module_of_its_id(module_id):
    assert dd._core_class(module_id).module_name() == module_id


@pytest.mark.parametrize("module_id", dd.module_ids())
def test_tables_are_plain_static_data(module_id):
    tables = dd.pref_tables(module_id)
    assert set(tables) == {"dock_keys", "pref_tabs", "dock_copies", "computed", "section_sources"}
    assert "Module" in tables["dock_keys"]
    assert len(tables["dock_keys"]) == len(set(tables["dock_keys"]))
    assert len(tables["computed"]) == len(set(tables["computed"]))
    for tab, kind, keys in tables["pref_tabs"]:
        assert isinstance(tab, str) and isinstance(kind, str) and isinstance(keys, list)
    for key, targets in tables["dock_copies"].items():
        assert key in tables["dock_keys"]
        assert len(targets) == len(set(targets))
    # A caller may mutate what it got without touching the cache.
    tables["computed"].append("x")
    assert "x" not in dd.pref_tables(module_id)["computed"]


def test_fin_plate_tables_match_the_core():
    tables = dd.pref_tables(KEY_DISP_FINPLATE)
    assert tables["dock_copies"] == {KEY_MATERIAL: [KEY_SUPTNGSEC_MATERIAL, KEY_SUPTDSEC_MATERIAL]}
    assert KEY_CONNECTOR_MATERIAL in tables["computed"]
    assert KEY_DP_BOLT_TYPE in tables["computed"]
    assert ["Column Section *", "ComboBox", [KEY_SUPTNGSEC_MATERIAL]] in tables["pref_tabs"]
    tables_by_key = {(row["dockKey"], row["table"]) for row in tables["section_sources"]}
    assert (Common.KEY_SUPTNGSEC, "Columns") in tables_by_key
    assert (Common.KEY_SUPTNGSEC, "Beams") in tables_by_key
    assert (Common.KEY_SUPTDSEC, "Beams") in tables_by_key


def test_images_and_titles_are_not_dock_values():
    keys = dd.pref_tables(KEY_DISP_FINPLATE)["dock_keys"]
    assert "Image" not in keys
    assert "Connectivity" in keys


def test_duplicate_key_in_tension_bolted_is_listed_once():
    computed = dd.pref_tables(KEY_DISP_TENSION_BOLTED)["computed"]
    assert computed.count(KEY_DP_DETAILING_EDGE_TYPE) == 1


def test_unknown_key_is_tolerated():
    # Flexure raises KeyError for a key its get_values_for_design_pref does not know.
    assert dd.computed_value(KEY_DISP_FLEXURE, "No.Such.Key", {KEY_MATERIAL: GRADE}) is None
    assert dd.computed_value(KEY_DISP_FINPLATE, KEY_DP_BOLT_TYPE, {}) is None  # dock key missing


def test_derive_without_prefs_copies_the_dock_and_asks_the_core():
    derived = dd.derive(KEY_DISP_FINPLATE, {KEY_MATERIAL: GRADE, "Bolt.Diameter": [12]})
    assert derived[KEY_SUPTNGSEC_MATERIAL] == derived[KEY_SUPTDSEC_MATERIAL] == GRADE
    assert derived[KEY_CONNECTOR_MATERIAL] == GRADE
    assert derived[KEY_DP_BOLT_TYPE] == "Pre-tensioned"
    assert derived[KEY_DP_WELD_MATERIAL_G_O] == "410"
    assert derived["Bolt.Diameter"] == [12]


def test_derive_without_the_driving_dock_key_skips_the_copy():
    derived = dd.derive(KEY_DISP_FINPLATE, {"Bolt.Diameter": [12]})
    assert KEY_SUPTNGSEC_MATERIAL not in derived
    assert derived == {"Bolt.Diameter": [12]}


def test_derive_with_prefs_is_the_dock_and_the_prefs():
    dock = {KEY_MATERIAL: GRADE, "Bolt.Diameter": [12]}
    prefs = {KEY_DP_BOLT_TYPE: "Bearing Bolt", KEY_CONNECTOR_MATERIAL: "E 350 (Fe 490)"}
    assert dd.derive(KEY_DISP_FINPLATE, dock, prefs) == {**dock, **prefs}


def test_derive_computed_sees_the_earlier_answers_and_leaves_the_dock_alone():
    dock = {KEY_MATERIAL: GRADE}
    answers = dd.derive_computed(KEY_DISP_FINPLATE, dock)
    assert dock == {KEY_MATERIAL: GRADE}
    assert set(answers) <= set(dd.pref_tables(KEY_DISP_FINPLATE)["computed"])
    assert answers[KEY_CONNECTOR_MATERIAL] == GRADE


def test_generated_js_tables_are_current():
    spec = importlib.util.spec_from_file_location("gen_core_keys", ROOT / "scripts" / "gen_core_keys.py")
    gen = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gen)
    expected = gen.render_tables(gen.collect_pref_tables())
    assert gen.TABLES_OUTPUT.read_text(encoding="utf-8") == expected, (
        "frontend/src/constants/generated/designPrefTables.js is stale: run python scripts/gen_core_keys.py"
    )
