"""
Unit tests for design preference sync merge and HTTP API.
"""

from django.contrib.auth.models import User
from django.test import TestCase

from apps.core.api.design.sync_merge import (
    list_registered_module_ids,
    lookup_sources,
    merge_design_pref_sync,
    unchanged,
)
from apps.core.models import CustomMaterials
from apps.core.tests.auth_utils import authenticated_as
from apps.core.tests.test_osdag_overrides import make_beam

from osdag_core.Common import (
    KEY_CONNECTOR_MATERIAL,
    KEY_DISP_FINPLATE,
    KEY_DISP_SEATED_ANGLE,
    KEY_DISP_HEADERPLATE,
    KEY_DISP_CLEATANGLE,
    KEY_DISP_FLEXURE,
    KEY_DISP_FLEXURE4,
    KEY_DP_BOLT_HOLE_TYPE,
    KEY_MATERIAL,
    KEY_SECSIZE,
    KEY_SUPTDSEC_MATERIAL,
    KEY_SUPTNGSEC_MATERIAL,
)


class DesignPrefSyncMergeTests(TestCase):
    def test_fin_plate_open_copies_dock_material_to_pref_keys(self):
        inputs = {
            KEY_CONNECTOR_MATERIAL: "E 250 (Fe 410 W)A",
            KEY_MATERIAL: "E 250 (Fe 410 W)A",
        }
        resolved, meta, _md, _sd = merge_design_pref_sync(
            KEY_DISP_FINPLATE,
            inputs,
            "open",
            design_pref_draft=None,
            material_model=None,
        )
        self.assertEqual(resolved[KEY_SUPTNGSEC_MATERIAL], "E 250 (Fe 410 W)A")
        self.assertEqual(resolved[KEY_SUPTDSEC_MATERIAL], "E 250 (Fe 410 W)A")
        self.assertEqual(resolved[KEY_CONNECTOR_MATERIAL], "E 250 (Fe 410 W)A")
        self.assertIn(KEY_MATERIAL, meta["copied_from_input_dock_keys"])
        self.assertEqual(meta["module_id"], KEY_DISP_FINPLATE)

    def test_save_preserves_draft_overrides_without_forcing_dock_resync(self):
        inputs = {
            KEY_MATERIAL: "E 250 (Fe 410 W)A",
            KEY_SUPTNGSEC_MATERIAL: "E 250 (Fe 410 W)A",
            KEY_SUPTDSEC_MATERIAL: "E 250 (Fe 410 W)A",
            KEY_CONNECTOR_MATERIAL: "E 250 (Fe 410 W)A",
        }
        draft = {KEY_CONNECTOR_MATERIAL: "E 350 (Fe 490)"}
        resolved, _meta, _md, _sd = merge_design_pref_sync(
            KEY_DISP_FINPLATE,
            inputs,
            "save",
            design_pref_draft=draft,
            material_model=None,
        )
        self.assertEqual(resolved[KEY_CONNECTOR_MATERIAL], "E 350 (Fe 490)")

    def test_reset_applies_driver_sync(self):
        inputs = {KEY_MATERIAL: "E 165 (Fe 290)"}
        resolved, _meta, _md, _sd = merge_design_pref_sync(
            KEY_DISP_FINPLATE,
            inputs,
            "reset",
            design_pref_draft=None,
            material_model=None,
        )
        self.assertEqual(resolved[KEY_SUPTNGSEC_MATERIAL], "E 165 (Fe 290)")
        self.assertIn("linked_pref_keys", _meta)
        self.assertIn(KEY_SUPTNGSEC_MATERIAL, _meta["linked_pref_keys"])

    def test_request_is_not_mutated_and_answer_has_core_keys_only(self):
        inputs = {KEY_CONNECTOR_MATERIAL: "E 250 (Fe 410 W)A", KEY_SECSIZE: ["MB 300"]}
        resolved, _meta, _md, _sd = merge_design_pref_sync(KEY_DISP_FLEXURE, inputs, "refresh")
        self.assertEqual(inputs, {KEY_CONNECTOR_MATERIAL: "E 250 (Fe 410 W)A", KEY_SECSIZE: ["MB 300"]})
        self.assertIn(KEY_SECSIZE, resolved)
        self.assertNotIn("connector_material", resolved)

    def test_the_core_knows_every_module_the_frontend_serves(self):
        ids = list_registered_module_ids()
        self.assertIn(KEY_DISP_FINPLATE, ids)
        self.assertNotIn(KEY_DISP_FLEXURE4, ids)

    def test_purlin_has_no_core_tables_and_is_answered_unchanged(self):
        # Purlin is out of scope: it keeps web names and gets no sync.
        inputs = {"material": "E 250 (Fe 410 W)A", "section_material": "E 350 (Fe 490)"}
        resolved, meta, _md, _sd = unchanged(KEY_DISP_FLEXURE4, inputs, "open")
        self.assertEqual(resolved, inputs)
        self.assertEqual(meta["copied_from_input_dock_keys"], {})
        self.assertEqual(meta["module_id"], KEY_DISP_FLEXURE4)

    def test_shear_refresh_follows_dock_material_not_connector_tab(self):
        for module in (KEY_DISP_FINPLATE, KEY_DISP_CLEATANGLE, KEY_DISP_HEADERPLATE, KEY_DISP_SEATED_ANGLE):
            inputs = {KEY_MATERIAL: "E 350 (Fe 490)", KEY_CONNECTOR_MATERIAL: "E 165 (Fe 290)"}
            resolved, _meta, _md, _sd = merge_design_pref_sync(module, inputs, "refresh")
            self.assertEqual(resolved[KEY_CONNECTOR_MATERIAL], "E 350 (Fe 490)", module)
            self.assertEqual(resolved[KEY_SUPTNGSEC_MATERIAL], "E 350 (Fe 490)", module)
            self.assertEqual(resolved[KEY_SUPTDSEC_MATERIAL], "E 350 (Fe 490)", module)

    def test_shear_open_keeps_saved_connector_material(self):
        inputs = {KEY_MATERIAL: "E 250 (Fe 410 W)A", KEY_CONNECTOR_MATERIAL: "E 350 (Fe 490)"}
        resolved, _meta, _md, _sd = merge_design_pref_sync(KEY_DISP_FINPLATE, inputs, "open")
        self.assertEqual(resolved[KEY_CONNECTOR_MATERIAL], "E 350 (Fe 490)")
        self.assertEqual(resolved[KEY_SUPTNGSEC_MATERIAL], "E 250 (Fe 410 W)A")

    def test_the_section_tab_of_a_tension_member_shows_the_saved_member_material(self):
        inputs = {"Material": "E 250 (Fe 410 W)A", "Member.Material": "E 350 (Fe 490)"}
        _resolved, _meta, material_details, _sd = merge_design_pref_sync(
            "Tension Member Design - Bolted to End Gusset", inputs, "open", **lookup_sources()
        )
        assert [row["Grade"] for row in material_details["supported"]] == ["E 350 (Fe 490)"]


