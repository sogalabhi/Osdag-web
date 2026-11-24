"""
The design dictionary, derived from the core's own tables, the way the desktop does it.

The desktop (``osdag_gui/ui/windows/template_page.py``, ``design_fn``) builds the dict it hands
to the design from the Input Dock, keyed by the core keys of ``input_values()``. Additional
Inputs (the design preferences) are either taken from the dialog or, when it was never opened,
derived from tables every core module declares:

* ``input_values()``                      the dock keys,
* ``input_dictionary_design_pref()``      the Additional Inputs tabs and their keys,
* ``input_dictionary_without_design_pref()``
      ``(dock_key, [keys], 'Input Dock')`` copies a dock value into pref keys, and
      ``(None, [keys], '')`` asks ``get_values_for_design_pref(key, dict)`` for each key,
* ``refresh_input_dock()``                where each section designation comes from.

This module reads those tables (``pref_tables``) and ports ``design_fn`` (``derive``). It has no
database or Celery dependency beyond what the core classes use themselves (``Material(grade)``
reads the catalog, and honours ``osdag_overrides`` for custom materials).

Module ids are the desktop names, ``KEY_DISP_*`` from ``osdag_core/Common.py``
(``cls.module_name()``).

Known core defects this tolerates:

* ``tension_bolted.py`` lists ``KEY_DP_DETAILING_EDGE_TYPE`` twice in one entry: keys are
  de-duplicated, first occurrence wins.
* ``member.py`` ``get_values_for_design_pref`` has ``KEY_DP_WELD_MATERIAL_G_O`` twice in its dict
  literal: Python keeps the last (``str(fu)``), so nothing to do; noted here for the next reader.
* ``get_values_for_design_pref`` raises ``KeyError`` for keys it does not know (most flexure,
  compression and tension classes), and some raise other errors when the dict lacks a dock key:
  such a key is left out of the result.
* ``input_dictionary_without_design_pref`` of the base plate has a five-element tuple whose
  third element is a key, not ``'Input Dock'``: read literally, as the desktop does, it is a
  "computed" row.
"""
import importlib
import logging
from functools import lru_cache
from typing import Any, Dict, List, Optional

from osdag_core.Common import (
    KEY_DESIGN_LOAD,
    KEY_DISP_BASE_PLATE,
    KEY_DISP_BB_EP_SPLICE,
    KEY_DISP_BCENDPLATE,
    KEY_DISP_BEAMCOVERPLATE,
    KEY_DISP_BEAMCOVERPLATEWELD,
    KEY_DISP_BUTTJOINTBOLTED,
    KEY_DISP_BUTTJOINTWELDED,
    KEY_DISP_CLEATANGLE,
    KEY_DISP_COLUMNCOVERPLATE,
    KEY_DISP_COLUMNCOVERPLATEWELD,
    KEY_DISP_COLUMNENDPLATE,
    KEY_DISP_COMPRESSION_COLUMN,
    KEY_DISP_FINPLATE,
    KEY_DISP_FLEXURE,
    KEY_DISP_FLEXURE2,
    KEY_DISP_HEADERPLATE,
    KEY_DISP_LAPJOINTBOLTED,
    KEY_DISP_LAPJOINTWELDED,
    KEY_DISP_PLATE_GIRDER_WELDED,
    KEY_DISP_SEATED_ANGLE,
    KEY_DISP_STRUT_BOLTED_END_GUSSET,
    KEY_DISP_STRUT_WELDED_END_GUSSET,
    KEY_DISP_TENSION_BOLTED,
    KEY_DISP_TENSION_WELDED,
    KEY_MAX_DEFL,
    KEY_MODULE,
    KEY_PLATETHK,
    KEY_SUPPORTING_OPTIONS,
    TYPE_COMBOBOX,
    TYPE_COMBOBOX_CUSTOMIZED,
    TYPE_MODULE,
    TYPE_NOTE,
    TYPE_TEXTBOX,
)

logger = logging.getLogger(__name__)

INPUT_DOCK = "Input Dock"

