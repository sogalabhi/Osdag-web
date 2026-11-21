"""
Design-input keys are written once, in ``osdag_core/Common.py``; everything else imports the
constant.

The guard reads the source of every module under ``apps/modules`` and ``apps/core`` and fails when
a string literal is a design-input key: a dotted name such as ``"Bolt.Diameter"``, or one of the
undotted keys (``"Module"``, ``"Material"``, ...) used as a dict key, a subscript, the first
argument of ``.get``/``.pop``/``.setdefault``, a list element or a comparison operand in the
modules, ``osi_files.py`` and ``sync_merge.py``. Docstrings, the literal parts of f-strings and
annotations are not looked at. Import the constant instead (``from osdag_core.Common import KEY_D``);
a key the core does not have goes in ``apps/core/web_keys.py``. Purlin is skipped.

Files that have not been converted yet are listed in ``NOT_CONVERTED`` with the number of inline
keys they still hold. A count may only go down; the entry goes away when the file reaches zero.
``ALLOWED`` lists reviewed strings that only look like keys. No database is used.
"""
import ast
import re
from pathlib import Path

from osdag_core import Common

BACKEND_DIR = Path(__file__).resolve().parents[3]
SCAN_DIRS = ("apps/modules", "apps/core")
SKIPPED_PARTS = {"tests", "migrations", "__pycache__", "purlin"}
WEB_KEYS_FILE = "apps/core/web_keys.py"

DOTTED = re.compile(r"^[A-Z][A-Za-z0-9_]*( [A-Z][A-Za-z0-9_]*)?(\.[A-Za-z0-9_]+)+$")
UNDOTTED = {
    "Module",
    "Material",
    "Connectivity",
    "Conn_Location",
    "End_1",
    "End_2",
    "End_1_Y",
    "End_2_Y",
    "PlateWidth",
    "Plate1Thickness",
    "Plate2Thickness",
    "EndPlateType",
    "End Condition",
    " Out_of_Plane",
    " In_Plane",
}
UNDOTTED_FILES = {"apps/core/utils/osi_files.py", "apps/core/api/design/sync_merge.py"}
UNDOTTED_EXCLUDED = {"catalog.py", "osdag_overrides.py"}
VALIDATOR_ERRORS = {"InvalidInputTypeError", "MissingKeyError"}
STRING_NODES = tuple(t for t in (ast.JoinedStr, getattr(ast, "TemplateStr", None)) if t is not None)

# file (relative to backend/) -> number of inline keys it still holds
NOT_CONVERTED = {
    "apps/core/api/cad/cad_model_api.py": 2,
    "apps/core/api/design/sync_merge.py": 45,
    "apps/core/utils/cad_helpers.py": 2,
    "apps/core/utils/osi_files.py": 94,
    "apps/core/utils/output_dialogs.py": 42,
}

# (file, value) -> why the string is not a key
ALLOWED = {}


def _is_key_position(node, parent, field):
    if isinstance(parent, ast.Dict):
        return field == "keys"
    if isinstance(parent, ast.Subscript):
        return field == "slice"
    if isinstance(parent, ast.Call):
        first = bool(parent.args) and parent.args[0] is node
        func = parent.func
        if isinstance(func, ast.Attribute) and func.attr in ("get", "pop", "setdefault"):
            return first
        return isinstance(func, ast.Name) and func.id in VALIDATOR_ERRORS and first
    if isinstance(parent, (ast.List, ast.Tuple)):
        return True
    return isinstance(parent, ast.Compare)


def _undotted_allowed(rel):
    if Path(rel).name in UNDOTTED_EXCLUDED:
        return False
    return rel.startswith("apps/modules/") or rel in UNDOTTED_FILES


def _inline_keys(path, rel):
    """(line, value) of every inline key string in a source file."""
    tree = ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))
    found = []

    def visit(node, inherited):
        for field, value in ast.iter_fields(node):
            for child in value if isinstance(value, list) else [value]:
                if not isinstance(child, ast.AST):
                    continue
                skip = inherited or isinstance(node, ast.pattern) or field in ("annotation", "returns")
                if isinstance(child, ast.Constant) and isinstance(child.value, str):
                    if not (skip or isinstance(node, STRING_NODES) or isinstance(node, ast.Expr)):
                        text = child.value
                        if DOTTED.match(text) or (
                            text in UNDOTTED and _undotted_allowed(rel) and _is_key_position(child, node, field)
                        ):
                            found.append((child.lineno, text))
                visit(child, skip)

    visit(tree, False)
    return found


def _source_files():
    for scan_dir in SCAN_DIRS:
        for path in sorted((BACKEND_DIR / scan_dir).rglob("*.py")):
            rel = path.relative_to(BACKEND_DIR).as_posix()
            if SKIPPED_PARTS.intersection(path.relative_to(BACKEND_DIR).parts) or rel == WEB_KEYS_FILE:
                continue
            yield path, rel


