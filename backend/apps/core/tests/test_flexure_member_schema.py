"""
Design request models of the flexure members (simply supported beam, cantilever beam, plate girder).

The schema tests are pure (no database). The view tests post to the design endpoint and
check that a bad request is a 400 in the shared error format and that no task is enqueued.
"""
import copy
import json
from unittest.mock import patch

import pytest
from django.test import TestCase

from apps.core.design_dictionary import fill_request_prefs
from apps.core.tasks import run_design_calculation_task
from apps.core.tests.test_design_input_fixtures import FIXTURES_DIR
from apps.core.utils.errors import ValidationError
from apps.modules.flexure_member.submodules.on_cantilever.schema import OnCantileverInput
from apps.modules.flexure_member.submodules.plate_girder.schema import PlateGirderInput
from apps.modules.flexure_member.submodules.simply_supported_beam.schema import SimplySupportedBeamInput
from osdag_core.Common import (
    KEY_BOTTOM_Bflange_PG,
    KEY_IntermediateStiffener_spacing,
    KEY_LENGTH,
    KEY_MODULE,
    KEY_OVERALL_DEPTH_PG,
    KEY_OVERALL_DEPTH_PG_TYPE,
    KEY_SECSIZE,
    KEY_SHEAR,
    KEY_SUPPORT_WIDTH,
    KEY_TOP_Bflange_PG,
    KEY_WEB_THICKNESS_PG,
)

# slug -> (model, number of required keys)
MODULES = {
    "simply_supported_beam": (SimplySupportedBeamInput, 16),
    "on_cantilever": (OnCantileverInput, 11),
    "plate_girder": (PlateGirderInput, 23),
}
FIXTURE = "defaults-all.json"


def url(slug):
    return f"/api/modules/flexure-member/{slug.replace('_', '-')}/design/"


def raw_inputs(slug):
    path = FIXTURES_DIR / f"flexure_member__{slug}" / FIXTURE
    return json.loads(path.read_text(encoding="utf-8"))["inputs"]


def valid_inputs(slug):
    return fill_request_prefs(raw_inputs(slug))


def fields_of(model, inputs):
    with pytest.raises(ValidationError) as caught:
        model.validate_request(inputs)
    return {e["field"]: e["message"] for e in caught.value.errors}


@pytest.mark.parametrize("slug", MODULES)
def test_valid_fixture_passes(slug):
    MODULES[slug][0].validate_request(valid_inputs(slug))


@pytest.mark.parametrize("slug", MODULES)
def test_each_required_key_missing_is_reported_under_that_key(slug):
    model = MODULES[slug][0]
    assert len(model.required_keys()) == MODULES[slug][1]
    for key in model.required_keys():
        inputs = valid_inputs(slug)
        del inputs[key]
        assert fields_of(model, inputs) == {key: f"Please specify {key} in input values."}


@pytest.mark.parametrize("slug", MODULES)
def test_empty_required_values_count_as_missing(slug):
    model = MODULES[slug][0]
    for empty in (None, "", []):
        inputs = valid_inputs(slug)
        inputs[KEY_MODULE] = empty
        assert fields_of(model, inputs) == {KEY_MODULE: f"Please specify {KEY_MODULE} in input values."}


@pytest.mark.parametrize("slug", ["simply_supported_beam", "on_cantilever"])
def test_beams_accept_any_non_empty_value(slug):
    model = MODULES[slug][0]
    inputs = valid_inputs(slug)
    inputs[KEY_LENGTH] = 5000
    inputs[KEY_SECSIZE] = ["ISMB 300", "ISMB 350"]
    inputs[KEY_SHEAR] = "not a number"
    model.validate_request(inputs)


@pytest.mark.parametrize("slug", MODULES)
def test_all_bad_fields_are_reported_together(slug):
    model = MODULES[slug][0]
    inputs = valid_inputs(slug)
    del inputs[KEY_MODULE]
    inputs[KEY_LENGTH] = None if slug != "plate_girder" else "abc"
    inputs[KEY_SHEAR] = "" if slug != "plate_girder" else 12
    assert set(fields_of(model, inputs)) == {KEY_MODULE, KEY_LENGTH, KEY_SHEAR}


