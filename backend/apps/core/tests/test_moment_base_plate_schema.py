"""
Design request models of the moment connections (cover plate bolted and welded, end plate; beam
and column) and the base plate.

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
from apps.modules.base_plate.schema import BasePlateInput
from apps.modules.moment_connection.submodules.beam_beam_cover_plate_bolted.schema import BeamBeamCoverPlateBoltedInput
from apps.modules.moment_connection.submodules.beam_beam_cover_plate_welded.schema import BeamBeamCoverPlateWeldedInput
from apps.modules.moment_connection.submodules.beam_beam_end_plate.schema import BeamBeamEndPlateInput
from apps.modules.moment_connection.submodules.beam_column_end_plate.schema import BeamColumnEndPlateInput
from apps.modules.moment_connection.submodules.column_column_cover_plate_bolted.schema import (
    ColumnColumnCoverPlateBoltedInput,
)
from apps.modules.moment_connection.submodules.column_column_cover_plate_welded.schema import (
    ColumnColumnCoverPlateWeldedInput,
)
from apps.modules.moment_connection.submodules.column_column_end_plate.schema import ColumnColumnEndPlateInput
from osdag_core.Common import (
    KEY_AXIAL,
    KEY_AXIAL_TENSION_BP,
    KEY_CONN,
    KEY_D,
    KEY_DISP_CONN,
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DETAILING_GAP,
    KEY_DP_WELD_FAB,
    KEY_DP_WELD_MATERIAL_G_O,
    KEY_FLANGEPLATE_THICKNESS,
    KEY_MODULE,
    KEY_MOMENT,
    KEY_MOMENT_MAJOR,
    KEY_PLATETHK,
    KEY_SECSIZE,
    KEY_SHEAR,
)

# slug -> (model, fixture file, design URL, number of required keys)
MOMENT = "/api/modules/moment-connection/{}/design/"
MODULES = {
    "beam_beam_cover_plate_bolted": (BeamBeamCoverPlateBoltedInput, "defaults-all.json", MOMENT, 21),
    "column_column_cover_plate_bolted": (ColumnColumnCoverPlateBoltedInput, "defaults-all.json", MOMENT, 21),
    "beam_beam_cover_plate_welded": (BeamBeamCoverPlateWeldedInput, "defaults-all.json", MOMENT, 16),
    "column_column_cover_plate_welded": (ColumnColumnCoverPlateWeldedInput, "defaults-all.json", MOMENT, 16),
    "beam_beam_end_plate": (BeamBeamEndPlateInput, "defaults-all.json", MOMENT, 24),
    "beam_column_end_plate": (BeamColumnEndPlateInput, "defaults-all.json", MOMENT, 26),
    "column_column_end_plate": (ColumnColumnEndPlateInput, "defaults-all__flush-end-plate.json", MOMENT, 21),
    "base_plate": (BasePlateInput, "defaults-all__welded-column-base.json", "/api/modules/base-plate/design/", 11),
}
BOLTED = [s for s in MODULES if "bolted" in s or "end_plate" in s]
COVER_WELDED = [s for s in MODULES if s.endswith("cover_plate_welded")]
END_PLATE = [s for s in MODULES if s.endswith("end_plate")]
MOMENT_MODULES = [s for s in MODULES if s != "base_plate"]


def fixture_dir(slug):
    return slug if slug == "base_plate" else f"moment_connection__{slug}"


def url(slug):
    template = MODULES[slug][2]
    return template.format(slug.replace("_", "-")) if "{}" in template else template


def valid_inputs(slug):
    path = FIXTURES_DIR / fixture_dir(slug) / MODULES[slug][1]
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
    for key, empty in ((KEY_MODULE, None), (KEY_AXIAL, ""), (KEY_SECSIZE, [])):
        if key not in model.required_keys():
            continue
        inputs = valid_inputs(slug)
        inputs[key] = empty
        assert list(fields_of(model, inputs)) == [key]


@pytest.mark.parametrize("slug", BOLTED)
def test_bolted_wrong_types_and_values_are_reported_under_their_key(slug):
    model = MODULES[slug][0]
    for key, value in (
        (KEY_AXIAL, 60),  # a number where a numeric string is expected
        (KEY_SHEAR, "5.5"),  # int_able rejects a float string
        (KEY_MOMENT, "abc"),
        (KEY_D, ["16", "x"]),
        (KEY_D, "16"),
        (KEY_DP_DETAILING_CORROSIVE_INFLUENCES, "yes"),
        (KEY_DP_DETAILING_GAP, "0.5"),
        (KEY_MODULE, 3),
    ):
        inputs = valid_inputs(slug)
        inputs[key] = value
        assert list(fields_of(model, inputs)) == [key], (key, value)
    inputs = valid_inputs(slug)
    inputs[KEY_D] = ["16", "x"]
    assert "Item 1" in fields_of(model, inputs)[KEY_D]


@pytest.mark.parametrize("slug", COVER_WELDED)
def test_cover_plate_welded_accepts_decimals_and_rejects_a_negative_gap(slug):
    model = MODULES[slug][0]
    inputs = valid_inputs(slug)
    for key in (KEY_AXIAL, KEY_SHEAR, KEY_MOMENT, KEY_DP_WELD_MATERIAL_G_O, KEY_DP_DETAILING_GAP):
        inputs[key] = "5.5"
    inputs[KEY_FLANGEPLATE_THICKNESS] = ["10.5", "12"]
    model.validate_request(inputs)
    inputs[KEY_DP_DETAILING_GAP] = "-1"
    assert list(fields_of(model, inputs)) == [KEY_DP_DETAILING_GAP]
    inputs[KEY_DP_DETAILING_GAP] = "0"
    inputs[KEY_FLANGEPLATE_THICKNESS] = ["10", "x"]
    inputs[KEY_AXIAL] = 5
    assert set(fields_of(model, inputs)) == {KEY_FLANGEPLATE_THICKNESS, KEY_AXIAL}


@pytest.mark.parametrize("slug", END_PLATE)
def test_end_plate_thickness_list_must_be_integers(slug):
    model = MODULES[slug][0]
    inputs = valid_inputs(slug)
    inputs[KEY_PLATETHK] = ["10", "12.5"]
    assert list(fields_of(model, inputs)) == [KEY_PLATETHK]


def test_beam_beam_end_plate_requires_the_display_label_connectivity_key():
    model = BeamBeamEndPlateInput
    assert KEY_DISP_CONN in model.required_keys()
    assert KEY_CONN not in model.required_keys()
    for slug in ("beam_column_end_plate", "column_column_end_plate"):
        assert KEY_CONN in MODULES[slug][0].required_keys()


def test_weld_fabrication_and_grade_are_optional_for_the_column_end_plate_but_checked_when_sent():
    model = ColumnColumnEndPlateInput
    inputs = valid_inputs("column_column_end_plate")
    inputs.pop(KEY_DP_WELD_FAB, None)
    inputs.pop(KEY_DP_WELD_MATERIAL_G_O, None)
    model.validate_request(inputs)
    inputs[KEY_DP_WELD_FAB] = 5
    inputs[KEY_DP_WELD_MATERIAL_G_O] = "x"
    assert set(fields_of(model, inputs)) == {KEY_DP_WELD_FAB, KEY_DP_WELD_MATERIAL_G_O}
    inputs[KEY_DP_WELD_FAB] = None  # sent as null: rejected
    inputs[KEY_DP_WELD_MATERIAL_G_O] = "410"
    assert list(fields_of(model, inputs)) == [KEY_DP_WELD_FAB]
    for slug in ("beam_beam_end_plate", "beam_column_end_plate"):
        assert KEY_DP_WELD_FAB in MODULES[slug][0].required_keys()
        assert KEY_DP_WELD_MATERIAL_G_O in MODULES[slug][0].required_keys()


def test_base_plate_section_is_a_string_or_a_list_of_strings():
    inputs = valid_inputs("base_plate")
    inputs[KEY_SECSIZE] = ["ISMB 300", "ISMB 350"]
    BasePlateInput.validate_request(inputs)
    inputs[KEY_SECSIZE] = "ISMB 300"
    BasePlateInput.validate_request(inputs)
    for bad in (["ISMB 300", 5], 5, {"a": "b"}):
        inputs[KEY_SECSIZE] = bad
        assert list(fields_of(BasePlateInput, inputs)) == [KEY_SECSIZE], bad


def test_base_plate_loads_must_be_numeric_strings():
    for key in (KEY_AXIAL, KEY_AXIAL_TENSION_BP, KEY_MOMENT_MAJOR):
        inputs = valid_inputs("base_plate")
        inputs[key] = "12.5"
        BasePlateInput.validate_request(inputs)
        for bad in ("Disabled", 12, "1,5"):
            inputs[key] = bad
            assert list(fields_of(BasePlateInput, inputs)) == [key], (key, bad)


@pytest.mark.parametrize("slug", MODULES)
def test_all_bad_fields_are_reported_together(slug):
    model = MODULES[slug][0]
    inputs = valid_inputs(slug)
    del inputs[KEY_MODULE]
    inputs[KEY_AXIAL] = 60
    third = KEY_D if KEY_D in model.required_keys() else KEY_SECSIZE
    inputs[third] = ["x"] if third == KEY_D else {"a": 1}
    assert set(fields_of(model, inputs)) == {KEY_MODULE, KEY_AXIAL, third}


def test_a_request_that_is_not_an_object_is_one_error():
    assert list(fields_of(BeamBeamEndPlateInput, ["not", "a", "dict"])) == ["non_field_errors"]


class DesignViewTests(TestCase):
    def post(self, slug, inputs):
        with patch.object(run_design_calculation_task, "delay") as delay:
            delay.return_value.id = "task-1"
            response = self.client.post(url(slug), data={"inputs": inputs}, content_type="application/json")
        return response, delay

    def test_bad_request_is_a_400_with_every_field_and_no_task(self):
        for slug in MODULES:
            inputs = valid_inputs(slug)
            del inputs[KEY_MODULE]
            inputs[KEY_AXIAL] = 60
            response, delay = self.post(slug, inputs)
            self.assertEqual(response.status_code, 400, slug)
            error = response.json()["error"]
            self.assertEqual(error["code"], "validation_error")
            self.assertEqual(set(error["fields"]), {KEY_MODULE, KEY_AXIAL})
            delay.assert_not_called()

    def test_valid_request_is_enqueued(self):
        for slug in MODULES:
            raw = json.loads(
                (FIXTURES_DIR / fixture_dir(slug) / MODULES[slug][1]).read_text(encoding="utf-8")
            )["inputs"]
            response, delay = self.post(slug, copy.deepcopy(raw))
            self.assertEqual(response.status_code, 202, (slug, response.content))
            delay.assert_called_once()
            self.assertEqual(delay.call_args.kwargs["inputs"], raw)
