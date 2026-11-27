"""
Every key an adapter requires must be a string constant defined in osdag_core.Common.

Keys written only in an adapter cannot be checked against the core and drift from
it silently. No database is used: get_required_keys() is pure.
"""
import importlib
from pathlib import Path

import pytest

from osdag_core import Common

BACKEND_DIR = Path(__file__).resolve().parents[3]
MODULES_DIR = BACKEND_DIR / "apps" / "modules"

CORE_VALUES = {v for k, v in vars(Common).items() if not k.startswith("_") and isinstance(v, str)}

# Adapters whose required-keys function is not called get_required_keys.
REQUIRED_KEYS_FUNCTION = {
    "shear_connection__cleat_angle": "get_required_keys_cleat_angle",
    "shear_connection__seated_angle": "get_required_keys_seated_angle",
}

# Adapters that validate with a Pydantic model: the model's name in the adapter.
SCHEMA_MODELS = {
    "tension_member__bolted": "BoltedTensionInput",
    "tension_member__welded": "WeldedTensionInput",
}


def adapter_slug(adapter_file: Path) -> str:
    """apps/modules/<family>/submodules/<sub>/adapter.py -> '<family>__<sub>';
    apps/modules/<family>/adapter.py -> '<family>'."""
    parts = adapter_file.relative_to(MODULES_DIR).parts[:-1]
    return "__".join(p for p in parts if p != "submodules")


def adapter_import_path(slug: str) -> str:
    family, _, sub = slug.partition("__")
    if sub:
        return f"apps.modules.{family}.submodules.{sub}.adapter"
    return f"apps.modules.{family}.adapter"


ADAPTER_SLUGS = sorted(adapter_slug(p) for p in MODULES_DIR.rglob("adapter.py"))


def test_core_constants_were_collected():
    assert "Bolt.Diameter" in CORE_VALUES
    assert len(CORE_VALUES) > 1000


@pytest.mark.parametrize("slug", ADAPTER_SLUGS)
def test_required_keys_are_core_keys(slug):
    adapter = importlib.import_module(adapter_import_path(slug))
    if slug in SCHEMA_MODELS:
        required = getattr(adapter, SCHEMA_MODELS[slug]).required_keys()
    else:
        required = getattr(adapter, REQUIRED_KEYS_FUNCTION.get(slug, "get_required_keys"))()

    missing = sorted(k for k in required if k not in CORE_VALUES)
    assert not missing, f"{slug}: required keys that are not Common.py values: {missing}"
