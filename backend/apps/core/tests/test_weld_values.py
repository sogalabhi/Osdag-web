"""
The weld spellings the core accepts, read from the core's own weld dropdowns.

The core looks the weld fabrication up by exact spelling (``IS800_2007.cl_5_4_1_Table_5['gamma_mw'][fab]``),
so a request with 'Shop weld' where the core knows 'Shop Weld' fails inside the design. Every module that
shows a weld dropdown in Additional Inputs offers ``Weld.Fab`` with ``KEY_DP_WELD_FAB_VALUES``, except the
butt and lap joint welded modules, whose one weld dropdown is ``Weld.Type`` with 'Shop weld' and 'Field weld'.
``frontend/src/modules/shared/config/prefOptions.js`` holds the spellings the web dialog offers; the frontend
test ``weldOptions.test.js`` checks every module against them, and this test checks them against the core.

No database is used.
"""
import re
from pathlib import Path

import pytest
from apps.core import design_dictionary

from osdag_core.Common import KEY_DP_FAB_FIELD, KEY_DP_FAB_SHOP, KEY_DP_WELD_FAB, KEY_DP_WELD_FAB_VALUES, KEY_DP_WELD_TYPE
from osdag_core.utils.common.is800_2007 import IS800_2007

PREF_OPTIONS = Path(__file__).resolve().parents[4] / "frontend/src/modules/shared/config/prefOptions.js"


def _weld_dropdowns(module_id):
    """key -> option list of every weld ComboBox the module's core class offers (empty when it has none)."""
    cls = design_dictionary._core_class(module_id)
    if not hasattr(cls, "weld_values"):
        return {}
    # weld_values reads no instance state; it is given the defaults a module opens with.
    rows = cls.weld_values(cls, {})
    return {row[0]: list(row[3]) for row in rows if row[2] == "ComboBox"}


def _module_ids_with(key):
    return [m for m in design_dictionary.module_ids()
            if key in {k for _tab, _kind, keys in design_dictionary.pref_tables(m)["pref_tabs"] for k in keys}]


def _web_options(name):
    text = PREF_OPTIONS.read_text()
    body = re.search(rf"export const {name} = \[(.*?)\];", text, re.S).group(1)
    return re.findall(r'"([^"]+)"', body) or body


def test_the_core_names_two_fabrication_spellings():
    assert KEY_DP_WELD_FAB_VALUES == [KEY_DP_FAB_SHOP, KEY_DP_FAB_FIELD] == ["Shop Weld", "Field weld"]


@pytest.mark.parametrize("fab", KEY_DP_WELD_FAB_VALUES)
def test_the_design_looks_up_each_core_spelling(fab):
    assert IS800_2007.cl_5_4_1_Table_5["gamma_mw"][fab] in (1.25, 1.5)


@pytest.mark.parametrize("fab", ["Shop weld", "Field Weld", "shop weld"])
def test_the_design_does_not_know_other_spellings(fab):
    with pytest.raises(KeyError):
        IS800_2007.cl_5_4_1_Table_5["gamma_mw"][fab]


@pytest.mark.parametrize("module_id", sorted(_module_ids_with(KEY_DP_WELD_FAB)))
def test_a_module_with_a_weld_fab_tab_offers_the_core_spellings(module_id):
    assert _weld_dropdowns(module_id).get(KEY_DP_WELD_FAB) == KEY_DP_WELD_FAB_VALUES


@pytest.mark.parametrize("module_id", sorted(_module_ids_with(KEY_DP_WELD_TYPE)))
def test_a_module_with_a_weld_type_tab_offers_shop_weld_and_field_weld(module_id):
    assert _weld_dropdowns(module_id).get(KEY_DP_WELD_TYPE) == ["Shop weld", "Field weld"]


def test_the_web_dialog_offers_what_the_core_offers():
    assert _web_options("WELD_FAB_OPTIONS") != []
    # WELD_FAB_OPTIONS is written with the generated core constants; WELD_TYPE_OPTIONS as literals.
    assert _web_options("WELD_TYPE_OPTIONS") == ["Shop weld", "Field weld"]
    types = {tuple(_weld_dropdowns(m)[KEY_DP_WELD_TYPE]) for m in _module_ids_with(KEY_DP_WELD_TYPE)}
    assert types == {tuple(_web_options("WELD_TYPE_OPTIONS"))}


def test_the_modules_with_a_weld_type_tab_are_the_butt_and_lap_joints():
    ids = set(_module_ids_with(KEY_DP_WELD_TYPE))
    assert {i.split(" Connection")[0] for i in ids} == {"Butt Joint Welded", "Lap Joint Welded"}
