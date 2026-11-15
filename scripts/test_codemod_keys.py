"""Unit tests for scripts/codemod_keys.py.

Run from the repository root:

    QT_QPA_PLATFORM=offscreen conda run -n osdag-web python -m pytest scripts/test_codemod_keys.py -q -p no:cacheprovider

The tests rewrite small source strings in memory; nothing under backend/ is touched.
"""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

import codemod_keys as ck  # noqa: E402

REL = "backend/apps/modules/demo/adapter.py"


@pytest.fixture(scope="module")
def tables():
    return ck.Tables()


def run(tables, source, rel=REL, newline=None):
    data = source.encode("utf-8")
    result = ck.analyze(rel, data, tables)
    assert result.abort is None, result.abort
    out = result.new_bytes if result.new_bytes is not None else data
    if result.new_bytes is not None:
        assert ck.self_check(rel, data, out, tables) is None
    return result, out.decode("utf-8")


def test_replaces_a_key_and_adds_the_import(tables):
    result, out = run(tables, 'import json\n\nx = {"Bolt.Diameter": 1}\n')
    assert out == "import json\nfrom osdag_core.Common import KEY_D\n\nx = {KEY_D: 1}\n"
    assert result.replacements == 1


def test_merges_into_an_existing_import_sorted(tables):
    _, out = run(tables, 'from osdag_core.Common import KEY_TYP, KEY_D\n\nx = ["Bolt.Grade", KEY_D]\n')
    assert out.splitlines()[0] == "from osdag_core.Common import KEY_D, KEY_GRD, KEY_TYP"


def test_merge_wraps_at_100_columns(tables):
    names = ", ".join(f"KEY_DP_DETAILING_{n}" for n in ("GAP", "EDGE_TYPE", "CORROSIVE_INFLUENCES", "PACKING_PLATE"))
    _, out = run(tables, f'from osdag_core.Common import {names}\n\nx = "Bolt.Grade"\n')
    assert out.startswith("from osdag_core.Common import (\n    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,\n")
    assert "    KEY_GRD,\n)" in out


def test_import_with_a_comment_gets_a_second_statement(tables):
    _, out = run(tables, 'from osdag_core.Common import KEY_D  # the diameter\n\nx = "Bolt.Grade"\n')
    assert out.startswith("from osdag_core.Common import KEY_D  # the diameter\n")
    assert "\nfrom osdag_core.Common import KEY_GRD\n" in out


def test_star_import_still_gets_explicit_names(tables):
    _, out = run(tables, 'from osdag_core.Common import *\n\nx = "Bolt.Grade"\n')
    assert out.splitlines()[:2] == ["from osdag_core.Common import *", "from osdag_core.Common import KEY_GRD"]


def test_implicit_concatenation_aborts_the_file(tables):
    result = ck.analyze(REL, b'x = "Bolt." "Diameter"\n', tables)
    assert result.abort and "single plain string token" in result.abort
    assert result.new_bytes is None


@pytest.mark.parametrize("prefix", ["r", "u", "b"])
def test_prefixed_strings_are_not_replaced_blindly(tables, prefix):
    result = ck.analyze(REL, f'x = {prefix}"Bolt.Diameter"\n'.encode(), tables)
    if prefix == "b":
        assert result.new_bytes is None and result.abort is None  # bytes are not keys
    else:
        assert result.abort


def test_non_ascii_text_before_the_key(tables):
    _, out = run(tables, 'label = "µ→é"; k = "Bolt.Grade"\n')
    assert out.endswith('label = "µ→é"; k = KEY_GRD\n')


def test_bom_and_crlf_are_kept(tables):
    data = b'\xef\xbb\xbfimport json\r\n\r\nx = "Bolt.Grade"\r\n'
    result = ck.analyze(REL, data, tables)
    assert result.new_bytes.startswith(b"\xef\xbb\xbfimport json\r\nfrom osdag_core.Common import KEY_GRD\r\n")
    assert b"\n" not in result.new_bytes.replace(b"\r\n", b"")
    assert ck.self_check(REL, data, result.new_bytes, tables) is None


