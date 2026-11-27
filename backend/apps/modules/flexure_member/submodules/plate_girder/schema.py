"""Design request of the plate girder, customized (every dimension given) or optimized."""
from typing import Annotated, Any, List, Optional

from pydantic import AfterValidator, Field, ValidationInfo, field_validator
from pydantic_core import PydanticCustomError

from apps.core.schemas import DesignInput, FloatStr, Text
from apps.core.utils.validation import float_able
from osdag_core.Common import (
    KEY_ALLOW_CLASS,
    KEY_BENDING_MOMENT_SHAPE,
    KEY_BOTTOM_Bflange_PG,
    KEY_BOTTOM_FLANGE_THICKNESS_PG,
    KEY_DESIGN_TYPE_FLEXURE,
    KEY_IntermediateStiffener,
    KEY_IntermediateStiffener_spacing,
    KEY_IntermediateStiffener_thickness,
    KEY_LENGTH,
    KEY_LOAD,
    KEY_LongitudnalStiffener,
    KEY_LongitudnalStiffener_thickness,
    KEY_MATERIAL,
    KEY_MAX_DEFL,
    KEY_MODULE,
    KEY_MOMENT,
    KEY_OVERALL_DEPTH_PG,
    KEY_OVERALL_DEPTH_PG_TYPE,
    KEY_SHEAR,
    KEY_SUPPORT_WIDTH,
    KEY_TOP_Bflange_PG,
    KEY_TOP_FLANGE_THICKNESS_PG,
    KEY_TORSIONAL_RES,
    KEY_WARPING_RES,
    KEY_WEB_PHILOSOPHY,
    KEY_WEB_THICKNESS_PG,
)

CUSTOMIZED = "Customized"


def _numeric_or_na(value):
    if value.upper() != "NA" and not float_able(value):
        raise PydanticCustomError("invalid_value", "should be a string that can be converted to float or 'NA'")
    return value


# A numeric string, or 'NA'.
FloatStrOrNA = Annotated[Text, AfterValidator(_numeric_or_na)]
# A non-empty list; its items are not checked.
ThicknessList = Annotated[List[Any], Field(min_length=1, strict=True)]


class PlateGirderInput(DesignInput):
    module: Text = Field(alias=KEY_MODULE)
    material: Text = Field(alias=KEY_MATERIAL)
    length: FloatStr = Field(alias=KEY_LENGTH)
    load: Text = Field(alias=KEY_LOAD)
    shear_load: FloatStr = Field(alias=KEY_SHEAR)
    moment_load: FloatStr = Field(alias=KEY_MOMENT)
    depth_type: Text = Field(alias=KEY_OVERALL_DEPTH_PG_TYPE)
    web_thickness: ThicknessList = Field(alias=KEY_WEB_THICKNESS_PG)
    top_flange_thickness: ThicknessList = Field(alias=KEY_TOP_FLANGE_THICKNESS_PG)
    bottom_flange_thickness: ThicknessList = Field(alias=KEY_BOTTOM_FLANGE_THICKNESS_PG)
    design_type: Text = Field(alias=KEY_DESIGN_TYPE_FLEXURE)
    bending_moment_shape: Text = Field(alias=KEY_BENDING_MOMENT_SHAPE)
    torsional_restraint: Text = Field(alias=KEY_TORSIONAL_RES)
    warping_restraint: Text = Field(alias=KEY_WARPING_RES)
    max_deflection: Text = Field(alias=KEY_MAX_DEFL)
    allowable_class: Text = Field(alias=KEY_ALLOW_CLASS)
    web_philosophy: Text = Field(alias=KEY_WEB_PHILOSOPHY)
    support_width: FloatStr = Field(alias=KEY_SUPPORT_WIDTH)
    intermediate_stiffener: Text = Field(alias=KEY_IntermediateStiffener)
    intermediate_stiffener_spacing: FloatStrOrNA = Field(alias=KEY_IntermediateStiffener_spacing)
    intermediate_stiffener_thickness: Text = Field(alias=KEY_IntermediateStiffener_thickness)
    longitudinal_stiffener: Text = Field(alias=KEY_LongitudnalStiffener)
    longitudinal_stiffener_thickness: Text = Field(alias=KEY_LongitudnalStiffener_thickness)
    # Sent with the customized design only: the dimensions the optimized design leaves to the optimiser.
    overall_depth: Optional[Any] = Field(default=None, alias=KEY_OVERALL_DEPTH_PG, validate_default=True)
    top_flange_width: Optional[Any] = Field(default=None, alias=KEY_TOP_Bflange_PG, validate_default=True)
    bottom_flange_width: Optional[Any] = Field(default=None, alias=KEY_BOTTOM_Bflange_PG, validate_default=True)

    @field_validator("overall_depth", "top_flange_width", "bottom_flange_width")
    @classmethod
    def _dimension_of_a_customized_design(cls, value, info: ValidationInfo):
        if info.data.get("depth_type") != CUSTOMIZED:
            return value
        if value is None:
            raise PydanticCustomError("conditionally_missing", "is required for a customized design")
        if not isinstance(value, str) or not float_able(value):
            raise PydanticCustomError("invalid_value", "should be a string that can be converted to float")
        return value
