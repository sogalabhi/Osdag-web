"""
The web shows and sends the core's spelling of the bolt tension type (Bolt.TensionType).

The Bolt tab of Additional Inputs offers what `Main.bolt_values` lists in osdag_core/design_type/main.py,
for every module with the tab, the butt and lap joints included. The web keeps the same two values in
frontend/src/modules/shared/config/prefOptions.js (`BOLT_TENSION_TYPE_OPTIONS`).
"""
import re
from pathlib import Path

from django.test import TestCase

from osdag_core.Common import KEY_DP_BOLT_TYPE, KEY_TYP, TYPE_COMBOBOX
from osdag_core.design_type.connection.butt_joint_bolted import ButtJointBolted
from osdag_core.design_type.connection.lap_joint_bolted import LapJointBolted
from osdag_core.design_type.main import Main

PREF_OPTIONS = Path(__file__).resolve().parents[4] / "frontend" / "src" / "modules" / "shared" / "config" / "prefOptions.js"


def core_options():
    rows = Main().bolt_values({KEY_TYP: "Friction Grip Bolt"})
    (row,) = [r for r in rows if r[0] == KEY_DP_BOLT_TYPE]
    assert row[2] == TYPE_COMBOBOX
    return list(row[3])


def web_options():
    source = PREF_OPTIONS.read_text(encoding="utf-8")
    values = dict(re.findall(r'export const (BOLT_\w+) = "([^"]+)";', source))
    return [values["BOLT_PRE_TENSIONED"], values["BOLT_NON_PRE_TENSIONED"]]


class BoltTensionTypeSpellingTests(TestCase):
    def test_the_web_options_are_the_cores(self):
        self.assertEqual(web_options(), core_options())

    def test_butt_and_lap_joint_defaults_are_options_of_the_core(self):
        for module in (ButtJointBolted, LapJointBolted):
            with self.subTest(module=module.__name__):
                default = module().get_values_for_design_pref(KEY_DP_BOLT_TYPE, {})
                self.assertIn(default, core_options())

    def test_simple_connection_options_are_the_cores(self):
        for slug in ("butt-joint-bolted", "lap-joint-bolted"):
            with self.subTest(slug=slug):
                response = self.client.get(f"/api/modules/simple-connection/{slug}/options/")
                self.assertEqual(response.status_code, 200)
                bolt = response.json()["designPreferences"]["bolt"]
                self.assertEqual(bolt["boltType"], core_options())
