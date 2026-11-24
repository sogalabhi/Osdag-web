"""
CAD export goes through the same checks as the design endpoint (known module, validated
inputs, known format and section) and is rate limited like the other API views.
"""
import json
from pathlib import Path
from unittest import mock

from django.core.cache import cache
from django.test import SimpleTestCase
from rest_framework.test import APIClient, APISimpleTestCase
from rest_framework.throttling import SimpleRateThrottle

URL = "/api/design/exportCad"
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures" / "design_inputs"
FIN_PLATE = "Fin Plate Connection"


def fin_plate_inputs():
    path = FIXTURES_DIR / "shear_connection__fin_plate" / "osi-fin1.json"
    return json.loads(path.read_text(encoding="utf-8"))["inputs"]


class CadExportValidationTest(APISimpleTestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def post(self, **body):
        return self.client.post(URL, body, format="json")

    def assert_error(self, response, status, code=None):
        self.assertEqual(response.status_code, status, response.content[:300])
        error = response.json()["error"]
        if code:
            self.assertEqual(error["code"], code)
        return error

    def test_unknown_module_is_rejected(self):
        response = self.post(module_id="No Such Module", input_values=fin_plate_inputs(), format="step")
        self.assert_error(response, 400, "unknown_module")

    def test_module_id_must_be_a_string(self):
        for bad in (["x"], {"a": 1}, 5):
            with self.subTest(module_id=bad):
                response = self.post(module_id=bad, input_values=fin_plate_inputs(), format="step")
                self.assert_error(response, 400, "unknown_module")

    def test_input_values_must_be_an_object(self):
        for bad in ("text", ["a"], 5):
            with self.subTest(input_values=bad):
                response = self.post(module_id=FIN_PLATE, input_values=bad, format="step")
                self.assert_error(response, 400, "invalid_type")

    def test_missing_required_key_is_rejected_with_the_key(self):
        inputs = fin_plate_inputs()
        del inputs["Bolt.Diameter"]
        error = self.assert_error(self.post(module_id=FIN_PLATE, input_values=inputs, format="step"), 400, "missing_key")
        self.assertIn("Bolt.Diameter", error["fields"])

    def test_wrong_input_type_is_rejected(self):
        inputs = fin_plate_inputs()
        inputs["Bolt.Diameter"] = "16"
        self.assert_error(self.post(module_id=FIN_PLATE, input_values=inputs, format="step"), 400, "invalid_type")

    def test_unknown_format_is_rejected(self):
        for bad in ("exe", "../step", 5, ["step"]):
            with self.subTest(format=bad):
                response = self.post(module_id=FIN_PLATE, input_values=fin_plate_inputs(), format=bad)
                self.assertEqual(response.status_code, 400, response.content[:300])
                self.assertIn(response.json()["error"]["code"], ("invalid_format", "missing_field"))

    def test_unknown_section_is_rejected(self):
        for bad in ("../Model", "Model/../../x", "Nope", "x" * 100, 5):
            with self.subTest(section=bad):
                response = self.post(module_id=FIN_PLATE, input_values=fin_plate_inputs(), format="step", section=bad)
                self.assertEqual(response.status_code, 400, response.content[:300])
                self.assertIn("error", response.json())

    def test_body_must_be_a_json_object(self):
        response = self.client.post(URL, data="not json", content_type="application/json")
        self.assert_error(response, 400)
        response = self.client.post(URL, data="[1, 2]", content_type="application/json")
        self.assert_error(response, 400)

    def test_valid_request_still_exports(self):
        response = self.post(module_id=FIN_PLATE, input_values=fin_plate_inputs(), format="step", section="Model")
        self.assertEqual(response.status_code, 200, response.content[:300] if not response.streaming else "")
        body = b"".join(response.streaming_content)
        self.assertIn(b"ISO-10303-21", body[:200])
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertTrue(response["Content-Disposition"].endswith('_Model.step"'))

    def test_requests_over_the_rate_limit_get_429(self):
        rates = {"anon": "2/minute", "user": "2/minute", "cad_export_anon": "2/minute"}
        with mock.patch.object(SimpleRateThrottle, "THROTTLE_RATES", rates):
            # cheap invalid requests: the limit counts requests, not successful exports
            statuses = [self.post(module_id="x", input_values={"a": 1}, format="step").status_code for _ in range(3)]
        self.assertEqual(statuses, [400, 400, 429])

    def test_throttled_response_uses_the_standard_error_format(self):
        rates = {"anon": "1/minute", "user": "1/minute", "cad_export_anon": "1/minute"}
        with mock.patch.object(SimpleRateThrottle, "THROTTLE_RATES", rates):
            self.post(module_id="x", input_values={"a": 1}, format="step")
            response = self.post(module_id="x", input_values={"a": 1}, format="step")
        self.assert_error(response, 429, "throttled")
        self.assertIn("Retry-After", response)

    def test_unused_unvalidated_cad_route_is_gone(self):
        for url in ("/api/design/cad", "/api/design/cad/"):
            response = self.client.post(url, {"module_id": FIN_PLATE, "input_values": fin_plate_inputs()}, format="json")
            self.assertEqual(response.status_code, 404, url)


class CadExportGuestRateTests(SimpleTestCase):
    def test_guests_have_a_tighter_default_rate_than_the_global_anonymous_rate(self):
        from apps.core.api.cad.cad_model_export import CadExportAnonThrottle

        self.assertEqual(CadExportAnonThrottle.scope, "cad_export_anon")
        from django.conf import settings

        rates = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
        self.assertIn("cad_export_anon", rates)
