"""Design request of the simply supported beam."""
from pydantic import Field

from apps.core.schemas import Present
from apps.modules.flexure_member.schema import BeamInput
from osdag_core.Common import (
    KEY_ALLOW_CLASS,
    KEY_BEARING_LENGTH,
    KEY_DP_DESIGN_METHOD,
    KEY_EFFECTIVE_AREA_PARA,
    KEY_LENGTH_OVERWRITE,
    KEY_TORSIONAL_RES,
    KEY_WARPING_RES,
)


class SimplySupportedBeamInput(BeamInput):
    design_method: Present = Field(alias=KEY_DP_DESIGN_METHOD)
    allowable_class: Present = Field(alias=KEY_ALLOW_CLASS)
    effective_area_parameter: Present = Field(alias=KEY_EFFECTIVE_AREA_PARA)
    length_overwrite: Present = Field(alias=KEY_LENGTH_OVERWRITE)
    bearing_length: Present = Field(alias=KEY_BEARING_LENGTH)
    torsional_restraint: Present = Field(alias=KEY_TORSIONAL_RES)
    warping_restraint: Present = Field(alias=KEY_WARPING_RES)
