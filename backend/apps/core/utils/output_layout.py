"""
Builds the output dock from a module's own output list, the way the desktop app does.

A module's `output_values(flag)` returns tuples `(key, label, type, value, visible[, show_callable])`.
`build_output_layout` walks that list in order and returns JSON the web dock renders:

    [
      {"title": "Bolt", "visible": True, "items": [
          {"type": "field", "key": "...", "label": "...", "value": "40", "visible": True},
          {"type": "button", "key": "...", "label": "...", "button_text": "...", "popup_title": "...",
           "visible": True, "popup": [...]},
      ]},
    ]

Rules taken from the desktop app (`output_dock.py` and `template_page.py`):

* `TYPE_TITLE` starts a group, `TYPE_TEXTBOX` is a read-only label and value, `TYPE_OUT_BUTTON` is a
  label and a button that opens a popup. `TYPE_MODULE` rows are skipped.
* An unsafe design leaves the dock as it was built: every group and field visible, values empty,
  buttons disabled and no popups.
* A safe design fills each field with `str(value)` and hides a field whose value is `None`.
* A group is hidden when none of its fields or buttons are visible. A group with no fields at all
  (a header) stays visible only while a visible group follows it, before the next header.
* A button with a callable sixth element is shown only if `callable(design_inputs)` is truthy. Like
  the desktop, such a button still counts as visible when deciding whether its group is shown.
* A popup is `function(design_status)`: `TYPE_NOTE`, `TYPE_SECTION` (title and optional image),
  `TYPE_TEXTBOX` and `TYPE_COMBOBOX` rows, and `TYPE_IMAGE`.
* A button the desktop opens a drawing dialog for also carries `dialog` (see `output_dialogs`);
  its `popup` rows are what the desktop shows when it has no dialog.
"""
import logging
from importlib.resources import files
from pathlib import Path
from urllib.parse import quote

from apps.core.utils.output_dialogs import dialog_for
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

logger = logging.getLogger(__name__)

CORE_IMAGES_DIR = Path(str(files("osdag_core.data.ResourceFiles.images"))).resolve()
CORE_IMAGES_URL = "/api/core-images/"


def core_image_url(path):
    """`/api/core-images/<name>` for a file directly inside the core images folder, else None."""
    if not path:
        return None
    try:
        resolved = Path(str(path)).resolve()
    except (OSError, ValueError):
        return None
    if resolved.parent != CORE_IMAGES_DIR or not resolved.is_file():
        return None
    return CORE_IMAGES_URL + quote(resolved.name)


def _text(value):
    return "" if value is None else str(value)


def _image(value):
    """`[path, width, height, caption]` as a popup image, or None when the row has no image."""
    if value is None or value == "":
        return None
    try:
        return {
            "src": core_image_url(value[0]),
            "width": int(value[1]),
            "height": int(value[2]),
            "caption": _text(value[3]) if len(value) > 3 else "",
        }
    except (TypeError, ValueError, IndexError):
        return None


def build_popup(function, design_status):
    """The rows of one popup, from the button's `function(design_status)`."""
    rows = []
    for option in function(design_status):
        kind = option[2]
        label = option[1]
        value = option[3]
        if kind == TYPE_NOTE:
            rows.append({"type": "note", "text": _text(value)})
        elif kind == TYPE_SECTION:
            rows.append({"type": "section", "title": _text(label), "image": _image(value)})
        elif kind == TYPE_TEXTBOX:
            rows.append({"type": "field", "key": option[0], "label": _text(label), "value": _text(value)})
        elif kind == TYPE_COMBOBOX:
            rows.append({"type": "label", "key": option[0], "label": _text(label)})
        elif kind == TYPE_IMAGE:
            image = _image(value)
            if image is not None:
                rows.append({"type": "image", **image})
    return rows


def _button_item(module, option, design_status, design_inputs):
    key, label, value = option[0], option[1], option[3]
    popup_title, function = value[0], value[1]

    item = {
        "type": "button",
        "key": key,
        "label": _text(label),
        "button_text": _text(label).strip(),
        "popup_title": _text(popup_title),
        "visible": True,
        "popup": [],
        "dialog": None,
    }
    # The desktop enables its buttons, and applies show callables, only after a safe design.
    if not design_status:
        return item

    if len(option) > 5 and callable(option[5]):
        try:
            item["visible"] = bool(option[5](design_inputs))
        except Exception:
            logger.exception("Output button %s: its show check failed", key)
    # A hidden button cannot be pressed.
    if item["visible"]:
        try:
            item["popup"] = build_popup(function, design_status)
        except Exception:
            logger.exception("Output popup %s could not be built", key)
            item["error"] = True
        item["dialog"] = dialog_for(module, option, design_inputs)
    return item


def build_output_layout(module, design_status, design_inputs):
    """Sections of the output dock for a solved `module`, in the engine's order."""
    design_status = bool(design_status)
    sections = []
    section = None
    for option in module.output_values(design_status):
        kind = option[2]
        if kind == TYPE_MODULE:
            continue
        if kind == TYPE_TITLE:
            section = {"title": _text(option[1]), "visible": True, "items": []}
            sections.append(section)
        elif kind == TYPE_TEXTBOX and section is not None:
            value = option[3]
            section["items"].append({
                "type": "field",
                "key": option[0],
                "label": _text(option[1]),
                "value": _text(value) if design_status else "",
                "visible": not design_status or value is not None,
            })
        elif kind == TYPE_OUT_BUTTON and section is not None:
            section["items"].append(_button_item(module, option, design_status, design_inputs))

    if design_status:
        _set_section_visibility(sections)
    return sections


def _set_section_visibility(sections):
    """Hide groups with nothing to show, as `OutputDock.output_title_change` does.

    A group with fields or buttons is shown when one of them is visible; a button always counts,
    including one hidden by its show callable. A header, a group without fields, is shown when a
    group with fields after it, and before the next header, is shown.
    """
    for section in sections:
        section["visible"] = any(
            item["type"] == "button" or item["visible"] for item in section["items"]
        )

    header = None
    for section in sections:
        if not section["items"]:
            section["visible"] = False
            header = section
        elif section["visible"] and header is not None:
            header["visible"] = True
            header = None