# Dock row types design_fn reads a value from; every other row (images, titles, headings) is skipped.
_DOCK_VALUE_TYPES = frozenset({TYPE_COMBOBOX, TYPE_MODULE, TYPE_COMBOBOX_CUSTOMIZED, TYPE_TEXTBOX, TYPE_NOTE})

# module id -> (python module under osdag_core.design_type, class name).
# Purlin is out of scope. The test suite checks that every module the web registers is here and
# that ``cls.module_name()`` is the key.
CORE_CLASSES: Dict[str, tuple] = {
    KEY_DISP_FINPLATE: ("connection.fin_plate_connection", "FinPlateConnection"),
    KEY_DISP_HEADERPLATE: ("connection.header_plate_connection", "HeaderPlateConnection"),
    KEY_DISP_CLEATANGLE: ("connection.cleat_angle_connection", "CleatAngleConnection"),
    KEY_DISP_SEATED_ANGLE: ("connection.seated_angle_connection", "SeatedAngleConnection"),
    KEY_DISP_BCENDPLATE: ("connection.beam_column_end_plate", "BeamColumnEndPlate"),
    KEY_DISP_BB_EP_SPLICE: ("connection.beam_beam_end_plate_splice", "BeamBeamEndPlateSplice"),
    KEY_DISP_COLUMNCOVERPLATE: ("connection.column_cover_plate", "ColumnCoverPlate"),
    KEY_DISP_BEAMCOVERPLATE: ("connection.beam_cover_plate", "BeamCoverPlate"),
    KEY_DISP_COLUMNCOVERPLATEWELD: ("connection.column_cover_plate_weld", "ColumnCoverPlateWeld"),
    KEY_DISP_BEAMCOVERPLATEWELD: ("connection.beam_cover_plate_weld", "BeamCoverPlateWeld"),
    KEY_DISP_COLUMNENDPLATE: ("connection.column_end_plate", "ColumnEndPlate"),
    KEY_DISP_BASE_PLATE: ("connection.base_plate_connection", "BasePlateConnection"),
    KEY_DISP_BUTTJOINTBOLTED: ("connection.butt_joint_bolted", "ButtJointBolted"),
    KEY_DISP_LAPJOINTBOLTED: ("connection.lap_joint_bolted", "LapJointBolted"),
    KEY_DISP_BUTTJOINTWELDED: ("connection.butt_joint_welded", "ButtJointWelded"),
    KEY_DISP_LAPJOINTWELDED: ("connection.lap_joint_welded", "LapJointWelded"),
    KEY_DISP_FLEXURE: ("flexural_member.flexure", "Flexure"),
    KEY_DISP_FLEXURE2: ("flexural_member.flexure_cantilever", "Flexure_Cantilever"),
    KEY_DISP_PLATE_GIRDER_WELDED: ("plate_girder.core.plate_girder", "PlateGirderWelded"),
    KEY_DISP_COMPRESSION_COLUMN: ("compression_member.compression_column", "ColumnDesign"),
    KEY_DISP_STRUT_BOLTED_END_GUSSET: ("compression_member.compression_bolted", "Compression_bolted"),
    KEY_DISP_STRUT_WELDED_END_GUSSET: ("compression_member.compression_welded", "Compression_welded"),
    KEY_DISP_TENSION_BOLTED: ("tension_member.tension_bolted", "Tension_bolted"),
    KEY_DISP_TENSION_WELDED: ("tension_member.tension_welded", "Tension_welded"),
}


def module_ids() -> List[str]:
    return list(CORE_CLASSES)


def _core_class(module_id: str):
    try:
        path, name = CORE_CLASSES[module_id]
    except KeyError:
        raise KeyError(f"no core class for module id {module_id!r}") from None
    return getattr(importlib.import_module(f"osdag_core.design_type.{path}"), name)


