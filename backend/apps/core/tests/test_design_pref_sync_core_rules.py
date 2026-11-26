"""
Additional Inputs sync rules of Header Plate, Plate Girder and the butt and lap joints, checked
against the real core classes (``osdag_core.design_type``) instead of against the web's own tables.

Which pref keys follow the dock Material is read two ways and the two must agree:

* the core's tables (``design_dictionary.pref_tables``: the 'Input Dock' rows of
  ``input_dictionary_without_design_pref()``) and its answers (``get_values_for_design_pref``)
  for dock Materials of different strength, and
* what ``sync_merge.merge_design_pref_sync`` does with the same dock for each operation.

The core tables are pinned here, so a change of the vendored core is a visible edit; the web side
is compared with the core's answers, not with copies of values. Custom materials follow the same
path as in the API: ``user_rows`` makes the signed-in user's grades (and the ``Cus_`` names a guest
may type) visible to the core class.

Header Plate and Plate Girder follow the core rule: the plate girder's dock Material copies to
``Member.Material``, the one material row of its Girder Properties tab (the web used to give it the
shear connection rule, which wrote keys the plate girder does not have).

The butt and lap joints have no material row at all. Their only Material dependent default is the
weld grade of the welded ones (``Weld.Material_Grade_OverWrite``, the ``fu`` of the dock Material).
"""
import pytest
from apps.core import design_dictionary as dd
from apps.core.api.design import sync_merge
from apps.core.models import CustomMaterials
from apps.core.osdag_overrides import user_rows
from apps.core.tests.auth_utils import authenticated_as
from apps.core.tests.test_osdag_overrides import make_beam
from django.contrib.auth.models import User
from django.test import TestCase

from osdag_core.Common import (
    KEY_CONN,
    KEY_CONNECTOR_MATERIAL,
    KEY_DISP_BUTTJOINTBOLTED,
    KEY_DISP_BUTTJOINTWELDED,
    KEY_DISP_HEADERPLATE,
    KEY_DISP_LAPJOINTBOLTED,
    KEY_DISP_LAPJOINTWELDED,
    KEY_DISP_PLATE_GIRDER_WELDED,
    KEY_DP_WELD_MATERIAL_G_O,
    KEY_MATERIAL,
    KEY_SEC_MATERIAL,
    KEY_SUPTDSEC,
    KEY_SUPTDSEC_MATERIAL,
    KEY_SUPTNGSEC,
    KEY_SUPTNGSEC_MATERIAL,
    VALUES_CONN_2,
)

HEADER = KEY_DISP_HEADERPLATE
GIRDER = KEY_DISP_PLATE_GIRDER_WELDED
BOLTED_JOINTS = (KEY_DISP_BUTTJOINTBOLTED, KEY_DISP_LAPJOINTBOLTED)
WELDED_JOINTS = (KEY_DISP_BUTTJOINTWELDED, KEY_DISP_LAPJOINTWELDED)
JOINTS = BOLTED_JOINTS + WELDED_JOINTS
MODULES = (HEADER, GIRDER, *JOINTS)

# Catalog grade -> its fu, which the core answers as the weld grade.
FU_OF = {
    "E 165 (Fe 290)": "290",
    "E 250 (Fe 410 W)A": "410",
    "E 350 (Fe 490)": "490",
    "E 410 (Fe 540)": "540",
}
GRADE, OTHER_GRADE = "E 250 (Fe 410 W)A", "E 350 (Fe 490)"
GUEST_GRADE = "Cus_250_240_230_410"  # a guest may type this: fy 250 / fu 410, read from the name
OPERATIONS = ("open", "refresh", "save", "reset")

def pref_keys(module_id):
    """Every key of the module's Additional Inputs tabs (what the dialog can hold)."""
    return {key for _tab, _kind, keys in dd.pref_tables(module_id)["pref_tabs"] for key in keys}


def follows_dock_material(module_id, grades=(GRADE, OTHER_GRADE)):
    """The keys whose core answer changes with the dock Material (the dock holds nothing else)."""
    answers = [dd.derive_computed(module_id, {KEY_MATERIAL: grade}) for grade in grades]
    return {key for key in answers[0] if any(a.get(key) != answers[0][key] for a in answers[1:])}


def merge(module_id, inputs, operation, draft=None, **sources):
    resolved, meta, material_details, section_details = sync_merge.merge_design_pref_sync(
        module_id, inputs, operation, design_pref_draft=draft, **sources
    )
    return resolved, meta, material_details, section_details


