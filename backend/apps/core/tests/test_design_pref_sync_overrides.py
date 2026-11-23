"""
Where the core's tables and the old web sync rules disagree, ``sync_merge`` keeps the old
behaviour in small ``LEGACY_*`` tables so the goldens (``test_design_pref_sync_golden.py``) stay
valid. Each row is a decision still to be taken: this test lists them, so changing either side
(a core table, or an override) is a visible edit here, and an override the core has caught up
with is reported as removable.

No database is used.
"""
import pytest
from apps.core.api.design import sync_merge
from apps.core.design_dictionary import module_ids

from osdag_core.Common import (
    KEY_DISP_BASE_PLATE,
    KEY_DISP_BB_EP_SPLICE,
    KEY_DISP_BCENDPLATE,
    KEY_DISP_BEAMCOVERPLATE,
    KEY_DISP_BEAMCOVERPLATEWELD,
    KEY_DISP_BUTTJOINTBOLTED,
    KEY_DISP_BUTTJOINTWELDED,
    KEY_DISP_CLEATANGLE,
    KEY_DISP_COLUMNCOVERPLATE,
    KEY_DISP_COLUMNCOVERPLATEWELD,
    KEY_DISP_COLUMNENDPLATE,
    KEY_DISP_COMPRESSION_COLUMN,
    KEY_DISP_FINPLATE,
    KEY_DISP_FLEXURE,
    KEY_DISP_FLEXURE2,
    KEY_DISP_HEADERPLATE,
    KEY_DISP_LAPJOINTBOLTED,
    KEY_DISP_LAPJOINTWELDED,
    KEY_DISP_PLATE_GIRDER_WELDED,
    KEY_DISP_SEATED_ANGLE,
    KEY_DISP_STRUT_BOLTED_END_GUSSET,
    KEY_DISP_STRUT_WELDED_END_GUSSET,
    KEY_DISP_TENSION_BOLTED,
    KEY_DISP_TENSION_WELDED,
)

# Material rules: modules whose old rule differs from the core's 'Input Dock' rows.
RULE_OVERRIDES = {
    KEY_DISP_BCENDPLATE,
    KEY_DISP_BB_EP_SPLICE, KEY_DISP_COLUMNENDPLATE, KEY_DISP_BASE_PLATE,
    KEY_DISP_FLEXURE, KEY_DISP_FLEXURE2, KEY_DISP_PLATE_GIRDER_WELDED, KEY_DISP_COMPRESSION_COLUMN,
    KEY_DISP_STRUT_WELDED_END_GUSSET,
}
# Cover plates and the shear modules with a Connector tab: the dock Material copies to the member and
# connector rows, as the core says.
COVER_PLATE_RULES = {KEY_DISP_BEAMCOVERPLATE, KEY_DISP_BEAMCOVERPLATEWELD, KEY_DISP_COLUMNCOVERPLATE, KEY_DISP_COLUMNCOVERPLATEWELD}
SHEAR_CORE_RULES = {KEY_DISP_FINPLATE, KEY_DISP_HEADERPLATE, KEY_DISP_CLEATANGLE, KEY_DISP_SEATED_ANGLE}
# Tension members and the bolted strut: the dock Material copies to Member.Material (the section tab, which
# the web form holds as supported_material) and Connector.Material.
MEMBER_CORE_RULES = {KEY_DISP_TENSION_BOLTED, KEY_DISP_TENSION_WELDED, KEY_DISP_STRUT_BOLTED_END_GUSSET}
CORE_RULES = COVER_PLATE_RULES | SHEAR_CORE_RULES | MEMBER_CORE_RULES
# Modules where core and old agree on "no material sync": no copy rows.
NO_RULES = {KEY_DISP_BUTTJOINTBOLTED, KEY_DISP_BUTTJOINTWELDED, KEY_DISP_LAPJOINTBOLTED, KEY_DISP_LAPJOINTWELDED}

SECTION_OVERRIDES = {
    KEY_DISP_FLEXURE, KEY_DISP_FLEXURE2, KEY_DISP_COMPRESSION_COLUMN, KEY_DISP_STRUT_BOLTED_END_GUSSET,
    KEY_DISP_TENSION_WELDED,
}
NO_DEFAULTS = {KEY_DISP_HEADERPLATE, KEY_DISP_PLATE_GIRDER_WELDED}


