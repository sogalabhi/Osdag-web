"""
The `.osi` key table only holds core keys, and an export writes the core spelling.

`OSI_KEY_TO_FIELD` maps an `.osi` key to the frontend field name. An export turns a field name back
into a key, so the key it picks must be the one the desktop app reads. No database is used.
"""
from osdag_core import Common

from apps.core.utils.osi_files import (
    FIELD_TO_OSI_KEY,
    OSI_KEY_TO_FIELD,
    flatten_and_translate_keys,
    normalize_osi_keys,
)

CORE_VALUES = {v for k, v in vars(Common).items() if not k.startswith("_") and isinstance(v, str)}


def test_every_osi_key_is_a_core_key():
    not_core = sorted(k for k in OSI_KEY_TO_FIELD if k not in CORE_VALUES)
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


def test_a_field_exports_to_a_key_that_loads_back_to_it():
    for field, key in FIELD_TO_OSI_KEY.items():
        assert OSI_KEY_TO_FIELD[key] == field
        assert normalize_osi_keys({key: "x"})["dock"][field] == "x"