def test_docstrings_fstring_pieces_and_annotations_are_skipped(tables):
    source = (
        '"""Bolt.Diameter in the module docstring."""\n'
        "def f(a: 'Bolt.Grade') -> 'Bolt.Type':\n"
        '    """Weld.Size in a docstring."""\n'
        '    return f"Bolt.Diameter is {a}"\n'
    )
    result, out = run(tables, source)
    assert out == source
    assert result.counts["skipped"] >= 1


def test_a_key_inside_an_fstring_expression_is_replaced(tables):
    _, out = run(tables, 'x = f"{d[\'Bolt.Grade\']} Bolt.Diameter"\n')
    assert "{d[KEY_GRD]}" in out and "Bolt.Diameter\"" in out


def test_shadowing_aborts_the_file(tables):
    result = ck.analyze(REL, b'KEY_GRD = 3\nx = "Bolt.Grade"\n', tables)
    assert result.abort and "KEY_GRD is already bound" in result.abort
    result = ck.analyze(REL, b'def f(KEY_GRD):\n    return {"Bolt.Grade": 1}\n', tables)
    assert result.abort and "KEY_GRD" in result.abort


def test_a_local_copy_is_deleted_and_imported(tables):
    source = 'import json\n\nKEY_D = "Bolt.Diameter"\n\ndef f(d):\n    return d[KEY_D]\n'
    result, out = run(tables, source)
    assert "KEY_D =" not in out
    assert "from osdag_core.Common import KEY_D\n" in out
    assert result.local_copies == 1


def test_a_local_copy_with_another_value_aborts(tables):
    result = ck.analyze(REL, b'KEY_D = "Something.Else"\n', tables)
    assert result.abort and "differs from the core value" in result.abort


def test_an_ambiguous_value_without_a_rule_aborts(tmp_path):
    choices = {"undotted": [], "ambiguous": {}}
    path = tmp_path / "choices.json"
    path.write_text(json.dumps(choices), encoding="utf-8")
    bare = ck.Tables(path)
    result = ck.analyze(REL, b'x = "Bolt.Diameter"\n', bare)
    assert result.abort and "no rule" in result.abort
    assert result.counts["ambiguous"] == 1


def test_ambiguous_values_follow_the_rules(tables):
    assert tables.resolve("Bolt.Diameter", REL, None) == "KEY_D"
    assert tables.resolve("Bolt.Diameter", "backend/apps/core/utils/output_dialogs.py", None) == "KEY_OUT_D_PROVIDED"
    assert tables.resolve("Bolt.Diameter", REL, "map_tuple_list") == "KEY_OUT_D_PROVIDED"
    assert tables.resolve("Weld.Type", REL, "generate_output") == "KEY_OUT_WELD_TYPE"
    assert tables.resolve("Weld.Type", "backend/apps/modules/simple_connection/x/adapter.py", None) == "KEY_DP_WELD_TYPE"
    assert tables.resolve("Weld.Type", REL, None) == "KEY_WELD_TYPE"
    assert tables.resolve("Weld.Size", REL, "map_tuple_list") == "KEY_OUT_WELD_SIZE"
    assert tables.resolve("Plate.Thickness", REL, None) == "KEY_OUT_PLATETHK"
    assert tables.resolve("Stiffener.Height", REL, None) == "KEY_OUT_STIFFENER_HEIGHT"
    assert tables.resolve("Stiffener.Thickness", REL, None) == "KEY_OUT_STIFFENER_THICKNESS"
    assert tables.resolve("Plate.Height", REL, None) == "KEY_OUT_PLATE_HEIGHT"
    assert tables.resolve("ColumnEndPlate.p2_flange", REL, None) == "KEY_PITCH_2_FLANGE1"


