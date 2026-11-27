"""Design request of the cantilever beam."""
from pydantic import Field

from apps.core.schemas import Present
from apps.modules.flexure_member.schema import BeamInput
from osdag_core.Common import KEY_SUPPORT_TYPE, KEY_SUPPORT_TYPE2


class OnCantileverInput(BeamInput):
    support_restraint: Present = Field(alias=KEY_SUPPORT_TYPE)
    top_restraint: Present = Field(alias=KEY_SUPPORT_TYPE2)
