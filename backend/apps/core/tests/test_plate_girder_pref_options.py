"""
The plate girder's Additional Inputs tabs offer the core's own option lists.

The web dialog's lists are in ``frontend/src/modules/flexuralMember/plateGirder/configs/plateGirderPrefOptions.js``;
the core's are the rows of its tab functions (``optimization_tab_welded_plate_girder_design``, ``Stiffener_design``,
``girder_geometry``, ``deflection_values`` in ``design_type/member.py``), the narrowing of the deflection rows
(``member_options_change``, ``supp_options_change`` in ``plate_girder.py``) and the defaults of
``get_values_for_design_pref``. This test reads the JavaScript file and compares each list with the core's, so a
change on either side is a visible failure.

No database is used.
"""
import re
from pathlib import Path

import pytest
from apps.core import design_dictionary

from osdag_core import Common
from osdag_core.Common import (
    KEY_ALLOW_CLASS,
    KEY_DESIGN_LOAD,
    KEY_DISP_PLATE_GIRDER_WELDED,
    KEY_EFFECTIVE_AREA_PARA,
    KEY_IS_IT_SYMMETRIC,
    KEY_LENGTH_OVERWRITE,
    KEY_LOAD,
    KEY_MEMBER_OPTIONS,
    KEY_STR_TYPE,
    KEY_SUPPORTING_OPTIONS,
    KEY_IntermediateStiffener,
    KEY_IntermediateStiffener_thickness,
    KEY_LongitudnalStiffener,
    KEY_LongitudnalStiffener_thickness,
    KEY_ShearBucklingOption,
)

OPTIONS_FILE = (
    Path(__file__).resolve().parents[4]
    / "frontend/src/modules/flexuralMember/plateGirder/configs/plateGirderPrefOptions.js"
)
SOURCE = OPTIONS_FILE.read_text()
TOKEN = re.compile(r'"([^"]*)"|\b(KEY_[A-Za-z0-9_]+)\b')


def _values(body):
    """The strings of a JavaScript list body; a KEY_* name is the core constant it names."""
    return [text if name is None or not name else getattr(Common, name) for text, name in TOKEN.findall(body)]


def web_list(name):
    body = re.search(rf"export const {name} = \[(.*?)\];", SOURCE, re.S).group(1)
    return _values(body)


def web_map(name):
    """A JavaScript object of lists: {key: [strings]}."""
    body = re.search(rf"export const {name} = \{{(.*?)\n\}};", SOURCE, re.S).group(1)
    return {
        quoted or bare: _values(items)
        for quoted, bare, items in re.findall(r'(?:"([^"]+)"|(\w+)):\s*\[(.*?)\]', body, re.S)
    }


def web_defaults(name):
    body = re.search(rf"export const {name} = \{{(.*?)\n\}};", SOURCE, re.S).group(1)
    return dict(re.findall(r'(\w+): "([^"]*)"', body))


@pytest.fixture(scope="module")
def girder():
    return design_dictionary.core_instance(KEY_DISP_PLATE_GIRDER_WELDED)


def core_options(rows):
    """{key: options} of a tab function's rows (key, label, type, options, value)."""
    return {row[0]: list(row[3]) for row in rows if row[0] and isinstance(row[3], (list, tuple))}


@pytest.mark.parametrize("web_name, tab, key", [
    ("PG_ALLOW_CLASS_OPTIONS", "optimization_tab_welded_plate_girder_design", KEY_ALLOW_CLASS),
    ("PG_LOADING_CONDITION_OPTIONS", "optimization_tab_welded_plate_girder_design", KEY_LOAD),
    ("PG_INTERMEDIATE_STIFFENER_OPTIONS", "Stiffener_design", KEY_IntermediateStiffener),
    ("PG_LONGITUDINAL_STIFFENER_OPTIONS", "Stiffener_design", KEY_LongitudnalStiffener),
    ("PG_STIFFENER_THICKNESS_OPTIONS", "Stiffener_design", KEY_IntermediateStiffener_thickness),
    ("PG_STIFFENER_THICKNESS_OPTIONS", "Stiffener_design", KEY_LongitudnalStiffener_thickness),
    ("PG_SHEAR_BUCKLING_OPTIONS", "Stiffener_design", KEY_ShearBucklingOption),
    ("PG_SYMMETRY_OPTIONS", "girder_geometry", KEY_IS_IT_SYMMETRIC),
    ("PG_STRUCTURE_TYPE_OPTIONS", "deflection_values", KEY_STR_TYPE),
    ("PG_DESIGN_LOAD_OPTIONS", "deflection_values", KEY_DESIGN_LOAD),
])
def test_a_dropdown_offers_the_cores_options(girder, web_name, tab, key):
    assert web_list(web_name) == core_options(getattr(girder, tab)({}))[key]


def test_the_member_options_narrow_by_structure_type_as_in_the_core(girder):
    web = web_map("PG_MEMBER_OPTIONS")
    assert sorted(web) == sorted(web_list("PG_STRUCTURE_TYPE_OPTIONS"))
    for structure_type, options in web.items():
        assert options == girder.member_options_change([structure_type])[KEY_MEMBER_OPTIONS], structure_type


def test_the_supporting_options_narrow_by_member_option_as_in_the_core(girder):
    web = web_map("PG_SUPPORTING_OPTIONS")
    every_member_option = {option for options in web_map("PG_MEMBER_OPTIONS").values() for option in options}
    assert set(web) <= every_member_option
    for member_option in every_member_option:
        expected = girder.supp_options_change([member_option])[KEY_SUPPORTING_OPTIONS]
        assert web.get(member_option, web_list("PG_SUPPORTING_OPTIONS_DEFAULT")) == expected, member_option


def test_the_optimisation_defaults_are_the_cores(girder):
    fields = {"allowable_class": KEY_ALLOW_CLASS, "effective_area_parameter": KEY_EFFECTIVE_AREA_PARA,
              "length_overwrite": KEY_LENGTH_OVERWRITE}
    web = web_defaults("PLATE_GIRDER_OPTIMISATION_DEFAULTS")
    assert sorted(web) == sorted(fields)
    for field, key in fields.items():
        assert web[field] == girder.get_values_for_design_pref(key, {}), field
