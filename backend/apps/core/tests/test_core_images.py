"""GET /api/core-images/<name> serves only image files directly inside the engine's images folder."""
import pytest

from apps.core.utils.output_layout import CORE_IMAGES_DIR

pytestmark = pytest.mark.django_db

URL = "/api/core-images/"


def test_serves_a_core_image(client):
    response = client.get(URL + "CHS_BP.png")
    assert response.status_code == 200
    assert response["Content-Type"] == "image/png"
    assert "max-age" in response["Cache-Control"]
    assert b"".join(response.streaming_content) == (CORE_IMAGES_DIR / "CHS_BP.png").read_bytes()


def test_serves_uppercase_extensions_and_svg(client):
    upper = next(p for p in CORE_IMAGES_DIR.iterdir() if p.suffix == ".PNG")
    assert client.get(URL + upper.name).status_code == 200
    svg = next(p for p in CORE_IMAGES_DIR.iterdir() if p.suffix == ".svg" and p.name.replace(".", "").isalnum())
    response = client.get(URL + svg.name)
    assert response.status_code == 200
    assert response["Content-Type"] == "image/svg+xml"


@pytest.mark.parametrize("name", [
    "../CHS_BP.png",
    "..%2FCHS_BP.png",
    "%2e%2e%2fmanage.py",
    "..%2F..%2F..%2Fmanage.py",
    "%2Fetc%2Fpasswd",
    "/etc/passwd",
    "SectionModeller/x.png",
    "..\\CHS_BP.png",
])
def test_rejects_traversal_and_absolute_paths(client, name):
    assert client.get(URL + name).status_code == 404


@pytest.mark.parametrize("name", ["__init__.py", "Parallel_Beam.eps", "CHS_BP.png.txt", "CHS_BP", "CHS_BP.gif", ".png"])
def test_rejects_other_extensions(client, name):
    assert client.get(URL + name).status_code == 404


def test_missing_file_is_404(client):
    assert client.get(URL + "does_not_exist.png").status_code == 404


def test_a_folder_named_like_an_image_is_404(client, monkeypatch, tmp_path):
    (tmp_path / "folder.png").mkdir()
    monkeypatch.setattr("apps.core.api.design.core_images_api.CORE_IMAGES_DIR", tmp_path.resolve())
    assert client.get(URL + "folder.png").status_code == 404


def test_a_link_leading_out_of_the_folder_is_404(client, monkeypatch, tmp_path):
    images = tmp_path / "images"
    images.mkdir()
    secret = tmp_path / "secret.png"
    secret.write_bytes(b"x")
    (images / "link.png").symlink_to(secret)
    monkeypatch.setattr("apps.core.api.design.core_images_api.CORE_IMAGES_DIR", images.resolve())
    assert client.get(URL + "link.png").status_code == 404


@pytest.mark.parametrize("name", ["../CHS_BP.png", "/etc/passwd", "..", "a/b.png", str(CORE_IMAGES_DIR / "CHS_BP.png")])
def test_the_view_itself_rejects_names_that_could_leave_the_folder(name):
    from django.test import RequestFactory

    from apps.core.api import CoreImageView

    request = RequestFactory().get(URL + "x")
    assert CoreImageView.as_view()(request, name=name).status_code == 404
