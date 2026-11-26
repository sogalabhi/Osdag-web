"""
The plate girder's section properties in Additional Inputs (Girder Properties tab) are the core's.

The desktop fills Label_12..Label_23 of ``tab_girder_sec`` from the dimensions (Label_6..Label_11) through
``tab_value_changed`` -> ``Unsymm_I_Section_properties``. The web has no catalog row for a built-up girder:
``sync_merge.computed_section_details`` asks the same core function with the dock dimensions and the sync
answers the result as the supporting section, in the catalog's column names. No database is used.
"""
import pytest
from apps.core.api.design import sync_merge
from django.test import SimpleTestCase

from osdag_core.Common import (
    KEY_BOTTOM_FLANGE_THICKNESS_PG,
    KEY_DISP_FINPLATE,
    KEY_DISP_PLATE_GIRDER_WELDED,
    KEY_MATERIAL,
    KEY_OVERALL_DEPTH_PG,
    KEY_OVERALL_DEPTH_PG_TYPE,
    KEY_TOP_FLANGE_THICKNESS_PG,
    KEY_WEB_THICKNESS_PG,
    KEY_BOTTOM_Bflange_PG,
    KEY_TOP_Bflange_PG,
)
from osdag_core.utils.common.Unsymmetrical_Section_Properties import (
    Unsymmetrical_I_Section_Properties as USP,
)

GIRDER = KEY_DISP_PLATE_GIRDER_WELDED
COLUMNS = ("Mass", "Area", "Iz", "Iy", "rz", "ry", "Zz", "Zy", "Zpz", "Zpy", "It", "Iw")


def dock(depth="1300", web="20", top=("350", "40"), bottom=("300", "32"), design_type="Customized", material="E 250 (Fe 410 W)A"):
    return {
        KEY_MATERIAL: material,
        KEY_OVERALL_DEPTH_PG_TYPE: design_type,
        KEY_OVERALL_DEPTH_PG: depth,
        KEY_WEB_THICKNESS_PG: [web],
        KEY_TOP_Bflange_PG: top[0],
        KEY_TOP_FLANGE_THICKNESS_PG: [top[1]],
        KEY_BOTTOM_Bflange_PG: bottom[0],
        KEY_BOTTOM_FLANGE_THICKNESS_PG: [bottom[1]],
    }


def expected(depth, web, top_width, top_thk, bottom_width, bottom_thk):
    """The core's own functions, in the order of Label_12..Label_23."""
    args = (depth, top_width, bottom_width, web, top_thk, bottom_thk)
    values = (
        USP.calc_mass(*args), USP.calc_area(*args), USP.calc_MomentOfAreaZ(*args), USP.calc_MomentOfAreaY(*args),
        USP.calc_RadiusOfGyrationZ(*args), USP.calc_RadiusOfGyrationY(*args), USP.calc_ElasticModulusZz(*args),
        USP.calc_ElasticModulusZy(*args), USP.calc_PlasticModulusZ(*args), USP.calc_PlasticModulusY(*args),
        USP.calc_TorsionConstantIt(*args), USP.calc_WarpingConstantIw(*args),
    )
    return dict(zip(COLUMNS, (str(v) for v in values)))


def test_an_unsymmetric_girder_gets_the_cores_twelve_properties():
    row = sync_merge.computed_section_details(GIRDER, dock())["supporting"]
    assert row == expected(1300.0, 20.0, 350.0, 40.0, 300.0, 32.0)
    assert float(row["Mass"]) == pytest.approx(7850 * float(row["Area"]) / 1e6, abs=0.01)


def test_the_properties_follow_the_dimensions_not_the_material():
    base = sync_merge.computed_section_details(GIRDER, dock())
    assert sync_merge.computed_section_details(GIRDER, dock(material="E 350 (Fe 490)")) == base
    deeper = sync_merge.computed_section_details(GIRDER, dock(depth="1500"))["supporting"]
    assert float(deeper["Iz"]) > float(base["supporting"]["Iz"])


@pytest.mark.parametrize("inputs", [
    dock(design_type="Optimized"),  # the optimisation chooses the dimensions
    dock(depth=""),
    dock(web="x"),
    dock(depth="0"),
    {KEY_MATERIAL: "E 250 (Fe 410 W)A"},
])
def test_no_row_without_usable_dimensions(inputs):
    assert sync_merge.computed_section_details(GIRDER, inputs) == {}


def test_a_module_with_catalog_sections_gets_none():
    assert sync_merge.computed_section_details(KEY_DISP_FINPLATE, dock()) == {}


@pytest.mark.parametrize("operation", ("open", "refresh", "save", "reset"))
def test_every_sync_operation_answers_the_girder_as_the_supporting_section(operation):
    _r, _m, _md, sections = sync_merge.merge_design_pref_sync(GIRDER, dock(), operation, **sync_merge.lookup_sources())
    assert sections["supporting"] == expected(1300.0, 20.0, 350.0, 40.0, 300.0, 32.0)
    assert sections["supported"] == {} and sections["connector"] == {}


class SyncApiTests(SimpleTestCase):
    def test_the_sync_and_defaults_endpoints_answer_the_section_properties(self):
        for url, body in (
            ("/api/design-preferences/sync/", {"module_id": GIRDER, "inputs": dock(), "operation": "open"}),
            ("/api/design-preferences/defaults/", {"module_id": GIRDER, "inputs": dock()}),
        ):
            r = self.client.post(url, data=body, content_type="application/json")
            self.assertEqual(r.status_code, 200, r.content)
            self.assertEqual(r.json()["section_details"]["supporting"], expected(1300.0, 20.0, 350.0, 40.0, 300.0, 32.0))