def test_undotted_keys_resolve_to_the_planned_names(tables):
    expected = {
        "Module": "KEY_MODULE",
        "Material": "KEY_MATERIAL",
        "Connectivity": "KEY_CONN",
        "Conn_Location": "KEY_LOCATION",
        "End_1": "KEY_END1",
        "End_2": "KEY_END2",
        "End_1_Y": "KEY_END1_Y",
        "End_2_Y": "KEY_END2_Y",
        "PlateWidth": "KEY_PLATE_WIDTH",
        "Plate1Thickness": "KEY_PLATE1_THICKNESS",
        "Plate2Thickness": "KEY_PLATE2_THICKNESS",
        "EndPlateType": "KEY_ENDPLATE_TYPE",
        "End Condition": "KEY_END_CONDITION",
        " Out_of_Plane": "KEY_Buckling_Out_plane",
        " In_Plane": "KEY_Buckling_In_plane",
    }
    assert {v: tables.resolve(v, REL, None) for v in tables.undotted} == expected


def test_undotted_keys_only_in_key_positions_and_paths(tables):
    source = (
        'a = {"Module": 1}\n'
        'b = d["Material"]\n'
        'c = d.get("End_1", 0)\n'
        'e = ["Connectivity", "x"]\n'
        'f = "Material"\n'
        'g = print("Module")\n'
    )
    result, out = run(tables, source)
    assert result.counts["undotted"] == 4
    assert 'f = "Material"' in out and 'print("Module")' in out
    other = ck.analyze("backend/apps/core/catalog.py", source.encode(), tables)
    assert other.counts["undotted"] == 0


def test_hint_comments(tables):
    source = (
        "x = [\n"
        '    "Bolt.Grade",  # KEY_GRD\n'
        '    "Bolt.Type",  # KEY_GRD\n'
        '    "Bolt.Diameter",  # KEY_D, the diameter\n'
        "]\n"
    )
    result, out = run(tables, source)
    assert "    KEY_GRD,\n" in out
    assert "    KEY_TYP,  # KEY_GRD\n" in out
    assert "    KEY_D,  # KEY_D, the diameter\n" in out
    assert any("KEY_TYP" in w for w in result.warnings)


def test_unknown_keys_are_reported_and_left(tables):
    result, out = run(tables, 'x = "Nothing.Known"\n')
    assert out == 'x = "Nothing.Known"\n'
    assert result.counts["unknown"] == 1


def test_use_before_the_import_aborts(tables):
    source = 'class A:\n    k = "Bolt.Grade"\nimport json\n'
    result = ck.analyze(REL, source.encode(), tables)
    assert result.abort and "before its import" in result.abort


def test_second_pass_changes_nothing(tables):
    _, once = run(tables, 'KEY_D = "Bolt.Diameter"\nx = {"Bolt.Grade": 1, KEY_D: 2}\n')
    again = ck.analyze(REL, once.encode(), tables)
    assert again.abort is None and again.new_bytes is None


def test_the_tree_comparison_catches_a_wrong_name(tables):
    old = b'x = "Bolt.Grade"\n'
    wrong = b"from osdag_core.Common import KEY_TYP\nx = KEY_TYP\n"
    assert "tree comparison failed" in ck.self_check(REL, old, wrong, tables)
    right = b"from osdag_core.Common import KEY_GRD\nx = KEY_GRD\n"
    assert ck.self_check(REL, old, right, tables) is None


def test_paths_are_refused_or_skipped():
    with pytest.raises(SystemExit):
        ck.collect_files(["backend/apps/modules/flexure_member/submodules/purlin"])
    assert ck.never_touch("backend/apps/core/tests/test_x.py")
    assert ck.never_touch("backend/apps/core/migrations/0001_initial.py")
    assert ck.never_touch("backend/apps/core/web_keys.py")
    assert not ck.never_touch("backend/apps/modules/tension_member/shared.py")
    purlin_free = ck.collect_files([str(ck.BACKEND / "apps" / "modules" / "flexure_member")])
    assert purlin_free and not any("purlin" in str(p) for p in purlin_free)
