"""
The output dock is built from the engine's own output list.

`build_output_layout` must reproduce `module.output_values()` (order, keys, labels, values as
`str()`) and apply the desktop app's visibility rules. Real modules come from the design-input
fixtures; the rules that no fixture exercises (a `None` value, a failing popup) use a small stand-in
module.

No database is used.
"""
import json
from pathlib import Path

import pytest

from apps.core.main_registry import WebMainRegistry
from apps.core.tasks import _solved_module, get_service_class, run_design_calculation_task
from apps.core.utils.output_layout import CORE_IMAGES_DIR, build_output_layout, core_image_url
from osdag_core.Common import (
    TYPE_COMBOBOX,
    TYPE_IMAGE,
    TYPE_MODULE,
    TYPE_NOTE,
    TYPE_OUT_BUTTON,
    TYPE_SECTION,
    TYPE_TEXTBOX,
    TYPE_TITLE,
)

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures" / "design_inputs"
FIXTURE_FILES = sorted(
    path for path in FIXTURES_DIR.glob("*/*.json")
    if "purlin" not in path.parent.name and not json.loads(path.read_text(encoding="utf-8")).get("xfail")
)
POPUP_TYPES = (TYPE_NOTE, TYPE_SECTION, TYPE_TEXTBOX, TYPE_COMBOBOX, TYPE_IMAGE)


def solve(path):
    """(solved module, inputs) for a fixture, or (None, inputs) when the design did not run."""
    inputs = json.loads(path.read_text(encoding="utf-8"))["inputs"]
    family, _, sub = path.parent.name.partition("__")
    service = get_service_class(family.replace("_", "-"), (sub or family).replace("_", "-"))
    WebMainRegistry.start_recording()
    try:
        service.calculate(inputs=inputs)
    finally:
        instances = WebMainRegistry.stop_recording()
    return _solved_module(instances), inputs


def fixture_id(path):
    return f"{path.parent.name}/{path.stem}"


class StandIn:
    """A module whose output list is given directly."""

    def __init__(self, rows):
        self.rows = rows

    def output_values(self, flag):
        return self.rows(flag) if callable(self.rows) else self.rows


def popup_rows(status):
    return [
        (None, "Note", TYPE_NOTE, "Take care", True),
        (None, "Spacing", TYPE_SECTION, [str(CORE_IMAGES_DIR / "CHS_BP.png"), 120, 80, "Figure"], True),
        ("Pitch", "Pitch (mm)", TYPE_TEXTBOX, 40, True),
        ("Grade", "Grade", TYPE_COMBOBOX, "8.8", True),
        (None, "Other", TYPE_SECTION, "", True),
        (None, "Extra figure", TYPE_IMAGE, ["/not/in/the/core/images/figure.png", 50, 60, "Elsewhere"], True),
    ]


def expected_visibility(rows):
    """Section visibility worked out from the desktop rules, independently of the implementation."""
    groups = []
    for row in rows:
        if row[2] == TYPE_TITLE:
            groups.append({"title": row[1], "members": []})
        elif row[2] in (TYPE_TEXTBOX, TYPE_OUT_BUTTON):
            groups[-1]["members"].append(row)

    shown = []
    for group in groups:
        shown.append(any(m[2] == TYPE_OUT_BUTTON or m[3] is not None for m in group["members"]))
    for index, group in enumerate(groups):
        if group["members"]:
            continue
        shown[index] = False
        for later in range(index + 1, len(groups)):
            if not groups[later]["members"]:
                break
            if shown[later]:
                shown[index] = True
                break
    return shown


def assert_matches_engine(layout, rows, design_status):
    """The layout holds the engine's titles, fields and buttons, in order."""
    rows = [row for row in rows if row[2] in (TYPE_TITLE, TYPE_TEXTBOX, TYPE_OUT_BUTTON)]
    expected_sections = []
    for row in rows:
        if row[2] == TYPE_TITLE:
            expected_sections.append((row[1], []))
        else:
            expected_sections[-1][1].append(row)

    assert [s["title"] for s in layout] == [title for title, _ in expected_sections]
    for section, (_, members) in zip(layout, expected_sections):
        assert [i["key"] for i in section["items"]] == [m[0] for m in members]
        assert [i["label"] for i in section["items"]] == [m[1] for m in members]
        for item, member in zip(section["items"], members):
            if member[2] == TYPE_TEXTBOX:
                assert item["type"] == "field"
                if design_status:
                    assert item["value"] == ("" if member[3] is None else str(member[3]))
                    assert item["visible"] == (member[3] is not None)
                else:
                    assert item["value"] == ""
                    assert item["visible"] is True
            else:
                assert item["type"] == "button"
                assert item["popup_title"] == member[3][0]
                assert item["button_text"] == member[1].strip()


