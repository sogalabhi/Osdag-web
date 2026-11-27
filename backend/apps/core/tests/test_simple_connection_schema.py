"""
Design request models of the butt and lap joints (bolted and welded).

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
from apps.modules.simple_connection.schema import normalise_numeric_inputs
from apps.modules.simple_connection.submodules.butt_joint_bolted.schema import ButtJointBoltedInput
from apps.modules.simple_connection.submodules.butt_joint_welded.schema import ButtJointWeldedInput
from apps.modules.simple_connection.submodules.lap_joint_bolted.schema import LapJointBoltedInput
from apps.modules.simple_connection.submodules.lap_joint_welded.schema import LapJointWeldedInput
from osdag_core.Common import (
    KEY_AXIAL,
    KEY_COVER_PLATE,
    KEY_D,
    KEY_DESIGN_FOR,
    KEY_DP_BOLT_SLIP_FACTOR,
    KEY_GRD,
    KEY_MODULE,
    KEY_PLATE1_THICKNESS,
    KEY_PLATE_WIDTH,
    KEY_WELD_SIZE,
)

MODELS = {
    "butt_joint_bolted": ButtJointBoltedInput,
    "butt_joint_welded": ButtJointWeldedInput,
    "lap_joint_bolted": LapJointBoltedInput,
    "lap_joint_welded": LapJointWeldedInput,
}
BOLTED = [slug for slug in MODELS if slug.endswith("bolted")]
WELDED = [slug for slug in MODELS if slug.endswith("welded")]
REQUIRED_COUNT = {"butt_joint_bolted": 13, "lap_joint_bolted": 12, "butt_joint_welded": 9, "lap_joint_welded": 8}
DESIGN_URL = "/api/modules/simple-connection/{}/design/"


def fixture_name(slug):
    return f"simple_connection__{slug}"


def valid_inputs(slug):
    path = FIXTURES_DIR / fixture_name(slug) / "defaults-all.json"
    return fill_request_prefs(json.loads(path.read_text(encoding="utf-8"))["inputs"])


def fields_of(model, inputs):
    with pytest.raises(ValidationError) as caught:
        model.validate_request(inputs)
    return {e["field"]: e["message"] for e in caught.value.errors}


@pytest.mark.parametrize("slug", MODELS)
def test_valid_fixture_passes(slug):
    MODELS[slug].validate_request(valid_inputs(slug))


@pytest.mark.parametrize("slug", MODELS)
def test_each_required_key_missing_is_reported_under_that_key(slug):
    model = MODELS[slug]
    assert len(model.required_keys()) == REQUIRED_COUNT[slug]
    for key in model.required_keys():
        inputs = valid_inputs(slug)
        del inputs[key]
        assert fields_of(model, inputs) == {key: f"Please specify {key} in input values."}


@pytest.mark.parametrize("slug", MODELS)
def test_empty_required_values_count_as_missing(slug):
    model = MODELS[slug]
    for key, empty in ((KEY_PLATE1_THICKNESS, []), (KEY_AXIAL, ""), (KEY_MODULE, None), (KEY_DESIGN_FOR, "")):
        inputs = valid_inputs(slug)
        inputs[key] = empty
        assert list(fields_of(model, inputs)) == [key]


@pytest.mark.parametrize("slug", MODELS)
def test_numeric_values_may_be_numbers_or_lists(slug):
    inputs = valid_inputs(slug)
    inputs[KEY_AXIAL] = 60
    inputs[KEY_PLATE1_THICKNESS] = ["10", "12"]
    inputs[KEY_PLATE_WIDTH] = [200.5]
    MODELS[slug].validate_request(inputs)
    normalise_numeric_inputs(inputs)
    assert (inputs[KEY_AXIAL], inputs[KEY_PLATE1_THICKNESS], inputs[KEY_PLATE_WIDTH]) == ("60", "10", "200.5")


@pytest.mark.parametrize("slug", MODELS)
def test_wrong_types_and_values_are_reported_under_their_key(slug):
    model = MODELS[slug]
    for key, value in (
        (KEY_AXIAL, "abc"),
        (KEY_PLATE1_THICKNESS, {"a": 1}),
        (KEY_PLATE_WIDTH, "0"),
        (KEY_AXIAL, "-5"),
        (KEY_AXIAL, None),
    ):
        inputs = valid_inputs(slug)
        inputs[key] = value
        assert list(fields_of(model, inputs)) == [key], (key, value)


@pytest.mark.parametrize("slug", BOLTED)
def test_bolted_specific_wrong_values(slug):
    for key, value in (
        (KEY_D, ["10", "x"]),
        (KEY_D, "10"),
        (KEY_GRD, ["8.8", "high"]),
        (KEY_DP_BOLT_SLIP_FACTOR, "0,3"),
        (KEY_DP_BOLT_SLIP_FACTOR, "0"),
        (KEY_DP_BOLT_SLIP_FACTOR, "1.5"),
    ):
        inputs = valid_inputs(slug)
        inputs[key] = value
        assert list(fields_of(MODELS[slug], inputs)) == [key], (key, value)
    inputs = valid_inputs(slug)
    inputs[KEY_DP_BOLT_SLIP_FACTOR] = "1"
    MODELS[slug].validate_request(inputs)


@pytest.mark.parametrize("slug", WELDED)
def test_weld_size_is_a_list_or_a_single_value(slug):
    inputs = valid_inputs(slug)
    inputs[KEY_WELD_SIZE] = "6"
    MODELS[slug].validate_request(inputs)
    inputs[KEY_WELD_SIZE] = 6
    MODELS[slug].validate_request(inputs)
    for bad in (["6", "x"], "x"):
        inputs[KEY_WELD_SIZE] = bad
        assert list(fields_of(MODELS[slug], inputs)) == [KEY_WELD_SIZE]


@pytest.mark.parametrize("slug", WELDED)
def test_weld_material_fabrication_and_type_are_not_required(slug):
    inputs = valid_inputs(slug)
    for key in ("Weld.Material_Grade_OverWrite", "Weld.Fab", "Weld.Type"):
        inputs.pop(key, None)
    MODELS[slug].validate_request(inputs)


@pytest.mark.parametrize("slug", WELDED)
def test_welded_checks_the_bolt_keys_when_sent_and_ignores_them_otherwise(slug):
    inputs = valid_inputs(slug)
    inputs.pop(KEY_D, None)
    MODELS[slug].validate_request(inputs)
    inputs[KEY_D] = "not a list"
    assert list(fields_of(MODELS[slug], inputs)) == [KEY_D]


def test_cover_plate_is_required_for_the_butt_joints_only():
    for slug in ("butt_joint_bolted", "butt_joint_welded"):
        assert KEY_COVER_PLATE in MODELS[slug].required_keys()
    for slug in ("lap_joint_bolted", "lap_joint_welded"):
        assert KEY_COVER_PLATE not in MODELS[slug].required_keys()


@pytest.mark.parametrize("slug", MODELS)
def test_all_bad_fields_are_reported_together(slug):
    inputs = valid_inputs(slug)
    del inputs[KEY_MODULE]
    inputs[KEY_AXIAL] = "abc"
    inputs[KEY_PLATE1_THICKNESS] = []
    inputs[KEY_PLATE_WIDTH] = "-1"
    assert set(fields_of(MODELS[slug], inputs)) == {KEY_MODULE, KEY_AXIAL, KEY_PLATE1_THICKNESS, KEY_PLATE_WIDTH}


def test_a_request_that_is_not_an_object_is_one_error():
    assert list(fields_of(ButtJointBoltedInput, ["not", "a", "dict"])) == ["non_field_errors"]


class DesignViewTests(TestCase):
    def post(self, slug, inputs):
        with patch.object(run_design_calculation_task, "delay") as delay:
            delay.return_value.id = "task-1"
            response = self.client.post(
                DESIGN_URL.format(slug.replace("_", "-")), data={"inputs": inputs}, content_type="application/json"
            )
        return response, delay

    def test_bad_request_is_a_400_with_every_field_and_no_task(self):
        for slug in MODELS:
            inputs = valid_inputs(slug)
            del inputs[KEY_MODULE]
            inputs[KEY_AXIAL] = "abc"
            inputs[KEY_PLATE1_THICKNESS] = ["x"]
            response, delay = self.post(slug, inputs)
            self.assertEqual(response.status_code, 400, slug)
            error = response.json()["error"]
            self.assertEqual(error["code"], "validation_error")
            self.assertEqual(set(error["fields"]), {KEY_MODULE, KEY_AXIAL, KEY_PLATE1_THICKNESS})
            delay.assert_not_called()

    def test_valid_request_is_enqueued(self):
        for slug in MODELS:
            raw = json.loads(
                (FIXTURES_DIR / fixture_name(slug) / "defaults-all.json").read_text(encoding="utf-8")
            )["inputs"]
            response, delay = self.post(slug, copy.deepcopy(raw))
            self.assertEqual(response.status_code, 202, (slug, response.content))
            delay.assert_called_once()
            self.assertEqual(delay.call_args.kwargs["inputs"], raw)
