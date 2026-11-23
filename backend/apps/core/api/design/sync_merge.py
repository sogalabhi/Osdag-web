"""
Design-preference sync merge, on core keys.

``inputs`` and ``resolved_inputs`` are keyed by the core keys of the module (``Material``,
``Member.Supporting_Section.Material``, ``Bolt.TensionType``...), and the module is a module id
(``KEY_DISP_*`` from ``osdag_core/Common.py``). Which keys are linked, defaulted and looked up in
the catalog comes from the core's own tables through ``apps.core.design_dictionary.pref_tables``:

* material sync: the 'Input Dock' rows of ``input_dictionary_without_design_pref()`` (dock key ->
  pref keys), plus the computed keys that just echo the dock material (``Connector.Material``);
* defaults: ``get_values_for_design_pref`` (``design_dictionary.computed_value``) for the keys in
  ``SYNC_DEFAULT_KEYS``;
* section details: the rows of ``refresh_input_dock()`` (designation key, catalog table, and the
  master key that selects the table).

The frontend turns its form field names into core keys before the request and back after the
answer (``frontend/src/modules/shared/utils/prefSyncKeys.js``); nothing here knows a web name.

Where the core's tables and the web's old rules disagree, the old behaviour is kept in the small
``LEGACY_*`` tables below, so the goldens in ``tests/test_design_pref_sync_golden.py`` stay valid.
Each of those rows is a decision still to be taken (see ``documentation`` chapter 2 and the test
``test_design_pref_sync_overrides.py``).

Operations: open = merge rules onto current inputs; refresh = driving-input wins (invalidates
material copies); save = apply draft then preserve user choices; reset = contextual defaults from
driver material only.
"""
from copy import deepcopy
from typing import Any, Dict, List, Optional, Tuple

from apps.core import catalog, design_dictionary
from apps.core.design_dictionary import CORE_CLASSES

from osdag_core.Common import (
    KEY_ANGLE_LIST,
    KEY_CONNECTOR_MATERIAL,
    KEY_DESIGN_FOR,
    KEY_DIA_ANCHOR_ICF,
    KEY_DIA_ANCHOR_OCF,
    KEY_DISP_BASE_PLATE,
    KEY_DISP_BB_EP_SPLICE,
    KEY_DISP_BCENDPLATE,
    KEY_DISP_CLEATANGLE,
    KEY_DISP_COLUMNENDPLATE,
    KEY_DISP_COMPRESSION_COLUMN,
    KEY_DISP_FINPLATE,
    KEY_DISP_FLEXURE,
    KEY_DISP_FLEXURE2,
    KEY_DISP_HEADERPLATE,
    KEY_DISP_PLATE_GIRDER_WELDED,
    KEY_DISP_SEATED_ANGLE,
    KEY_DISP_STRUT_BOLTED_END_GUSSET,
    KEY_DISP_STRUT_WELDED_END_GUSSET,
    KEY_DISP_TENSION_BOLTED,
    KEY_DISP_TENSION_WELDED,
    KEY_DP_ANCHOR_BOLT_DESIGNATION_ICF,
    KEY_DP_ANCHOR_BOLT_DESIGNATION_OCF,
    KEY_DP_ANCHOR_BOLT_FRICTION,
    KEY_DP_ANCHOR_BOLT_GALVANIZED_ICF,
    KEY_DP_ANCHOR_BOLT_GALVANIZED_OCF,
    KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF,
    KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF,
    KEY_DP_ANCHOR_BOLT_LENGTH_ICF,
    KEY_DP_ANCHOR_BOLT_LENGTH_OCF,
    KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_ICF,
    KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_OCF,
    KEY_DP_ANCHOR_BOLT_TYPE_ICF,
    KEY_DP_ANCHOR_BOLT_TYPE_OCF,
    KEY_DP_BOLT_HOLE_TYPE,
    KEY_DP_BOLT_SLIP_FACTOR,
    KEY_DP_BOLT_TYPE,
    KEY_DP_DESIGN_BASE_PLATE,
    KEY_DP_DESIGN_METHOD,
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DETAILING_EDGE_TYPE,
    KEY_DP_DETAILING_GAP,
    KEY_DP_DETAILING_PACKING_PLATE,
    KEY_DP_WELD_FAB,
    KEY_DP_WELD_MATERIAL_G_O,
    KEY_MATERIAL,
    KEY_SEC_MATERIAL,
    KEY_SEC_PROFILE,
    KEY_SECSIZE,
    KEY_ST_KEY_MATERIAL,
    KEY_SUPTDSEC,
    KEY_SUPTDSEC_MATERIAL,
    KEY_SUPTNGSEC,
    KEY_SUPTNGSEC_MATERIAL,
)