# ---------------------------------------------------------------------------------------------
# The core's tables, pinned
# ---------------------------------------------------------------------------------------------

@pytest.mark.parametrize("module_id", JOINTS)
def test_a_joint_has_no_material_row_and_copies_nothing_from_the_dock(module_id):
    tables = dd.pref_tables(module_id)
    assert tables["dock_copies"] == {}
    assert not [k for k in pref_keys(module_id) | set(tables["computed"]) if k.endswith(".Material")]
    assert sync_merge.echo_keys(module_id) == []
    assert sync_merge.core_sync_rules(module_id) == []
    assert sync_merge.sync_rules(module_id) == []


def test_header_plate_copies_the_dock_material_to_both_sections_and_echoes_it_to_the_connector():
    tables = dd.pref_tables(HEADER)
    assert tables["dock_copies"] == {KEY_MATERIAL: [KEY_SUPTNGSEC_MATERIAL, KEY_SUPTDSEC_MATERIAL]}
    assert KEY_CONNECTOR_MATERIAL in tables["computed"]
    assert sync_merge.echo_keys(HEADER) == [KEY_CONNECTOR_MATERIAL]
    assert sync_merge.sync_rules(HEADER) == sync_merge.core_sync_rules(HEADER) == [
        (KEY_MATERIAL, [KEY_SUPTNGSEC_MATERIAL, KEY_SUPTDSEC_MATERIAL, KEY_CONNECTOR_MATERIAL])
    ]


def test_plate_girder_core_rule_is_the_dock_material_to_the_girder_material():
    assert dd.pref_tables(GIRDER)["dock_copies"] == {KEY_MATERIAL: [KEY_SEC_MATERIAL]}
    assert sync_merge.echo_keys(GIRDER) == []
    assert sync_merge.core_sync_rules(GIRDER) == [(KEY_MATERIAL, [KEY_SEC_MATERIAL])]
    # The Girder Properties tab holds that one material row.
    assert [KEY_SEC_MATERIAL] == [k for k in pref_keys(GIRDER) if k.endswith(".Material")]


@pytest.mark.parametrize("module_id", MODULES)
def test_every_pref_key_in_a_dock_copy_belongs_to_an_additional_inputs_tab(module_id):
    tables = dd.pref_tables(module_id)
    for dock_key, targets in tables["dock_copies"].items():
        assert dock_key in tables["dock_keys"]
        assert set(targets) <= pref_keys(module_id), (dock_key, targets)


@pytest.mark.parametrize("module_id", [HEADER, GIRDER, *JOINTS])
def test_the_web_rule_writes_only_keys_the_core_class_has(module_id):
    """The rule's targets are keys of the module's Additional Inputs (or computed from the dock)."""
    known = pref_keys(module_id) | set(dd.pref_tables(module_id)["computed"])
    for _driver, targets in sync_merge.sync_rules(module_id):
        assert set(targets) <= known, set(targets) - known


@pytest.mark.parametrize("module_id", [HEADER, GIRDER, *JOINTS])
def test_the_web_rule_is_the_core_rule(module_id):
    assert sync_merge.sync_rules(module_id) == sync_merge.core_sync_rules(module_id)


# ---------------------------------------------------------------------------------------------
# What follows the dock Material, from the core's answers
# ---------------------------------------------------------------------------------------------

@pytest.mark.parametrize("module_id, expected", [
    (HEADER, {KEY_CONNECTOR_MATERIAL, KEY_DP_WELD_MATERIAL_G_O}),
    (GIRDER, {"Member.Fu", "Member.Fy"}),
    (KEY_DISP_BUTTJOINTBOLTED, set()),
    (KEY_DISP_LAPJOINTBOLTED, set()),
    (KEY_DISP_BUTTJOINTWELDED, {KEY_DP_WELD_MATERIAL_G_O}),
    (KEY_DISP_LAPJOINTWELDED, {KEY_DP_WELD_MATERIAL_G_O}),
])
def test_the_core_answers_that_depend_on_the_dock_material(module_id, expected):
    assert follows_dock_material(module_id, tuple(FU_OF)) == expected


@pytest.mark.parametrize("module_id", [HEADER, *WELDED_JOINTS])
def test_the_weld_grade_is_the_fu_of_the_dock_material(module_id):
    for grade, fu in FU_OF.items():
        assert dd.derive_computed(module_id, {KEY_MATERIAL: grade})[KEY_DP_WELD_MATERIAL_G_O] == fu, grade


