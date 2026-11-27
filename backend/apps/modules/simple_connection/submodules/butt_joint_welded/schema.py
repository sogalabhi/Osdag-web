"""Design request of the butt joint welded connection."""
from pydantic import Field

from apps.core.schemas import Present
from apps.modules.simple_connection.schema import WeldedConnectionInput
from osdag_core.Common import KEY_COVER_PLATE


class ButtJointWeldedInput(WeldedConnectionInput):
    cover_plate: Present = Field(alias=KEY_COVER_PLATE)
