"""User text in the design report is written to the LaTeX source as literal text.

Report metadata (company, designer, project title, ...) and the section details
(designation and material, which can name a user's custom section or material)
must not change the structure of the generated .tex file. These tests read the
.tex source only; pdflatex is run in one test, which is skipped where it is not
installed.
"""
import shutil
import subprocess

import pylatex
import pytest
from pylatex.utils import NoEscape

from osdag_core.Common import (
    KEY_DISP_COLSEC_REPORT,
    KEY_DISP_MATERIAL,
    KEY_DISP_SEC_PROFILE,
    KEY_DISP_SECSIZE,
    KEY_REPORT_AREA,
    KEY_REPORT_DEPTH,
    KEY_REPORT_MASS,
)
from osdag_core.design_report import reportGenerator_latex as rg
from osdag_core.design_report.reportGenerator_latex import CreateLatex, escape_latex_text

COMMAND_TEXT = r"A\relax\textbf{B}\def\x{y}"


@pytest.mark.parametrize("raw, expected", [
    ("ISMB 300", "ISMB 300"),
    ("E 250 (Fe 410 W)A", "E 250 (Fe 410 W)A"),
    ("Cus_250_250_250_410", r"Cus\_250\_250\_250\_410"),
    ("50% & #1 {x} $y$ ~ ^", r"50\% \& \#1 \{x\} \$y\$ \textasciitilde{} \^{}"),
    ("a\\b", r"a\textbackslash{}b"),
    ("Ünïcode - [x]", "Ünïcode - [x]"),
    (44.2, "44.2"),
])
def test_escape_latex_text(raw, expected):
    assert escape_latex_text(raw) == expected


def test_escape_latex_text_keeps_latex_built_by_the_core():
    value = NoEscape(r"$\mathrm{kg/m}$")
    assert escape_latex_text(value) is value


def test_escaped_text_has_no_command_or_group():
    out = escape_latex_text(COMMAND_TEXT)
    # every backslash starts \textbackslash{}, every brace is \{ or \}
    assert out.replace(r"\textbackslash{}", "").replace(r"\{", "").replace(r"\}", "").count("\\") == 0
    assert "{" not in out.replace(r"\textbackslash{}", "").replace(r"\{", "")


@pytest.fixture
def no_compile(monkeypatch):
    """Write the .tex only."""
    monkeypatch.setattr(rg, "get_latex_executable", lambda: "")


def _summary(text):
    return {
        "ProfileSummary": {"CompanyName": text, "CompanyLogo": "", "Group/TeamName": text, "Designer": text},
        "ProjectTitle": text, "Subtitle": text, "JobNumber": text, "Client": text,
        "does_design_exist": False, "logger_messages": "INFO " + text,
    }


def _section(designation, material):
    return {
        KEY_DISP_SEC_PROFILE: "ISection",
        KEY_DISP_SECSIZE: (designation, "Beams"),
        KEY_DISP_COLSEC_REPORT: designation,
        KEY_DISP_MATERIAL: material,
        KEY_REPORT_MASS: 44.2,
        KEY_REPORT_AREA: 56.3,
        KEY_REPORT_DEPTH: 300,
    }


def _tex(tmp_path, summary, ui_obj, checks=()):
    filename = str(tmp_path / "report")
    CreateLatex.save_latex(CreateLatex(), ui_obj, list(checks), summary, filename, str(tmp_path), [], False)
    return (tmp_path / "report.tex").read_text(encoding="utf-8")


def test_metadata_with_commands_is_literal_text(tmp_path, no_compile):
    tex = _tex(tmp_path, _summary(COMMAND_TEXT), {"Module": "x"})
    assert COMMAND_TEXT not in tex
    assert r"A\textbackslash{}relax\textbackslash{}textbf\{B\}" in tex


def test_ordinary_metadata_is_written_unchanged(tmp_path, no_compile):
    tex = _tex(tmp_path, _summary("Acme Steel Works 2026"), {"Module": "x"})
    assert "Company Name&Acme Steel Works 2026&Project Title&Acme Steel Works 2026" in tex