VALID_OPERATIONS = frozenset({"open", "refresh", "save", "reset"})

# The modules whose web form holds Member.Material as the material of one section tab: that tab shows
# the properties of Member.Material (the saved one), not of the dock Material.
MEMBER_MATERIAL_TAB = {
    KEY_DISP_TENSION_BOLTED: "supported",
    KEY_DISP_TENSION_WELDED: "supported",
    KEY_DISP_STRUT_BOLTED_END_GUSSET: "supported",
    KEY_DISP_STRUT_WELDED_END_GUSSET: "supported",
    KEY_DISP_FLEXURE: "supporting",
    KEY_DISP_BASE_PLATE: "supporting",
}

# A material grade the core can look up; used when the dock has none yet.
_FALLBACK_GRADE = "E 250 (Fe 410 W)A"

# The three roles of ``material_details`` and ``section_details`` in the response.
MATERIAL_ROLE_KEYS = {
    "connector": KEY_CONNECTOR_MATERIAL,
    "supported": KEY_SUPTDSEC_MATERIAL,
    "supporting": KEY_SUPTNGSEC_MATERIAL,
}


# --------------------------------------------------------------------------------------------
# Old web behaviour kept where the core's tables disagree (decisions still to be taken).
# A module not listed uses the core tables. See test_design_pref_sync_overrides.py for the list.
# --------------------------------------------------------------------------------------------

# module id -> ordered [(driver key, [target keys])]; the first driver with a value wins.
# These are the rules of the old web table (_MATERIAL_SYNC_RULES), written in core keys. Where the
# old table named a field that feeds no core key (member_material in most modules) that driver is
# gone. The core's own table for each module is core_sync_rules(module_id); the test
# test_design_pref_sync_overrides.py lists how each differs.
_M, _R, _S, _D, _C = (KEY_MATERIAL, KEY_SEC_MATERIAL, KEY_SUPTNGSEC_MATERIAL, KEY_SUPTDSEC_MATERIAL,
                      KEY_CONNECTOR_MATERIAL)
_SHEAR_RULES = [(_C, [_S, _D])]
_MEMBER_RULES = [(_M, [_S, _D, _C])]
LEGACY_SYNC_RULES: Dict[str, List[Tuple[str, List[str]]]] = {
    KEY_DISP_BCENDPLATE: _SHEAR_RULES,
    KEY_DISP_BB_EP_SPLICE: [(_C, [_D])],
    KEY_DISP_COLUMNENDPLATE: [(_M, [_S, _R, _C, _D])],
    KEY_DISP_FLEXURE2: _MEMBER_RULES,
    KEY_DISP_PLATE_GIRDER_WELDED: _MEMBER_RULES,
    KEY_DISP_COMPRESSION_COLUMN: _MEMBER_RULES,
    # The core gives the welded strut no Connector.Material row, which the web form still sends.
    KEY_DISP_STRUT_WELDED_END_GUSSET: [(_M, [_R, _C])],
}

# module id -> {role: [section source, ...]}; a section source is
# {"key": designation key, "master": key choosing the row or None, "values": [...] or None, "tables": (names,)}.
# The old web table (_SECTION_KEY_MAP) where the core's refresh_input_dock() says otherwise.
_BEAMS_THEN_COLUMNS = {"supporting": [{"key": KEY_SECSIZE, "master": None, "values": None, "tables": ("Beams", "Columns")}]}
_ANGLES_OR_CHANNELS = {
    "supported": [
        {"key": KEY_SECSIZE, "master": KEY_SEC_PROFILE, "values": ["Channels", "Back to Back Channels"],
         "tables": ("Channels",)},
        {"key": KEY_SECSIZE, "master": None, "values": None, "tables": ("Angles",)},
    ],
}
LEGACY_SECTION_SOURCES: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
    # The core has no refresh_input_dock() rows for flexure: the old web looked in beams, then columns.
    KEY_DISP_FLEXURE: _BEAMS_THEN_COLUMNS,
    KEY_DISP_FLEXURE2: _BEAMS_THEN_COLUMNS,
    # The core offers columns only; the web also offers beams for this module (test_additional_inputs_sections).
    KEY_DISP_COMPRESSION_COLUMN: {
        "supporting": [{"key": KEY_SECSIZE, "master": None, "values": None, "tables": ("Columns", "Beams")}],
    },
    # Core defects: refresh_input_dock() lists the channel profiles under the 'Angles' table (struts
    # bolted) and gives its two rows (Angles, Channels) no master key (tension welded). The old web
    # looked in channels for a channel profile.
    KEY_DISP_STRUT_BOLTED_END_GUSSET: _ANGLES_OR_CHANNELS,
    KEY_DISP_TENSION_WELDED: _ANGLES_OR_CHANNELS,
}

