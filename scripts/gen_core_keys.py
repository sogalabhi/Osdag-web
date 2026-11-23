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


if __name__ == "__main__":
    main()