@pytest.mark.parametrize("section_key", ["Section", "Selected Section Details"])
def test_custom_designation_and_material_are_literal_text(tmp_path, no_compile, section_key):
    section = _section(COMMAND_TEXT, COMMAND_TEXT + "M")
    checks = [["Selected", "Selected Section", "|p{5cm}|p{2.5cm}|p{1.5cm}|p{3cm}|p{3.5cm}|"]]
    tex = _tex(tmp_path, _summary("C"), {"Module": "x", section_key: section}, checks)
    assert COMMAND_TEXT not in tex
    assert r"\textbf{B}" not in tex


@pytest.mark.parametrize("section_key", ["Section", "Selected Section Details"])
def test_ordinary_section_details_are_written_unchanged(tmp_path, no_compile, section_key):
    section = _section("ISMB 300", "E 250 (Fe 410 W)A")
    checks = [["Selected", "Selected Section", "|p{5cm}|p{2.5cm}|p{1.5cm}|p{3cm}|p{3.5cm}|"]]
    tex = _tex(tmp_path, _summary("C"), {"Module": "x", section_key: section}, checks)
    assert "{ISMB 300}" in tex
    assert "{E 250 (Fe 410 W)A}" in tex


def test_report_compile_disables_shell_escape_and_has_a_timeout(tmp_path, monkeypatch):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append((cmd, kwargs))
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(rg, "get_latex_executable", lambda: "pdflatex")
    monkeypatch.setattr(rg.subprocess, "run", fake_run)
    monkeypatch.setattr(pylatex.Document, "generate_pdf",
                        lambda *a, **k: pytest.fail("report must be compiled with the restricted command"))
    _tex(tmp_path, _summary("C"), {"Module": "x"})
    assert len(calls) == 1
    cmd, kwargs = calls[0]
    assert cmd[0] == "pdflatex"
    assert "-no-shell-escape" in cmd
    assert "-interaction=nonstopmode" in cmd
    assert kwargs["timeout"] > 0
    assert kwargs["cwd"] == str(tmp_path)


# A custom designation or material name is user text. Every place of the report that
# prints one (input table, list of input sections, both section detail blocks, log
# lines and the metadata) has to print it literally.
HOSTILE_NAME = r"ISMB 150 & $x_1$ \input{x}"
HOSTILE_NAME_ESCAPED = r"ISMB 150 \& \$x\_1\$ \textbackslash{}input\{x\}"
SELECTED_CHECKS = [["Selected", "Selected Section", "|p{5cm}|p{2.5cm}|p{1.5cm}|p{3cm}|p{3.5cm}|"]]


def _hostile_ui_obj(name):
    section = _section(name, name + " M")
    return {
        "Module": "x",
        "Material": name,
        "Section Size*": "['%s', 'ISMB 100']" % name,
        "Section": section,
        "Selected Section Details": dict(section),
    }


def test_hostile_designation_is_escaped_on_every_report_path(tmp_path, no_compile):
    tex = _tex(tmp_path, _summary(HOSTILE_NAME), _hostile_ui_obj(HOSTILE_NAME), SELECTED_CHECKS)
    # nothing of the name is left unescaped: no \input command and no math group
    assert r"\input{x}" not in tex
    assert "$x_1$" not in tex
    # metadata, input table material, list of input sections, both section blocks, log line
    assert tex.count(HOSTILE_NAME_ESCAPED) >= 8
    assert r"\multicolumn{3}{|c|}{Material}&\multicolumn{2}{|c|}{" + HOSTILE_NAME_ESCAPED + "}" in tex
    assert "'" + HOSTILE_NAME_ESCAPED + "', 'ISMB 100'" in tex
    assert "INFO " + HOSTILE_NAME_ESCAPED in tex


@pytest.mark.skipif(shutil.which("pdflatex") is None, reason="pdflatex is not installed")
def test_report_with_hostile_designation_compiles(tmp_path, monkeypatch):
    monkeypatch.setattr(rg, "get_latex_executable", lambda: shutil.which("pdflatex"))
    _tex(tmp_path, _summary(HOSTILE_NAME), _hostile_ui_obj(HOSTILE_NAME), SELECTED_CHECKS)
    # compile_report_tex removes the .log only after a run that returned 0
    assert (tmp_path / "report.pdf").exists()
    assert not (tmp_path / "report.log").exists()
