"""
Design request models of the bolted and welded tension member.

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
from apps.core.utils.errors import ValidationError
from apps.modules.tension_member.submodules.bolted.schema import BoltedTensionInput
from apps.modules.tension_member.submodules.welded.schema import WeldedTensionInput
from apps.core.tests.test_design_input_fixtures import FIXTURES_DIR
from osdag_core.Common import (
    KEY_AXIAL,
    KEY_D,
    KEY_DP_BOLT_SLIP_FACTOR,
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DETAILING_GAP,
    KEY_GRD,
    KEY_MODULE,
    KEY_PLATETHK,
    KEY_SECSIZE,
    KEY_SEC_MATERIAL,
)

MODELS = {
    "tension_member__bolted": BoltedTensionInput,
    "tension_member__welded": WeldedTensionInput,
}
DESIGN_URL = "/api/modules/tension-member/{}/design/"


def valid_inputs(slug):
    letter = "b" if slug.endswith("bolted") else "w"
    path = FIXTURES_DIR / slug / f"osi-tension-{letter}-angle.json"
    return fill_request_prefs(json.loads(path.read_text(encoding="utf-8"))["inputs"])


def fields_of(model, inputs):
    with pytest.raises(ValidationError) as caught:
        model.validate_request(inputs)
    return {e["field"]: e["message"] for e in caught.value.errors}


BOLTED_ONLY = {
    "Bolt.Diameter", "Bolt.Grade", "Bolt.Type", "Bolt.Bolt_Hole_Type", "Bolt.Slip_Factor",
    "Detailing.Corrosive_Influences", "Detailing.Edge_type", "Detailing.Gap",
}


@pytest.mark.parametrize("slug", MODELS)
def test_valid_fixture_passes(slug):
    MODELS[slug].validate_request(valid_inputs(slug))


@pytest.mark.parametrize("slug", MODELS)
def test_each_required_key_missing_is_reported_under_that_key(slug):
    model = MODELS[slug]
    assert len(model.required_keys()) == (19 if slug.endswith("bolted") else 11)
    for key in model.required_keys():
        inputs = valid_inputs(slug)
        del inputs[key]
        assert fields_of(model, inputs) == {key: f"Please specify {key} in input values."}


@pytest.mark.parametrize("slug", MODELS)
def test_empty_required_values_count_as_missing(slug):
    model = MODELS[slug]
    for key, empty in ((KEY_SECSIZE, []), (KEY_PLATETHK, []), (KEY_AXIAL, ""), (KEY_MODULE, None)):
        inputs = valid_inputs(slug)
        inputs[key] = empty
        assert list(fields_of(model, inputs)) == [key]


@pytest.mark.parametrize("slug", MODELS)
def test_wrong_types_and_values_are_reported_under_their_key(slug):
    model = MODELS[slug]
    bad = {
        KEY_AXIAL: 500,  # a number where a numeric string is expected
        KEY_PLATETHK: ["10", "abc"],  # an item that is not an int string
        KEY_SECSIZE: "ISA 20x20x3",  # a string where a list is expected
        KEY_SEC_MATERIAL: "",
    }
    for key, value in bad.items():
        inputs = valid_inputs(slug)
        inputs[key] = value
        assert list(fields_of(model, inputs)) == [key]
    inputs = valid_inputs(slug)
    inputs[KEY_PLATETHK] = ["10", "abc"]
    assert "Item 1" in fields_of(model, inputs)[KEY_PLATETHK]
    inputs = valid_inputs(slug)
    inputs[KEY_AXIAL] = "5.5"  # int_able rejects a float string
    assert list(fields_of(model, inputs)) == [KEY_AXIAL]


def test_bolted_specific_wrong_values():
    for key, value in (
        (KEY_D, ["10", "x"]),
        (KEY_D, "10"),
        (KEY_GRD, ["8.8", "high"]),
        (KEY_DP_BOLT_SLIP_FACTOR, "0,3"),
        (KEY_DP_DETAILING_CORROSIVE_INFLUENCES, "yes"),
        (KEY_DP_DETAILING_GAP, "0.5"),
    ):
        inputs = valid_inputs("tension_member__bolted")
        inputs[key] = value
        assert list(fields_of(BoltedTensionInput, inputs)) == [key], (key, value)


@pytest.mark.parametrize("slug", MODELS)
def test_all_bad_fields_are_reported_together(slug):
    inputs = valid_inputs(slug)
    del inputs[KEY_MODULE]
    inputs[KEY_AXIAL] = 500
    inputs[KEY_PLATETHK] = []
    inputs[KEY_DP_DETAILING_CORROSIVE_INFLUENCES] = "maybe"
    assert set(fields_of(MODELS[slug], inputs)) == {
        KEY_MODULE, KEY_AXIAL, KEY_PLATETHK, KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    }


def test_welded_detailing_keys_are_optional_but_checked_when_sent():
    inputs = valid_inputs("tension_member__welded")
    for key in ("Detailing.Corrosive_Influences", "Detailing.Edge_type", "Detailing.Gap"):
        inputs.pop(key, None)
    WeldedTensionInput.validate_request(inputs)
    inputs[KEY_DP_DETAILING_GAP] = "x"
    assert list(fields_of(WeldedTensionInput, inputs)) == [KEY_DP_DETAILING_GAP]
    inputs[KEY_DP_DETAILING_GAP] = None  # sent as null: rejected, as before
    assert list(fields_of(WeldedTensionInput, inputs)) == [KEY_DP_DETAILING_GAP]


def test_a_request_that_is_not_an_object_is_one_error():
    assert list(fields_of(BoltedTensionInput, ["not", "a", "dict"])) == ["non_field_errors"]


def test_welded_ignores_the_bolt_keys():
    inputs = valid_inputs("tension_member__welded")
    inputs[KEY_D] = "not a list"
    WeldedTensionInput.validate_request(inputs)


class DesignViewTests(TestCase):
    def post(self, slug, inputs):
        with patch.object(run_design_calculation_task, "delay") as delay:
            delay.return_value.id = "task-1"
            response = self.client.post(
                DESIGN_URL.format(slug), data={"inputs": inputs}, content_type="application/json"
            )
        return response, delay

    def test_bad_request_is_a_400_with_every_field_and_no_task(self):
        for slug in ("bolted", "welded"):
            inputs = valid_inputs(f"tension_member__{slug}")
            del inputs[KEY_MODULE]
            inputs[KEY_AXIAL] = 500
            inputs[KEY_PLATETHK] = ["abc"]
            response, delay = self.post(slug, inputs)
            self.assertEqual(response.status_code, 400, slug)
            error = response.json()["error"]
            self.assertEqual(error["code"], "validation_error")
            self.assertEqual(set(error["fields"]), {KEY_MODULE, KEY_AXIAL, KEY_PLATETHK})
            delay.assert_not_called()

    def test_valid_request_is_enqueued(self):
        for slug in ("bolted", "welded"):
            raw = json.loads(
                (FIXTURES_DIR / f"tension_member__{slug}" / "defaults-all.json").read_text(encoding="utf-8")
            )["inputs"]
            response, delay = self.post(slug, copy.deepcopy(raw))
            self.assertEqual(response.status_code, 202, (slug, response.content))
            delay.assert_called_once()
            # The task gets the request as sent; it fills the Additional Inputs itself.
            self.assertEqual(delay.call_args.kwargs["inputs"], raw)