# Modules the old sync never asked the core for defaults (no entry in the old core class map).
NO_CORE_DEFAULTS = frozenset({KEY_DISP_HEADERPLATE, KEY_DISP_PLATE_GIRDER_WELDED})

# The keys the sync asks the core to default, in the order the old web table listed them. The core
# computes more (Optimum.*, loads...) and does not list some of these for every module (Weld.Fab for a
# bolted one), but the old sync asked the class for every one of them and kept the answers.
SYNC_DEFAULT_KEYS = (
    KEY_DP_BOLT_TYPE,
    KEY_DP_BOLT_HOLE_TYPE,
    KEY_DP_BOLT_SLIP_FACTOR,
    KEY_DP_WELD_FAB,
    KEY_DP_WELD_MATERIAL_G_O,
    KEY_DP_DETAILING_EDGE_TYPE,
    KEY_DP_DETAILING_GAP,
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DETAILING_PACKING_PLATE,
    KEY_DP_DESIGN_METHOD,
    KEY_DESIGN_FOR,
    KEY_DP_ANCHOR_BOLT_DESIGNATION_OCF,
    KEY_DP_ANCHOR_BOLT_TYPE_OCF,
    KEY_DP_ANCHOR_BOLT_GALVANIZED_OCF,
    KEY_DP_ANCHOR_BOLT_HOLE_TYPE_OCF,
    KEY_DP_ANCHOR_BOLT_LENGTH_OCF,
    KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_OCF,
    KEY_DP_ANCHOR_BOLT_DESIGNATION_ICF,
    KEY_DP_ANCHOR_BOLT_TYPE_ICF,
    KEY_DP_ANCHOR_BOLT_GALVANIZED_ICF,
    KEY_DP_ANCHOR_BOLT_HOLE_TYPE_ICF,
    KEY_DP_ANCHOR_BOLT_LENGTH_ICF,
    KEY_DP_ANCHOR_BOLT_MATERIAL_G_O_ICF,
    KEY_DP_ANCHOR_BOLT_FRICTION,
    KEY_DP_DESIGN_BASE_PLATE,
)


# --------------------------------------------------------------------------------------------
# Tables from the core
# --------------------------------------------------------------------------------------------

def _is_material_key(key: str) -> bool:
    return key == KEY_MATERIAL or key.endswith(".Material")


def echo_keys(module_id: str) -> List[str]:
    """Computed keys whose value is just the dock material (``Connector.Material``)."""
    return list(_echo_keys(module_id))


_ECHO_CACHE: Dict[str, Tuple[str, ...]] = {}


def _echo_keys(module_id: str) -> Tuple[str, ...]:
    if module_id not in _ECHO_CACHE:
        answers = design_dictionary.derive_computed(module_id, {KEY_MATERIAL: _FALLBACK_GRADE})
        _ECHO_CACHE[module_id] = tuple(k for k, v in answers.items() if v == _FALLBACK_GRADE)
    return _ECHO_CACHE[module_id]


def core_sync_rules(module_id: str) -> List[Tuple[str, List[str]]]:
    """
    Material sync rules read from the core: every 'Input Dock' row whose dock key is a material
    gives ``(dock key, pref keys + the computed keys that echo the dock material)``.
    """
    tables = design_dictionary.pref_tables(module_id)
    echoes = list(_echo_keys(module_id))
    return [
        (dock_key, [*targets, *(k for k in echoes if k not in targets)])
        for dock_key, targets in tables["dock_copies"].items()
        if _is_material_key(dock_key)
    ]


