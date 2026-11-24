"""
The design method the Additional Inputs Design tab offers is the core's own wording.

Every module with a Design tab lists 'Limit State Design' first in its core dropdown (``design_values`` in
``design_type/main.py``, the base plate class has its own list). The web dialog offers the same three values
(``DESIGN_METHOD_OPTIONS`` in ``frontend/src/modules/shared/config/prefOptions.js``) and sends the one it shows, so
the wording 'Limited State Design' the dialog used to show must not come back. The frontend test
``prefTabValues.test.js`` checks every module's default against the options.

No database is used.
"""
import re
from pathlib import Path

import pytest
from apps.core import design_dictionary

from osdag_core.Common import KEY_DP_DESIGN_METHOD

PREF_OPTIONS = Path(__file__).resolve().parents[4] / "frontend/src/modules/shared/config/prefOptions.js"


def _web_methods():
    body = re.search(r"export const DESIGN_METHOD_OPTIONS = \[(.*?)\n\];", PREF_OPTIONS.read_text(), re.S).group(1)
    return re.findall(r'value: "([^"]+)", disabled: (true|false)', body)


def _core_methods(module_id):
    cls = design_dictionary._core_class(module_id)
    rows = cls.design_values(cls, {})
    return next(list(row[3]) for row in rows if row[0] == KEY_DP_DESIGN_METHOD)


def _modules_with_design_tab():
    return [m for m in design_dictionary.module_ids()
            if KEY_DP_DESIGN_METHOD in {k for _t, _kind, keys in design_dictionary.pref_tables(m)["pref_tabs"] for k in keys}]


def test_the_web_dialog_offers_limit_state_design_and_only_that_can_be_picked():
    methods = _web_methods()
    assert [value for value, _ in methods] == ["Limit State Design", "Limit State (capacity based) Design", "Working Stress Design"]
    assert [value for value, disabled in methods if disabled == "false"] == ["Limit State Design"]


@pytest.mark.parametrize("module_id", sorted(_modules_with_design_tab()))
def test_a_module_offers_the_wording_of_the_web_dialog(module_id):
    core = _core_methods(module_id)
    assert core[0] == "Limit State Design"
    # The base plate class spells 'Capacity' with a capital C; the rest are the same text.
    assert [m.casefold() for m in core] == [value.casefold() for value, _ in _web_methods()]
