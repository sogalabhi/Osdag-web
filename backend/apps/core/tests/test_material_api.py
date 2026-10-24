from django.contrib.auth.models import User
from django.test import TestCase

from apps.core.models import CustomMaterials, Material
from apps.core.tests.auth_utils import authenticated_as

URL = "/api/materialDetails/"


def strengths(**extra):
    return dict(
        Yield_Stress_less_than_20=300, Yield_Stress_between_20_and_neg40=290,
        Yield_Stress_greater_than_40=280, Ultimate_Tensile_Stress=450, Elongation=0, **extra,
    )


class MaterialDetailsConflictTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="u1", email="u1@example.com", password="x")
        Material.objects.create(Grade="E 250 (Fe 410 W)A", **strengths())
        self.first = CustomMaterials.objects.create(user=self.user, Grade="Mine 1", **strengths())
        self.second = CustomMaterials.objects.create(user=self.user, Grade="Mine 2", **strengths())

    def put(self, material, grade):
        with authenticated_as(self.user):
            return self.client.put(
                f"{URL}{material.pk}/", data={"Grade": grade}, content_type="application/json",
            )

    def test_post_with_catalog_grade_is_rejected(self):
        body = {"materialName": "E 250 (Fe 410 W)A", "fy_20": 300, "fy_20_40": 290, "fy_40": 280, "fu": 450}
        with authenticated_as(self.user):
            r = self.client.post(URL, data=body, content_type="application/json")
        self.assertEqual(r.status_code, 403)
        self.assertFalse(CustomMaterials.objects.filter(Grade="E 250 (Fe 410 W)A").exists())

    def test_post_with_new_grade_is_created(self):
        body = {"materialName": "Mine 3", "fy_20": 300, "fy_20_40": 290, "fy_40": 280, "fu": 450}
        with authenticated_as(self.user):
            r = self.client.post(URL, data=body, content_type="application/json")
        self.assertEqual(r.status_code, 201)

    def test_rename_to_catalog_grade_is_rejected(self):
        self.assertEqual(self.put(self.first, "E 250 (Fe 410 W)A").status_code, 403)
        self.first.refresh_from_db()
        self.assertEqual(self.first.Grade, "Mine 1")

    def test_rename_to_another_own_grade_is_rejected(self):
        self.assertEqual(self.put(self.first, "Mine 2").status_code, 403)

    def test_normal_rename_works(self):
        self.assertEqual(self.put(self.first, "Renamed").status_code, 200)
        self.first.refresh_from_db()
        self.assertEqual(self.first.Grade, "Renamed")

    def test_update_keeping_the_same_grade_works(self):
        self.assertEqual(self.put(self.first, "Mine 1").status_code, 200)
