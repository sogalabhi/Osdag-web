"""
A plate girder request never sees the customized stiffener thickness list of another request.

The core's `PlateGirderWelded.set_input_values` reads the 'Customized' intermediate and longitudinal
stiffener thickness lists from the class attributes `int_thicklist` and `long_thicklist`, which every
request of the process shares. The adapter now derives the lists per request and holds them in those
attributes only while one `set_input_values` runs, so a 'Customized' request without a list gets the
standard `VALUES_STIFFENER_THICKNESS`, as the desktop does for an empty list.
"""
import copy
import json
from pathlib import Path

import pytest
from apps.core.web_keys import (
    WEB_DESIGN_INTERMEDIATESTIFFENER_THICKNESS_VALUES,
    WEB_DESIGN_LONGITUDNALSTIFFENER_THICKNESS_VALUES,
)
from apps.modules.flexure_member.submodules.plate_girder import adapter

from osdag_core.Common import (
    KEY_BOTTOM_FLANGE_THICKNESS_PG,
    KEY_OVERALL_DEPTH_PG_TYPE,
    KEY_TOP_FLANGE_THICKNESS_PG,
    KEY_WEB_THICKNESS_PG,
    KEY_IntermediateStiffener_thickness,
    KEY_IntermediateStiffener_thickness_val,
    KEY_LongitudnalStiffener_thickness,
    KEY_LongitudnalStiffener_thickness_val,
)
from osdag_core.design_type.plate_girder.core.plate_girder import (
    VALUES_STIFFENER_THICKNESS,
    PlateGirderWelded,
)

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "design_inputs" / "flexure_member__plate_girder"

FIRST_INT = ["10", "12"]
FIRST_LONG = ["8", "16", "20"]


@pytest.fixture(autouse=True)
def clean_class_lists():
    PlateGirderWelded.int_thicklist = []
    PlateGirderWelded.long_thicklist = []
    yield
    PlateGirderWelded.int_thicklist = []
    PlateGirderWelded.long_thicklist = []


def customized_request(int_list=None, long_list=None):
    inputs = json.loads((FIXTURES / "defaults-customized.json").read_text(encoding="utf-8"))["inputs"]
    inputs = copy.deepcopy(inputs)
    inputs[KEY_IntermediateStiffener_thickness] = "Customized"
    inputs[KEY_LongitudnalStiffener_thickness] = "Customized"
    if int_list is not None:
        inputs[WEB_DESIGN_INTERMEDIATESTIFFENER_THICKNESS_VALUES] = int_list
    if long_list is not None:
        inputs[WEB_DESIGN_LONGITUDNALSTIFFENER_THICKNESS_VALUES] = long_list
    return inputs


def optimized_request(int_list=None, long_list=None):
    inputs = customized_request(int_list, long_list)
    inputs[KEY_OVERALL_DEPTH_PG_TYPE] = "Optimized"
    return inputs


def test_a_customized_request_uses_its_own_lists():
    module = adapter.create_from_input(customized_request(FIRST_INT, FIRST_LONG))
    assert module.int_thickness_list == FIRST_INT
    assert module.long_thickness_list == FIRST_LONG


def test_a_second_customized_request_without_lists_does_not_use_the_first_ones():
    first = adapter.create_from_input(customized_request(FIRST_INT, FIRST_LONG))
    second = adapter.create_from_input(customized_request())
    assert first.int_thickness_list == FIRST_INT
    assert second.int_thickness_list == VALUES_STIFFENER_THICKNESS
    assert second.long_thickness_list == VALUES_STIFFENER_THICKNESS


def test_a_second_customized_request_with_other_lists_uses_those():
    adapter.create_from_input(customized_request(FIRST_INT, FIRST_LONG))
    second = adapter.create_from_input(customized_request(["6"], ["40"]))
    assert second.int_thickness_list == ["6"]
    assert second.long_thickness_list == ["40"]


