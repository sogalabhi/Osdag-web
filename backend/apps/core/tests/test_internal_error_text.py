"""An unexpected failure never puts exception text into a response, a task result or a socket message.

Each handler is forced to raise ``RuntimeError("secret-internal-detail")``. The client gets the
generic message with the stable ``internal_error`` code, and the server log has the exception.
Expected user errors keep their own specific message.
"""
import asyncio
import importlib
import json
import types
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from apps.core import consumers, signals, tasks, views
from apps.core.api.design import report_customization_api as report_api
from apps.core.models import OsiFile, Project
from apps.core.tests.auth_utils import authenticated_as
from apps.core.utils import cad_helpers, module_helpers
from apps.core.utils.api_errors import INTERNAL_ERROR_MESSAGE, failure_result
from apps.core.utils.errors import MissingKeyError
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient, APIRequestFactory

from osdag_core.Common import KEY_DISP_FINPLATE

SECRET = "secret-internal-detail"

pytestmark = pytest.mark.django_db


def boom(*args, **kwargs):
    raise RuntimeError(SECRET)


class Boom:
    """Any attribute access raises."""

    def __getattr__(self, name):
        raise RuntimeError(SECRET)


def was_logged(caplog):
    for record in caplog.records:
        if SECRET in record.getMessage():
            return True
        if record.exc_info and record.exc_info[1] is not None and SECRET in str(record.exc_info[1]):
            return True
    return False


def assert_generic(response, caplog, status=500, code="internal_error"):
    assert response.status_code == status
    body = response.json()
    assert body["error"]["code"] == code
    assert body["error"]["message"] == INTERNAL_ERROR_MESSAGE
    assert SECRET not in json.dumps(body)
    assert "RuntimeError" not in json.dumps(body)
    assert was_logged(caplog)


@pytest.fixture
def user():
    return User.objects.create_user(username="uid1", email="owner@example.com", password="x")


@pytest.fixture
def api(user):
    client = APIClient()
    with authenticated_as(user):
        yield client


# Projects and .osi files ------------------------------------------------------------------


def test_save_osi_from_inputs_hides_an_internal_failure(caplog):
    with patch("apps.core.api.projects.osi_api.build_osi_payload", boom):
        response = APIClient().post(
            "/api/save-osi-from-inputs/", {"name": "n", "module_id": "Fin Plate Connection", "inputs": {}}, format="json"
        )
    assert_generic(response, caplog)


