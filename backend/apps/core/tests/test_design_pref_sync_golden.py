"""
Golden snapshots of ``merge_design_pref_sync`` for every module, operation and draft variant.

The Additional Inputs dialog and the dock-material hook call ``POST /api/design-preferences/sync/``
with the dock inputs in web field names (a module config's ``defaultInputs``) and one of four
operations: open, refresh, save, reset. This test replays those calls for every module in
``_CORE_CLASS_MAP`` (Purlin excluded) plus Plate Girder, which the map does not know, and compares
``resolved_inputs``, ``metadata`` and the grades/designations found in ``material_details`` and
``section_details`` with ``fixtures/design_pref_sync_golden.json``. It is a safety net for the
pref-sync refactor: it pins what the code does today, including odd behaviour (see ``NOTES`` in
the golden file). A module whose sync raises is recorded as an ``{"error": ...}`` entry, never skipped.

Inputs live in ``fixtures/design_pref_sync_inputs.json`` (web ``defaultInputs`` and the session
name of each module config; ``Compression Member Design`` has no frontend config and reuses the
Struts Welded inputs). No database is used: catalog rows come from the SQLite catalog.

When a change is meant to alter the sync output, regenerate and review the diff:

    cd backend && QT_QPA_PLATFORM=offscreen UPDATE_DESIGN_PREF_SYNC_GOLDEN=1 \\
        python -m pytest apps/core/tests/test_design_pref_sync_golden.py --ds=config.settings -q

When a frontend config's ``defaultInputs`` or ``sessionName`` changed, refresh the inputs first:

    node backend/apps/core/tests/fixtures/dump_design_pref_sync_inputs.mjs   # needs frontend/node_modules
"""
import json
import os
from pathlib import Path

from apps.core.api.design.sync_merge import _CORE_CLASS_MAP, lookup_sources, merge_design_pref_sync
from django.test import SimpleTestCase

FIXTURES = Path(__file__).resolve().parent / "fixtures"
INPUTS_FILE = FIXTURES / "design_pref_sync_inputs.json"
GOLDEN_FILE = FIXTURES / "design_pref_sync_golden.json"
UPDATE_ENV = "UPDATE_DESIGN_PREF_SYNC_GOLDEN"
REGENERATE_HINT = (
    f"If the change is intended, regenerate the goldens with {UPDATE_ENV}=1 "
    "(cd backend && QT_QPA_PLATFORM=offscreen UPDATE_DESIGN_PREF_SYNC_GOLDEN=1 python -m pytest "
    "apps/core/tests/test_design_pref_sync_golden.py --ds=config.settings -q) and review the diff of "
    "backend/apps/core/tests/fixtures/design_pref_sync_golden.json. See the module docstring."
)

PURLIN = "Purlin Design"
# In _CORE_CLASS_MAP but without a frontend config: reuse the inputs of this config.
BORROWED_INPUTS = {"Compression Member Design": "strutsWeldedConfig"}

ALT_GRADE = "E 350 (Fe 490)"
ALT_GRADE_2 = "E 450 (Fe 570) D"
DRIVER_KEYS = ("connector_material", "material", "member_material")
PREF_MATERIAL_KEYS = ("supporting_material", "supported_material", "connector_material")

NOTES = [
    "Each case: resolved_inputs, metadata, material_grades and section_designations per role, "
    "or an 'error' entry when merge_design_pref_sync raised.",
    "Inputs are each frontend config's defaultInputs (fixtures/design_pref_sync_inputs.json).",
    "Cases: open*, refresh*, save*, reset*; *_draft sends design_pref_draft, *_saved_overrides / "
    "*_stale_prefs put non-driver pref values in inputs, *_changed_driver moves the dock grade.",
    "Header Plate Connection and Plate Girder Design are absent from _CORE_CLASS_MAP: they get no "
    "core defaults, so defaulted_keys stays empty.",
    "_get_core_defaults swallows every exception, so a core class that raises KeyError for a pref key "
    "(most flexure, compression and tension classes do) silently yields fewer defaults; the goldens pin "
    "which keys survive.",
    "Butt/Lap Joint modules have empty _MATERIAL_SYNC_RULES: no driver, no linked keys, no material rows.",
    "Compression Member Design has no frontend config; its inputs are Struts Welded to End Gusset's.",
]


