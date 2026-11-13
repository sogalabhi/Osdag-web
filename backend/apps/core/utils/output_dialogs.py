"""
The detail dialogs that open from the output dock buttons, ported from the desktop app.

The desktop app (`output_dock.py`, `output_button_connect`) opens one of many drawing dialogs for
a button, or, when none applies, a plain list of the popup rows (`SpacingDialog`). `dialog_for`
makes the same choice from the same conditions (module name, button key and title, connectivity)
and returns what the dialog reads from the solved module:

    {"id": "fin_plate_capacity",
     "note": "Representative image for Failure Pattern (Half Plate)",   # or None
     "footnote": None,                                                  # or "(All Dimensions are in mm)"
     "sections": [{"title": "...", "fields": [{"label": "...", "value": "..."}]}],
     "values": {...}}                                                   # what the drawing needs

`sections` is the dialog's left panel. `values` are the numbers and strings the drawing reads,
named after the props of the web drawing (`frontend/.../shared/components/diagrams`), so the
frontend passes them on as they are. A button the desktop sends to `SpacingDialog` gets no dialog,
and neither does a button whose dialog cannot be built from this module (logged); the popup rows
stand in for both.

The "Header Plate Connection" is the desktop's End Plate module under another name. Its capacity
popups list other fields than the desktop dialog reads, so only its spacing opens a dialog.
"""
import logging
import re

from osdag_core import Common as C

logger = logging.getLogger(__name__)

BEAM_BEAM = "Beam-Beam"
SECTION_CAPACITY_KEY = "button_section_capacity"


# ---------------------------------------------------------------- small helpers