def test_plate_girder_wrong_types_are_reported_under_their_key():
    for key, value in (
        (KEY_MODULE, 3),
        (KEY_LENGTH, 5000),  # a number where a numeric string is expected
        (KEY_SUPPORT_WIDTH, "wide"),
        (KEY_WEB_THICKNESS_PG, "10"),  # a string where a list is expected
        (KEY_WEB_THICKNESS_PG, ("10",)),
    ):
        inputs = valid_inputs("plate_girder")
        inputs[key] = value
        assert list(fields_of(PlateGirderInput, inputs)) == [key], (key, value)


def test_plate_girder_thickness_list_items_are_not_checked():
    inputs = valid_inputs("plate_girder")
    inputs[KEY_WEB_THICKNESS_PG] = ["10", 12, "x"]
    PlateGirderInput.validate_request(inputs)


def test_plate_girder_stiffener_spacing_is_a_number_or_na():
    inputs = valid_inputs("plate_girder")
    for good in ("NA", "na", "1500", "1500.5"):
        inputs[KEY_IntermediateStiffener_spacing] = good
        PlateGirderInput.validate_request(inputs)
    for bad in ("abc", 1500):
        inputs[KEY_IntermediateStiffener_spacing] = bad
        assert list(fields_of(PlateGirderInput, inputs)) == [KEY_IntermediateStiffener_spacing], bad


def test_customized_design_requires_numeric_dimensions():
    dimensions = (KEY_OVERALL_DEPTH_PG, KEY_TOP_Bflange_PG, KEY_BOTTOM_Bflange_PG)
    for key in dimensions:
        inputs = valid_inputs("plate_girder")
        assert inputs[KEY_OVERALL_DEPTH_PG_TYPE] == "Customized"
        del inputs[key]
        assert fields_of(PlateGirderInput, inputs) == {key: f"Please specify {key} in input values."}
        for bad in ("abc", 1300, ""):
            inputs[key] = bad
            assert list(fields_of(PlateGirderInput, inputs)) == [key], (key, bad)
    inputs = valid_inputs("plate_girder")
    for key in dimensions:
        del inputs[key]
    assert set(fields_of(PlateGirderInput, inputs)) == set(dimensions)


def test_optimized_design_does_not_need_the_dimensions():
    inputs = valid_inputs("plate_girder")
    inputs[KEY_OVERALL_DEPTH_PG_TYPE] = "Optimized"
    for key in (KEY_OVERALL_DEPTH_PG, KEY_TOP_Bflange_PG, KEY_BOTTOM_Bflange_PG):
        del inputs[key]
    PlateGirderInput.validate_request(inputs)
    # sent anyway, they are not checked
    inputs[KEY_OVERALL_DEPTH_PG] = "abc"
    PlateGirderInput.validate_request(inputs)


def test_a_request_that_is_not_an_object_is_one_error():
    assert list(fields_of(SimplySupportedBeamInput, ["not", "a", "dict"])) == ["non_field_errors"]


class DesignViewTests(TestCase):
    def post(self, slug, inputs):
        with patch.object(run_design_calculation_task, "delay") as delay:
            delay.return_value.id = "task-1"
            response = self.client.post(url(slug), data={"inputs": inputs}, content_type="application/json")
        return response, delay

    def test_bad_request_is_a_400_with_every_field_and_no_task(self):
        for slug in MODULES:
            inputs = raw_inputs(slug)
            if slug == "plate_girder":
                inputs[KEY_LENGTH] = 5000
                inputs[KEY_SUPPORT_WIDTH] = "wide"
                expected = {KEY_LENGTH, KEY_SUPPORT_WIDTH}
            else:
                del inputs[KEY_LENGTH]
                del inputs[KEY_SHEAR]
                expected = {KEY_LENGTH, KEY_SHEAR}
            response, delay = self.post(slug, inputs)
            self.assertEqual(response.status_code, 400, slug)
            error = response.json()["error"]
            self.assertEqual(error["code"], "validation_error")
            self.assertEqual(set(error["fields"]), expected)
            delay.assert_not_called()

    def test_valid_request_is_enqueued(self):
        for slug in MODULES:
            raw = raw_inputs(slug)
            response, delay = self.post(slug, copy.deepcopy(raw))
            self.assertEqual(response.status_code, 202, (slug, response.content))
            delay.assert_called_once()
            self.assertEqual(delay.call_args.kwargs["inputs"], raw)