class DesignPrefSyncAPITests(TestCase):
    def test_defaults_post_returns_default_payload(self):
        body = {
            "module_id": KEY_DISP_FINPLATE,
            "inputs": {KEY_CONNECTOR_MATERIAL: "E 250 (Fe 410 W)A"},
        }
        r = self.client.post(
            "/api/design-preferences/defaults/",
            data=body,
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data.get("success"))
        self.assertIn("default_pref_inputs", data)
        self.assertIn("metadata", data)
        self.assertIn("material_details", data)

    def test_sync_post_returns_resolved_payload(self):
        body = {
            "module_id": KEY_DISP_FINPLATE,
            "inputs": {KEY_CONNECTOR_MATERIAL: "E 250 (Fe 410 W)A"},
            "operation": "open",
        }
        r = self.client.post(
            "/api/design-preferences/sync/",
            data=body,
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data.get("success"))
        self.assertIn("resolved_inputs", data)
        self.assertIn("metadata", data)
        self.assertIn("material_details", data)
        self.assertIn("copied_from_input_dock_keys", data["metadata"])
        self.assertIn("linked_pref_keys", data["metadata"])

    def test_sync_rejects_bad_operation(self):
        r = self.client.post(
            "/api/design-preferences/sync/",
            data={
                "module_id": KEY_DISP_FINPLATE,
                "inputs": {},
                "operation": "not-an-operation",
            },
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)

    def test_sync_answers_a_module_without_core_tables_unchanged(self):
        inputs = {"material": "E 250 (Fe 410 W)A"}
        for url, extra, field in (
            ("/api/design-preferences/sync/", {"operation": "open"}, "resolved_inputs"),
            ("/api/design-preferences/defaults/", {}, "default_pref_inputs"),
        ):
            r = self.client.post(
                url, data={"module_id": KEY_DISP_FLEXURE4, "inputs": inputs, **extra}, content_type="application/json"
            )
            self.assertEqual(r.status_code, 200, url)
            self.assertEqual(r.json()[field], inputs)

    def test_sync_requires_module(self):
        r = self.client.post(
            "/api/design-preferences/sync/",
            data={"inputs": {}, "operation": "open"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)


class DesignPrefCustomRowsTests(TestCase):
    """Custom sections and materials reach the design preference dialog for their owner only."""

    INPUTS = {KEY_MATERIAL: "My Steel", KEY_SECSIZE: ["MY 200"]}

    def setUp(self):
        self.user = User.objects.create_user(username="u1", email="u1@example.com", password="x")
        self.other = User.objects.create_user(username="u2", email="u2@example.com", password="x")
        make_beam(self.user, mass=30.0)
        CustomMaterials.objects.create(
            user=self.user, Grade="My Steel", Yield_Stress_less_than_20=300,
            Yield_Stress_between_20_and_neg40=290, Yield_Stress_greater_than_40=280,
            Ultimate_Tensile_Stress=450, Elongation=0,
        )

    def merge(self, user):
        return merge_design_pref_sync(
            KEY_DISP_FLEXURE, self.INPUTS, "open", **lookup_sources(user),
        )

    def test_owner_gets_custom_rows(self):
        _resolved, _meta, material_details, section_details = self.merge(self.user)
        self.assertEqual(section_details["supporting"]["Designation"], "MY 200")
        self.assertEqual(float(section_details["supporting"]["Mass"]), 30.0)
        self.assertEqual(material_details["connector"][0]["Grade"], "My Steel")
        self.assertEqual(material_details["connector"][0]["Ultimate_Tensile_Stress"], 450)

    def test_other_user_and_guest_get_nothing(self):
        for user in (self.other, None):
            _resolved, _meta, material_details, section_details = self.merge(user)
            self.assertEqual(section_details["supporting"], {})
            self.assertEqual(material_details["connector"], [])

    def test_sync_api_returns_custom_details(self):
        body = {"module_id": KEY_DISP_FLEXURE, "inputs": self.INPUTS, "operation": "open"}
        with authenticated_as(self.user):
            r = self.client.post("/api/design-preferences/sync/", data=body, content_type="application/json")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["section_details"]["supporting"]["Designation"], "MY 200")
        self.assertEqual(data["material_details"]["connector"][0]["Grade"], "My Steel")

    def test_defaults_api_returns_custom_details(self):
        body = {"module_id": KEY_DISP_FLEXURE, "inputs": self.INPUTS}
        with authenticated_as(self.user):
            r = self.client.post("/api/design-preferences/defaults/", data=body, content_type="application/json")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["section_details"]["supporting"]["Designation"], "MY 200")
        self.assertEqual(data["material_details"]["connector"][0]["Grade"], "My Steel")