def sync_rules(module_id: str) -> List[Tuple[str, List[str]]]:
    return LEGACY_SYNC_RULES.get(module_id) or core_sync_rules(module_id)


_SECTION_ROLES = ("supporting", "supported", "connector")


def _section_role(row: Dict[str, Any]) -> str:
    key, tab = row["dockKey"], row["tab"]
    if key == KEY_SUPTNGSEC:
        return "supporting"
    if key == KEY_SUPTDSEC:
        return "supported"
    if key == KEY_ANGLE_LIST:
        return "connector"
    # Member.Designation of a one-member module: the tab says which kind of member it is.
    return "supporting" if tab == "Column Section *" else "supported"


def core_section_sources(module_id: str) -> Dict[str, List[Dict[str, Any]]]:
    """Section lookups read from ``refresh_input_dock()``: role -> rows (first row whose master matches wins)."""
    sources: Dict[str, List[Dict[str, Any]]] = {}
    for row in design_dictionary.pref_tables(module_id)["section_sources"]:
        sources.setdefault(_section_role(row), []).append({
            "key": row["dockKey"],
            "master": row["masterKey"],
            "values": row["values"],
            "tables": (row["table"],),
        })
    return sources


def section_sources(module_id: str) -> Dict[str, List[Dict[str, Any]]]:
    return LEGACY_SECTION_SOURCES.get(module_id) or core_section_sources(module_id)


# --------------------------------------------------------------------------------------------
# Catalog lookups
# --------------------------------------------------------------------------------------------

def lookup_sources(user=None) -> Dict[str, List[Any]]:
    """
    Model kwargs for merge_design_pref_sync / build_design_pref_defaults.

    Each value lists the sources searched in order: querysets of a signed-in user's
    custom rows first, then the name of the catalog table. That is the same precedence
    osdag_core uses (apps.core.osdag_overrides).
    """
    from apps.core.models import CustomMaterials
    from apps.sections.models import (
        UserCustomAngle,
        UserCustomBeam,
        UserCustomChannel,
        UserCustomColumn,
    )

    sources = {
        "material_model": [KEY_MATERIAL],
        "beams_model": ["Beams"],
        "columns_model": ["Columns"],
        "angles_model": ["Angles"],
        "channels_model": ["Channels"],
    }
    if user is not None and getattr(user, "is_authenticated", False):
        sources["material_model"].insert(0, CustomMaterials.objects.filter(user=user))
        for key, Model in (
            ("beams_model", UserCustomBeam),
            ("columns_model", UserCustomColumn),
            ("angles_model", UserCustomAngle),
            ("channels_model", UserCustomChannel),
        ):
            sources[key].insert(0, Model.objects.filter(user=user, is_active=True))
    return sources


def first_row(sources, **lookup) -> Optional[Dict[str, Any]]:
    """
    First row matching `lookup` across `sources`, searched in order.

    `sources` is one source or a list of them; a source is a queryset (user rows) or
    the name of a catalog table.
    """
    if sources is None:
        return None
    for source in sources if isinstance(sources, (list, tuple)) else (sources,):
        if isinstance(source, str):
            row = catalog.find(source, **lookup)
        else:
            row = source.filter(**lookup).values().first()
        if row:
            return row
    return None


def _material_row_for_grade(material_models, grade: str) -> List[Dict[str, Any]]:
    if not grade:
        return []
    row = first_row(material_models, Grade=grade)
    return [row] if row else []




def _section_row_for_designation(section_model, designation: str) -> Dict[str, Any]:
    if not designation:
        return {}
    return first_row(section_model, Designation=designation) or {}


def _designation(value: Any) -> str:
    if isinstance(value, list):
        return str(value[0]) if value else ""
    return str(value) if value else ""


def _normalize_angle(designation: str) -> str:
    parts = designation.replace("ISA ", "").replace("X", "x").split("x")
    return " x ".join(p.strip() for p in parts)


