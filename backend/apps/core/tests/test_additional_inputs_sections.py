"""Additional Inputs load the selected section's properties, and report section titles parse whole."""
import pytest

from apps.core.api.design.report_customization_api import LaTeXParser
from apps.core.api.design.sync_merge import lookup_sources, merge_design_pref_sync

from osdag_core.Common import (
    KEY_DISP_BB_EP_SPLICE,
    KEY_DISP_COLUMNENDPLATE,
    KEY_DISP_COMPRESSION_COLUMN,
    KEY_DISP_FLEXURE,
    KEY_DISP_FLEXURE2,
    KEY_DISP_STRUT_BOLTED_END_GUSSET,
    KEY_DISP_STRUT_WELDED_END_GUSSET,
    KEY_DISP_TENSION_BOLTED,
    KEY_DISP_TENSION_WELDED,
    KEY_SEC_PROFILE,
    KEY_SECSIZE,
    KEY_SUPTDSEC,
)

# (module id, designation keys the draft sets, designation, role the Additional Inputs tab reads)
SECTION_CASES = [
    (KEY_DISP_COLUMNENDPLATE, (KEY_SECSIZE, KEY_SUPTDSEC), "HB 150", "supporting"),
    (KEY_DISP_BB_EP_SPLICE, (KEY_SUPTDSEC,), "MB 300", "supported"),
    (KEY_DISP_FLEXURE, (KEY_SECSIZE,), "MB 400", "supporting"),
    (KEY_DISP_FLEXURE, (KEY_SECSIZE,), "HB 150", "supporting"),
    (KEY_DISP_FLEXURE2, (KEY_SECSIZE,), "MB 400", "supporting"),
    (KEY_DISP_COMPRESSION_COLUMN, (KEY_SECSIZE,), "HB 150", "supporting"),
    # Beam sections are offered for this module too, so both tables must be searched.
    (KEY_DISP_COMPRESSION_COLUMN, (KEY_SECSIZE,), "JB 150", "supporting"),
    (KEY_DISP_TENSION_BOLTED, (KEY_SECSIZE,), "20 x 20 x 3", "supported"),
    (KEY_DISP_TENSION_WELDED, (KEY_SECSIZE,), "20 x 20 x 3", "supported"),
    (KEY_DISP_STRUT_BOLTED_END_GUSSET, (KEY_SECSIZE,), "20 x 20 x 3", "supported"),
    (KEY_DISP_STRUT_WELDED_END_GUSSET, (KEY_SECSIZE,), "20 x 20 x 3", "supported"),
]


@pytest.mark.parametrize("module_id,keys,designation,role", SECTION_CASES)
def test_selected_section_details_reach_the_tab_that_reads_them(module_id, keys, designation, role):
    _, _, _, details = merge_design_pref_sync(
        module_id=module_id,
        inputs={},
        operation="open",
        design_pref_draft={key: [designation] for key in keys},
        **lookup_sources(None),
    )
    assert details[role].get("Designation") == designation


def test_section_titles_keep_their_nested_braces():
    latex = "\n".join([
        r"\section{Design Checks}",
        r"\subsection{Bolt Design {-} Connected to Beam}",
        r"\subsection{Bolt Design {-} Connected to Column}",
        r"\subsection{Plain Title}",
    ])
    sections = LaTeXParser().parse_sections(latex)
    assert sections == {
        "Design Checks": [
            "Bolt Design {-} Connected to Beam",
            "Bolt Design {-} Connected to Column",
            "Plain Title",
        ]
    }


# The tension members and the bolted strut have an Angle Section and a Channel Section tab; the dock's section
# profile decides which table the member's section is read from. The dialog also asks for a section of the other
# tab's table by naming that tab's profile in the draft, so its tab shows something to look at.
ANGLE_OR_CHANNEL_MODULES = [KEY_DISP_TENSION_BOLTED, KEY_DISP_TENSION_WELDED, KEY_DISP_STRUT_BOLTED_END_GUSSET]
CHANNEL_PROFILES = ["Channels", "Back to Back Channels"]
ANGLE_PROFILES = ["Angles", "Back to Back Angles"]


@pytest.mark.parametrize("module_id", ANGLE_OR_CHANNEL_MODULES)
@pytest.mark.parametrize("profile", CHANNEL_PROFILES)
def test_a_channel_profile_reads_the_section_from_the_channels(module_id, profile):
    _, _, _, details = merge_design_pref_sync(
        module_id=module_id,
        inputs={},
        operation="open",
        design_pref_draft={KEY_SECSIZE: ["MC 100"], KEY_SEC_PROFILE: profile},
        **lookup_sources(None),
    )
    assert details["supported"].get("Designation") == "MC 100"
    assert details["supported"].get("FlangeSlope") is not None  # a channel row, not an angle row


@pytest.mark.parametrize("module_id", ANGLE_OR_CHANNEL_MODULES)
@pytest.mark.parametrize("profile", ANGLE_PROFILES)
def test_an_angle_profile_reads_the_section_from_the_angles(module_id, profile):
    _, _, _, details = merge_design_pref_sync(
        module_id=module_id,
        inputs={},
        operation="open",
        design_pref_draft={KEY_SECSIZE: ["20 x 20 x 3"], KEY_SEC_PROFILE: profile},
        **lookup_sources(None),
    )
    assert details["supported"].get("Designation") == "20 x 20 x 3"
    assert details["supported"].get("Cz") is not None  # an angle row


@pytest.mark.parametrize("module_id", ANGLE_OR_CHANNEL_MODULES)
def test_the_core_lists_the_channel_section_tab_of_these_modules(module_id):
    from apps.core import design_dictionary

    tabs = [tab for tab, _kind, _keys in design_dictionary.pref_tables(module_id)["pref_tabs"]]
    assert "Channel Section" in tabs