def test_the_girder_strengths_come_from_the_dock_material():
    derived = {g: dd.derive_computed(GIRDER, {KEY_MATERIAL: g}) for g in FU_OF}
    assert {g: a["Member.Fu"] for g, a in derived.items()} == FU_OF
    assert derived[GRADE]["Member.Fy"] == "240"  # fy of the thickness band the core asks for


@pytest.mark.parametrize("module_id", BOLTED_JOINTS)
def test_a_bolted_joint_answers_do_not_change_with_the_material(module_id):
    answers = {tuple(sorted(dd.derive_computed(module_id, {KEY_MATERIAL: g}).items())) for g in FU_OF}
    assert len(answers) == 1


# ---------------------------------------------------------------------------------------------
# merge_design_pref_sync against those answers
# ---------------------------------------------------------------------------------------------

@pytest.mark.parametrize("operation", ("open", "refresh", "reset"))
def test_header_plate_dock_material_reaches_every_material_row_it_owns(operation):
    dock = {KEY_MATERIAL: OTHER_GRADE}
    resolved, meta, _md, _sd = merge(HEADER, dock, operation)
    for key in (KEY_SUPTNGSEC_MATERIAL, KEY_SUPTDSEC_MATERIAL, KEY_CONNECTOR_MATERIAL):
        assert resolved[key] == OTHER_GRADE, key
    assert meta["linked_pref_keys"] == [KEY_SUPTNGSEC_MATERIAL, KEY_SUPTDSEC_MATERIAL, KEY_CONNECTOR_MATERIAL]
    assert set(meta["copied_from_input_dock_keys"]) == {KEY_MATERIAL}
    assert dock == {KEY_MATERIAL: OTHER_GRADE}  # the request is not mutated


def test_header_plate_dock_change_beats_stale_rows_on_refresh_and_reset_but_not_on_open_or_save():
    stale = {KEY_SUPTNGSEC_MATERIAL: GRADE, KEY_SUPTDSEC_MATERIAL: GRADE, KEY_CONNECTOR_MATERIAL: GRADE}
    inputs = {KEY_MATERIAL: OTHER_GRADE, **stale}
    for operation in ("refresh", "reset"):
        resolved, *_ = merge(HEADER, inputs, operation)
        assert {k: resolved[k] for k in stale} == {k: OTHER_GRADE for k in stale}, operation
    # open keeps what was saved; save keeps what the dialog holds.
    resolved, *_ = merge(HEADER, inputs, "open")
    assert {k: resolved[k] for k in stale} == stale
    resolved, *_ = merge(HEADER, inputs, "save", draft={KEY_CONNECTOR_MATERIAL: "E 410 (Fe 540)"})
    assert resolved[KEY_CONNECTOR_MATERIAL] == "E 410 (Fe 540)"
    assert resolved[KEY_SUPTNGSEC_MATERIAL] == GRADE


@pytest.mark.parametrize("module_id", JOINTS)
@pytest.mark.parametrize("operation", OPERATIONS)
def test_a_joint_links_no_pref_key_to_the_dock_material(module_id, operation):
    inputs = {KEY_MATERIAL: OTHER_GRADE}
    resolved, meta, material_details, _sd = merge(module_id, inputs, operation, **sync_merge.lookup_sources())
    assert [k for k in resolved if k.endswith(".Material")] == []
    assert meta["copied_from_input_dock_keys"] == {}
    assert meta["linked_input_dock_keys"] == []
    assert meta["linked_pref_keys"] == []
    assert material_details == {"connector": [], "supported": [], "supporting": []}
    assert resolved[KEY_MATERIAL] == OTHER_GRADE


@pytest.mark.parametrize("module_id", (HEADER, *WELDED_JOINTS))
def test_a_module_with_a_weld_grade_reset_defaults_it_from_the_dock_material(module_id):
    for grade, fu in FU_OF.items():
        # A stale grade from the previous dock Material is replaced, as the desktop re-derives it.
        resolved, meta, *_ = merge(module_id, {KEY_MATERIAL: grade, KEY_DP_WELD_MATERIAL_G_O: "410x"}, "reset")
        assert resolved[KEY_DP_WELD_MATERIAL_G_O] == fu, grade
        assert KEY_DP_WELD_MATERIAL_G_O in meta["defaulted_keys"]


