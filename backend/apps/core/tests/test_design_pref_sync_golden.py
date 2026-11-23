"""
Golden snapshots of ``merge_design_pref_sync`` for every module, operation and draft variant.

The Additional Inputs dialog and the dock-material hook call ``POST /api/design-preferences/sync/``
with the module id and the dock inputs keyed by core key, and one of four operations: open,
refresh, save, reset. This test replays those requests for every module of the core (Purlin has
none) and compares ``resolved_inputs``, ``metadata`` and the grades/designations found in
``material_details`` and ``section_details`` with ``fixtures/design_pref_sync_golden.json``. It
pins what the code does today, including odd behaviour (see ``NOTES`` in the golden file). A
module whose sync raises is recorded as an ``{"error": ...}`` entry, never skipped.

The requests live in ``fixtures/design_pref_sync_inputs.json``: they are what the frontend builds
from each module config's ``defaultInputs`` and ``coreKeys`` (``frontend/src/test/prefSyncCases.js``).
No database is used: catalog rows come from the SQLite catalog.

When a change is meant to alter the sync output, regenerate and review the diff:

    cd backend && QT_QPA_PLATFORM=offscreen UPDATE_DESIGN_PREF_SYNC_GOLDEN=1 \\
        python -m pytest apps/core/tests/test_design_pref_sync_golden.py --ds=config.settings -q

When a frontend config's ``defaultInputs``, ``designType`` or ``coreKeys`` changed, refresh the requests first:

    node backend/apps/core/tests/fixtures/dump_design_pref_sync_inputs.mjs   # needs frontend/node_modules
"""
import json
import os
from pathlib import Path

from apps.core.api.design.sync_merge import list_registered_module_ids, lookup_sources, merge_design_pref_sync
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

NOTES = [
    "Each case: resolved_inputs, metadata, material_grades and section_designations per role, "
    "or an 'error' entry when merge_design_pref_sync raised.",
    "Requests are built by the frontend from each module config (fixtures/design_pref_sync_inputs.json): "
    "core-keyed inputs, one entry per case.",
    "Cases: open*, refresh*, save*, reset*; *_draft sends design_pref_draft, *_saved_overrides / "
    "*_stale_prefs put non-driver pref values in inputs, *_changed_driver moves the dock grade.",
    "Header Plate Connection and Plate Girder have no core defaults (NO_CORE_DEFAULTS): defaulted_keys stays empty.",
    "_core_defaults skips every key the core class does not answer (most flexure, compression and tension "
    "classes raise KeyError for some pref keys), so fewer defaults survive; the goldens pin which keys do.",
    "Butt/Lap Joint modules have no material sync rules: no driver, no linked keys, no material rows.",
]


def load_requests():
    """module id -> {case name: request body}."""
    raw = json.loads(INPUTS_FILE.read_text())
    return {module: entry["requests"] for module, entry in sorted(raw.items())}


def snapshot(request):
    try:
        resolved, metadata, material_details, section_details = merge_design_pref_sync(
            module_id=request["module_id"],
            inputs=request["inputs"],
            operation=request["operation"],
            design_pref_draft=request["design_pref_draft"],
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


def snapshot_module(requests):
    return {name: snapshot(request) for name, request in requests.items()}


def as_json(value):
    """What the golden file round trip does to a value (tuples to lists, int keys to strings)."""
    return json.loads(json.dumps(value))


def write_golden(modules):
    golden = {
        "_regenerate": REGENERATE_HINT,
        "notes": NOTES,
        "modules": {module: snapshot_module(requests) for module, requests in modules.items()},
    }
    GOLDEN_FILE.write_text(json.dumps(golden, indent=2, sort_keys=True) + "\n")


class DesignPrefSyncGoldenTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.modules = load_requests()
        if os.environ.get(UPDATE_ENV):
            write_golden(cls.modules)
        cls.golden = json.loads(GOLDEN_FILE.read_text())["modules"]

    def test_every_core_module_has_requests_and_goldens(self):
        expected = sorted(list_registered_module_ids())
        missing = [m for m in sorted(self.modules) if m not in expected]
        self.assertEqual(missing, [], f"module ids the core does not know. {REGENERATE_HINT}")
        self.assertEqual(sorted(self.golden), sorted(self.modules), REGENERATE_HINT)

    def test_golden_covers_every_case(self):
        for module, requests in self.modules.items():
            self.assertEqual(sorted(self.golden[module]), sorted(requests), f"{module}: case list changed. {REGENERATE_HINT}")


def _make_module_test(module):
    def test(self):
        actual = as_json(snapshot_module(self.modules[module]))
        expected = self.golden[module]
        for case in sorted(set(actual) | set(expected)):
            self.assertEqual(
                actual.get(case), expected.get(case),
                f"{module} / {case}: merge_design_pref_sync output changed. {REGENERATE_HINT}",
            )
    return test


for _module in load_requests():
    _name = "test_golden_" + "".join(c if c.isalnum() else "_" for c in _module.lower())
    setattr(DesignPrefSyncGoldenTests, _name, _make_module_test(_module))