def test_the_override_tables_list_exactly_the_documented_modules():
    assert set(sync_merge.LEGACY_SYNC_RULES) == RULE_OVERRIDES
    assert set(sync_merge.LEGACY_SECTION_SOURCES) == SECTION_OVERRIDES
    assert set(sync_merge.NO_CORE_DEFAULTS) == NO_DEFAULTS
    assert RULE_OVERRIDES | CORE_RULES | NO_RULES == set(module_ids())


@pytest.mark.parametrize("module_id", sorted(RULE_OVERRIDES))
def test_a_rule_override_differs_from_the_core_rule(module_id):
    assert sync_merge.LEGACY_SYNC_RULES[module_id] != sync_merge.core_sync_rules(module_id), (
        f"{module_id}: the core table now gives the old rule; drop the override"
    )


@pytest.mark.parametrize("module_id", sorted(NO_RULES))
def test_modules_without_overrides_follow_the_core_rule(module_id):
    assert sync_merge.core_sync_rules(module_id) == []
    assert sync_merge.sync_rules(module_id) == []


@pytest.mark.parametrize("module_id", sorted(SECTION_OVERRIDES))
def test_a_section_override_differs_from_the_core_sources(module_id):
    assert sync_merge.LEGACY_SECTION_SOURCES[module_id] != sync_merge.core_section_sources(module_id)


@pytest.mark.parametrize("module_id", sorted(SHEAR_CORE_RULES))
def test_a_shear_module_follows_the_core_rule(module_id):
    # The dock Material copies into the supporting, supported and connector rows; the Connector tab
    # is a target of it, not a driver.
    assert sync_merge.sync_rules(module_id) == [
        ("Material", ["Member.Supporting_Section.Material", "Member.Supported_Section.Material", "Connector.Material"])
    ]


@pytest.mark.parametrize("module_id", sorted(MEMBER_CORE_RULES))
def test_a_member_module_copies_the_dock_material_to_the_member_material(module_id):
    assert sync_merge.sync_rules(module_id) == [("Material", ["Member.Material", "Connector.Material"])]


@pytest.mark.parametrize("module_id", sorted(MEMBER_CORE_RULES))
def test_a_changed_dock_material_replaces_the_section_tab_material(module_id):
    # The section tab holds the old grade in the request; the dock Material wins on refresh.
    resolved, _meta, _md, _sd = sync_merge.merge_design_pref_sync(
        module_id,
        {"Material": "E 350 (Fe 490)", "Member.Material": "E 250 (Fe 410 W)A", "Connector.Material": "E 250 (Fe 410 W)A"},
        "refresh",
    )
    assert resolved["Member.Material"] == "E 350 (Fe 490)"
    assert resolved["Connector.Material"] == "E 350 (Fe 490)"


@pytest.mark.parametrize("module_id", sorted(COVER_PLATE_RULES))
def test_a_cover_plate_follows_the_core_rule(module_id):
    # The dock Material copies into Member.Material and Connector.Material; no other driver.
    assert sync_merge.sync_rules(module_id) == [("Material", ["Member.Material", "Connector.Material"])]


@pytest.mark.parametrize("module_id", sorted(COVER_PLATE_RULES))
def test_a_changed_dock_material_replaces_the_member_and_connector_materials(module_id):
    # A stale Member.Material or Connector.Material in the request (the form still holds the old
    # grade) must not win over the dock Material on refresh.
    resolved, _meta, _md, _sd = sync_merge.merge_design_pref_sync(
        module_id,
        {"Material": "E 350 (Fe 490)", "Member.Material": "E 250 (Fe 410 W)A", "Connector.Material": "E 250 (Fe 410 W)A"},
        "refresh",
    )
    assert resolved["Member.Material"] == "E 350 (Fe 490)"
    assert resolved["Connector.Material"] == "E 350 (Fe 490)"


def test_a_channel_strut_is_looked_up_in_channels():
    # Core defect worked around by LEGACY_SECTION_SOURCES: refresh_input_dock lists channels under Angles.
    from apps.core.api.design.sync_merge import lookup_sources

    from osdag_core.Common import KEY_MATERIAL, KEY_SEC_PROFILE, KEY_SECSIZE

    _r, _m, _md, details = sync_merge.merge_design_pref_sync(
        KEY_DISP_STRUT_BOLTED_END_GUSSET,
        {KEY_SEC_PROFILE: "Channels", KEY_SECSIZE: ["MC 75"], KEY_MATERIAL: "E 250 (Fe 410 W)A"},
        "open",
        **lookup_sources(None),
    )
    assert details["supported"].get("Designation") == "MC 75"
