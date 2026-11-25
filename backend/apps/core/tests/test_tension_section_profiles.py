"""
Both tension member modules offer the core's whole Section Profile list, and a design with the
last profile, Back to Back Channels, runs through the same path the Design button uses.
"""
import json
from pathlib import Path

from django.test import TestCase

from apps.core.tasks import run_design_calculation_task
from osdag_core.Common import KEY_SEC_PROFILE, VALUES_SEC_PROFILE_2

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures" / "design_inputs"

# Desktop examples of the Back to Back Channels profile, as the web sends them.
BACK_TO_BACK_CHANNELS_FIXTURES = [
    ("tension_member__bolted", "osi-tension-b-bbchannel"),
    ("tension_member__welded", "osi-tension-w-bbchannels"),
]


def _inputs(slug, name):
    return json.loads((FIXTURES_DIR / slug / f"{name}.json").read_text(encoding="utf-8"))["inputs"]


class TensionSectionProfileTests(TestCase):
    def test_options_list_every_profile_of_the_core(self):
        self.assertEqual(VALUES_SEC_PROFILE_2[-1], "Back to Back Channels")
        for submodule in ("bolted", "welded"):
            with self.subTest(submodule=submodule):
                response = self.client.get(f"/api/modules/tension-member/{submodule}/options/")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["sectionProfileList"], list(VALUES_SEC_PROFILE_2))

    def test_back_to_back_channels_design_runs(self):
        for slug, name in BACK_TO_BACK_CHANNELS_FIXTURES:
            with self.subTest(fixture=f"{slug}/{name}"):
                inputs = _inputs(slug, name)
                self.assertEqual(inputs[KEY_SEC_PROFILE], "Back to Back Channels")
                result = run_design_calculation_task.apply(
                    kwargs={"module_name": "tension-member", "submodule_slug": slug.partition("__")[2], "inputs": inputs}
                )
                result.get()  # re-raises anything the design task raised
                self.assertTrue(result.result["success"], result.result.get("error"))
                self.assertIs(result.result["design_status"], True)
                self.assertTrue(result.result["data"])