def test_an_empty_list_is_the_standard_list():
    module = adapter.create_from_input(customized_request([], []))
    assert module.int_thickness_list == VALUES_STIFFENER_THICKNESS
    assert module.long_thickness_list == VALUES_STIFFENER_THICKNESS


def test_a_list_left_on_the_class_by_something_else_is_not_used():
    PlateGirderWelded.int_thicklist = ["99"]
    PlateGirderWelded.long_thicklist = ["98"]
    module = adapter.create_from_input(customized_request())
    assert module.int_thickness_list == VALUES_STIFFENER_THICKNESS
    assert module.long_thickness_list == VALUES_STIFFENER_THICKNESS


def test_a_standard_request_ignores_lists_it_carries():
    inputs = customized_request(FIRST_INT, FIRST_LONG)
    inputs[KEY_IntermediateStiffener_thickness] = "Standard"
    inputs[KEY_LongitudnalStiffener_thickness] = "Standard"
    module = adapter.create_from_input(inputs)
    assert module.int_thickness_list == VALUES_STIFFENER_THICKNESS
    assert module.long_thickness_list == VALUES_STIFFENER_THICKNESS


def test_nothing_is_left_on_the_class_afterwards():
    adapter.create_from_input(customized_request(FIRST_INT, FIRST_LONG))
    assert PlateGirderWelded.int_thicklist == []
    assert PlateGirderWelded.long_thicklist == []


def test_the_lists_are_cleared_when_set_input_values_fails():
    class Failing:
        def set_input_values(self, design_dict):
            assert PlateGirderWelded.int_thicklist == FIRST_INT
            raise RuntimeError("core failed")

    design_dict = {
        KEY_IntermediateStiffener_thickness: "Customized",
        KEY_IntermediateStiffener_thickness_val: FIRST_INT,
        KEY_LongitudnalStiffener_thickness: "Standard",
        KEY_LongitudnalStiffener_thickness_val: VALUES_STIFFENER_THICKNESS,
    }
    with pytest.raises(RuntimeError):
        adapter.set_input_values_for_request(Failing(), design_dict)
    assert PlateGirderWelded.int_thicklist == []
    assert PlateGirderWelded.long_thicklist == []


def _optimisation_module(inputs):
    """What the optimisation task does with a request: the design dictionary, then set_input_values on scalars."""
    design_dict = adapter.create_optimization_input(inputs)
    scalar = design_dict.copy()
    for key in (KEY_TOP_FLANGE_THICKNESS_PG, KEY_BOTTOM_FLANGE_THICKNESS_PG, KEY_WEB_THICKNESS_PG):
        scalar[key] = design_dict[key][0] if isinstance(design_dict[key], list) else design_dict[key]
    module = adapter.create_module()
    adapter.set_input_values_for_request(module, scalar)
    return design_dict, module


def test_a_second_optimisation_without_lists_does_not_use_the_first_ones():
    first_dict, first = _optimisation_module(optimized_request(FIRST_INT, FIRST_LONG))
    second_dict, second = _optimisation_module(optimized_request())
    assert first_dict[KEY_IntermediateStiffener_thickness_val] == FIRST_INT
    assert first_dict[KEY_LongitudnalStiffener_thickness_val] == FIRST_LONG
    assert first.int_thickness_list == FIRST_INT
    assert second_dict[KEY_IntermediateStiffener_thickness_val] == VALUES_STIFFENER_THICKNESS
    assert second_dict[KEY_LongitudnalStiffener_thickness_val] == VALUES_STIFFENER_THICKNESS
    assert second.int_thickness_list == VALUES_STIFFENER_THICKNESS
    assert second.long_thickness_list == VALUES_STIFFENER_THICKNESS
    assert PlateGirderWelded.int_thicklist == []
    assert PlateGirderWelded.long_thicklist == []


def test_a_design_after_an_optimisation_does_not_use_its_lists():
    _optimisation_module(optimized_request(FIRST_INT, FIRST_LONG))
    module = adapter.create_from_input(customized_request())
    assert module.int_thickness_list == VALUES_STIFFENER_THICKNESS
