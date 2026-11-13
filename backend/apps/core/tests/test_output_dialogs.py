"""
The detail dialogs of the output buttons follow the desktop app's `output_button_connect`.

Each fixture design is solved and every visible button must carry the dialog the desktop opens
for it, with no empty values, or none when the desktop shows only the popup rows.

No database is used.
"""
import json

import pytest

from apps.core.utils.output_dialogs import dialog_for
from apps.core.utils.output_layout import build_output_layout
from apps.core.tests.test_output_layout import FIXTURE_FILES, fixture_id, solve
from osdag_core.Common import TYPE_OUT_BUTTON

# Buttons that open a dialog, by fixture folder. Any other button shows the popup rows.
EXPECTED = {
    "base_plate": {"BasePlate.Detailing": ("base_plate", "base_plate_hollow")},
    "moment_connection__beam_beam_cover_plate_bolted": {
        "Web_plate.spacing": "cover_plate_spacing",
        "Flange_plate.spacing": "cover_plate_spacing",
        "section.web_capacities": "beam_web_fracture",
        "section.flange_capacity": "beam_flange_fracture",
    },
    "moment_connection__beam_beam_cover_plate_welded": {
        "Web detail": "cover_plate_weld",
        "Flange detail": "cover_plate_weld",
    },
    "moment_connection__beam_beam_end_plate": {
        "Detailing": "b2c_end_plate",
        "Stiffener.Sketch": "b2b_end_plate_sketch",
    },
    "moment_connection__beam_column_end_plate": {"Detailing": "b2c_end_plate"},
    "moment_connection__column_column_cover_plate_bolted": {
        "Web_plate.spacing": "cover_plate_spacing",
        "Flange_plate.spacing": "cover_plate_spacing",
        "section.web_capacities": "column_web_fracture",
        "section.flange_capacity": "column_flange_fracture",
    },
    "moment_connection__column_column_end_plate": {
        "Bolt.web_bolts": "c2c_end_plate",
        "Bolt.flange_bolts": "c2c_end_plate",
    },
    "shear_connection__cleat_angle": {
        "spacing": "cleat_angle_spacing",
        "Cleat.Spting_leg.spacing": "cleat_angle_spacing",
        "button_capacity_sptd": "cleat_angle_capacity",
        "button_capacity_spting": "cleat_angle_capacity",
        "button_section_capacity": "cleat_angle_section",
    },
    "shear_connection__fin_plate": {
        "spacing": "bolt_pattern",
        "button1": "fin_plate_capacity",
        "button2": "fin_plate_section_capacity",
    },
    "shear_connection__header_plate": {"spacing": "end_plate_spacing"},
    "shear_connection__seated_angle": {
        "SeatedAngle.Bolt_Spacing_col": "seated_angle_spacing",
        "SeatedAngle.Bolt_Spacing_beam": "seated_angle_spacing",
        "TopAngle.Bolt_Spacing_col": "seated_angle_spacing",
        "TopAngle.Bolt_Spacing_beam": "seated_angle_spacing",
        "capacities": "seated_angle_capacity",
        "button_section_capacity": "seated_angle_section",
    },
    "simple_connection__lap_joint_bolted": {"spacing": "bolt_pattern"},
}


def empty_values(value, path=""):
    """Paths of the None values inside a dialog."""
    if value is None:
        return [path]
    if isinstance(value, dict):
        return [p for k, v in value.items() for p in empty_values(v, f"{path}.{k}")]
    if isinstance(value, list):
        return [p for i, v in enumerate(value) for p in empty_values(v, f"{path}[{i}]")]
    return []


def visible_buttons(layout):
    return [item for section in layout for item in section["items"]
            if item["type"] == "button" and item["visible"]]


def expected_id(folder, key, module):
    expected = EXPECTED.get(folder, {}).get(key)
    if isinstance(expected, tuple):
        hollow = module.connectivity not in ("Moment Base Plate", "Welded Column Base")
        return expected[1] if hollow else expected[0]
    return expected