@pytest.mark.parametrize("module_id", (HEADER, *WELDED_JOINTS))
def test_a_module_with_a_weld_grade_open_defaults_a_missing_one_and_keeps_a_saved_one(module_id):
    resolved, *_ = merge(module_id, {KEY_MATERIAL: OTHER_GRADE}, "open")
    assert resolved[KEY_DP_WELD_MATERIAL_G_O] == FU_OF[OTHER_GRADE]
    resolved, meta, *_ = merge(module_id, {KEY_MATERIAL: OTHER_GRADE, KEY_DP_WELD_MATERIAL_G_O: "999"}, "open")
    assert resolved[KEY_DP_WELD_MATERIAL_G_O] == "999"
    assert KEY_DP_WELD_MATERIAL_G_O not in meta["defaulted_keys"]


@pytest.mark.parametrize("module_id", BOLTED_JOINTS)
@pytest.mark.parametrize("operation", ("open", "reset"))
def test_a_bolted_joint_never_gets_a_weld_grade(module_id, operation):
    resolved, *_ = merge(module_id, {KEY_MATERIAL: OTHER_GRADE}, operation)
    assert not [k for k in resolved if k.startswith("Weld.")]


@pytest.mark.parametrize("module_id", JOINTS)
def test_a_joint_save_keeps_the_draft_over_the_dock_material(module_id):
    draft = {KEY_DP_WELD_MATERIAL_G_O: "500"}
    resolved, *_ = merge(module_id, {KEY_MATERIAL: GRADE}, "save", draft=draft)
    assert resolved[KEY_DP_WELD_MATERIAL_G_O] == "500"


@pytest.mark.parametrize("operation", ("refresh", "reset"))
def test_plate_girder_dock_material_reaches_the_girder_material(operation):
    resolved, meta, *_ = merge(GIRDER, {KEY_MATERIAL: OTHER_GRADE, KEY_SEC_MATERIAL: GRADE}, operation)
    assert resolved[KEY_SEC_MATERIAL] == OTHER_GRADE
    assert meta["linked_pref_keys"] == [KEY_SEC_MATERIAL]


def test_plate_girder_sync_does_not_invent_section_rows():
    # The core's refresh_input_dock() has no rows for the plate girder: nothing to look up.
    assert dd.pref_tables(GIRDER)["section_sources"] == []
    _r, _m, _md, section_details = merge(GIRDER, {KEY_MATERIAL: GRADE}, "open", **sync_merge.lookup_sources())
    assert section_details == {"supporting": {}, "supported": {}, "connector": {}}


# ---------------------------------------------------------------------------------------------
# Custom materials and sections (the signed-in user's rows, and Cus_ names for a guest)
# ---------------------------------------------------------------------------------------------

