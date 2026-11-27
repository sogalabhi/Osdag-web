"""Design request of the header plate connection."""
from pydantic import Field

from apps.core.schemas import IntStr, IntStrList, Text
from apps.modules.shear_connection.schema import ShearConnectionInput
from osdag_core.Common import KEY_AXIAL, KEY_DP_WELD_FAB, KEY_DP_WELD_MATERIAL_G_O, KEY_PLATETHK


class HeaderPlateInput(ShearConnectionInput):
    axial_load: IntStr = Field(alias=KEY_AXIAL)
    weld_fabrication: Text = Field(alias=KEY_DP_WELD_FAB)
    weld_material_grade_overwrite: IntStr = Field(alias=KEY_DP_WELD_MATERIAL_G_O)
    plate_thickness: IntStrList = Field(alias=KEY_PLATETHK)