def _pick_section_source(rows: List[Dict[str, Any]], inputs: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    The first row with no master key, or whose master key holds one of the row's values. A dock
    without a value for the master key (a request that omits it) takes the first row.
    """
    for row in rows:
        if row.get("master") is None or str(inputs.get(row["master"])) in (row.get("values") or ()):
            return row
    first = rows[0] if rows else None
    return first if first is not None and not inputs.get(first["master"]) else None


def _resolve_section_details(
    module_id: str,
    inputs: Dict[str, Any],
    beams_model=None,
    columns_model=None,
    angles_model=None,
    channels_model=None,
) -> Dict[str, Dict[str, Any]]:
    models = {"Beams": beams_model, "Columns": columns_model, "Angles": angles_model, "Channels": channels_model}
    details: Dict[str, Dict[str, Any]] = {role: {} for role in _SECTION_ROLES}
    for role, rows in section_sources(module_id).items():
        row = _pick_section_source(rows, inputs)
        if row is None:
            continue
        model = [source for table in row["tables"] for source in (models.get(table) or [])]
        if not model:
            continue
        designation = _designation(inputs.get(row["key"]))
        if row["tables"] == ("Angles",):
            designation = _normalize_angle(designation)
        details[role] = _section_row_for_designation(model, designation)
    return details


# --------------------------------------------------------------------------------------------
# Material sync and defaults
# --------------------------------------------------------------------------------------------

def _resolve_driver_and_targets(module_id: str, inputs: Dict[str, Any]) -> Tuple[Optional[str], List[str], str]:
    """
    (driver key, target keys, grade): the first rule whose driver has a value. When none has but
    the dock Material does, Material drives with its own rule's targets, else the first rule's
    targets plus the connector material. A module without rules (butt and lap joints) has no driver.
    """
    rules = sync_rules(module_id)
    if not rules:
        return None, [], ""
    for driver, targets in rules:
        value = inputs.get(driver)
        if value:
            return driver, list(targets), str(value)
    value = inputs.get(KEY_MATERIAL)
    if value:
        by_driver = dict(rules)
        if KEY_MATERIAL in by_driver:
            return KEY_MATERIAL, list(by_driver[KEY_MATERIAL]), str(value)
        first = list(rules[0][1])
        return KEY_MATERIAL, first if KEY_CONNECTOR_MATERIAL in first else [*first, KEY_CONNECTOR_MATERIAL], str(value)
    return None, [], ""


def _apply_material_sync(out: Dict[str, Any], module_id: str) -> Tuple[Dict[str, List[str]], str]:
    """Mutates out; returns (copied_from_dock, grade) for metadata."""
    driver_key, targets, grade = _resolve_driver_and_targets(module_id, out)
    copied: Dict[str, List[str]] = {}
    if driver_key and targets and grade:
        for t in targets:
            out[t] = grade
        copied[driver_key] = list(targets)
    return copied, grade


def _core_defaults(module_id: str, inputs: Dict[str, Any], grade: str) -> Dict[str, Any]:
    """What ``get_values_for_design_pref`` answers for the keys the sync defaults."""
    if module_id in NO_CORE_DEFAULTS or module_id not in CORE_CLASSES:
        return {}
    material = grade or inputs.get(KEY_CONNECTOR_MATERIAL) or inputs.get(KEY_MATERIAL) or inputs.get(KEY_SEC_MATERIAL)
    if not material or material == "Select Material":
        material = _FALLBACK_GRADE
    dock = {
        **inputs,
        KEY_MATERIAL: material,
        KEY_ST_KEY_MATERIAL: material,
        KEY_DIA_ANCHOR_OCF: [20],
        KEY_DIA_ANCHOR_ICF: [20],
    }
    instance = design_dictionary.core_instance(module_id)
    defaults = {}
    for key in SYNC_DEFAULT_KEYS:
        value = design_dictionary.computed_value(module_id, key, dock, instance)
        if value is not None:
            defaults[key] = value.strip() if isinstance(value, str) else value
    return defaults


def merge_design_pref_sync(
    module_id: str,
    inputs: Dict[str, Any],
    operation: str,
    design_pref_draft: Optional[Dict[str, Any]] = None,
    material_model=None,
    beams_model=None,
    columns_model=None,
    angles_model=None,
    channels_model=None,
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, List[Dict[str, Any]]], Dict[str, Dict[str, Any]]]:
    """
    ``inputs`` and ``design_pref_draft`` are core-keyed. Returns
    (resolved_inputs, metadata, material_details_by_role, section_details_by_role).
    """
    if module_id not in CORE_CLASSES:
        raise KeyError(f"unknown module id {module_id!r}")
    if operation not in VALID_OPERATIONS:
        operation = "open"

    out = deepcopy(inputs) if inputs else {}
    copied: Dict[str, List[str]] = {}
    defaulted_keys: List[str] = []
    overridden_keys: List[str] = []
    grade = ""
    _driver_key, linked_targets, _driver_grade = _resolve_driver_and_targets(module_id, out)

    if operation == "save":
        # Draft carries explicit user choices; merge them and preserve.
        if design_pref_draft:
            out.update(design_pref_draft)
        _, _, grade = _resolve_driver_and_targets(module_id, out)
    elif operation == "open":
        # Preserve saved pref overrides: do NOT force-sync targets from the driver.
        # Only resolve the driver so material_details are populated correctly.
        _driver_key, linked_targets, grade = _resolve_driver_and_targets(module_id, out)
        if grade and linked_targets:
            copied_targets = []
            for t in linked_targets:
                if t not in out:
                    out[t] = grade
                    copied_targets.append(t)
            if copied_targets and _driver_key:
                copied[_driver_key] = copied_targets
        if design_pref_draft:
            out.update(design_pref_draft)

        # Populate defaults for missing keys
        for k, v in _core_defaults(module_id, out, grade).items():
            if k not in out:
                out[k] = v
                if k not in defaulted_keys:
                    defaulted_keys.append(k)
    elif operation == "reset":
        # reset: dock driver wins, targets are updated, and design prefs are reset to defaults
        copied, grade = _apply_material_sync(out, module_id)
        for k, v in _core_defaults(module_id, out, grade).items():
            out[k] = v
            if k not in defaulted_keys:
                defaulted_keys.append(k)
    else:
        # refresh: dock driver wins and propagates to all targets.
        copied, grade = _apply_material_sync(out, module_id)

    material_details = {"connector": [], "supported": [], "supporting": []}
    if material_model is not None:
        member_role = MEMBER_MATERIAL_TAB.get(module_id)
        for role, key in MATERIAL_ROLE_KEYS.items():
            # The section tab that holds Member.Material shows that material's properties.
            shown = (out.get(KEY_SEC_MATERIAL) if role == member_role else None) or out.get(key) or grade
            material_details[role] = _material_row_for_grade(material_model, str(shown or ""))
    section_details = _resolve_section_details(
        module_id=module_id,
        inputs=out,
        beams_model=beams_model,
        columns_model=columns_model,
        angles_model=angles_model,
        channels_model=channels_model,
    )

    metadata = {
        "copied_from_input_dock_keys": copied,
        "linked_input_dock_keys": [k for k in copied.keys()] if copied else ([_driver_key] if _driver_key else []),
        "linked_pref_keys": list(linked_targets),
        "defaulted_keys": defaulted_keys,
        "overridden_keys": overridden_keys,
        "operation": operation,
        "module_id": module_id,
    }
    return out, metadata, material_details, section_details


def unchanged(module_id: str, inputs: Optional[Dict[str, Any]], operation: str):
    """
    The answer for a module the core has no tables for (Purlin, still under development): its
    inputs as sent, nothing linked or defaulted. Same shape as ``merge_design_pref_sync``.
    """
    metadata = {
        "copied_from_input_dock_keys": {},
        "linked_input_dock_keys": [],
        "linked_pref_keys": [],
        "defaulted_keys": [],
        "overridden_keys": [],
        "operation": operation if operation in VALID_OPERATIONS else "open",
        "module_id": module_id,
    }
    return (
        deepcopy(inputs) if inputs else {},
        metadata,
        {"connector": [], "supported": [], "supporting": []},
        {role: {} for role in _SECTION_ROLES},
    )


def build_design_pref_defaults(
    module_id: str,
    inputs: Dict[str, Any],
    material_model=None,
    beams_model=None,
    columns_model=None,
    angles_model=None,
    channels_model=None,
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, List[Dict[str, Any]]], Dict[str, Dict[str, Any]]]:
    """
    Defaults for Additional Inputs using the current dock driver values.
    Shape mirrors the sync merge response to keep frontend handling consistent.
    """
    return merge_design_pref_sync(
        module_id=module_id,
        inputs=inputs,
        operation="reset",
        design_pref_draft=None,
        material_model=material_model,
        beams_model=beams_model,
        columns_model=columns_model,
        angles_model=angles_model,
        channels_model=channels_model,
    )


def list_registered_module_ids() -> List[str]:
    return sorted(CORE_CLASSES)