def core_instance(module_id: str):
    """A fresh core instance with the attributes ``get_values_for_design_pref`` reads defaulted."""
    instance = _core_class(module_id)()
    # Some classes read these before a design ran; the dock never sets them.
    for attr, default in (("design_status", False), ("load_axial_tension", 0.0), ("load_moment_minor", 0.0)):
        if not hasattr(instance, attr):
            setattr(instance, attr, default)
    return instance


def _unique(keys) -> List[str]:
    return list(dict.fromkeys(keys))


@lru_cache(maxsize=None)
def _pref_tables(module_id: str) -> Dict[str, Any]:
    instance = core_instance(module_id)

    dock_keys = _unique(
        row[0] for row in instance.input_values() if row[0] and row[2] in _DOCK_VALUE_TYPES
    )
    pref_tabs = [[tab, kind, list(keys)] for tab, kind, keys in instance.input_dictionary_design_pref()]

    dock_copies: Dict[str, List[str]] = {}
    computed: List[str] = []
    for row in instance.input_dictionary_without_design_pref():
        dock_key, keys, source = row[0], row[1], row[2]
        if source == INPUT_DOCK:
            dock_copies[dock_key] = _unique([*dock_copies.get(dock_key, []), *keys])
        else:
            computed.extend(keys)

    section_sources = [
        {
            "tab": tab,
            "dockKey": dock_key,
            "dockType": dock_type,
            "prefKey": pref_key,
            "masterKey": master_key,
            "values": None if values is None else list(values),
            "table": table,
        }
        for tab, dock_key, dock_type, pref_key, master_key, values, table in instance.refresh_input_dock()
    ]
    return {
        "dock_keys": dock_keys,
        "pref_tabs": pref_tabs,
        "dock_copies": dock_copies,
        "computed": _unique(computed),
        "section_sources": section_sources,
    }


def pref_tables(module_id: str) -> Dict[str, Any]:
    """
    The static tables of a core module (a deep-enough copy: callers may mutate it).

    ``dock_keys``       keys of ``input_values()`` whose value the design dict carries.
    ``pref_tabs``       ``[tab, type, [keys]]`` from ``input_dictionary_design_pref()``.
    ``dock_copies``     ``{dock_key: [pref keys]}`` the 'Input Dock' rows of
                        ``input_dictionary_without_design_pref()``.
    ``computed``        pref keys ``get_values_for_design_pref`` answers (the ``None`` rows).
    ``section_sources`` one dict per ``refresh_input_dock()`` row: tab, dockKey, dockType,
                        prefKey, masterKey, values, table (the catalog table: Columns, Beams,
                        Angles, Channels).
    """
    tables = _pref_tables(module_id)
    return {
        "dock_keys": list(tables["dock_keys"]),
        "pref_tabs": [[tab, kind, list(keys)] for tab, kind, keys in tables["pref_tabs"]],
        "dock_copies": {key: list(targets) for key, targets in tables["dock_copies"].items()},
        "computed": list(tables["computed"]),
        "section_sources": [dict(row, values=None if row["values"] is None else list(row["values"]))
                            for row in tables["section_sources"]],
    }


def computed_value(module_id: str, key: str, design_dictionary: Dict[str, Any], instance=None) -> Any:
    """``get_values_for_design_pref(key, dict)``; ``KeyError`` (and any error from a missing dock key) -> None."""
    instance = instance if instance is not None else core_instance(module_id)
    try:
        return instance.get_values_for_design_pref(key, design_dictionary)
    except Exception as exc:  # the core raises KeyError for keys it does not know, others for missing dock keys
        logger.debug("get_values_for_design_pref(%r) failed for %s: %r", key, module_id, exc)
        return None


def derive_computed(module_id: str, dock: Dict[str, Any]) -> Dict[str, Any]:
    """
    The part of ``derive`` that asks the core: ``{key: get_values_for_design_pref(key, dict)}``
    for every ``computed`` key the core can answer, after the 'Input Dock' copies were applied to
    a private copy of ``dock``. Each call sees the copies and the answers before it.
    """
    tables = _pref_tables(module_id)
    working = dict(dock)
    for dock_key, targets in tables["dock_copies"].items():
        if dock_key not in working:
            continue  # the desktop would raise KeyError here
        for key in targets:
            working[key] = working[dock_key]

    instance = core_instance(module_id)
    answers: Dict[str, Any] = {}
    for key in tables["computed"]:
        value = computed_value(module_id, key, working, instance)
        if value is not None:
            working[key] = answers[key] = value
    return answers