class CustomRowsSyncTests(TestCase):
    CUSTOM = "My Steel"  # fy 300 / fu 450 / fy at 40 mm 280

    def setUp(self):
        self.user = User.objects.create_user(username="u1", email="u1@example.com", password="x")
        self.other = User.objects.create_user(username="u2", email="u2@example.com", password="x")
        CustomMaterials.objects.create(
            user=self.user, Grade=self.CUSTOM, Yield_Stress_less_than_20=300,
            Yield_Stress_between_20_and_neg40=290, Yield_Stress_greater_than_40=280,
            Ultimate_Tensile_Stress=450, Elongation=0,
        )

    def sync(self, module_id, inputs, operation="open", user=None):
        """What POST /api/design-preferences/sync/ answers for the user."""
        body = {"module_id": module_id, "inputs": inputs, "operation": operation}
        if user is None:
            r = self.client.post("/api/design-preferences/sync/", data=body, content_type="application/json")
        else:
            with authenticated_as(user):
                r = self.client.post("/api/design-preferences/sync/", data=body, content_type="application/json")
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def test_the_core_derives_the_weld_grade_from_a_custom_material_of_its_owner(self):
        for module_id in (HEADER, *WELDED_JOINTS):
            with user_rows(self.user.id):
                answers = dd.derive_computed(module_id, {KEY_MATERIAL: self.CUSTOM})
            self.assertEqual(answers[KEY_DP_WELD_MATERIAL_G_O], "450", module_id)

    def test_the_core_derives_the_weld_grade_from_a_cus_name_for_a_guest(self):
        for module_id in (HEADER, *WELDED_JOINTS):
            with user_rows(None):
                answers = dd.derive_computed(module_id, {KEY_MATERIAL: GUEST_GRADE})
            self.assertEqual(answers[KEY_DP_WELD_MATERIAL_G_O], "410", module_id)

    def test_the_girder_strengths_follow_a_custom_material(self):
        with user_rows(self.user.id):
            answers = dd.derive_computed(GIRDER, {KEY_MATERIAL: self.CUSTOM})
        self.assertEqual(answers["Member.Fu"], "450")
        # fy is the one of the thickness band the core asks for: one of the custom grade's three.
        self.assertIn(answers["Member.Fy"], {"300", "290", "280"})

    def test_the_sync_api_defaults_the_weld_grade_from_the_owners_custom_material(self):
        for module_id in (HEADER, *WELDED_JOINTS):
            for operation in ("open", "reset"):
                data = self.sync(module_id, {KEY_MATERIAL: self.CUSTOM}, operation, user=self.user)
                self.assertEqual(data["resolved_inputs"][KEY_DP_WELD_MATERIAL_G_O], "450", (module_id, operation))

    def test_the_sync_api_defaults_a_guests_cus_material_by_its_name(self):
        for module_id in (HEADER, *WELDED_JOINTS):
            data = self.sync(module_id, {KEY_MATERIAL: GUEST_GRADE}, "reset")
            self.assertEqual(data["resolved_inputs"][KEY_DP_WELD_MATERIAL_G_O], "410", module_id)

    def test_the_sync_api_gives_a_bolted_joint_no_material_details_for_a_custom_material(self):
        for module_id in BOLTED_JOINTS:
            data = self.sync(module_id, {KEY_MATERIAL: self.CUSTOM}, user=self.user)
            self.assertEqual(data["material_details"], {"connector": [], "supported": [], "supporting": []}, module_id)
            self.assertEqual(data["metadata"]["linked_pref_keys"], [], module_id)

    def test_header_plate_shows_the_custom_material_on_every_tab_for_its_owner_only(self):
        inputs = {KEY_MATERIAL: self.CUSTOM}
        data = self.sync(HEADER, inputs, user=self.user)
        for role in ("connector", "supported", "supporting"):
            self.assertEqual([row["Grade"] for row in data["material_details"][role]], [self.CUSTOM], role)
            self.assertEqual(data["material_details"][role][0]["Ultimate_Tensile_Stress"], 450)
        for user in (self.other, None):
            data = self.sync(HEADER, inputs, user=user)
            self.assertEqual(data["material_details"], {"connector": [], "supported": [], "supporting": []})
            # The grade itself still copies to the rows; only the properties are unknown.
            self.assertEqual(data["resolved_inputs"][KEY_CONNECTOR_MATERIAL], self.CUSTOM)

    def test_header_plate_refresh_with_a_custom_dock_material_replaces_stale_catalog_rows(self):
        stale = {KEY_SUPTNGSEC_MATERIAL: GRADE, KEY_SUPTDSEC_MATERIAL: GRADE, KEY_CONNECTOR_MATERIAL: GRADE}
        data = self.sync(HEADER, {KEY_MATERIAL: self.CUSTOM, **stale}, "refresh", user=self.user)
        self.assertEqual({k: data["resolved_inputs"][k] for k in stale}, {k: self.CUSTOM for k in stale})
        self.assertEqual([row["Grade"] for row in data["material_details"]["connector"]], [self.CUSTOM])

    def test_header_plate_looks_up_custom_beams_for_the_owner_only(self):
        make_beam(self.user, designation="MY 200", mass=30.0)
        inputs = {KEY_MATERIAL: GRADE, KEY_CONN: VALUES_CONN_2[0], KEY_SUPTNGSEC: ["MY 200"], KEY_SUPTDSEC: ["MY 200"]}
        data = self.sync(HEADER, inputs, user=self.user)
        for role in ("supporting", "supported"):
            self.assertEqual(data["section_details"][role]["Designation"], "MY 200", role)
            self.assertEqual(float(data["section_details"][role]["Mass"]), 30.0)
        data = self.sync(HEADER, inputs, user=self.other)
        self.assertEqual(data["section_details"]["supporting"], {})
        self.assertEqual(data["section_details"]["supported"], {})

    def test_plate_girder_custom_dock_material_reaches_the_girder_material_row(self):
        # A custom dock grade copies to Member.Material, whose properties (the supporting role, which the
        # Girder Properties tab shows) are the owner's row; the sync invents no section rows.
        data = self.sync(GIRDER, {KEY_MATERIAL: self.CUSTOM}, user=self.user)
        self.assertEqual(data["resolved_inputs"][KEY_MATERIAL], self.CUSTOM)
        self.assertEqual(data["resolved_inputs"][KEY_SEC_MATERIAL], self.CUSTOM)
        self.assertEqual([row["Grade"] for row in data["material_details"]["supporting"]], [self.CUSTOM])
        self.assertEqual(data["section_details"], {"supporting": {}, "supported": {}, "connector": {}})
