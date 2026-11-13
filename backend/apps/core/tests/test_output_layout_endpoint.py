"""GET /api/modules/<module>/output-layout/ returns the output dock of every module before a design."""
import re
from pathlib import Path

import pytest

REGISTRY = Path(__file__).resolve().parents[4] / "frontend" / "src" / "modules" / "registry.js"
ENTRY = re.compile(r'\{\s*id:\s*KEY_DISP_\w+,\s*(hidden:\s*true,\s*)?path:\s*"[^"]*",\s*apiSlug:\s*"([^"]+)"')

# Purlin is still under development.
SLUGS = sorted(slug for hidden, slug in ENTRY.findall(REGISTRY.read_text(encoding="utf-8"))
               if not hidden and "purlin" not in slug)

pytestmark = pytest.mark.django_db


def test_registry_lists_modules():
    assert len(SLUGS) >= 23, SLUGS


@pytest.mark.parametrize("slug", SLUGS)
def test_every_module_has_an_empty_output_dock(client, slug):
    response = client.get(f"/api/modules/{slug}/output-layout/")
    assert response.status_code == 200, slug
    sections = response.json()
    assert sections, slug
    assert any(section["items"] for section in sections)
    for section in sections:
        assert section["visible"] is True
        for item in section["items"]:
            assert item["visible"] is True
            if item["type"] == "field":
                assert item["value"] == ""
            else:
                assert item["popup"] == [] and item["dialog"] is None


def test_unknown_module_is_not_found(client):
    assert client.get("/api/modules/shear-connection/no-such-module/output-layout/").status_code == 404
