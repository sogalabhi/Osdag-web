"""
Design request models of the fin plate, header plate, cleat angle and seated angle connections.

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
from apps.modules.shear_connection.submodules.cleat_angle.schema import CleatAngleInput
from apps.modules.shear_connection.submodules.fin_plate.schema import FinPlateInput
from apps.modules.shear_connection.submodules.header_plate.schema import HeaderPlateInput
from apps.modules.shear_connection.submodules.seated_angle.schema import SeatedAngleInput
from osdag_core.Common import (
    KEY_ANGLE_LIST,
    KEY_AXIAL,
    KEY_CONN,
    KEY_D,
    KEY_DP_BOLT_SLIP_FACTOR,
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DETAILING_GAP,
    KEY_DP_WELD_FAB,
    KEY_DP_WELD_MATERIAL_G_O,
    KEY_GRD,
    KEY_MODULE,
    KEY_PLATETHK,
    KEY_SHEAR,
    KEY_TOPANGLE,
)

# slug -> (model, fixture file, URL slug, number of required keys)
MODULES = {
    "shear_connection__fin_plate": (FinPlateInput, "osi-fin1.json", "fin-plate", 23),
    "shear_connection__header_plate": (HeaderPlateInput, "osi-ep-1.json", "header-plate", 23),
    "shear_connection__cleat_angle": (CleatAngleInput, "osi-cleat-1.json", "cleat-angle", 20),
    "shear_connection__seated_angle": (SeatedAngleInput, "osi-sa-1.json", "seated-angle", 21),
}
DESIGN_URL = "/api/modules/shear-connection/{}/design/"
WELDED_PLATE = ("shear_connection__fin_plate", "shear_connection__header_plate")
ANGLE = ("shear_connection__cleat_angle", "shear_connection__seated_angle")


def valid_inputs(slug):
    path = FIXTURES_DIR / slug / MODULES[slug][1]
    return fill_request_prefs(json.loads(path.read_text(encoding="utf-8"))["inputs"])


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
    assert len(model.required_keys()) == MODULES[slug][3]
    for key in model.required_keys():
        inputs = valid_inputs(slug)
        del inputs[key]
        assert fields_of(model, inputs) == {key: f"Please specify {key} in input values."}


@pytest.mark.parametrize("slug", MODULES)
def test_empty_required_values_count_as_missing(slug):
    model = MODULES[slug][0]
    for key, empty in ((KEY_D, []), (KEY_SHEAR, ""), (KEY_MODULE, None), (KEY_CONN, "")):
        inputs = valid_inputs(slug)
        inputs[key] = empty
        assert list(fields_of(model, inputs)) == [key]


@pytest.mark.parametrize("slug", MODULES)
def test_wrong_types_and_values_are_reported_under_their_key(slug):
    model = MODULES[slug][0]
    for key, value in (
        (KEY_SHEAR, 60),  # a number where a numeric string is expected
        (KEY_SHEAR, "5.5"),  # int_able rejects a float string
        (KEY_D, ["16", "x"]),
        (KEY_D, "16"),
        (KEY_GRD, ["8.8", "high"]),
        (KEY_DP_BOLT_SLIP_FACTOR, "0,3"),
        (KEY_DP_DETAILING_CORROSIVE_INFLUENCES, "yes"),
        (KEY_DP_DETAILING_GAP, "0.5"),
        (KEY_CONN, 3),
    ):
        inputs = valid_inputs(slug)
        inputs[key] = value
        assert list(fields_of(model, inputs)) == [key], (key, value)
    inputs = valid_inputs(slug)
    inputs[KEY_D] = ["16", "x"]
    assert "Item 1" in fields_of(model, inputs)[KEY_D]


@pytest.mark.parametrize("slug", MODULES)
def test_all_bad_fields_are_reported_together(slug):
    inputs = valid_inputs(slug)
    del inputs[KEY_MODULE]
    inputs[KEY_SHEAR] = 60
    inputs[KEY_D] = []
    inputs[KEY_DP_DETAILING_CORROSIVE_INFLUENCES] = "maybe"
    assert set(fields_of(MODULES[slug][0], inputs)) == {
        KEY_MODULE, KEY_SHEAR, KEY_D, KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    }


@pytest.mark.parametrize("slug", WELDED_PLATE)
def test_plate_connections_require_axial_load_weld_and_plate_thickness(slug):
    model = MODULES[slug][0]
    for key in (KEY_AXIAL, KEY_DP_WELD_FAB, KEY_DP_WELD_MATERIAL_G_O, KEY_PLATETHK):
        assert key in model.required_keys()
    inputs = valid_inputs(slug)
    inputs[KEY_PLATETHK] = ["10", "abc"]
    inputs[KEY_DP_WELD_MATERIAL_G_O] = "x"
    assert set(fields_of(model, inputs)) == {KEY_PLATETHK, KEY_DP_WELD_MATERIAL_G_O}


@pytest.mark.parametrize("slug", ANGLE)
def test_angle_connections_weld_keys_are_optional_but_checked_when_sent(slug):
    model = MODULES[slug][0]
    inputs = valid_inputs(slug)
    for key in (KEY_DP_WELD_FAB, KEY_DP_WELD_MATERIAL_G_O, KEY_AXIAL, KEY_PLATETHK):
        inputs.pop(key, None)
    model.validate_request(inputs)
    inputs[KEY_DP_WELD_MATERIAL_G_O] = "x"
    assert list(fields_of(model, inputs)) == [KEY_DP_WELD_MATERIAL_G_O]
    inputs[KEY_DP_WELD_MATERIAL_G_O] = "410"
    inputs[KEY_DP_WELD_FAB] = 5
    assert list(fields_of(model, inputs)) == [KEY_DP_WELD_FAB]
    inputs[KEY_DP_WELD_FAB] = None  # sent as null: rejected
    assert list(fields_of(model, inputs)) == [KEY_DP_WELD_FAB]


@pytest.mark.parametrize("slug", ANGLE)
def test_angle_list_is_required_but_not_type_checked(slug):
    model = MODULES[slug][0]
    keys = [KEY_ANGLE_LIST] + ([KEY_TOPANGLE] if slug.endswith("seated_angle") else [])
    for key in keys:
        inputs = valid_inputs(slug)
        inputs[key] = "ISA 100x100x10"
        model.validate_request(inputs)
        inputs[key] = []
        assert list(fields_of(model, inputs)) == [key]


def test_a_request_that_is_not_an_object_is_one_error():
    assert list(fields_of(FinPlateInput, ["not", "a", "dict"])) == ["non_field_errors"]


class DesignViewTests(TestCase):
    def post(self, url_slug, inputs):
        with patch.object(run_design_calculation_task, "delay") as delay:
            delay.return_value.id = "task-1"
            response = self.client.post(
                DESIGN_URL.format(url_slug), data={"inputs": inputs}, content_type="application/json"
            )
        return response, delay

    def test_bad_request_is_a_400_with_every_field_and_no_task(self):
        for slug, (_, _, url_slug, _) in MODULES.items():
            inputs = valid_inputs(slug)
            del inputs[KEY_MODULE]
            inputs[KEY_SHEAR] = 60
            inputs[KEY_D] = ["abc"]
            response, delay = self.post(url_slug, inputs)
            self.assertEqual(response.status_code, 400, slug)
            error = response.json()["error"]
            self.assertEqual(error["code"], "validation_error")
            self.assertEqual(set(error["fields"]), {KEY_MODULE, KEY_SHEAR, KEY_D})
            delay.assert_not_called()

    def test_valid_request_is_enqueued(self):
        for slug, (_, _, url_slug, _) in MODULES.items():
            raw = json.loads(
                (FIXTURES_DIR / slug / "defaults-all__column-flange-beam-web.json").read_text(encoding="utf-8")
            )["inputs"]
            response, delay = self.post(url_slug, copy.deepcopy(raw))
            self.assertEqual(response.status_code, 202, (slug, response.content))
            delay.assert_called_once()
            self.assertEqual(delay.call_args.kwargs["inputs"], raw)
