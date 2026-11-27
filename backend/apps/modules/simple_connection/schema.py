"""Design request keys that the butt and lap joints (bolted and welded) share."""
from typing import Annotated, Any, Optional

from pydantic import AfterValidator, BeforeValidator, Field
from pydantic_core import PydanticCustomError

from apps.core.schemas import DesignInput, FloatStr, FloatStrList, IntStrList, Present
from osdag_core.Common import (
    KEY_AXIAL,
    KEY_D,
    KEY_DESIGN_FOR,
    KEY_DP_BOLT_HOLE_TYPE,
    KEY_DP_BOLT_SLIP_FACTOR,
    KEY_GRD,
    KEY_MATERIAL,
    KEY_MODULE,
    KEY_PLATE1_THICKNESS,
    KEY_PLATE2_THICKNESS,
    KEY_PLATE_WIDTH,
    KEY_TYP,
    KEY_WELD_SIZE,
)

# Keys whose value may arrive as a number or a one-item list; the adapters pass them on as strings.
NUMERIC_KEYS = (
    KEY_PLATE1_THICKNESS,
    KEY_PLATE2_THICKNESS,
    KEY_PLATE_WIDTH,
    KEY_AXIAL,
    KEY_DP_BOLT_SLIP_FACTOR,
)


def as_numeric_string(value: Any) -> Any:
    """The first item of a non-empty list or tuple; a number as its string; anything else as is."""
    if isinstance(value, (list, tuple)) and value:
        value = value[0]
    if isinstance(value, (int, float)):
        value = str(value)
    return value


def _as_list(value: Any) -> Any:
    return [str(value)] if isinstance(value, (int, float, str)) else value


def _positive(at_most: Optional[float] = None):
    expected = "greater than 0" if at_most is None else f"greater than 0 and at most {at_most:g}"

    def check(value):
        number = float(value)
        if number <= 0 or (at_most is not None and number > at_most):
            raise PydanticCustomError("out_of_range", "should be {expected}", {"expected": expected})
        return value
    return check


# A numeric string, sent as a string, a number or a list whose first item is one of those.
NumStr = Annotated[FloatStr, BeforeValidator(as_numeric_string)]
PositiveNumStr = Annotated[NumStr, AfterValidator(_positive())]
SlipFactorStr = Annotated[NumStr, AfterValidator(_positive(at_most=1.0))]
# A weld size list; a single value counts as a list of one.
WeldSizeList = Annotated[FloatStrList, BeforeValidator(_as_list)]


class SimpleConnectionInput(DesignInput):
    """Keys of every simple connection. The bolt and weld keys are checked when sent."""

    module: Present = Field(alias=KEY_MODULE)
    material: Present = Field(alias=KEY_MATERIAL)
    axial_load: PositiveNumStr = Field(alias=KEY_AXIAL)
    plate1_thickness: PositiveNumStr = Field(alias=KEY_PLATE1_THICKNESS)
    plate2_thickness: PositiveNumStr = Field(alias=KEY_PLATE2_THICKNESS)
    plate_width: PositiveNumStr = Field(alias=KEY_PLATE_WIDTH)
    design_for: Present = Field(alias=KEY_DESIGN_FOR)
    bolt_diameter: IntStrList = Field(default=None, alias=KEY_D)
    bolt_grade: FloatStrList = Field(default=None, alias=KEY_GRD)
    bolt_slip_factor: NumStr = Field(default=None, alias=KEY_DP_BOLT_SLIP_FACTOR)
    weld_size: WeldSizeList = Field(default=None, alias=KEY_WELD_SIZE)


class BoltedConnectionInput(SimpleConnectionInput):
    """Bolt keys are required; the slip factor lies in (0, 1]."""

    bolt_diameter: IntStrList = Field(alias=KEY_D)
    bolt_grade: FloatStrList = Field(alias=KEY_GRD)
    bolt_type: Present = Field(alias=KEY_TYP)
    bolt_hole_type: Present = Field(alias=KEY_DP_BOLT_HOLE_TYPE)
    bolt_slip_factor: SlipFactorStr = Field(alias=KEY_DP_BOLT_SLIP_FACTOR)


class WeldedConnectionInput(SimpleConnectionInput):
    """The weld size is required. The weld material, fabrication and type default in the adapter."""

    weld_size: WeldSizeList = Field(alias=KEY_WELD_SIZE)


def normalise_numeric_inputs(input_values: Any) -> None:
    """Replace each numeric key's list or number in the request with its string, in place."""
    if not isinstance(input_values, dict):
        return
    for key in NUMERIC_KEYS:
        if key in input_values:
            input_values[key] = as_numeric_string(input_values[key])
