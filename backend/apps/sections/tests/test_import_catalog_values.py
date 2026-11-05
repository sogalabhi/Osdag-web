"""Section import accepts every number the catalog itself holds, as desktop Osdag does."""
import io

import openpyxl
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from apps.core import catalog
from apps.sections.validation import get_db_header


class ImportCatalogValuesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="importer", email="importer@example.com", password="x")
        self.client = APIClient(HTTP_HOST="localhost")
        self.client.force_authenticate(user=self.user)

    def import_catalog_copy(self, table):
        """Import every catalog row under a new name; return the import response body."""
        headers = get_db_header(table)
        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.title = table
        sheet.append(headers)
        for row in catalog.rows(table):
            values = [row[h] for h in headers]
            values[headers.index("Designation")] = f"COPY {row['Designation']}"
            sheet.append(values)
        upload = io.BytesIO()
        workbook.save(upload)
        upload.seek(0)
        upload.name = f"{table}.xlsx"
        response = self.client.post("/api/sections/import/", {"file": upload, "table": table}, format="multipart")
        self.assertEqual(response.status_code, 200, response.content[:300])
        return response.json()

    def test_catalog_numbers_are_accepted(self):
        # Desktop stores these as SQLite REAL: values such as FlangeSlope 91.5 or It 0.033 must import.
        for table in ("Beams", "Columns", "Angles", "Channels"):
            with self.subTest(table=table):
                body = self.import_catalog_copy(table)
                format_errors = [r for r in body["rejected"] if r.get("reason") == "serializer_validation"]
                self.assertEqual(format_errors, [])
                self.assertGreater(body["inserted"], 0)

    def test_stored_values_keep_their_precision(self):
        self.import_catalog_copy("Angles")
        source = next(r for r in catalog.rows("Angles") if r.get("It") not in (None, "") and round(float(r["It"]), 2) != float(r["It"]))
        from apps.sections.models import UserCustomAngle

        saved = UserCustomAngle.objects.get(user=self.user, Designation=f"COPY {source['Designation']}")
        self.assertAlmostEqual(saved.It, float(source["It"]), places=6)
