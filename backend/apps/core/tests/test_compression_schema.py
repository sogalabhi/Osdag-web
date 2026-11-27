"""
Design request models of the struts (bolted, welded) and the axially loaded column.

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
from apps.modules.compression_member.submodules.axially_loaded_column.schema import AxiallyLoadedColumnInput
from apps.modules.compression_member.submodules.struts_bolted.schema import BoltedStrutInput
from apps.modules.compression_member.submodules.struts_welded.schema import WeldedStrutInput
from osdag_core.Common import (
    KEY_ACTUAL_LEN_ZZ,
    KEY_AXIAL,
    KEY_CONNECTOR_MATERIAL,
    KEY_D,
    KEY_DP_BOLT_SLIP_FACTOR,
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DETAILING_GAP,
    KEY_END1,
    KEY_GRD,
    KEY_MODULE,
    KEY_PLATETHK,
    KEY_SECSIZE,
    KEY_SEC_MATERIAL,
    KEY_SEC_PROFILE,
)

MODELS = {
    "struts_bolted": BoltedStrutInput,
    "struts_welded": WeldedStrutInput,
    "axially_loaded_column": AxiallyLoadedColumnInput,
}
REQUIRED_COUNT = {"struts_bolted": 21, "struts_welded": 12, "axially_loaded_column": 11}
DESIGN_URL = "/api/modules/compression-member/{}/design/"


def valid_inputs(sub):
    path = FIXTURES_DIR / f"compression_member__{sub}" / "defaults-all.json"
    return fill_request_prefs(json.loads(path.read_text(encoding="utf-8"))["inputs"])


def fields_of(model, inputs):
    with pytest.raises(ValidationError) as caught:
        model.validate_request(inputs)
    return {e["field"]: e["message"] for e in caught.value.errors}


@pytest.mark.parametrize("sub", MODELS)
def test_valid_fixture_passes(sub):
    MODELS[sub].validate_request(valid_inputs(sub))


@pytest.mark.parametrize("sub", MODELS)
def test_each_required_key_missing_is_reported_under_that_key(sub):
    model = MODELS[sub]
    assert len(model.required_keys()) == REQUIRED_COUNT[sub]
    for key in model.required_keys():
        inputs = valid_inputs(sub)
        del inputs[key]
        assert fields_of(model, inputs) == {key: f"Please specify {key} in input values."}


@pytest.mark.parametrize("sub", MODELS)
def test_empty_required_values_count_as_missing(sub):
    model = MODELS[sub]
    for key, empty in ((KEY_SECSIZE, []), (KEY_AXIAL, ""), (KEY_MODULE, None), (KEY_SEC_PROFILE, "")):
        inputs = valid_inputs(sub)
        inputs[key] = empty
        assert list(fields_of(model, inputs)) == [key]


@pytest.mark.parametrize("sub", MODELS)
def test_blank_section_names_are_rejected(sub):
    inputs = valid_inputs(sub)
    inputs[KEY_SECSIZE] = ["", "  "]
    assert list(fields_of(MODELS[sub], inputs)) == [KEY_SECSIZE]


@pytest.mark.parametrize("sub", ["struts_bolted", "struts_welded"])
def test_strut_section_may_be_a_single_name_but_not_all(sub):
    inputs = valid_inputs(sub)
    inputs[KEY_SECSIZE] = "20 x 20 x 3"
    MODELS[sub].validate_request(inputs)
    inputs[KEY_SECSIZE] = "All"
    assert list(fields_of(MODELS[sub], inputs)) == [KEY_SECSIZE]
    inputs[KEY_SECSIZE] = 5
    assert list(fields_of(MODELS[sub], inputs)) == [KEY_SECSIZE]


def test_column_section_must_be_a_list():
    inputs = valid_inputs("axially_loaded_column")
    inputs[KEY_SECSIZE] = "JB 150"
    assert list(fields_of(AxiallyLoadedColumnInput, inputs)) == [KEY_SECSIZE]


@pytest.mark.parametrize("sub", ["struts_bolted", "struts_welded"])
def test_strut_axial_load_must_be_an_int_string(sub):
    for value in (500, "5.5", "abc"):
        inputs = valid_inputs(sub)
        inputs[KEY_AXIAL] = value
        assert list(fields_of(MODELS[sub], inputs)) == [KEY_AXIAL], value


def test_bolted_strut_specific_wrong_values():
    for key, value in (
        (KEY_D, ["10", "x"]),
        (KEY_D, "10"),
        (KEY_PLATETHK, "10"),
        (KEY_GRD, ["8.8", "high"]),
        (KEY_DP_BOLT_SLIP_FACTOR, "0,3"),
        (KEY_DP_DETAILING_CORROSIVE_INFLUENCES, "yes"),
        (KEY_DP_DETAILING_GAP, "0.5"),
        (KEY_SEC_MATERIAL, ""),
    ):
        inputs = valid_inputs("struts_bolted")
        inputs[key] = value
        assert list(fields_of(BoltedStrutInput, inputs)) == [key], (key, value)


def test_welded_strut_plate_thickness_is_a_string_or_a_list():
    inputs = valid_inputs("struts_welded")
    for value in ("10", ["10", "12"]):
        inputs[KEY_PLATETHK] = value
        WeldedStrutInput.validate_request(inputs)
    for value in ("abc", ["10", "x"], 10):
        inputs[KEY_PLATETHK] = value
        assert list(fields_of(WeldedStrutInput, inputs)) == [KEY_PLATETHK], value


def test_welded_strut_connector_material_is_optional_but_checked_when_sent():
    inputs = valid_inputs("struts_welded")
    inputs.pop(KEY_CONNECTOR_MATERIAL, None)
    WeldedStrutInput.validate_request(inputs)
    inputs[KEY_CONNECTOR_MATERIAL] = 5
    assert list(fields_of(WeldedStrutInput, inputs)) == [KEY_CONNECTOR_MATERIAL]
    inputs[KEY_CONNECTOR_MATERIAL] = None
    assert list(fields_of(WeldedStrutInput, inputs)) == [KEY_CONNECTOR_MATERIAL]


def test_column_lengths_and_load_take_numbers_or_numeric_strings():
    inputs = valid_inputs("axially_loaded_column")
    for key in (KEY_ACTUAL_LEN_ZZ, KEY_AXIAL):
        for value in ("3000", "2.5", 3000, 2.5):
            inputs[key] = value
            AxiallyLoadedColumnInput.validate_request(inputs)
        for value in ("abc", ["1"]):
            inputs[key] = value
            assert list(fields_of(AxiallyLoadedColumnInput, inputs)) == [key], (key, value)
        inputs[key] = "100"


@pytest.mark.parametrize("sub", MODELS)
def test_all_bad_fields_are_reported_together(sub):
    inputs = valid_inputs(sub)
    del inputs[KEY_MODULE]
    inputs[KEY_AXIAL] = ["x"]
    inputs[KEY_SECSIZE] = []
    inputs[KEY_END1] = 3
    assert set(fields_of(MODELS[sub], inputs)) == {KEY_MODULE, KEY_AXIAL, KEY_SECSIZE, KEY_END1}


def test_a_request_that_is_not_an_object_is_one_error():
    assert list(fields_of(BoltedStrutInput, ["not", "a", "dict"])) == ["non_field_errors"]


def test_welded_strut_ignores_the_bolt_keys():
    inputs = valid_inputs("struts_welded")
    inputs[KEY_D] = "not a list"
    WeldedStrutInput.validate_request(inputs)


class DesignViewTests(TestCase):
    SLUGS = {
        "struts-bolted": "struts_bolted",
        "struts-welded": "struts_welded",
        "axially-loaded-column": "axially_loaded_column",
    }

    def post(self, slug, inputs):
        with patch.object(run_design_calculation_task, "delay") as delay:
            delay.return_value.id = "task-1"
            response = self.client.post(
                DESIGN_URL.format(slug), data={"inputs": inputs}, content_type="application/json"
            )
        return response, delay

    def test_bad_request_is_a_400_with_every_field_and_no_task(self):
        for slug, sub in self.SLUGS.items():
            inputs = valid_inputs(sub)
            del inputs[KEY_MODULE]
            inputs[KEY_AXIAL] = ["x"]
            inputs[KEY_SECSIZE] = ["", " "]
            response, delay = self.post(slug, inputs)
            self.assertEqual(response.status_code, 400, slug)
            error = response.json()["error"]
            self.assertEqual(error["code"], "validation_error")
            self.assertEqual(set(error["fields"]), {KEY_MODULE, KEY_AXIAL, KEY_SECSIZE})
            delay.assert_not_called()

    def test_valid_request_is_enqueued(self):
        for slug, sub in self.SLUGS.items():
            raw = json.loads(
                (FIXTURES_DIR / f"compression_member__{sub}" / "defaults-all.json").read_text(encoding="utf-8")
            )["inputs"]
            response, delay = self.post(slug, copy.deepcopy(raw))
            self.assertEqual(response.status_code, 202, (slug, response.content))
            delay.assert_called_once()
            self.assertEqual(delay.call_args.kwargs["inputs"], raw)