@pytest.mark.parametrize("path", FIXTURE_FILES, ids=fixture_id)
def test_layout_reproduces_engine_output(path):
    module, inputs = solve(path)
    if module is None:
        pytest.skip("the design did not run")
    status = bool(module.design_status)
    layout = build_output_layout(module, status, inputs)
    rows = module.output_values(status)

    assert_matches_engine(layout, rows, status)

    if status:
        titled = [row for row in rows if row[2] == TYPE_TITLE]
        assert [s["visible"] for s in layout] == expected_visibility(rows)
        assert len(layout) == len(titled)
        for section in layout:
            for item in section["items"]:
                if item["type"] == "button" and item["visible"]:
                    function = next(r[3][1] for r in rows if r[0] == item["key"])
                    wanted = [r for r in function(status) if r[2] in POPUP_TYPES]
                    assert len(item["popup"]) <= len(wanted)
                    assert item["popup"], f"{item['key']} has an empty popup"
                    assert "error" not in item
    else:
        assert all(s["visible"] for s in layout)
        for section in layout:
            for item in section["items"]:
                assert item["visible"] is True
                if item["type"] == "button":
                    assert item["popup"] == []


def test_a_header_title_has_no_items_and_follows_the_next_group():
    rows = [
        (None, "Header", TYPE_TITLE, None, True),
        (None, "Group", TYPE_TITLE, None, True),
        ("A", "A", TYPE_TEXTBOX, None, True),
        (None, "Second header", TYPE_TITLE, None, True),
        (None, "Other group", TYPE_TITLE, None, True),
        ("B", "B", TYPE_TEXTBOX, 3, True),
    ]
    layout = build_output_layout(StandIn(rows), True, {})
    # Group has only a None field, so the header before it goes too; the second header sits before a shown group.
    assert [(s["title"], s["visible"]) for s in layout] == [
        ("Header", False), ("Group", False), ("Second header", True), ("Other group", True),
    ]
    assert layout[0]["items"] == []
    assert layout[2]["items"] == []

    unsafe = build_output_layout(StandIn(rows), False, {})
    assert all(s["visible"] for s in unsafe)


def test_a_header_stays_visible_when_a_later_group_before_the_next_header_is_visible():
    rows = [
        (None, "Header", TYPE_TITLE, None, True),
        (None, "Hidden group", TYPE_TITLE, None, True),
        ("A", "A", TYPE_TEXTBOX, None, True),
        (None, "Shown group", TYPE_TITLE, None, True),
        ("B", "B", TYPE_TEXTBOX, 3, True),
    ]
    layout = build_output_layout(StandIn(rows), True, {})
    assert [s["visible"] for s in layout] == [True, False, True]


def test_none_value_hides_its_field_and_all_hidden_fields_hide_the_group():
    rows = [
        (None, "Group", TYPE_TITLE, None, True),
        ("A", "A", TYPE_TEXTBOX, None, True),
        ("B", "B", TYPE_TEXTBOX, 0, True),
        (None, "Empty group", TYPE_TITLE, None, True),
        ("C", "C", TYPE_TEXTBOX, None, True),
    ]
    layout = build_output_layout(StandIn(rows), True, {})
    assert [(i["key"], i["value"], i["visible"]) for i in layout[0]["items"]] == [("A", "", False), ("B", "0", True)]
    assert [s["visible"] for s in layout] == [True, False]


def test_unsafe_design_keeps_the_dock_empty_and_visible():
    rows = [
        (None, "Group", TYPE_TITLE, None, True),
        ("A", "A", TYPE_TEXTBOX, "stale", True),
        ("B", "B", TYPE_TEXTBOX, None, True),
        ("Btn", "Details", TYPE_OUT_BUTTON, ["Details", popup_rows], True, lambda inputs: False),
    ]
    layout = build_output_layout(StandIn(rows), False, {})
    assert layout == [{
        "title": "Group",
        "visible": True,
        "items": [
            {"type": "field", "key": "A", "label": "A", "value": "", "visible": True},
            {"type": "field", "key": "B", "label": "B", "value": "", "visible": True},
            {"type": "button", "key": "Btn", "label": "Details", "button_text": "Details",
             "popup_title": "Details", "visible": True, "popup": [], "dialog": None},
        ],
    }]


def test_module_title_rows_are_skipped():
    rows = [
        ("Module", "A module", TYPE_MODULE, None, True, "No Validator"),
        (None, "Group", TYPE_TITLE, None, True),
        ("A", "A", TYPE_TEXTBOX, 1, True),
    ]
    assert [s["title"] for s in build_output_layout(StandIn(rows), True, {})] == ["Group"]


def test_button_with_a_show_callable_is_hidden_and_gets_no_popup():
    seen = []

    def show(design_inputs):
        seen.append(design_inputs)
        return design_inputs.get("Connectivity") != "Hidden"

    rows = [
        (None, "Group", TYPE_TITLE, None, True),
        ("Btn", "Details", TYPE_OUT_BUTTON, ["Details", popup_rows], True, show),
    ]
    shown = build_output_layout(StandIn(rows), True, {"Connectivity": "Shown"})[0]["items"][0]
    hidden_layout = build_output_layout(StandIn(rows), True, {"Connectivity": "Hidden"})
    hidden = hidden_layout[0]["items"][0]

    assert shown["visible"] is True and shown["popup"]
    assert hidden["visible"] is False and hidden["popup"] == []
    # Like the desktop, a hidden callable button still keeps its group visible.
    assert hidden_layout[0]["visible"] is True
    assert seen == [{"Connectivity": "Shown"}, {"Connectivity": "Hidden"}]


