"""
Every error response uses the standard format.

    {"error": {"code": ..., "message": ..., "fields": {...}}}

The guard reads the source of every backend module and fails when a view builds an error
body by hand: a ``Response`` or ``JsonResponse`` with a 4xx or 5xx status whose body is a dict
literal (``{'message': ...}``, ``{'detail': ...}``, ``{'error': 'text'}``) or missing. Use
``error_response`` or ``error_json_response`` from ``apps.core.utils.api_errors`` instead.

Success bodies are not checked, and neither are Celery task results, which keep their own shape.
No database is used.
"""
import ast
import io
from pathlib import Path

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

APPS_DIR = Path(__file__).resolve().parents[2]
RESPONSE_NAMES = {"Response", "JsonResponse"}


def _status_code(call):
    """The literal HTTP status of a response call, or None when it is not a literal."""
    for keyword in call.keywords:
        if keyword.arg != "status":
            continue
        value = keyword.value
        if isinstance(value, ast.Constant) and isinstance(value.value, int):
            return value.value
        if isinstance(value, ast.Attribute) and value.attr.startswith("HTTP_"):
            digits = value.attr.split("_")[1]
            if digits.isdigit():
                return int(digits)
    return None


def _hand_built_errors(path):
    """Line numbers of the hand-built error responses in a source file."""
    tree = ast.parse(path.read_text(encoding="utf-8-sig"), filename=str(path))
    found = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        func = node.func
        name = func.id if isinstance(func, ast.Name) else func.attr if isinstance(func, ast.Attribute) else None
        if name not in RESPONSE_NAMES:
            continue
        code = _status_code(node)
        if code is None or code < 400:
            continue
        body = node.args[0] if node.args else None
        if body is None or isinstance(body, (ast.Dict, ast.Set)):
            found.append(node.lineno)
    return found


def _source_files():
    return sorted(p for p in APPS_DIR.rglob("*.py") if "tests" not in p.parts and "migrations" not in p.parts)


def test_no_view_builds_an_error_body_by_hand():
    offenders = [
        f"{path.relative_to(APPS_DIR.parent)}:{line}"
        for path in _source_files()
        for line in _hand_built_errors(path)
    ]
    assert not offenders, (
        "Use error_response / error_json_response for 4xx and 5xx responses: " + ", ".join(offenders)
    )


def test_the_guard_finds_a_hand_built_error(tmp_path):
    sample = tmp_path / "views.py"
    sample.write_text(
        "from rest_framework.response import Response\n"
        "from rest_framework import status\n"
        "def a(): return Response({'message': 'x'}, status=status.HTTP_400_BAD_REQUEST)\n"
        "def b(): return Response(status=404)\n"
        "def c(): return Response({'ok': True}, status=200)\n"
        "def d(): return Response(error_payload('x', 'y'), status=400)\n",
        encoding="utf-8",
    )
    assert _hand_built_errors(sample) == [3, 4]


class ConvertedEndpointTests(SimpleTestCase):
    """The views that used to return {'message'}, {'detail'} or {'error': 'text'}."""

    @staticmethod
    def _error(response):
        response.render()
        return response.status_code, response.data["error"]

    def test_company_logo_without_a_file(self):
        from apps.core.api.design.design_report_pdf_view import CompanyLogoView

        request = APIRequestFactory().post("/api/company-logo/", {}, format="multipart")
        status_code, error = self._error(CompanyLogoView.as_view()(request))
        assert status_code == 400
        assert error["code"] == "missing_field"
        assert error["message"] == "No file provided"

    def test_company_logo_rejects_bad_files(self):
        from apps.core.api.design.design_report_pdf_view import CompanyLogoView

        for name, content, code in [
            ("logo.txt", b"text", "invalid_file_type"),
            ("logo.png", b"not an image", "invalid_image"),
        ]:
            with self.subTest(name=name):
                upload = io.BytesIO(content)
                upload.name = name
                request = APIRequestFactory().post("/api/company-logo/", {"file": upload}, format="multipart")
                status_code, error = self._error(CompanyLogoView.as_view()(request))
                assert status_code == 400
                assert error["code"] == code

    def test_company_logo_rejects_a_large_file(self):
        from apps.core.api.design.design_report_pdf_view import COMPANY_LOGO_MAX_BYTES, CompanyLogoView

        upload = io.BytesIO(b"0" * (COMPANY_LOGO_MAX_BYTES + 1))
        upload.name = "logo.png"
        request = APIRequestFactory().post("/api/company-logo/", {"file": upload}, format="multipart")
        status_code, error = self._error(CompanyLogoView.as_view()(request))
        assert status_code == 400
        assert error["code"] == "file_too_large"

    def test_report_sections_with_an_invalid_report_id(self):
        from apps.core.api.design.report_customization_api import ParseReportSections

        request = APIRequestFactory().post("/api/report/sections/", {"report_id": "../etc"}, format="json")
        status_code, error = self._error(ParseReportSections.as_view()(request))
        assert status_code == 400
        assert error["code"] == "invalid_report_id"

    def test_customize_report_with_an_invalid_report_id(self):
        from apps.core.api.design.report_customization_api import CustomizeReport

        request = APIRequestFactory().post("/api/report/customize/", {"report_id": "../etc"}, format="json")
        status_code, error = self._error(CustomizeReport.as_view()(request))
        assert status_code == 400
        assert error["code"] == "invalid_report_id"