def _suggestion(value):
    names = sorted(
        name
        for name, constant in vars(Common).items()
        if name.startswith(("KEY_", "DISP_", "CONN_")) and constant == value
    )
    if names:
        return "import " + " or ".join(names[:3]) + " from osdag_core.Common"
    return "add it to apps/core/web_keys.py"


def _describe(rel, line, value):
    return f"{rel}:{line}: inline key {value!r}; {_suggestion(value)} (for a key the core doesn't have, add it to apps/core/web_keys.py)"


def _scan():
    """{file: [(line, value), ...]} for the files that hold inline keys, ALLOWED removed."""
    found = {}
    for path, rel in _source_files():
        keys = [(line, value) for line, value in _inline_keys(path, rel) if (rel, value) not in ALLOWED]
        if keys:
            found[rel] = keys
    return found


def test_no_new_inline_keys():
    found = _scan()
    problems = []
    for rel, keys in found.items():
        allowed = NOT_CONVERTED.get(rel, 0)
        if len(keys) > allowed:
            label = "new file" if rel not in NOT_CONVERTED else f"{len(keys)} keys, {allowed} listed"
            problems.append(f"{rel} ({label}):")
            problems.extend("    " + _describe(rel, line, value) for line, value in keys)
    assert not problems, "Inline design-input keys; use the constants.\n" + "\n".join(problems)


def test_not_converted_has_no_stale_entries():
    found = _scan()
    problems = []
    for rel in NOT_CONVERTED:
        if not (BACKEND_DIR / rel).is_file():
            problems.append(f"{rel}: the file no longer exists; remove it from NOT_CONVERTED")
        elif rel not in found:
            problems.append(f"{rel}: no inline keys left; remove it from NOT_CONVERTED")
    assert not problems, "\n".join(problems)


def test_allowed_has_no_stale_entries():
    seen = set()
    for path, rel in _source_files():
        seen.update((rel, value) for _, value in _inline_keys(path, rel))
    stale = sorted(entry for entry in ALLOWED if entry not in seen)
    assert not stale, f"ALLOWED entries that match nothing: {stale}"


def test_the_guard_finds_inline_keys(tmp_path):
    sample = tmp_path / "adapter.py"
    sample.write_text(
        '"""A sentence. Bolt.Diameter in a docstring."""\n'
        "def get_keys():\n"
        '    "Load.Axial"\n'
        "    a = {'Bolt.Diameter': 1, 'Module': 2}\n"
        "    b = d.get('Material', 0) + d['Weld.Size']\n"
        "    c = f\"Member.Length is {d['Member.Length']} Load.Shear\"\n"
        "    e = ['Plate.Thickness', 'Plastic', 'Other.x y']\n"
        "    label = 'Material'\n"
        "    return a, b, c, e, label\n",
        encoding="utf-8",
    )
    values = [value for _, value in _inline_keys(sample, "apps/modules/x/adapter.py")]
    assert values == ["Bolt.Diameter", "Module", "Material", "Weld.Size", "Member.Length", "Plate.Thickness"]
    assert [v for _, v in _inline_keys(sample, "apps/core/other.py")] == [
        "Bolt.Diameter",
        "Weld.Size",
        "Member.Length",
        "Plate.Thickness",
    ]


def test_the_failure_message_names_the_constant():
    assert "import KEY_D" in _describe("apps/modules/x/adapter.py", 57, "Bolt.Diameter")
    assert "web_keys.py" in _describe("apps/modules/x/adapter.py", 3, "Nothing.Known")


# --- apps/core/web_keys.py ---------------------------------------------------------------------

CORE_VALUES = {v for k, v in vars(Common).items() if not k.startswith("_") and isinstance(v, str)}


def _web_keys():
    from apps.core import web_keys

    return {name: value for name, value in vars(web_keys).items() if not name.startswith("_")}


def test_web_key_names_follow_the_convention():
    bad = [name for name in _web_keys() if not re.fullmatch(r"WEB_[A-Z0-9_]+", name)]
    assert not bad, f"web_keys.py defines only WEB_ constants; rename {bad}"


def test_web_keys_are_strings_and_unique():
    keys = _web_keys()
    assert all(isinstance(value, str) for value in keys.values())
    values = list(keys.values())
    duplicates = sorted({v for v in values if values.count(v) > 1})
    assert not duplicates, f"web_keys.py has the same value under two names: {duplicates}"


def test_web_keys_are_not_in_the_core():
    clashes = {name: value for name, value in _web_keys().items() if value in CORE_VALUES}
    assert not clashes, f"the core has these now, use its constant and delete them from web_keys.py: {clashes}"


def test_web_keys_imports_nothing():
    tree = ast.parse((BACKEND_DIR / WEB_KEYS_FILE).read_text(encoding="utf-8"))
    assert not [n for n in ast.walk(tree) if isinstance(n, (ast.Import, ast.ImportFrom))]
