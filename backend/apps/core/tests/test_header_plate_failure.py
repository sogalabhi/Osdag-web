"""
A header plate design the core stops on is reported as a failed design, not raised.

With the desktop's edge type ("Sheared or hand flame cut"), the customized default request
fails: every bolt arrangement fits but no plate or weld does, and the core's
``set_values_to_class`` then reads an empty list (``IndexError``). The adapter turns that into a
``DesignFailedError`` and the service into a result with ``success`` and ``design_status`` false
and a message the page shows.
"""
import json
from pathlib import Path

from apps.core import design_dictionary
from apps.core.tasks import run_design_calculation_task
from apps.modules.shear_connection.submodules.header_plate.adapter import HEADER_PLATE_FAILED_MESSAGE
from apps.modules.shear_connection.submodules.header_plate.service import EndPlateService
from osdag_core.Common import KEY_DISP_HEADERPLATE, KEY_DP_DETAILING_EDGE_TYPE

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "design_inputs" / "shear_connection__header_plate"


def _request(name):
    """The fixture as the browser sends it with nothing saved: no Additional Inputs."""
    inputs = json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))["inputs"]
    prefs = set(design_dictionary.pref_keys(KEY_DISP_HEADERPLATE))
    return {key: value for key, value in inputs.items() if key not in prefs}


def test_customized_default_is_a_reported_failure():
    result = run_design_calculation_task.apply(kwargs={
        "module_name": "shear-connection",
        "submodule_slug": "header-plate",
        "inputs": _request("defaults-customized__column-flange-beam-web"),
    }).get()
    assert result["success"] is False
    assert result["design_status"] is False
    assert result["error"] == HEADER_PLATE_FAILED_MESSAGE


def test_the_service_returns_the_failure_instead_of_raising():
    inputs = design_dictionary.fill_prefs(KEY_DISP_HEADERPLATE, _request("defaults-customized__column-flange-beam-web"))
    assert inputs[KEY_DP_DETAILING_EDGE_TYPE] == "Sheared or hand flame cut"
    result = EndPlateService.calculate(inputs)
    assert result == {"data": {}, "logs": [], "success": False, "error": HEADER_PLATE_FAILED_MESSAGE}


def test_all_default_still_designs_with_the_core_edge_type():
    result = run_design_calculation_task.apply(kwargs={
        "module_name": "shear-connection",
        "submodule_slug": "header-plate",
        "inputs": _request("defaults-all__column-flange-beam-web"),
    }).get()
    assert result["success"] is True
    assert result["design_status"] is True
