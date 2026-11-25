"""
The base plate's Design tab of Additional Inputs offers what the core's `design_values` lists for
Base Plate Analysis (Design.Base_Plate); the web keeps the list in
frontend/src/modules/shared/config/prefOptions.js (`BASE_PLATE_ANALYSIS_OPTIONS`).
"""
import json
import re
from pathlib import Path

from osdag_core.Common import KEY_DISP_DP_DESIGN_BASE_PLATE, KEY_DP_DESIGN_BASE_PLATE, KEY_DP_DESIGN_METHOD
from osdag_core.design_type.connection.base_plate_connection import BasePlateConnection

PREF_OPTIONS = Path(__file__).resolve().parents[4] / "frontend" / "src" / "modules" / "shared" / "config" / "prefOptions.js"


def _core_rows():
    return {row[0]: row for row in BasePlateConnection().design_values({})}


def test_the_core_design_tab_has_a_base_plate_analysis_box():
    rows = _core_rows()
    assert list(rows) == [KEY_DP_DESIGN_METHOD, KEY_DP_DESIGN_BASE_PLATE]
    assert rows[KEY_DP_DESIGN_BASE_PLATE][1] == KEY_DISP_DP_DESIGN_BASE_PLATE


def test_the_web_options_are_the_cores():
    source = PREF_OPTIONS.read_text(encoding="utf-8")
    declared = re.search(r"export const BASE_PLATE_ANALYSIS_OPTIONS = (\[[^\]]*\]);", source).group(1)
    assert json.loads(declared) == list(_core_rows()[KEY_DP_DESIGN_BASE_PLATE][3])
