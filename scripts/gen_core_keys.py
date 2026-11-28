#!/usr/bin/env python
"""Generate the key constants the frontend imports.

frontend/src/constants/generated/coreKeys.js comes from osdag_core/Common.py: every
module-level string constant named KEY_*, DISP_* or CONN_* is written out as an exported JS
constant, sorted by name.

frontend/src/constants/generated/webKeys.js comes from backend/apps/core/web_keys.py in the
same way, for the WEB_* constants. With none defined the file holds only its header.

frontend/src/constants/generated/designPrefTables.js comes from backend/apps/core/design_dictionary.py
(``pref_tables``): for every module id (the desktop ``KEY_DISP_*`` name) the static tables the core
declares for Additional Inputs: dockKeys, prefTabs, dockCopies, computed and sectionSources.

frontend/src/constants/generated/inputSchemas.js comes from the Pydantic design request models
(``DesignInput`` in backend/apps/core/schemas/base.py), found through each module service's
``input_model``: for every module id the model name and its keys, required or optional, with the kind
of value each takes (``text``, ``present``, ``int``, ``float``, ``yesNo``, or a ``...List`` of them).

Run from the repository root:

    python scripts/gen_core_keys.py
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GENERATED = ROOT / "frontend" / "src" / "constants" / "generated"
OUTPUT = GENERATED / "coreKeys.js"
WEB_OUTPUT = GENERATED / "webKeys.js"
TABLES_OUTPUT = GENERATED / "designPrefTables.js"
SCHEMAS_OUTPUT = GENERATED / "inputSchemas.js"
PREFIXES = ("KEY_", "DISP_", "CONN_")
WEB_PREFIX = "WEB_"

HEADER = """\
// Generated from osdag_core/Common.py by scripts/gen_core_keys.py.
// Do not edit by hand; run `python scripts/gen_core_keys.py` to regenerate.
"""

WEB_HEADER = """\
// Generated from backend/apps/core/web_keys.py by scripts/gen_core_keys.py.
// Do not edit by hand; run `python scripts/gen_core_keys.py` to regenerate.
"""


def collect_keys():
    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
    sys.path.insert(0, str(ROOT))
    from osdag_core import Common

    return {
        name: value
        for name, value in vars(Common).items()
        if name.startswith(PREFIXES) and isinstance(value, str)
    }


def collect_web_keys():
    sys.path.insert(0, str(ROOT / "backend"))
    from apps.core import web_keys

    return {
        name: value
        for name, value in vars(web_keys).items()
        if name.startswith(WEB_PREFIX) and isinstance(value, str)
    }


TABLES_HEADER = """\
// Generated from the core classes (osdag_core/design_type) by scripts/gen_core_keys.py, through
// backend/apps/core/design_dictionary.py `pref_tables`. Static data per module id (the desktop
// KEY_DISP_* name): dockKeys, prefTabs, dockCopies, computed, sectionSources.
// Do not edit by hand; run `python scripts/gen_core_keys.py` to regenerate.
"""


def collect_pref_tables():
    sys.path.insert(0, str(ROOT / "backend"))
    from apps.core import design_dictionary

    tables = {}
    for module_id in sorted(design_dictionary.module_ids()):
        raw = design_dictionary.pref_tables(module_id)
        tables[module_id] = {
            "dockKeys": raw["dock_keys"],
            "prefTabs": raw["pref_tabs"],
            "dockCopies": raw["dock_copies"],
            "computed": raw["computed"],
            "sectionSources": raw["section_sources"],
        }
    return tables


SCHEMAS_HEADER = """\
// Generated from the design request models (backend/apps/core/schemas/base.py `DesignInput`) by
// scripts/gen_core_keys.py. Per module id: the model name and its keys, required or optional, with
// the kind of value each takes (text, present, int, float, yesNo, or a List of them).
// Do not edit by hand; run `python scripts/gen_core_keys.py` to regenerate.
"""

# What the closure of each field check says about the value it accepts (apps.core.schemas.base).
_EXPECTED_KINDS = {
    "a string that can be converted to int": "int",
    "a string that can be converted to float": "float",
    "'Yes' or 'No'": "yesNo",
    "specified": "present",
    "a non-empty str (single section) or non-empty List[str]": "textOrList",
    "a non-empty List[str] with at least one section selected": "textList",
    "a str or List[str] where all items can be converted to int": "intOrList",
    "a str convertible to float, or a numeric value": "number",
}


def _checked_kind(metadata):
    """The kind a field check names, or None when the metadata holds no known check."""
    for item in metadata:
        func = getattr(item, "func", None)
        if func is None or not func.__closure__:
            continue
        cells = dict(zip(func.__code__.co_freevars, (cell.cell_contents for cell in func.__closure__)))
        kind = _EXPECTED_KINDS.get(cells.get("expected"))
        if kind:
            return kind
    return None


def _field_kind(field):
    from typing import Annotated, get_args, get_origin

    annotation = field.annotation
    if get_origin(annotation) is list:
        # a check on the whole list, else a check on each item
        whole = _checked_kind(field.metadata)
        if whole:
            return whole
        inner = get_args(annotation)[0]
        return (_checked_kind(inner.__metadata__ if get_origin(inner) is Annotated else ()) or "text") + "List"
    return _checked_kind(field.metadata) or "text"


def collect_input_schemas():
    sys.path.insert(0, str(ROOT))
    sys.path.insert(0, str(ROOT / "backend"))
    # Importing the services needs settings that name secrets; nothing here connects to a database.
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    os.environ.setdefault("SECRET_KEY", "gen-core-keys")
    os.environ.setdefault("DATABASE_PASSWORD", "gen-core-keys")
    import django

    django.setup()
    import apps.modules.urls  # noqa: F401  (registers every module's service)
    from apps.core.registry import BaseModuleRegistry

    schemas = {}
    for module_id, meta in sorted(BaseModuleRegistry._global_metadata.items()):
        model = getattr(meta["service_class"], "input_model", None)
        if model is None:
            continue
        required, optional = {}, {}
        for field in model.model_fields.values():
            (required if field.is_required() else optional)[field.alias] = _field_kind(field)
        schemas[module_id] = {
            "model": model.__name__,
            "required": dict(sorted(required.items())),
            "optional": dict(sorted(optional.items())),
        }
    return schemas


def render_schemas(schemas):
    body = json.dumps(schemas, indent=2, ensure_ascii=False)
    return f"{SCHEMAS_HEADER}\nexport const INPUT_SCHEMAS = {body};\n"


def render_tables(tables):
    body = json.dumps(tables, indent=2, ensure_ascii=False)
    return f"{TABLES_HEADER}\nexport const DESIGN_PREF_TABLES = {body};\n"


def render(keys, header=HEADER):
    lines = [header]
    for name in sorted(keys):
        lines.append(f"export const {name} = {json.dumps(keys[name], ensure_ascii=False)};")
    return "\n".join(lines) + "\n"


def main():
    keys = collect_keys()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(render(keys), encoding="utf-8", newline="\n")
    print(f"Wrote {len(keys)} constants to {OUTPUT.relative_to(ROOT)}")
    web_keys = collect_web_keys()
    WEB_OUTPUT.write_text(render(web_keys, WEB_HEADER), encoding="utf-8", newline="\n")
    print(f"Wrote {len(web_keys)} constants to {WEB_OUTPUT.relative_to(ROOT)}")
    tables = collect_pref_tables()
    TABLES_OUTPUT.write_text(render_tables(tables), encoding="utf-8", newline="\n")
    print(f"Wrote tables of {len(tables)} modules to {TABLES_OUTPUT.relative_to(ROOT)}")
    schemas = collect_input_schemas()
    SCHEMAS_OUTPUT.write_text(render_schemas(schemas), encoding="utf-8", newline="\n")
    print(f"Wrote request schemas of {len(schemas)} modules to {SCHEMAS_OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
