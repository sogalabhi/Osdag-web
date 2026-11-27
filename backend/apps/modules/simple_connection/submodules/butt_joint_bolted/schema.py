"""Design request of the butt joint bolted connection."""
from pydantic import Field

from apps.core.schemas import Present
from apps.modules.simple_connection.schema import BoltedConnectionInput
from osdag_core.Common import KEY_COVER_PLATE


class ButtJointBoltedInput(BoltedConnectionInput):
    cover_plate: Present = Field(alias=KEY_COVER_PLATE)
