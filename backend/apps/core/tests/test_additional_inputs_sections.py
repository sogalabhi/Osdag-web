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
