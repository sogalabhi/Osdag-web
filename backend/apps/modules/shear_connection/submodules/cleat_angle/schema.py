"""Design request of the cleat angle connection."""
from pydantic import Field, StrictStr

from apps.core.schemas import IntStr, Present
from apps.modules.shear_connection.schema import ShearConnectionInput
from osdag_core.Common import KEY_ANGLE_LIST, KEY_DP_WELD_FAB, KEY_DP_WELD_MATERIAL_G_O


class CleatAngleInput(ShearConnectionInput):
    angle_list: Present = Field(alias=KEY_ANGLE_LIST)
    # The cleat angle design does not weld: both weld values are optional, checked when sent.
    weld_fabrication: StrictStr = Field(default="", alias=KEY_DP_WELD_FAB)
    weld_material_grade_overwrite: IntStr = Field(default="0", alias=KEY_DP_WELD_MATERIAL_G_O)
