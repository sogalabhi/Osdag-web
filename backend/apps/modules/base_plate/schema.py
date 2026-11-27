"""Design request of the base plate connection."""
from typing import Annotated, Any

from pydantic import AfterValidator, Field
from pydantic_core import PydanticCustomError

from apps.core.schemas import DesignInput, FloatStr, Text
from osdag_core.Common import (
    KEY_AXIAL,
    KEY_AXIAL_TENSION_BP,
    KEY_CONN,
    KEY_END_CONDITION,
    KEY_MATERIAL,
    KEY_MODULE,
    KEY_MOMENT_MAJOR,
    KEY_MOMENT_MINOR,
    KEY_SECSIZE,
    KEY_SHEAR_MAJOR,
    KEY_SHEAR_MINOR,
)


def _designation(value):
    if isinstance(value, str) and value:
        return value
    if isinstance(value, list) and value and all(isinstance(v, str) for v in value):
        return value
    raise PydanticCustomError("invalid_value", "should be a string or a list of strings")


# One section designation, or a list of them.
SectionDesignation = Annotated[Any, AfterValidator(_designation)]


class BasePlateInput(DesignInput):
    module: Text = Field(alias=KEY_MODULE)
    connectivity: Text = Field(alias=KEY_CONN)
    end_condition: Text = Field(alias=KEY_END_CONDITION)
    material: Text = Field(alias=KEY_MATERIAL)
    section: SectionDesignation = Field(alias=KEY_SECSIZE)
    axial_load: FloatStr = Field(alias=KEY_AXIAL)
    axial_tension: FloatStr = Field(alias=KEY_AXIAL_TENSION_BP)
    shear_major: FloatStr = Field(alias=KEY_SHEAR_MAJOR)
    shear_minor: FloatStr = Field(alias=KEY_SHEAR_MINOR)
    moment_major: FloatStr = Field(alias=KEY_MOMENT_MAJOR)
    moment_minor: FloatStr = Field(alias=KEY_MOMENT_MINOR)