def derive(
    module_id: str,
    dock: Dict[str, Any],
    prefs: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Port of the desktop ``design_fn`` (without the Qt widgets).

    ``dock`` is the Input Dock dict keyed by core keys. With ``prefs`` (Additional Inputs saved
    or loaded) the result is the dock plus the prefs. Without, the 'Input Dock' rows copy a dock
    value into pref keys and every ``computed`` key is asked of ``get_values_for_design_pref``,
    each call seeing what the earlier ones wrote. A key the core cannot answer is left out.
    """
    if prefs:
        return {**dock, **prefs}
    design_dictionary = dict(dock)
    for dock_key, targets in _pref_tables(module_id)["dock_copies"].items():
        if dock_key not in design_dictionary:
            continue
        for key in targets:
            design_dictionary[key] = design_dictionary[dock_key]
    design_dictionary.update(derive_computed(module_id, dock))
    return design_dictionary


# Keys the core lists as Additional Inputs that the web form holds on its main form. The web
# always sends them, so the fill must never treat them as preferences.
MAIN_FORM_KEYS: Dict[str, frozenset] = {
    KEY_DISP_PLATE_GIRDER_WELDED: frozenset({KEY_MAX_DEFL, KEY_DESIGN_LOAD, KEY_SUPPORTING_OPTIONS}),
    # The core derives one thickness ('8'); the web dock sends the list the design picks from.
    KEY_DISP_STRUT_WELDED_END_GUSSET: frozenset({KEY_PLATETHK}),
}


def pref_keys(module_id: str) -> List[str]:
    """
    The Additional Inputs keys of a module: the keys of its pref tabs, its computed keys and the
    targets of its 'Input Dock' copies, without the dock keys and the keys the web holds on its
    main form (``MAIN_FORM_KEYS``).
    """
    tables = _pref_tables(module_id)
    keys = [key for _tab, _kind, tab_keys in tables["pref_tabs"] for key in tab_keys]
    keys += tables["computed"]
    keys += [key for targets in tables["dock_copies"].values() for key in targets]
    excluded = set(tables["dock_keys"]) | MAIN_FORM_KEYS.get(module_id, frozenset())
    return [key for key in _unique(keys) if key not in excluded]


def _wire_value(value: Any) -> Any:
    """A derived value in the shape the web sends it: numbers as text, text without padding."""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return str(value)
    return value


def fill_prefs(module_id: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    The design request with every Additional Inputs key it lacks filled the way the desktop fills
    it when the dialog was never opened (``derive`` without prefs). Keys the request carries are
    saved choices and win; a key with ``None`` counts as missing. A module without core tables
    (Purlin) is returned unchanged.
    """
    filled = dict(inputs or {})
    if module_id not in CORE_CLASSES:
        return filled
    keys = pref_keys(module_id)
    missing = [key for key in keys if filled.get(key) is None]
    if not missing:
        return filled
    dock = {key: value for key, value in filled.items() if key not in keys}
    derived = derive(module_id, dock)
    for key in missing:
        if derived.get(key) is not None:
            filled[key] = _wire_value(derived[key])
    return filled


def fill_request_prefs(inputs: Dict[str, Any], module_id: Optional[str] = None) -> Dict[str, Any]:
    """
    ``fill_prefs`` for a design request (design, report, CAD export, optimisation). The module is
    ``module_id`` when the core has tables for it, else the request's ``Module`` key.
    """
    if not isinstance(inputs, dict):
        return inputs
    if module_id not in CORE_CLASSES:
        module_id = inputs.get(KEY_MODULE)
    if not isinstance(module_id, str):
        return dict(inputs)
    return fill_prefs(module_id, inputs)
