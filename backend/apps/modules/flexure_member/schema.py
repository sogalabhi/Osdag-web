"""Design request keys that the simply supported beam and the cantilever beam share."""
from pydantic import Field

from apps.core.schemas import DesignInput, Present
from osdag_core.Common import (
    KEY_DESIGN_TYPE_FLEXURE,
    KEY_LENGTH,
    KEY_MATERIAL,
    KEY_MODULE,
    KEY_MOMENT,
    KEY_SECSIZE,
    KEY_SEC_MATERIAL,
    KEY_SEC_PROFILE,
    KEY_SHEAR,
)


class BeamInput(DesignInput):
    """Keys every beam carries; each only has to be sent with a non-empty value."""

    module: Present = Field(alias=KEY_MODULE)
    section_profile: Present = Field(alias=KEY_SEC_PROFILE)
    section: Present = Field(alias=KEY_SECSIZE)
    material: Present = Field(alias=KEY_MATERIAL)
    section_material: Present = Field(alias=KEY_SEC_MATERIAL)
    design_type: Present = Field(alias=KEY_DESIGN_TYPE_FLEXURE)
    length: Present = Field(alias=KEY_LENGTH)
    shear_load: Present = Field(alias=KEY_SHEAR)
    moment_load: Present = Field(alias=KEY_MOMENT)