def test_popup_rows_follow_the_desktop_popup():
    rows = [
        (None, "Group", TYPE_TITLE, None, True),
        ("Btn", " Spacing ", TYPE_OUT_BUTTON, ["Spacing Details", popup_rows], True),
    ]
    button = build_output_layout(StandIn(rows), True, {})[0]["items"][0]
    assert button["button_text"] == "Spacing"
    assert button["popup_title"] == "Spacing Details"
    assert button["popup"] == [
        {"type": "note", "text": "Take care"},
        {"type": "section", "title": "Spacing",
         "image": {"src": "/api/core-images/CHS_BP.png", "width": 120, "height": 80, "caption": "Figure"}},
        {"type": "field", "key": "Pitch", "label": "Pitch (mm)", "value": "40"},
        {"type": "label", "key": "Grade", "label": "Grade"},
        {"type": "section", "title": "Other", "image": None},
        {"type": "image", "src": None, "width": 50, "height": 60, "caption": "Elsewhere"},
    ]


def test_a_failing_popup_does_not_fail_the_layout():
    def broken(status):
        raise RuntimeError("popup broke")

    rows = [
        (None, "Group", TYPE_TITLE, None, True),
        ("A", "A", TYPE_TEXTBOX, 1, True),
        ("Bad", "Broken", TYPE_OUT_BUTTON, ["Broken", broken], True),
        ("Good", "Fine", TYPE_OUT_BUTTON, ["Fine", popup_rows], True),
    ]
    items = build_output_layout(StandIn(rows), True, {})[0]["items"]
    assert items[1]["popup"] == [] and items[1]["error"] is True
    assert items[2]["popup"] and "error" not in items[2]
    assert items[0]["value"] == "1"


def test_popup_images_are_only_linked_inside_the_core_images_folder(tmp_path):
    outside = tmp_path / "CHS_BP.png"
    outside.write_bytes(b"x")
    assert core_image_url(str(CORE_IMAGES_DIR / "CHS_BP.png")) == "/api/core-images/CHS_BP.png"
    assert core_image_url(str(outside)) is None
    assert core_image_url(str(CORE_IMAGES_DIR / "missing.png")) is None
    assert core_image_url(str(CORE_IMAGES_DIR / ".." / "images" / "CHS_BP.png")) == "/api/core-images/CHS_BP.png"
    assert core_image_url(str(CORE_IMAGES_DIR / "SectionModeller")) is None
    assert core_image_url(None) is None


def run_task(slug, name):
    inputs = json.loads((FIXTURES_DIR / slug / f"{name}.json").read_text(encoding="utf-8"))["inputs"]
    family, _, sub = slug.partition("__")
    result = run_design_calculation_task.apply(kwargs={
        "module_name": family.replace("_", "-"),
        "submodule_slug": (sub or family).replace("_", "-"),
        "inputs": inputs,
    })
    result.get()
    return result.result


def test_design_task_returns_the_layout_for_safe_and_unsafe_designs():
    safe = run_task("shear_connection__header_plate", "defaults-all__beam-beam")
    assert safe["design_status"] is True
    bolt = next(s for s in safe["output_layout"] if s["title"] == "Bolt")
    force = next(i for i in bolt["items"] if i["key"] == "Bolt.TensionForce")
    assert force["value"] == "3.4"
    # The flat data the CSV export and reports read is still returned.
    assert "Bolt.TensionForce" in safe["data"]

    unsafe = run_task("shear_connection__seated_angle", "defaults-customized__column-flange-beam-web")
    assert unsafe["design_status"] is False
    assert unsafe["output_layout"]
    assert all(i["value"] == "" for s in unsafe["output_layout"] for i in s["items"] if i["type"] == "field")


def test_a_layout_failure_leaves_the_design_result_alone(monkeypatch):
    def broken(*args, **kwargs):
        raise RuntimeError("no layout")

    monkeypatch.setattr("apps.core.utils.output_layout.build_output_layout", broken)
    result = run_task("shear_connection__header_plate", "defaults-all__beam-beam")
    assert result["design_status"] is True
    assert result["data"]
    assert "output_layout" not in result


def test_the_early_design_message_carries_the_layout(monkeypatch):
    sent = []
    monkeypatch.setattr("apps.core.tasks._publish_design_ready", lambda task_id, result: sent.append(result))
    final = run_task("shear_connection__header_plate", "defaults-all__beam-beam")
    assert len(sent) == 1
    assert sent[0]["output_layout"] == final["output_layout"]
