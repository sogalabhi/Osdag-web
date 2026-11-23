"""
`.osi` files carry core keys in and core keys out, as the desktop writes them.

A project's `inputs_json` and the content of a `.osi` file are the same design dictionary (core key ->
string or list of strings). The export writes it as YAML as it is, and `parse_osi` reads that back to the
same dictionary. The database is used only by the project download and the migration.
"""
import importlib
import json
from pathlib import Path

import pytest
import yaml
from django.apps import apps as django_apps
from django.contrib.auth.models import User
from django.test import Client

from osdag_core import Common

from apps.core.models import Project
from apps.core.tests.auth_utils import authenticated_as
from apps.core.utils import osi_files
from apps.core.utils.osi_files import build_osi_payload, parse_osi, serialize_osi

EXAMPLES_DIR = Path(__file__).resolve().parents[4] / "osdag_core" / "data" / "ResourceFiles" / "design_example"


def export(module_id, dictionary):
    return serialize_osi(build_osi_payload("name", module_id, dictionary))


def test_the_key_tables_are_gone():
    assert not hasattr(osi_files, "FIELD_TO_OSI_KEY")
    assert not hasattr(osi_files, "flatten_and_translate_keys")


def test_core_keys_in_core_keys_out():
    dictionary = {
        Common.KEY_MODULE: Common.KEY_DISP_FINPLATE,
        Common.KEY_D: ["16", "20"],
        Common.KEY_GRD: ["8.8"],
        Common.KEY_MATERIAL: "E 250 (Fe 410 W)A",
        Common.KEY_DP_DETAILING_GAP: "10",
        Common.KEY_AXIAL: "",
        Common.KEY_DP_DETAILING_CORROSIVE_INFLUENCES: "No",
        Common.KEY_SHEAR: "1.0",
        Common.KEY_PLATETHK: [],
    }
    module_id, name, inputs = parse_osi(export(Common.KEY_DISP_FINPLATE, dictionary))

    assert module_id == Common.KEY_DISP_FINPLATE
    assert inputs == dictionary


def test_the_export_is_flat_yaml_with_no_prefix_and_no_form_state():
    text = export(Common.KEY_DISP_FINPLATE, {Common.KEY_D: ["16"], Common.KEY_DP_DETAILING_GAP: "10"})
    data = yaml.safe_load(text)

    assert data == {Common.KEY_MODULE: Common.KEY_DISP_FINPLATE, Common.KEY_D: ["16"], Common.KEY_DP_DETAILING_GAP: "10"}
    assert not any(key.startswith("Pref.") or key in ("dock", "pref", "inputs") for key in data)
    assert "&id" not in text and "*id" not in text


def test_numbers_are_written_as_strings_and_a_repeated_list_is_written_in_full():
    shared = ["8", "10"]
    text = export(Common.KEY_DISP_FINPLATE, {"out_titles_status": [1, 1, 0], "A": shared, "B": shared})
    inputs = parse_osi(text)[2]

    assert inputs["out_titles_status"] == ["1", "1", "0"]
    assert inputs["A"] == inputs["B"] == ["8", "10"]
    assert "&id" not in text and "*id" not in text


def test_a_missing_module_key_is_filled_from_the_module_id():
    assert parse_osi(export(Common.KEY_DISP_FINPLATE, {Common.KEY_D: ["16"]}))[2][Common.KEY_MODULE] == Common.KEY_DISP_FINPLATE


def test_the_header_plate_module_is_written_under_its_desktop_name():
    # The one place the exported dictionary differs from the stored one: the desktop calls the module
    # "End Plate Connection", and parse_osi maps that back to the web module id.
    text = export(Common.KEY_DISP_HEADERPLATE, {Common.KEY_MODULE: Common.KEY_DISP_HEADERPLATE, Common.KEY_D: ["16"]})
    module_id, _, inputs = parse_osi(text)

    assert inputs[Common.KEY_MODULE] == "End Plate Connection"
    assert module_id == Common.KEY_DISP_HEADERPLATE


@pytest.mark.parametrize("path", sorted(EXAMPLES_DIR.glob("*.osi")), ids=lambda p: p.name)
def test_every_desktop_example_exports_and_parses_to_the_same_dictionary(path):
    module_id, _, dictionary = parse_osi(path.read_text(encoding="utf-8"))

    exported_id, _, exported = parse_osi(export(module_id, dictionary))

    assert exported_id == module_id
    assert exported == dictionary


@pytest.mark.django_db
class TestProjectDownload:
    def test_the_stored_dictionary_is_the_file(self):
        user = User.objects.create_user(username="u1", email="u1@example.com", password="x")
        dictionary = {
            Common.KEY_MODULE: Common.KEY_DISP_FINPLATE,
            Common.KEY_D: ["16", "20"],
            Common.KEY_MATERIAL: "E 250 (Fe 410 W)A",
            Common.KEY_DP_DETAILING_GAP: "10",
        }
        project = Project.objects.create(
            name="p", module="connections", submodule=Common.KEY_DISP_FINPLATE, inputs_json=dictionary, user_email=user.email,
        )

        with authenticated_as(user):
            response = Client().get(f"/api/projects/{project.id}/osi")

        assert response.status_code == 200
        assert parse_osi(response.content.decode("utf-8"))[2] == dictionary

    def test_save_from_inputs_writes_the_dictionary_as_it_is(self):
        dictionary = {Common.KEY_MODULE: Common.KEY_DISP_FINPLATE, Common.KEY_D: ["16"], Common.KEY_DP_BOLT_HOLE_TYPE: "Over-sized"}

        response = Client().post(
            "/api/save-osi-from-inputs/",
            data=json.dumps({"name": "n", "module_id": Common.KEY_DISP_FINPLATE, "inputs": dictionary}),
            content_type="application/json",
        )

        import base64

        assert response.status_code == 200
        text = base64.b64decode(response.json()["content_base64"]).decode("utf-8")
        assert parse_osi(text)[2] == dictionary


@pytest.mark.django_db
class TestClearFieldStateMigration:
    def run(self):
        migration = importlib.import_module("apps.core.migrations.0018_clear_field_state_project_inputs")
        migration.clear_field_state_inputs(django_apps, None)

    def test_old_shapes_are_cleared_and_new_ones_kept(self):
        new = {Common.KEY_D: ["16"], Common.KEY_MODULE: Common.KEY_DISP_FINPLATE}
        rows = {
            "dock_pref": {"dock": {"bolt_diameter": ["16"]}, "pref": {}},
            "pref_only": {"pref": {"detailing_gap": "5"}},
            "envelope": {"version": "1.0", "name": "n", "module_id": "m", "inputs": {"dock": {}, "pref": {}}},
            "dictionary": new,
            "empty": {},
            "none": None,
        }
        ids = {key: Project.objects.create(name=key, inputs_json=value, user_email="a@example.com").id for key, value in rows.items()}

        self.run()

        stored = {key: Project.objects.get(id=pk).inputs_json for key, pk in ids.items()}
        assert stored == {"dock_pref": None, "pref_only": None, "envelope": None, "dictionary": new, "empty": {}, "none": None}
        assert Project.objects.filter(id__in=ids.values()).count() == len(rows)