def _num(value, default=None):
    """`value` as a float; `default` when it is not a number."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _json_safe(value):
    """Plain JSON types: numpy numbers become numbers, tuples become lists."""
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, (bool, int, float, str)) or value is None:
        return value
    return str(value)


def _dialog(dialog_id, values, sections=None, note=None, footnote=None):
    return {
        "id": dialog_id,
        "note": note,
        "footnote": footnote,
        "sections": sections or [],
        "values": values,
    }


def _section(title, pairs):
    return {"title": title, "fields": [{"label": str(k), "value": str(v)} for k, v in pairs]}


def _text_rows(function):
    """`{label: value}` for the text boxes of a popup function, called as the desktop does."""
    return {row[1]: row[3] for row in function(True) if len(row) > 3 and row[2] == C.TYPE_TEXTBOX and row[1]}


def _output_dict(module):
    return {row[0]: row[3] for row in module.output_values(True)}


def _gauge(params):
    """A single gauge, or the pair of alternating gauges."""
    if "gauge" in params:
        return params["gauge"]
    return [params.get("gauge1", 0), params.get("gauge2", params.get("gauge1", 0))]


def _spacing_params(rows):
    """Pitch, end, gauge and edge from a `spacing(True)` list, keyed as the desktop dialogs do."""
    names = {
        C.KEY_OUT_PITCH: "pitch",
        C.KEY_OUT_END_DIST: "end",
        C.KEY_OUT_GAUGE1: "gauge1",
        C.KEY_OUT_GAUGE2: "gauge2",
        C.KEY_OUT_GAUGE: "gauge",
        C.KEY_OUT_EDGE_DIST: "edge",
        "Member.Depth": "Member.Depth",
    }
    params = {}
    for row in rows:
        if row[0] in names:
            params[names[row[0]]] = float(row[3])
    return params


def _leg_sizes(designation):
    """The numbers of an angle designation such as `75 x 50 x 8`: leg, leg, thickness."""
    numbers = [float(n) for n in re.findall(r"\d+(?:\.\d+)?", str(designation))]
    if len(numbers) < 3:
        raise ValueError(f"Angle designation {designation!r} has no legs and thickness")
    return numbers


# ---------------------------------------------------------------- bolt pattern (fin plate, strut, lap joint)


def _member_height(designation):
    """The first number of a designation such as `ISA 60 x 60 x 6`, as the desktop reads it."""
    text = str(designation)
    parts = text.split("x") if "x" in text else text.split("X")
    try:
        return float(parts[0].strip().split()[-1])
    except (ValueError, IndexError):
        return None


def _bolt_pattern(module, rows, cols):
    """`BoltPatternGenerator`: the plate with its bolts and the spacing numbers."""
    outputs = _output_dict(module)
    name = module.module_name()
    is_strut = name == C.KEY_DISP_STRUT_BOLTED_END_GUSSET
    is_lap = name == C.KEY_DISP_LAPJOINTBOLTED
    rows = int(rows) if rows else int(module.plate.bolts_one_line)
    cols = int(cols) if cols else int(module.plate.bolt_line)
    hole = float(module.bolt.bolt_diameter_provided)
    width = float(module.plate.length)
    height = float(module.plate.height)

    params = _spacing_params(module.spacing(status=True))
    if is_strut:
        # The strut's pitch and gauge, end and edge are drawn the other way round.
        params["pitch"], params["gauge"] = params["gauge"], params["pitch"]
        params["end"], params["edge"] = params["edge"], params["end"]
    params["hole"] = hole

    if is_strut or is_lap:
        member = _member_height(outputs.get("section_size.designation", "")) if "section_size.designation" in outputs else None
        if is_strut and member is not None:
            height = member
        elif "Member.Depth" in params:
            height = params["Member.Depth"]
        # The bolts run along the plate: `end` and `pitch` are across the drawing.
        drawing = {"end": params["edge"], "pitch": params.get("gauge1", params.get("gauge", 0)),
                   "gauge": params["pitch"], "edge": params["end"]}
        origin = "left"
    else:
        drawing = {"end": params["end"], "pitch": params["pitch"], "gauge": _gauge(params),
                   "edge": params["edge"]}
        origin = "right"

    values = {
        "plateWidth": width,
        "plateHeight": height,
        "rows": rows,
        "cols": cols,
        "holeDiameter": hole,
        "weldSize": 0 if is_strut or is_lap else (_num(outputs.get("Weld.Size"), 0)),
        "origin": origin,
        **drawing,
    }
    fields = [(f"{key.title()} Distance :", f"{float(value):.2f}") for key, value in params.items()]
    return _dialog("bolt_pattern", values, [_section(None, fields)], footnote="(All Dimensions are in mm)")


# ---------------------------------------------------------------- fin plate capacity


_PLATE_SHEAR = ("Shear Yielding Capacity (kN)", "Rupture Capacity (kN)", "Block Shear Capacity (kN)")
_PLATE_TENSION = ("Tension Yielding Capacity (kN)", "Tension Rupture Capacity (kN)", "Axial Block Shear Capacity (kN)")


def _fin_plate_capacity(module, function, section, show_third=False):
    """`FinPlateCapacityDetails` and `SectionCapacityDetails`: failure patterns of the plate or section."""
    outputs = _output_dict(module)
    labels = _text_rows(function)
    params = _spacing_params(module.spacing(status=True))
    values = {
        "plateWidth": float(module.plate.length),
        "plateHeight": float(module.plate.height),
        "rows": int(module.plate.bolts_one_line),
        "cols": int(module.plate.bolt_line),
        "holeDiameter": float(module.bolt.bolt_diameter_provided),
        "weldSize": _num(outputs.get("Weld.Size"), 0),
        "end": params["end"],
        "pitch": params["pitch"],
        "gauge": _gauge(params),
        "edge": params["edge"],
        "showThird": bool(show_third),
        "section": bool(section),
    }
    sections = [
        _section("Failure Pattern due to Shear in Plate", [(k, float(labels[k])) for k in _PLATE_SHEAR]),
        _section("Failure Pattern due to Tension in Plate", [(k, float(labels[k])) for k in _PLATE_TENSION]),
    ]
    return _dialog(
        "fin_plate_section_capacity" if section else "fin_plate_capacity",
        values, sections, note="Representative image for Failure Pattern (Half Plate)",
    )


# ---------------------------------------------------------------- end plate (header plate spacing)


def _end_plate_spacing(module):
    """`EndPlateDetails`: the plate with a gap in the weld for the web."""
    outputs = _output_dict(module)
    params = _spacing_params(module.spacing(status=True))
    params["hole"] = module.bolt.bolt_diameter_provided
    values = {
        "plateWidth": _num(outputs["Plate.Length"]),
        "plateHeight": _num(outputs["Plate.Height"]),
        "rows": int(outputs["Bolt.Rows"]),
        "cols": int(module.plate.bolt_line),
        "holeDiameter": float(outputs["Bolt.Diameter"]),
        "weldSize": _num(outputs.get("Weld.Size"), 0),
        "weldGap": float(module.supported_section.web_thickness),
        "end": params["end"],
        "pitch": params["pitch"],
        "gauge": _gauge(params),
        "edge": params["edge"],
    }
    fields = [(f"{key.title()} Distance (mm):", value) for key, value in params.items()]
    return _dialog("end_plate_spacing", values, [_section(None, fields)])


# ---------------------------------------------------------------- cleat angle


def _cleat_params(module, flag):
    """The numbers `CleatAngleDetails` and its subclasses read for the supported (0) or supporting (1) leg."""
    outputs = {f"{row[1]} + {row[0]}": row[3] for row in module.output_values(True)}
    designation = outputs["Cleat Angle Designation + Cleat.Angle"]
    legs = _leg_sizes(designation)
    suffix = "" if flag == 0 else "Cleat.Spting_leg."

    def count(*names):
        for name in names:
            if name in outputs:
                return int(outputs[name])
        return 0

    key_rows, key_cols = ("Bolt.OneLine", "Bolt.Line") if flag == 0 else ("Cleat.Spting_leg.OneLine", "Cleat.Spting_leg.Line")
    params = {
        "width": int(outputs["Height (mm) + Plate.Height"]),
        "hole": int(outputs["Diameter (mm) + Bolt.Diameter"]),
        "length": legs[0] if flag == 0 else legs[1],
        "rows": count(f"Bolt Rows (nos) + {key_rows}", f"Bolt Rows (no) + {key_rows}"),
        "cols": count(f"Bolt Columns (nos) + {key_cols}", f"Bolt Columns (no) + {key_cols}"),
    }
    spacing = module.spacing(True) if flag == 0 else module.spting_spacing(True)
    for row in spacing:
        if not isinstance(row[0], str):
            continue
        key = row[0].lower()
        if "pitch" in key:
            params["pitch"] = row[3]
        elif "gauge1" in key:
            params["gauge1"] = row[3]
        elif "gauge2" in key:
            params["gauge2"] = row[3]
        elif "end" in key:
            params["end"] = row[3]
        elif "edge" in key:
            params["edge"] = row[3]
    return params, designation, legs[-1], suffix


def _cleat_values(module, flag):
    params, designation, thickness, _ = _cleat_params(module, flag)
    return params, {
        "leg": "supported" if flag == 0 else "supporting",
        "plateHeight": params["width"],
        "boltRows": params["rows"],
        "boltCols": params["cols"],
        "holeDiameter": params["hole"],
        "end": params["end"],
        "pitch": params["pitch"],
        "edge": params["edge"],
        "gauge1": params.get("gauge1", 0),
        "gauge2": params.get("gauge2", 0),
        "angleDesignation": designation,
        "angleThickness": thickness,
        "legLength": params["length"],
    }


def _cleat_spacing(module, flag):
    """`CleatAngleDetails`: the bolts on the leg of the cleat."""
    params, values = _cleat_values(module, flag)
    shown = [(f"{key.title()} Distance (mm):", f"{float(v):.2f}") for key, v in params.items()
             if key not in ("cols", "rows", "hole", "length", "width")]
    return _dialog("cleat_angle_spacing", values, [_section(None, shown)], footnote="(All Dimensions are in mm)")


def _cleat_capacity(module, flag):
    """`CleatAngleCapacityDetails`: the bolt capacity on the leg of the cleat."""
    params, values = _cleat_values(module, flag)
    rows = module.bolt_capacity_supported(True) if flag == 0 else module.bolt_capacity_supporting(True)
    found = {row[1]: row[3] for row in rows if row[1] is not None}
    capacities = [(label, found.get(label, "N/A")) for label in
                  ("Shear Capacity (kN)", "Bearing Capacity (kN)", "Bolt Value (kN)")]
    sections = [
        _section("Failure Pattern due to Shear", capacities),
        _section("Failure Pattern due to Tension", capacities),
    ]
    return _dialog("cleat_angle_capacity", values, sections, note="Representative image for Failure Pattern")


def _cleat_section(module, design_inputs):
    """`CleatAngleSectionDetails`: the section of the supporting member, with block shear for beam to beam."""
    params, values = _cleat_values(module, 1)
    values["connectivity"] = (design_inputs or {}).get(C.KEY_CONN, "")
    values["showThird"] = values["connectivity"] == BEAM_BEAM
    data = module.section_capacity_details(True)

    def cell(index):
        return data[index][3] if len(data) > index else "N/A"

    sections = [
        _section("Failure Pattern due to Shear in Supported Section",
                 [("Shear Yielding Capacity (kN)", cell(0)), ("Block Shear Capacity (kN)", cell(1))]),
        _section("Failure Pattern due to Tension in Supporting Section",
                 [("Moment Demand (kNm)", cell(2)), ("Moment Capacity (kNm)", cell(3))]),
    ]
    return _dialog("cleat_angle_section", values, sections, note="Representative image for Failure Pattern")


# ---------------------------------------------------------------- seated angle


def _seated_spacing(module, which):
    """`SeatedAngleDetails`: 1 top angle on the column, 2 top angle on the beam, 3 seat on the column, 4 seat on the beam."""
    seat = which in (3, 4)
    angle = module.seated_angle if seat else module.top_angle
    lists = [module.top_spacing_col(True), module.top_spacing_beam(True),
             module.seated_spacing_col(True), module.seated_spacing_beam(True)]
    data = {row[0]: row[3] for row in lists[which - 1] if row[0]}
    gauge = data["Bolt.Gauge"]
    if gauge == 0 and "Bolt.GaugeCentral" in data:
        gauge = data["Bolt.GaugeCentral"]
    hole = module.bolt.bolt_diameter_provided
    values = {
        "plateWidth": float(angle.width),
        "plateHeight": float(angle.leg_a_length),
        "rows": int(data["Bolt.Rows"]),
        "cols": int(data["Bolt.Cols"]),
        "holeDiameter": float(hole),
        "end": data["Bolt.EndDist"],
        "gauge": gauge,
        "edge": data["Bolt.EdgeDist"],
        "pitch": data.get("Bolt.Pitch", 0),
        "angleDesignation": str(angle.designation),
        "thicknessBand": "top" if which in (2, 4) else "bottom",
    }
    shown = [("End Distance (mm):", data["Bolt.EndDist"]), ("Gauge Distance (mm):", gauge),
             ("Edge Distance (mm):", data["Bolt.EdgeDist"]), ("Hole Distance (mm):", hole)]
    return _dialog("seated_angle_spacing", values, [_section(None, shown)])


def _seated_values(module):
    """`SeatedAngleCapacityDetails._get_spacing_values` and the plate size."""
    bolt = module.bolt
    rows = max(1, int(getattr(bolt, "bolt_row", 1) or 1))
    cols = max(1, int(getattr(bolt, "bolt_col", 1) or 1))
    central = _num(getattr(bolt, "seated_angle_gauge_column", 0.0), 0.0)
    side = _num(getattr(bolt, "min_gauge_round", 0.0), 0.0)
    return {
        "plateWidth": float(module.seated_angle.width),
        "plateHeight": float(module.seated_angle.leg_a_length),
        "holeDiameter": float(bolt.bolt_diameter_provided),
        "rows": rows,
        "cols": cols,
        "end": _num(getattr(bolt, "seated_angle_end_column", 0.0), 0.0),
        "edge": _num(getattr(bolt, "seated_angle_edge_column", 0.0), 0.0),
        "pitch": _num(getattr(bolt, "min_pitch_round", 0.0), 0.0) if rows > 1 else 0.0,
        "gauge": central if central > 0 else side,
    }


def _rounded(value):
    number = _num(value)
    return round(number, 3) if number is not None else "N/A"


def _seated_capacity(module):
    """`SeatedAngleCapacityDetails`: shear and moment in the seat angle."""
    outputs = _output_dict(module)
    found = {row[1]: row[3] for row in outputs[C.KEY_OUT_PLATE_CAPACITIES][1](True) if len(row) > 3}
    sections = [
        _section("Failure Pattern due to Shear in Plate", [
            ("Shear Yielding Capacity (kN)", _rounded(found.get(C.KEY_OUT_DISP_PLATE_SHEAR))),
            ("Shear Demand (kN)", _rounded(found.get(C.KEY_OUT_DISP_PLATE_SHEAR_DEMAND))),
        ]),
        _section("Failure Pattern due to Moment in Plate", [
            ("Moment Demand (kNm)", _rounded(found.get(C.KEY_OUT_DISP_PLATE_MOM_DEMAND))),
            ("Moment Capacity (kNm)", _rounded(found.get(C.KEY_OUT_DISP_PLATE_MOM_CAPACITY))),
        ]),
    ]
    return _dialog("seated_angle_capacity", _seated_values(module), sections,
                   note="Representative image for\nFailure Pattern")


def _seated_section(module):
    """`SeatedAngleSectionDetails`: shear in the supported and tension in the supporting section."""
    outputs = _output_dict(module)
    found = {row[1]: row[3] for row in outputs[SECTION_CAPACITY_KEY][1](True) if len(row) > 3}

    def get(label):
        return found.get(label, "N/A")

    sections = [
        _section("Failure Pattern due to Shear in Supported Section", [
            ("Supported Section Shear Yielding Capacity (kN)", get("Supported Section Shear Yielding Capacity (kN)")),
            ("Supported Section Allowable Shear Capacity (kN)", get("Supported Section Allowable Shear Capacity (kN)")),
        ]),
        _section("Failure Pattern due to Tension in Supporting Section", [
            ("Supporting Section Tension Yielding Capacity (kN)", get("Supporting Section Tension Yielding Capacity (kN)")),
        ]),
    ]
    return _dialog("seated_angle_section", _seated_values(module), sections,
                   note="Representative image for\nFailure Pattern")


# ---------------------------------------------------------------- base plate


def _base_plate_values(module, outputs):
    """What `BasePlateDetails` and `BasePlateHollowDetails` read; `outputs` is keyed `label + key`."""
    return {
        "plateLength": _num(outputs["Length (mm) + Baseplate.Length"]),
        "plateWidth": _num(outputs["Width (mm) + Baseplate.Width"]),
        "plateThickness": _num(module.plate_thk_provided),
        "columnDepth": _num(module.column_D),
        "columnWidth": _num(module.column_bf),
        "columnTf": _num(module.column_tf),
        "columnTw": _num(module.column_tw),
        "noOcfBolts": outputs["No. of Anchors + Anchor Bolt.No of Anchor Bolts"],
        "diaOcfBolt": outputs["Diameter (mm) + Anchor Bolt.Diameter"],
        "noIcfBolts": outputs["No. of Anchors + Anchor Bolt.No of Anchor Bolts_Uplift"],
        "diaIcfBolt": outputs["Diameter (mm) + Anchor Bolt.Diameter_Uplift"],
        "endOcf": outputs["End Distance (mm) + Detailing.EndDistanceOut"],
        "edgeOcf": outputs["Edge Distance (mm) + Detailing.EdgeDistanceOut"],
        "pitchOcf": outputs["Pitch Distance (mm) + Detailing.PitchDistanceOut"],
        "gaugeOcf": outputs["Gauge Distance (mm) + Detailing.GaugeDistanceOut"],
        "endIcf": outputs["End Distance (mm) + Detailing.EndDistanceIn"],
        "edgeIcf": outputs["Edge Distance (mm) + Detailing.EdgeDistanceIn"],
        "pitchIcf": outputs["Pitch Distance (mm) + Detailing.PitchDistanceIn"],
        "gaugeIcf": outputs["Gauge Distance (mm) + Detailing.GaugeDistanceIn"],
        "memberDesignation": str(module.column_section),
    }


def _base_plate(module):
    """`BasePlateDetails`: the plate, column, anchor bolts and the stiffeners of an I-section column."""
    outputs = {f"{row[1]} + {row[0]}": row[3] for row in module.output_values(True)}
    values = _base_plate_values(module, outputs)
    across = module.stiffener_across_web_details(True)
    along = module.stiffener_along_web_details(True)
    flange = module.stiffener_flange_details(True)
    values.update({
        "stiffAcrossLength": across[0][3], "stiffAcrossThickness": across[2][3],
        "stiffAlongLength": along[0][3], "stiffAlongThickness": along[2][3],
        "stiffFlangeLength": flange[0][3], "stiffFlangeThickness": flange[2][3],
    })
    return _dialog("base_plate", values)


def _base_plate_hollow(module):
    """`BasePlateHollowDetails`: the plate, hollow column, anchor bolts and the stiffeners."""
    outputs = {f"{row[1]} + {row[0]}": row[3] for row in module.output_values(True)}
    values = _base_plate_values(module, outputs)
    stiff = module.stiffener_hollow_details(True)
    values.update({
        "stiffDLength": stiff[1][3], "stiffDThickness": stiff[3][3],
        "stiffBLength": stiff[9][3], "stiffBThickness": stiff[11][3],
        "stiffODLength": stiff[17][3], "stiffODThickness": stiff[19][3],
    })
    return _dialog("base_plate_hollow", values)


# ---------------------------------------------------------------- end plate splice and beam to column end plate


def _end_plate_detail_values(module):
    """What `B2CEndPlateDetails` and `B2BEndPlateSketch` read from the module and its output list."""
    detail = {row[1]: row[3] for row in module.output_values(True)}
    cross = detail["Cross-centre Gauge (mm)"]
    gauge = detail["Gauge Distance (mm)"]
    return detail, {
        "endplateType": str(module.endplate_type),
        "webThickness": _num(module.beam_tw),
        "flangeThickness": _num(module.beam_tf),
        "middleBolts": module.bolt_row_web,
        "stiffenerThickness": _num(module.stiffener_thickness),
        "rowsInsideDMax": module.rows_inside_D_max,
        "rowsOutsideDMax": module.rows_outside_D_max,
        "rows": int(detail["No. of Rows"]),
        "cols": int(detail["No. of Columns"]),
        "pitch": detail["Pitch Distance (mm)"],
        "crossGauge": cross,
        "gauge": float(gauge) if str(gauge).isdigit() else cross,
        "end": detail["End Distance (mm)"],
        "edge": detail["Edge Distance (mm)"],
        "plateHeight": detail["Height (mm)"],
        "plateWidth": detail["Width (mm)"],
        "holeDia": detail["Diameter (mm)"],
    }


def _adjusted_edge(values):
    """The edge distance with the bolt group centred on the plate, as `createDrawingFlushedReversible` works it out."""
    span = 2 * float(values["edge"]) + float(values["crossGauge"])
    span += 2 * float(values["gauge"]) * ((int(values["cols"]) - 2) // 2)
    edge = float(values["edge"])
    if span <= float(values["plateWidth"]):
        edge += (float(values["plateWidth"]) - span) / 2
    return edge


def _b2c_end_plate(module):
    """`B2CEndPlateDetails`: the end plate with its bolts, seen from the column."""
    detail, values = _end_plate_detail_values(module)
    values["stiffenerLength"] = _num(module.stiffener_length)
    labels = ("No. of Rows", "No. of Columns", "Pitch Distance (mm)", "Gauge Distance (mm)",
              "Cross-centre Gauge (mm)", "End Distance (mm)", "Edge Distance (mm)", "Height (mm)",
              "Width (mm)", "Diameter (mm)")
    shown = [(label, detail[label]) for label in labels if label in detail]
    # The desktop works the adjusted edge out only for the flushed plate.
    if values["endplateType"].startswith("Flushed"):
        shown.append(("Adjusted Edge Distance", f"{_adjusted_edge(values):.2f} mm"))
    return _dialog("b2c_end_plate", values, [_section(None, shown)])


def _b2b_end_plate_sketch(module):
    """`B2BEndPlateSketch`: the end plate between two beams, seen from the side."""
    detail, values = _end_plate_detail_values(module)
    values.update({
        "stiffenerHeight": _num(module.stiffener_height),
        "stiffenerWidth": _num(module.stiffener_length),
        "beamDepth": _num(module.beam_D),
        "plateThickness": detail["Thickness (mm)"],
    })
    return _dialog("b2b_end_plate_sketch", values)


# ---------------------------------------------------------------- cover plates


def _cover_plate_spacing(module, is_web):
    """`B2BCoverPlateDetails`: bolts on the web or flange cover plate."""
    outputs = _output_dict(module)
    if is_web:
        length, width = outputs["Web_Plate.Height (mm)"], outputs["Web_Plate.Width"]
        spacing = outputs["Web_plate.spacing"][1](True)
        bolts = outputs["Web Bolt.Capacities"][1](True)
    else:
        length, width = outputs["Flange_Plate.Width (mm)"], outputs["flange_plate.Length"]
        spacing = outputs["Flange_plate.spacing"][1](True)
        bolts = outputs["Bolt.Capacities"][1](True)
    cols = bolts[1][3]
    rows = bolts[2][3] / cols
    pitch, end, gauge, edge = spacing[2][3], spacing[3][3], spacing[4][3], spacing[5][3]
    hole = outputs["Bolt.Diameter"]
    values = {
        "plateWidth": _num(length),
        "plateHeight": _num(width),
        "rows": int(rows),
        "cols": int(cols),
        "holeDiameter": float(hole),
        "end": end,
        "pitch": pitch,
        "gauge": gauge,
        "edge": edge,
        "isWeb": bool(is_web),
    }
    shown = [("Plate Length (mm):", length), ("Plate Width (mm):", width), ("Bolt Diameter (mm):", hole),
             ("Pitch Distance (mm):", pitch), ("End Distance (mm):", end), ("Gauge Distance (mm):", gauge),
             ("Edge Distance (mm):", edge), ("Number of Columns (mm):", cols), ("Number of Rows (mm):", rows)]
    return _dialog("cover_plate_spacing", values, [_section(None, shown)])


def _cover_plate_weld(module, is_web):
    """`B2BCoverPlateWeldedDetails`: the web or flange cover plate with its weld."""
    outputs = _output_dict(module)
    if is_web:
        plate, weld = module.web_plate, module.web_weld
        thickness = outputs["Connector.Web_Plate.Thickness_List"]
    else:
        plate, weld = module.flange_plate, module.flange_weld
        thickness = outputs["Connector.Flange_Plate.Thickness_list"]
    values = {
        "plateWidth": float(plate.height),
        "plateHeight": float(plate.length),
        "plateThickness": float(thickness),
        "weldSize": float(weld.size),
        "weldGap": float(plate.gap),
        "isWebPlate": bool(is_web),
    }
    shown = [("Plate Length:", plate.height), ("Plate Width:", plate.length)]
    return _dialog("cover_plate_weld", values, [_section(None, shown)])


def _fracture(module, function, dialog_id, plate, orientation, variant):
    """The four plate fracture dialogs: the failure patterns on a web or flange cover plate."""
    rows = [(str(row[1]), str(row[3]) if row[3] != "" else "—")
            for row in function(True) if len(row) >= 4 and row[2] == C.TYPE_TEXTBOX and row[1]]
    values = {
        "rows": int(plate.bolts_one_line),
        "cols": int(plate.bolt_line),
        "orientation": orientation,
        "variant": variant,
    }
    return _dialog(dialog_id, values, [_section(None, rows)])


# ---------------------------------------------------------------- column end plate


def _c2c_end_plate(module, flag):
    """`C2CEndPlateDetails`: the bolts along the web (0) or the flange (1) of a column end plate."""
    outputs = _output_dict(module)
    web = {row[1]: row[3] for row in outputs[C.KEY_BOLT_WEB_SPACING][1](True)}
    flange = {row[0]: row[3] for row in outputs[C.KEY_BOLT_FLANGE_SPACING][1](True)}
    pitches = [web.get(name, 0) for name in ("Pitch 1-2", "Pitch 2-3", "Pitch 3-4", "Pitch 4-5")]
    plate_width = outputs["Plate.Height"]
    plate_length = outputs["Plate.Length"]
    values = {
        "view": "web" if flag == 0 else "flange",
        "plateLength": _num(plate_length),
        "plateHeight": _num(plate_width),
        "stiffenerWidth": _num(outputs["Stiffener.Width"]),
        "stiffenerThickness": _num(outputs["Stiffener.Thickness"]),
        "webThickness": _num(module.section.web_thickness),
        "flangeThickness": _num(module.section.flange_thickness),
        "holeDia": _num(outputs["Bolt.Diameter"]),
        "pitches": pitches,
        "numBoltsWeb": web["No. of Bolts (along web)"],
        "webEnd": web["End Distance (mm)"],
        "flangeEnd": flange.get("Bolt.EndDist", 0),
        "boltsOneSide": flange.get("ColumnEndPlate.nbf", 0),
        "nbfTotal": flange.get("ColumnEndPlate.nbftotal", 0),
        "flangePitch": flange.get("ColumnEndPlate.p2_flange", 0),
    }
    shown = [("Plate Length:", plate_length), ("Plate Width:", plate_width)]
    return _dialog("c2c_end_plate", values, [_section(None, shown)])


# ---------------------------------------------------------------- choosing the dialog


def _is_beam_beam(design_inputs):
    return (design_inputs or {}).get(C.KEY_CONN, "") == BEAM_BEAM


def _cleat_choice(module, key, design_inputs):
    """Buttons of the cleat angle module that open a dialog, or None when the desktop shows the rows."""
    if key == C.KEY_OUT_SPACING:
        return lambda: _cleat_spacing(module, 0)
    if key == C.KEY_OUT_SPTING_SPACING:
        return lambda: _cleat_spacing(module, 1)
    if key == "button_capacity_sptd":
        return lambda: _cleat_capacity(module, 0)
    if key == "button_capacity_spting":
        return lambda: _cleat_capacity(module, 1)
    if key == SECTION_CAPACITY_KEY:
        return lambda: _cleat_section(module, design_inputs)
    return None


def _spacing_choice(module, name):
    """The dialog for the spacing buttons, by module; the desktop shows the rows for any other module."""
    if name == C.KEY_DISP_FINPLATE:
        plate, spting = module.plate, getattr(module, "spting_leg", None)
        if spting is not None and hasattr(spting, "bolt_line") and hasattr(spting, "bolts_one_line"):
            return lambda: _bolt_pattern(module, spting.bolt_line, spting.bolts_one_line)
        return lambda: _bolt_pattern(module, plate.bolts_one_line, plate.bolt_line)
    if name == C.KEY_DISP_HEADERPLATE:
        return lambda: _end_plate_spacing(module)
    if name == C.KEY_DISP_STRUT_BOLTED_END_GUSSET:
        return lambda: _bolt_pattern(module, module.plate.bolt_line, module.plate.bolts_one_line)
    if name == C.KEY_DISP_LAPJOINTBOLTED:
        return lambda: _bolt_pattern(module, module.rows, module.cols)
    return None


def _choose(module, option, design_inputs):
    """A callable that builds the dialog for `option`, or None, following `output_button_connect`."""
    key, label, (title, function) = option[0], option[1], option[3]
    name = module.module_name()
    label = str(label).strip()

    if name == C.KEY_DISP_CLEATANGLE:
        if key in (C.KEY_OUT_BOLT_IR_DETAILS_SPTD, C.KEY_OUT_BOLT_IR_DETAILS_SPTING):
            return None
        choice = _cleat_choice(module, key, design_inputs)
        if choice is not None:
            return choice

    if key in (C.KEY_OUT_SPACING, C.KEY_OUT_SPTING_SPACING):
        return _spacing_choice(module, name)

    if key in ("button1", "button2") and title == C.KEY_OUT_DISP_BOLT_IR_DETAILS and name == C.KEY_DISP_FINPLATE:
        section = key == "button2"
        show_third = section and _is_beam_beam(design_inputs)
        return lambda: _fin_plate_capacity(module, function, section, show_third)

    if name == C.KEY_DISP_SEATED_ANGLE and key in (C.KEY_OUT_PLATE_CAPACITIES, SECTION_CAPACITY_KEY):
        return (lambda: _seated_section(module)) if key == SECTION_CAPACITY_KEY else (lambda: _seated_capacity(module))

    if key.startswith("SeatedAngle") or key.startswith("TopAngle"):
        which = {C.KEY_OUT_SEATED_ANGLE_BOLT_COL: 3, C.KEY_OUT_SEATED_ANGLE_BOLT_BEAM: 4,
                 C.KEY_OUT_TOP_ANGLE_BOLT_COL: 1}.get(key, 2)
        return lambda: _seated_spacing(module, which)

    if key == C.KEY_OUT_DISP_BP_DETAILING_SKETCH and label == C.KEY_OUT_DISP_BP_DETAILING:
        return lambda: _b2c_end_plate(module)

    if key == C.KEY_OUT_STIFFENER_SKETCH and name == C.KEY_DISP_BCENDPLATE:
        return lambda: _b2c_end_plate(module)

    if key == C.KEY_OUT_BP_TYPICAL_DETAILING:
        if module.connectivity in ("Moment Base Plate", "Welded Column Base"):
            return lambda: _base_plate(module)
        return lambda: _base_plate_hollow(module)

    if key in (C.KEY_WEB_SPACING, C.KEY_FLANGE_SPACING):
        return lambda: _cover_plate_spacing(module, key == C.KEY_WEB_SPACING)

    if name == C.KEY_DISP_BEAMCOVERPLATEWELD and key in (C.KEY_WEB_WELD_DETAILS, C.KEY_FLANGE_WELD_DETAILS):
        return lambda: _cover_plate_weld(module, key == C.KEY_WEB_WELD_DETAILS)

    if key == C.KEY_OUT_STIFFENER_SKETCH and label == C.KEY_OUT_DISP_STIFFENER_SKETCH:
        return lambda: _b2b_end_plate_sketch(module)

    if key in (C.KEY_BOLT_WEB_SPACING, C.KEY_BOLT_FLANGE_SPACING):
        return lambda: _c2c_end_plate(module, 0 if key == C.KEY_BOLT_WEB_SPACING else 1)

    if key in (C.KEY_WEB_CAPACITY, C.KEY_FLANGE_CAPACITY):
        web = key == C.KEY_WEB_CAPACITY
        if name == C.KEY_DISP_COLUMNCOVERPLATE:
            plate = module.web_plate if web else module.flange_plate
            return lambda: _fracture(module, function, "column_web_fracture" if web else "column_flange_fracture",
                                     plate, "portrait", "web" if web else "flange")
        if name == C.KEY_DISP_BEAMCOVERPLATE:
            plate = module.web_plate if web else module.flange_plate
            return lambda: _fracture(module, function, "beam_web_fracture" if web else "beam_flange_fracture",
                                     plate, "landscape", "web" if web else "flange")
    return None


def dialog_for(module, option, design_inputs):
    """The dialog the desktop opens for the output button `option`, or None when it shows only the rows."""
    key = option[0]
    try:
        build = _choose(module, option, design_inputs)
        if build is None:
            return None
        dialog = build()
    except Exception:
        logger.exception("Output button %s: its dialog could not be built", key)
        return None
    return _json_safe(dialog) if dialog is not None else None