def load_inputs():
    raw = json.loads(INPUTS_FILE.read_text())
    modules = {}
    for alias, entry in raw.items():
        modules[entry["module"]] = {"alias": alias, "inputs": entry["inputs"]}
    for module, alias in BORROWED_INPUTS.items():
        modules[module] = {"alias": f"{alias} (borrowed)", "inputs": raw[alias]["inputs"]}
    modules.pop(PURLIN, None)
    return dict(sorted(modules.items()))


def with_driver(inputs, grade):
    out = dict(inputs)
    for key in DRIVER_KEYS:
        if key in out:
            out[key] = grade
    return out


def with_stale_prefs(inputs, grade):
    out = dict(inputs)
    out.update({key: grade for key in PREF_MATERIAL_KEYS})
    return out


def build_cases(inputs):
    """case name -> (inputs, operation, draft). Same shape the dialog sends."""
    draft = {"connector_material": ALT_GRADE, "supporting_material": ALT_GRADE, "bolt_hole_type": "Over-sized"}
    stale = with_stale_prefs(inputs, ALT_GRADE_2)
    stale["bolt_hole_type"] = "Over-sized"
    return {
        "open": (inputs, "open", None),
        "open_draft": (inputs, "open", draft),
        "open_saved_overrides": (stale, "open", None),
        "refresh": (inputs, "refresh", None),
        "refresh_changed_driver": (with_driver(inputs, ALT_GRADE), "refresh", None),
        "refresh_stale_prefs": (stale, "refresh", None),
        "save": (inputs, "save", None),
        "save_draft": (inputs, "save", draft),
        "save_saved_overrides_draft": (stale, "save", draft),
        "reset": (inputs, "reset", None),
        "reset_changed_driver": (with_driver(inputs, ALT_GRADE), "reset", None),
        "reset_saved_overrides": (stale, "reset", None),
    }


def snapshot(module, inputs, operation, draft):
    try:
        resolved, metadata, material_details, section_details = merge_design_pref_sync(
            module_session_name=module,
            inputs=inputs,
            operation=operation,
            design_pref_draft=draft,
            **lookup_sources(None),
        )
    except Exception as exc:  # recorded, never skipped
        return {"error": f"{type(exc).__name__}: {exc}"}
    return {
        "resolved_inputs": resolved,
        "metadata": metadata,
        "material_grades": {role: [row.get("Grade") for row in rows] for role, rows in material_details.items()},
        "section_designations": {role: row.get("Designation") for role, row in section_details.items()},
    }


def snapshot_module(module, inputs):
    return {name: snapshot(module, *case) for name, case in build_cases(inputs).items()}


def as_json(value):
    """What the golden file round trip does to a value (tuples to lists, int keys to strings)."""
    return json.loads(json.dumps(value))


def write_golden(modules):
    golden = {
        "_regenerate": REGENERATE_HINT,
        "notes": NOTES,
        "modules": {module: snapshot_module(module, info["inputs"]) for module, info in modules.items()},
    }
    GOLDEN_FILE.write_text(json.dumps(golden, indent=2, sort_keys=True) + "\n")


class DesignPrefSyncGoldenTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.modules = load_inputs()
        if os.environ.get(UPDATE_ENV):
            write_golden(cls.modules)
        cls.golden = json.loads(GOLDEN_FILE.read_text())["modules"]

    def test_every_core_module_except_purlin_has_goldens(self):
        expected = sorted(set(_CORE_CLASS_MAP) - {PURLIN})
        missing = [m for m in expected if m not in self.golden]
        self.assertEqual(missing, [], f"modules in _CORE_CLASS_MAP without goldens. {REGENERATE_HINT}")
        self.assertNotIn(PURLIN, self.golden)
        self.assertEqual(sorted(self.golden), sorted(self.modules), REGENERATE_HINT)

    def test_golden_covers_every_case(self):
        for module, info in self.modules.items():
            self.assertEqual(
                sorted(self.golden[module]), sorted(build_cases(info["inputs"])),
                f"{module}: case list changed. {REGENERATE_HINT}",
            )


def _make_module_test(module):
    def test(self):
        actual = as_json(snapshot_module(module, self.modules[module]["inputs"]))
        expected = self.golden[module]
        for case in sorted(set(actual) | set(expected)):
            self.assertEqual(
                actual.get(case), expected.get(case),
                f"{module} / {case}: merge_design_pref_sync output changed. {REGENERATE_HINT}",
            )
    return test


for _module in load_inputs():
    _name = "test_golden_" + "".join(c if c.isalnum() else "_" for c in _module.lower())
    setattr(DesignPrefSyncGoldenTests, _name, _make_module_test(_module))
