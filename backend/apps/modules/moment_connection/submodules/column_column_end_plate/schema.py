"""Design request of the column to column end plate connection."""
from pydantic import Field

from apps.core.schemas import Text
from apps.modules.moment_connection.schema import EndPlateInput
from osdag_core.Common import KEY_CONN, KEY_SEC_MATERIAL, KEY_SECSIZE


class ColumnColumnEndPlateInput(EndPlateInput):
    connectivity: Text = Field(alias=KEY_CONN)
    section: Text = Field(alias=KEY_SECSIZE)
    section_material: Text = Field(alias=KEY_SEC_MATERIAL)
