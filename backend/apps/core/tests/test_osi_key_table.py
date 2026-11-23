"""
`.osi` files carry core keys in and core keys out.

`parse_osi` returns the file's design dictionary as written (the frontend reads it with each module's
declared `coreKeys`). `FIELD_TO_OSI_KEY` is what an export of a stored project (`{dock, pref}` keyed by
the web field names) still needs to write each field under the core key the desktop reads. No database
is used.
"""
from osdag_core import Common

from apps.core.web_keys import WEB_OSDAGWEB_VERSION
from apps.core.utils.osi_files import (
    FIELD_TO_OSI_KEY,
    build_osi_payload,
    flatten_and_translate_keys,
    parse_osi,
    serialize_osi,
)

CORE_VALUES = {v for k, v in vars(Common).items() if not k.startswith("_") and isinstance(v, str)}


def test_every_export_key_is_a_core_key():
    not_core = sorted(k for k in FIELD_TO_OSI_KEY.values() if k not in CORE_VALUES)
    assert not not_core, f"keys that are not Common.py values: {not_core}"


def test_export_writes_the_core_spelling():
    exported = flatten_and_translate_keys(
        {
            "dock": {
                "plate_thickness": ["10"],
                "flange_plate_thickness": ["10"],
                "web_plate_thickness": ["8"],
                "section_profile": "Beams and Columns",
                "end_condition_1": "Fixed",
            },
            "pref": {},
        }
    )
    assert set(exported) == {
        Common.KEY_PLATETHK,  # Connector.Plate.Thickness_List
        "Connector.Flange_Plate.Thickness_list",
        "Connector.Web_Plate.Thickness_List",
        Common.KEY_SEC_PROFILE,  # Member.Profile
        Common.KEY_END1,  # End_1
    }


def test_a_design_dictionary_is_exported_as_it_is():
    dictionary = {Common.KEY_MODULE: Common.KEY_DISP_FINPLATE, Common.KEY_D: ["16", "20"], Common.KEY_MATERIAL: "E 250"}
    assert flatten_and_translate_keys(dictionary) == dictionary


def test_core_keys_in_core_keys_out():
    dictionary = {
        Common.KEY_MODULE: Common.KEY_DISP_FINPLATE,
        Common.KEY_D: ["16", "20"],
        Common.KEY_GRD: ["8.8"],
        Common.KEY_MATERIAL: "E 250 (Fe 410 W)A",
        Common.KEY_DP_DETAILING_GAP: "10",
    }
    payload = build_osi_payload("name", Common.KEY_DISP_FINPLATE, dictionary)
    module_id, name, inputs = parse_osi(serialize_osi(payload))

    assert module_id == Common.KEY_DISP_FINPLATE
    # The writer stamps the web version; everything else comes back as written.
    assert inputs.pop(WEB_OSDAGWEB_VERSION) == "1.0"
    assert inputs == dictionary


def test_a_stored_project_is_exported_under_core_keys_and_opens_as_that_dictionary():
    payload = build_osi_payload(
        "name",
        Common.KEY_DISP_FINPLATE,
        {"dock": {"bolt_diameter": ["16"], "material": "E 250 (Fe 410 W)A"}, "pref": {}},
    )
    assert payload["inputs"] == {Common.KEY_D: ["16"], Common.KEY_MATERIAL: "E 250 (Fe 410 W)A"}

    _, _, inputs = parse_osi(serialize_osi(payload))
    assert inputs[Common.KEY_D] == ["16"]
    assert inputs[Common.KEY_MATERIAL] == "E 250 (Fe 410 W)A"
