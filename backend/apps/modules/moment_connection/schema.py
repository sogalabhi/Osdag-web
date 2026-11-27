"""Design request keys that the moment connection submodules share."""
from typing import Annotated

from pydantic import AfterValidator, Field, StrictStr
from pydantic_core import PydanticCustomError

from apps.core.schemas import DesignInput, FloatStr, FloatStrList, IntStr, IntStrList, Text, YesNo
from osdag_core.Common import (
    KEY_AXIAL,
    KEY_CONNECTOR_MATERIAL,
    KEY_D,
    KEY_DP_BOLT_HOLE_TYPE,
    KEY_DP_BOLT_SLIP_FACTOR,
    KEY_DP_BOLT_TYPE,
    KEY_DP_DESIGN_METHOD,
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DETAILING_EDGE_TYPE,
    KEY_DP_DETAILING_GAP,
    KEY_DP_WELD_FAB,
    KEY_DP_WELD_MATERIAL_G_O,
    KEY_FLANGEPLATE_PREFERENCES,
    KEY_FLANGEPLATE_THICKNESS,
    KEY_GRD,
    KEY_MATERIAL,
    KEY_MODULE,
    KEY_MOMENT,
    KEY_PLATETHK,
    KEY_SEC_MATERIAL,
    KEY_SECSIZE,
    KEY_SHEAR,
    KEY_TYP,
    KEY_WEBPLATE_THICKNESS,
    KEY_WELD_TYPE,
)


def _not_negative(value):
    if float(value) < 0:
        raise PydanticCustomError("out_of_range", "should be non-negative")
    return value


# A numeric string that is not below zero.
NonNegativeFloatStr = Annotated[FloatStr, AfterValidator(_not_negative)]


class MomentConnectionInput(DesignInput):
    """Keys every moment connection carries."""

    module: Text = Field(alias=KEY_MODULE)
    material: Text = Field(alias=KEY_MATERIAL)
    connector_material: Text = Field(alias=KEY_CONNECTOR_MATERIAL)
    design_method: Text = Field(alias=KEY_DP_DESIGN_METHOD)


class BoltedMomentConnectionInput(MomentConnectionInput):
    """Bolt, detailing and load keys of the bolted moment connections."""

    bolt_hole_type: Text = Field(alias=KEY_DP_BOLT_HOLE_TYPE)
    bolt_diameter: IntStrList = Field(alias=KEY_D)
    bolt_grade: FloatStrList = Field(alias=KEY_GRD)
    bolt_slip_factor: FloatStr = Field(alias=KEY_DP_BOLT_SLIP_FACTOR)
    bolt_tension_type: Text = Field(alias=KEY_DP_BOLT_TYPE)
    bolt_type: Text = Field(alias=KEY_TYP)
    corrosive_influences: YesNo = Field(alias=KEY_DP_DETAILING_CORROSIVE_INFLUENCES)
    edge_type: Text = Field(alias=KEY_DP_DETAILING_EDGE_TYPE)
    detailing_gap: IntStr = Field(alias=KEY_DP_DETAILING_GAP)
    axial_load: IntStr = Field(alias=KEY_AXIAL)
    moment_load: IntStr = Field(alias=KEY_MOMENT)
    shear_load: IntStr = Field(alias=KEY_SHEAR)


class EndPlateInput(BoltedMomentConnectionInput):
    """Keys of the end plate connections. The weld fabrication and grade are checked when sent."""

    weld_type: Text = Field(alias=KEY_WELD_TYPE)
    plate_thickness: IntStrList = Field(alias=KEY_PLATETHK)
    weld_fabrication: StrictStr = Field(default=None, alias=KEY_DP_WELD_FAB)
    weld_material_grade_overwrite: IntStr = Field(default=None, alias=KEY_DP_WELD_MATERIAL_G_O)


class CoverPlateBoltedInput(BoltedMomentConnectionInput):
    """Keys of the beam and column cover plate bolted connections."""

    section: Text = Field(alias=KEY_SECSIZE)
    section_material: Text = Field(alias=KEY_SEC_MATERIAL)
    flange_plate_preferences: Text = Field(alias=KEY_FLANGEPLATE_PREFERENCES)
    flange_plate_thickness: IntStrList = Field(alias=KEY_FLANGEPLATE_THICKNESS)
    web_plate_thickness: IntStrList = Field(alias=KEY_WEBPLATE_THICKNESS)


class CoverPlateWeldedInput(MomentConnectionInput):
    """Keys of the beam and column cover plate welded connections; the numbers may be decimals."""

    section: Text = Field(alias=KEY_SECSIZE)
    section_material: Text = Field(alias=KEY_SEC_MATERIAL)
    moment_load: FloatStr = Field(alias=KEY_MOMENT)
    shear_load: FloatStr = Field(alias=KEY_SHEAR)
    axial_load: FloatStr = Field(alias=KEY_AXIAL)
    weld_type: Text = Field(alias=KEY_WELD_TYPE)
    weld_fabrication: Text = Field(alias=KEY_DP_WELD_FAB)
    weld_material_grade_overwrite: FloatStr = Field(alias=KEY_DP_WELD_MATERIAL_G_O)
    detailing_gap: NonNegativeFloatStr = Field(alias=KEY_DP_DETAILING_GAP)
    flange_plate_preferences: Text = Field(alias=KEY_FLANGEPLATE_PREFERENCES)
    flange_plate_thickness: FloatStrList = Field(alias=KEY_FLANGEPLATE_THICKNESS)
    web_plate_thickness: FloatStrList = Field(alias=KEY_WEBPLATE_THICKNESS)