@pytest.mark.parametrize("path", FIXTURE_FILES, ids=fixture_id)
def test_every_button_has_the_desktop_dialog(path):
    module, inputs = solve(path)
    if module is None or not module.design_status:
        pytest.skip("the design is not safe")
    layout = build_output_layout(module, True, inputs)

    for button in visible_buttons(layout):
        dialog = button["dialog"]
        expected = expected_id(path.parent.name, button["key"], module)
        if expected is None:
            assert dialog is None, f"{button['key']} shows only its rows on the desktop"
            continue
        assert dialog is not None, f"{button['key']} has no dialog"
        assert dialog["id"] == expected
        assert empty_values(dialog["values"]) == []
        json.dumps(dialog)


@pytest.mark.parametrize("path", FIXTURE_FILES[:1] + [p for p in FIXTURE_FILES if "fin_plate" in p.parent.name][:1],
                         ids=fixture_id)
def test_an_unsafe_design_has_no_dialogs(path):
    module, inputs = solve(path)
    layout = build_output_layout(module, False, inputs)
    assert all(button["dialog"] is None for section in layout for button in section["items"] if button["type"] == "button")


def fin_plate_module():
    path = next(p for p in FIXTURE_FILES if p.parent.name == "shear_connection__fin_plate" and "column-flange" in p.stem)
    module, inputs = solve(path)
    return module, inputs


def option_of(module, key):
    return next(row for row in module.output_values(True) if row[2] == TYPE_OUT_BUTTON and row[0] == key)


def test_fin_plate_section_capacity_shows_a_third_pattern_for_beam_to_beam():
    module, inputs = fin_plate_module()
    option = option_of(module, "button2")
    assert dialog_for(module, option, {**inputs, "Connectivity": "Beam-Beam"})["values"]["showThird"] is True
    assert dialog_for(module, option, {**inputs, "Connectivity": "Column Flange-Beam Web"})["values"]["showThird"] is False
    plate = dialog_for(module, option_of(module, "button1"), {**inputs, "Connectivity": "Beam-Beam"})
    assert plate["values"]["showThird"] is False


def test_cleat_angle_section_capacity_shows_a_third_pattern_for_beam_to_beam():
    path = next(p for p in FIXTURE_FILES if p.parent.name == "shear_connection__cleat_angle" and "beam-beam" in p.stem)
    module, inputs = solve(path)
    option = option_of(module, "button_section_capacity")
    assert dialog_for(module, option, inputs)["values"]["showThird"] is True
    assert dialog_for(module, option, {**inputs, "Connectivity": "Column Flange-Beam Web"})["values"]["showThird"] is False


def test_a_dialog_that_cannot_be_built_is_left_out(caplog):
    module, inputs = fin_plate_module()
    option = option_of(module, "spacing")

    class Broken:
        """A module that lacks what the dialog reads."""

        def module_name(self):
            return module.module_name()

    assert dialog_for(Broken(), option, inputs) is None
    assert "dialog could not be built" in caplog.text


def test_the_other_buttons_of_the_cleat_angle_show_their_rows():
    path = next(p for p in FIXTURE_FILES if p.parent.name == "shear_connection__cleat_angle")
    module, inputs = solve(path)
    for key in ("Bolt.IRDetails_sptd", "Bolt.IRDetails_spting", "button_sptd_cap", "button_spting_cap"):
        assert dialog_for(module, option_of(module, key), inputs) is None


def test_lap_joint_bolts_run_along_the_plate():
    path = next(p for p in FIXTURE_FILES if p.parent.name == "simple_connection__lap_joint_bolted")
    module, inputs = solve(path)
    values = dialog_for(module, option_of(module, "spacing"), inputs)["values"]
    assert values["origin"] == "left"
    assert values["rows"] == module.rows and values["cols"] == module.cols
    assert values["plateHeight"] == pytest.approx(float(module.plate.height))