def test_save_osi_from_inputs_keeps_the_message_for_invalid_input():
    response = APIClient().post(
        "/api/save-osi-from-inputs/", {"name": "n", "module_id": "!", "inputs": {}}, format="json"
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_osi"
    assert response.json()["error"]["message"] == "Invalid module_id"


def test_open_osi_upload_hides_an_internal_failure(caplog):
    upload = SimpleUploadedFile("a.osi", b"Module: x\n")
    with patch("apps.core.api.projects.osi_api.parse_osi", boom):
        response = APIClient().post("/api/open-osi/", {"file": upload}, format="multipart")
    assert_generic(response, caplog)


@pytest.mark.parametrize("content", [b"a: [unclosed", b"just text", b"Key: value\n"])
def test_open_osi_upload_gives_a_fixed_message_for_a_bad_file(content):
    response = APIClient().post(
        "/api/open-osi/", {"file": SimpleUploadedFile("a.osi", content)}, format="multipart"
    )
    assert response.status_code == 400
    error = response.json()["error"]
    assert error["code"] == "invalid_osi"
    assert error["message"] in ("Malformed OSI file", "Module missing in OSI")
    assert "unclosed" not in json.dumps(response.json())


def test_open_osi_by_id_hides_an_internal_failure(api, caplog):
    with patch.object(OsiFile.objects, "get", boom):
        response = api.get("/api/open-osi/1/")
    assert_generic(response, caplog)


def test_project_osi_download_hides_an_internal_failure(api, caplog):
    with patch.object(Project.objects, "get", boom):
        response = api.get("/api/projects/1/osi")
    assert_generic(response, caplog)


@pytest.mark.parametrize(
    "method, url, manager_method",
    [
        ("get", "/api/projects/", "filter"),
        ("post", "/api/projects/", "create"),
        ("get", "/api/projects/1/", "get"),
        ("put", "/api/projects/1/", "get"),
        ("delete", "/api/projects/1/", "get"),
        ("get", "/api/projects/by-name/abc/", "get"),
        ("put", "/api/projects/by-name/abc/", "get"),
    ],
)
def test_project_handlers_hide_an_internal_failure(api, caplog, method, url, manager_method):
    with patch.object(Project.objects, manager_method, boom):
        kwargs = {"data": {"name": "p"}, "format": "json"} if method in ("post", "put") else {}
        response = getattr(api, method)(url, **kwargs)
    assert_generic(response, caplog)


@pytest.mark.parametrize("field, value", [("name", "x" * 201), ("module", "m" * 201), ("name", None), ("name", 5)])
def test_creating_a_project_with_unusable_text_is_a_400_with_the_field(api, field, value):
    data = {"name": "p", field: value}
    response = api.post("/api/projects/", data, format="json")
    assert response.status_code == 400
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert field in error["fields"]


def test_updating_a_project_with_a_too_long_name_is_a_400(api, user):
    project = Project.objects.create(name="p", user_email=user.email)
    response = api.put(f"/api/projects/{project.id}/", {"name": "x" * 201}, format="json")
    assert response.status_code == 400
    assert "name" in response.json()["error"]["fields"]


def test_a_project_can_still_be_created(api):
    response = api.post("/api/projects/", {"name": "p", "module": "m"}, format="json")
    assert response.status_code == 201


# Module option lists ------------------------------------------------------------------------

OPTIONS = [
    ("compression_member", "/api/modules/compression-member/axially-loaded-column/options/"),
    ("flexure_member", "/api/modules/flexure-member/simply-supported-beam/options/"),
    ("simple_connection", "/api/modules/simple-connection/butt-joint-bolted/options/"),
    ("tension_member", "/api/modules/tension-member/bolted/options/"),
    ("base_plate", "/api/modules/base-plate/options/"),
    ("shear_connection", "/api/modules/shear-connection/fin-plate/options/"),
    ("moment_connection", "/api/modules/moment-connection/beam-beam-cover-plate-bolted/options/"),
]


@pytest.mark.parametrize("family, url", OPTIONS)
def test_options_hide_an_internal_failure(family, url, caplog):
    with patch(f"apps.modules.{family}.views.catalog", Boom()):
        response = APIClient().get(url)
    assert_generic(response, caplog)


# Accounts and sign-in ---------------------------------------------------------------------


def test_firebase_login_hides_an_internal_failure(caplog):
    with patch.object(views.firebase_auth, "verify_id_token", boom):
        response = APIClient().post("/api/auth/firebase-login/", {"token": "t"}, format="json")
    assert_generic(response, caplog)


def test_firebase_login_with_a_malformed_token_is_a_400():
    with patch.object(views.firebase_auth, "verify_id_token", side_effect=ValueError("bad token")):
        response = APIClient().post("/api/auth/firebase-login/", {"token": "t"}, format="json")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_token"


def test_delete_account_hides_an_internal_failure(api, caplog):
    with patch("apps.core.api.auth.delete_account_api.firebase_auth.delete_user"), \
            patch.object(Project.objects, "filter", boom):
        response = api.delete("/api/auth/delete-account/")
    assert_generic(response, caplog)


def test_export_data_hides_an_internal_failure(api, caplog):
    with patch.object(Project.objects, "filter", boom):
        response = api.get("/api/auth/export-data/")
    assert_generic(response, caplog)


# Design, CAD and reports -----------------------------------------------------------------


def test_design_preference_sync_hides_an_internal_failure(caplog):
    with patch("apps.core.api.design.design_pref_sync_api.merge_design_pref_sync", boom):
        response = APIClient().post(
            "/api/design-preferences/sync/", {"module_id": KEY_DISP_FINPLATE, "inputs": {}}, format="json"
        )
    assert_generic(response, caplog)


def test_design_preference_defaults_hides_an_internal_failure(caplog):
    with patch("apps.core.api.design.design_pref_defaults_api.build_design_pref_defaults", boom):
        response = APIClient().post(
            "/api/design-preferences/defaults/", {"module_id": KEY_DISP_FINPLATE, "inputs": {}}, format="json"
        )
    assert_generic(response, caplog)


class _CadService:
    @staticmethod
    def get_cad_model(*args, **kwargs):
        raise RuntimeError(SECRET)


class _CadServiceMissingFile:
    @staticmethod
    def get_cad_model(*args, **kwargs):
        return "file_storage/does/not/exist.brep"


def test_cad_warnings_carry_no_exception_text_or_paths(caplog):
    with patch.object(cad_helpers, "_build_hover_dict", return_value={}):
        failed = cad_helpers.generate_cad_models(_CadService, {}, None, sections=["Model"], session_id="s")
        missing = cad_helpers.generate_cad_models(_CadServiceMissingFile, {}, None, sections=["Model"], session_id="s")
    assert failed["warnings"] == [{"section": "Model", "error": "The CAD model could not be generated."}]
    assert SECRET not in json.dumps(failed)
    assert was_logged(caplog)
    assert missing["warnings"] == [{"section": "Model", "error": "The CAD file was not created."}]
    assert "does/not/exist" not in json.dumps(missing)


REPORT_ID = "AbCdEfGhIjKlMnOp"
TEX = "\\documentclass{article}\n\\begin{document}\n\\section{Input Parameters}\nx\n\\end{document}\n"


@pytest.fixture
def report_storage(tmp_path, monkeypatch):
    report_dir = tmp_path / "file_storage" / "design_report" / REPORT_ID
    report_dir.mkdir(parents=True)
    (report_dir / f"{REPORT_ID}.tex").write_text(TEX, encoding="utf-8")
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(report_api, "PDFLATEX", "pdflatex")


def _post(view, data):
    request = APIRequestFactory().post("/x/", data, format="json")
    return view.as_view()(request)


def _assert_generic_data(response, caplog):
    assert response.status_code == 500
    assert response.data["error"]["code"] == "internal_error"
    assert response.data["error"]["message"] == INTERNAL_ERROR_MESSAGE
    assert SECRET not in json.dumps(response.data)
    assert was_logged(caplog)


def test_parse_sections_hides_an_internal_failure(report_storage, caplog):
    with patch.object(report_api.LaTeXParser, "parse_sections", boom):
        response = _post(report_api.ParseReportSections, {"report_id": REPORT_ID})
    _assert_generic_data(response, caplog)


def test_customize_report_hides_an_internal_failure(report_storage, caplog):
    with patch.object(report_api.LaTeXFilter, "filter_content", boom):
        response = _post(report_api.CustomizeReport, {"report_id": REPORT_ID, "selected_sections": []})
    _assert_generic_data(response, caplog)


def test_a_failed_pdf_compile_does_not_return_the_compiler_output(report_storage, monkeypatch, caplog):
    def fake_run(cmd, **kwargs):
        return types.SimpleNamespace(returncode=1, stdout=f"stdout {SECRET}", stderr=f"/srv/app/path {SECRET}")

    monkeypatch.setattr(report_api.subprocess, "run", fake_run)
    response = _post(report_api.CustomizeReport, {"report_id": REPORT_ID, "selected_sections": ["Input Parameters"]})
    assert response.status_code == 500
    assert response.data["error"]["message"] == "PDF compilation failed"
    assert SECRET not in json.dumps(response.data)
    assert was_logged(caplog)


def test_initial_report_core_hides_an_internal_failure(caplog):
    from apps.core.api.design.design_report_pdf_view import CreateDesignReport

    with patch.object(CreateDesignReport, "post", boom):
        payload, status = report_api.generate_initial_report_core({"a": 1})
    assert status == 500
    assert payload == {"success": False, "error": INTERNAL_ERROR_MESSAGE}
    assert was_logged(caplog)


def test_initial_report_core_does_not_return_a_file_path(tmp_path, monkeypatch):
    from apps.core.api.design.design_report_pdf_view import CreateDesignReport

    monkeypatch.chdir(tmp_path)
    created = types.SimpleNamespace(status_code=201, data={"report_id": REPORT_ID})
    with patch.object(CreateDesignReport, "post", return_value=created):
        payload, status = report_api.generate_initial_report_core({"a": 1})
    assert status == 500
    assert str(tmp_path) not in json.dumps(payload)


# Services, tasks and sockets --------------------------------------------------------------

SERVICE_MODULES = [
    "apps.modules.compression_member.submodules.axially_loaded_column.service",
    "apps.modules.compression_member.submodules.struts_bolted.service",
    "apps.modules.compression_member.submodules.struts_welded.service",
    "apps.modules.flexure_member.submodules.simply_supported_beam.service",
    "apps.modules.flexure_member.submodules.on_cantilever.service",
    "apps.modules.flexure_member.submodules.plate_girder.service",
    "apps.modules.tension_member.submodules.bolted.service",
    "apps.modules.tension_member.submodules.welded.service",
    "apps.modules.simple_connection.submodules.lap_joint_bolted.service",
    "apps.modules.simple_connection.submodules.lap_joint_welded.service",
    "apps.modules.simple_connection.submodules.butt_joint_bolted.service",
    "apps.modules.simple_connection.submodules.butt_joint_welded.service",
    "apps.modules.base_plate.service",
    "apps.modules.shear_connection.submodules.fin_plate.service",
]


def _service(module_path):
    module = importlib.import_module(module_path)
    cls = next(
        value for value in vars(module).values()
        if isinstance(value, type) and value.__module__ == module.__name__ and hasattr(value, "calculate")
    )
    return module, cls


@pytest.mark.parametrize("module_path", SERVICE_MODULES)
def test_a_service_result_hides_an_internal_failure(module_path, caplog):
    module, cls = _service(module_path)
    with patch.object(module, "validate_input", boom):
        result = cls.calculate({})
    assert result["success"] is False
    assert result["error"] == INTERNAL_ERROR_MESSAGE
    assert SECRET not in json.dumps(result)
    assert was_logged(caplog)


@pytest.mark.parametrize("module_path", SERVICE_MODULES)
def test_a_service_result_keeps_the_message_for_invalid_input(module_path):
    module, cls = _service(module_path)
    with patch.object(module, "validate_input", side_effect=MissingKeyError("Bolt.Diameter")):
        result = cls.calculate({})
    assert result["success"] is False
    assert result["error"] == "Please specify Bolt.Diameter in input values."


def test_failure_result_shape():
    assert failure_result(MissingKeyError("k"), "ctx") == {
        "data": {}, "logs": [], "success": False, "error": "Please specify k in input values."
    }


def test_a_service_that_raises_gives_a_failed_result_without_the_exception_text(caplog):
    class Raising:
        calculate = staticmethod(boom)

    with patch.object(tasks, "get_service_class", return_value=Raising):
        result = tasks.run_design_calculation_task.apply(
            kwargs={"module_name": "shear-connection", "submodule_slug": "fin-plate", "inputs": {}}
        ).get()
    assert result["success"] is False
    assert result["error"] == INTERNAL_ERROR_MESSAGE
    assert SECRET not in json.dumps(result)
    assert was_logged(caplog)


def test_task_status_endpoint_hides_a_failed_task(caplog):
    failed = MagicMock()
    failed.ready.return_value = True
    failed.successful.return_value = False
    failed.status = "FAILURE"
    failed.result = RuntimeError(SECRET)
    with patch.object(views, "AsyncResult", return_value=failed):
        response = APIClient().get("/api/tasks/abc/")
    assert response.status_code == 200
    assert response.json()["error"] == INTERNAL_ERROR_MESSAGE
    assert SECRET not in json.dumps(response.json())
    assert was_logged(caplog)


def test_task_socket_hides_a_failed_task(caplog):
    failed = MagicMock()
    failed.ready.return_value = True
    failed.successful.return_value = False
    failed.status = "FAILURE"
    failed.result = RuntimeError(SECRET)
    with patch.object(consumers, "AsyncResult", return_value=failed):
        data = consumers._check_task_status_sync.func("abc")
    assert data["error"] == INTERNAL_ERROR_MESSAGE
    assert SECRET not in json.dumps(data)
    assert was_logged(caplog)


def test_task_postrun_broadcast_hides_a_failed_task(caplog):
    layer = MagicMock()
    layer.group_send = AsyncMock()
    with patch.object(signals, "get_channel_layer", return_value=layer):
        signals.on_task_postrun("abc", MagicMock(name="task"), RuntimeError(SECRET), "FAILURE")
    message = layer.group_send.call_args.args[1]
    assert message["error"] == INTERNAL_ERROR_MESSAGE
    assert SECRET not in json.dumps(message)
    assert was_logged(caplog)


def test_cad_error_of_a_design_task_carries_no_exception_text():
    from apps.core.tests.test_design_task_cad import FakeService

    with patch.object(tasks, "get_service_class", return_value=FakeService), \
            patch.object(cad_helpers, "generate_cad_models", boom):
        result = tasks.run_design_calculation_task.apply(
            kwargs={"module_name": "shear-connection", "submodule_slug": "fin-plate", "inputs": {}}
        ).get()
    assert result["cad_error"] == tasks.CAD_ERROR_MESSAGE
    assert SECRET not in json.dumps(result)


def test_saving_inputs_to_a_project_hides_an_internal_failure(caplog):
    with patch.object(Project.objects, "get", boom):
        result = module_helpers.save_to_project(1, "a@example.com", {})
    assert result == {"saved": False, "project_id": 1, "error": INTERNAL_ERROR_MESSAGE}
    assert was_logged(caplog)


def test_optimization_start_failure_message_has_no_exception_text(caplog):
    consumer = consumers.PSOOptimizationConsumer()
    consumer.send_json = AsyncMock()
    consumer.channel_name = "chan"
    task = MagicMock()
    task.delay.side_effect = RuntimeError(SECRET)
    with patch.object(consumers, "_user_id_from_token", AsyncMock(return_value=None)), \
            patch.object(consumers, "_unknown_material_error", AsyncMock(return_value=None)), \
            patch("apps.modules.flexure_member.submodules.plate_girder.tasks.run_pso_optimization", task):
        asyncio.run(consumer.receive_json({"type": "start_optimization", "data": {}}))
    sent = consumer.send_json.call_args.args[0]
    assert sent["type"] == "error"
    assert SECRET not in json.dumps(sent)
    assert was_logged(caplog)


def test_optimization_error_message_has_no_exception_text_or_traceback():
    from apps.modules.flexure_member.submodules.plate_girder import tasks as pso

    layer = MagicMock()
    layer.send = AsyncMock()
    task = types.SimpleNamespace(request=types.SimpleNamespace(id="t"))
    with patch.object(pso, "get_channel_layer", return_value=layer), \
            patch.object(pso, "create_optimization_input", boom):
        with pytest.raises(RuntimeError):
            pso._run_pso_optimization(task, "chan", {})
    message = layer.send.call_args.args[1]
    assert message["type"] == "pso_error"
    assert SECRET not in json.dumps(message)
    assert "traceback" not in message["data"]
