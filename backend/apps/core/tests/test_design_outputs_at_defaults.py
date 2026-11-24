"""
The design at each module's default inputs is the design the desktop makes when its Additional
Inputs dialog was never opened.

For every ``defaults-*`` fixture (what the browser sends at the module's defaults; Purlin is out
of scope):

* the request carries no Additional Inputs: the web invents none;
* the dict the core designs with (``fill_prefs``) holds, for every Additional Inputs key, what the
  desktop's ``design_fn`` derives from the dock (``design_dictionary.derive`` without prefs),
  in the web's value shape;
* the design status and every output value equal ``fixtures/design_outputs_at_defaults.json``.

The golden pins the results the core defaults give, so a change in them shows in review. When a
change is meant to move them, regenerate and read the diff:

    cd backend && QT_QPA_PLATFORM=offscreen UPDATE_DESIGN_OUTPUTS_GOLDEN=1 \\
        python -m pytest apps/core/tests/test_design_outputs_at_defaults.py --ds=config.settings -q
"""
import json
import math
import os
from pathlib import Path

import pytest
from apps.core import design_dictionary
from apps.core.tasks import get_service_class

from osdag_core.Common import KEY_MODULE

FIXTURES = Path(__file__).resolve().parent / "fixtures"
GOLDEN_FILE = FIXTURES / "design_outputs_at_defaults.json"
UPDATE_ENV = "UPDATE_DESIGN_OUTPUTS_GOLDEN"
DEFAULT_FIXTURES = sorted(
    path for path in (FIXTURES / "design_inputs").glob("*/defaults-*.json") if "purlin" not in path.parent.name
)


def _id(path):
    return f"{path.parent.name}/{path.stem}"


def _request(path):
    return json.loads(path.read_text(encoding="utf-8"))["inputs"]


def _design(path):
    """(design status, {output key: value}) of the fixture designed as the design task designs it."""
    family, _, sub = path.parent.name.partition("__")
    service = get_service_class(family.replace("_", "-"), (sub or family).replace("_", "-"))
    result = service.calculate(inputs=design_dictionary.fill_request_prefs(_request(path)))
    if not result.get("success"):
        return {"success": False, "error": result.get("error")}
    values = {}
    for key, entry in sorted((result.get("data") or {}).items()):
        value = entry.get("val", entry.get("value")) if isinstance(entry, dict) else entry
        values[key] = value
    return {"success": True, "outputs": json.loads(json.dumps(values, default=str))}


def _same(a, b):
    if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
        return math.isclose(a, b, rel_tol=1e-9, abs_tol=1e-12)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_same(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_same(a[k], b[k]) for k in a)
    return a == b


@pytest.mark.parametrize("path", DEFAULT_FIXTURES, ids=_id)
def test_the_default_request_carries_no_additional_inputs(path):
    request = _request(path)
    prefs = set(design_dictionary.pref_keys(request[KEY_MODULE]))
    assert sorted(prefs & set(request)) == []


@pytest.mark.parametrize("path", DEFAULT_FIXTURES, ids=_id)
def test_the_core_designs_with_the_desktop_derived_values(path):
    request = _request(path)
    module_id = request[KEY_MODULE]
    filled = design_dictionary.fill_prefs(module_id, request)
    derived = design_dictionary.derive(module_id, request)
    for key in design_dictionary.pref_keys(module_id):
        if derived.get(key) is not None:
            assert filled[key] == design_dictionary._wire_value(derived[key]), key


def test_design_outputs_at_defaults_match_the_golden():
    actual = {_id(path): _design(path) for path in DEFAULT_FIXTURES}
    if os.environ.get(UPDATE_ENV):
        GOLDEN_FILE.write_text(json.dumps(actual, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    golden = json.loads(GOLDEN_FILE.read_text(encoding="utf-8"))
    assert sorted(actual) == sorted(golden), "fixtures added or removed: regenerate the golden"
    different = [name for name in actual if not _same(actual[name], golden[name])]
    assert different == [], (
        f"design outputs at defaults changed for {different}. If intended, regenerate with {UPDATE_ENV}=1 "
        "and review the diff of fixtures/design_outputs_at_defaults.json"
    )
