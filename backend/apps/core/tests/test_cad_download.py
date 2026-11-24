"""
CAD download accepts only a UUID request id and a plain section name, and serves files
only from inside the CAD storage folder.
"""
import os
import tempfile
import uuid
from pathlib import Path

from rest_framework.test import APIClient, APISimpleTestCase

URL = "/api/design/downloadCad/"


class CadDownloadTest(APISimpleTestCase):
    def setUp(self):
        self.client = APIClient()
        self._cwd = os.getcwd()
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name).resolve()
        self.storage = self.root / "file_storage" / "cad_models"
        self.storage.mkdir(parents=True)
        os.chdir(self.root)
        self.addCleanup(self._restore)

    def _restore(self):
        os.chdir(self._cwd)
        self._tmp.cleanup()

    def post(self, **body):
        return self.client.post(URL, body, format="json")

    def test_valid_download_is_served(self):
        request_id = str(uuid.uuid4())
        (self.storage / f"{request_id}_Model.step").write_bytes(b"ISO-10303-21;")
        response = self.post(format="step", section="Model", request_id=request_id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), b"ISO-10303-21;")
        self.assertIn(f"{request_id}_Model.step", response["Content-Disposition"])

    def test_missing_file_is_not_found(self):
        response = self.post(format="step", section="Model", request_id=str(uuid.uuid4()))
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"]["code"], "file_not_found")

    def test_request_id_must_be_a_uuid(self):
        # a file that a path-like request id would reach from the storage folder
        (self.root / "file_storage" / "secret_Model.step").write_bytes(b"outside")
        for bad in ("../secret", "..\\secret", "../../file_storage/secret", "abc", "a/b", 123):
            with self.subTest(request_id=bad):
                response = self.post(format="step", section="Model", request_id=bad)
                self.assertEqual(response.status_code, 400, response.content)
                self.assertEqual(response.json()["error"]["code"], "invalid_request_id")

    def test_section_must_be_a_plain_name(self):
        request_id = str(uuid.uuid4())
        for bad in ("../Model", "a/b", "Model.step", "", "x" * 200, "Mo del", 5):
            with self.subTest(section=bad):
                response = self.post(format="step", section=bad, request_id=request_id)
                self.assertEqual(response.status_code, 400, response.content)
                self.assertIn(response.json()["error"]["code"], ("invalid_section", "missing_field"))

    def test_link_pointing_outside_the_storage_folder_is_not_served(self):
        request_id = str(uuid.uuid4())
        outside = self.root / "outside.step"
        outside.write_bytes(b"outside")
        (self.storage / f"{request_id}_Model.step").symlink_to(outside)
        response = self.post(format="step", section="Model", request_id=request_id)
        self.assertEqual(response.status_code, 404)

    def test_unknown_format_is_rejected(self):
        response = self.post(format="exe", section="Model", request_id=str(uuid.uuid4()))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["error"]["code"], "invalid_format")