class DesignPrefCatalogTests(TestCase):
    """Without custom rows, section and material details come from the SQLite catalog."""

    INPUTS = {KEY_MATERIAL: "E 250 (Fe 410 W)A", KEY_SECSIZE: ["MB 300"]}

    def setUp(self):
        self.user = User.objects.create_user(username="u1", email="u1@example.com", password="x")

    def merge(self, user):
        return merge_design_pref_sync(
            KEY_DISP_FLEXURE, self.INPUTS, "open", **lookup_sources(user),
        )

    def test_guest_gets_catalog_rows(self):
        _resolved, _meta, material_details, section_details = self.merge(None)
        self.assertEqual(section_details["supporting"]["Designation"], "MB 300")
        self.assertAlmostEqual(section_details["supporting"]["Mass"], 46.02)
        self.assertEqual(material_details["connector"][0]["Grade"], "E 250 (Fe 410 W)A")
        self.assertEqual(material_details["connector"][0]["Yield_Stress_less_than_20"], 250)

    def test_custom_row_wins_over_catalog_row_of_the_same_designation(self):
        make_beam(self.user, designation="MB 300", mass=99.0)
        _resolved, _meta, _md, section_details = self.merge(self.user)
        self.assertEqual(float(section_details["supporting"]["Mass"]), 99.0)

    def test_catalog_row_is_found_after_the_users_rows(self):
        make_beam(self.user, designation="MY 200")
        _resolved, _meta, _md, section_details = self.merge(self.user)
        self.assertAlmostEqual(section_details["supporting"]["Mass"], 46.02)

    def test_design_preferences_api_returns_catalog_row(self):
        r = self.client.get("/api/design-preferences/", {"section_type": "angles", "supported_section": "20 x 20 x 3"})
        self.assertEqual(r.status_code, 200)
        row = r.json()["supported_section_results"][0]
        self.assertEqual(row["Designation"], "20 x 20 x 3")
        self.assertEqual(row["It"], 0.033)
        self.assertIn("lumax", row)
