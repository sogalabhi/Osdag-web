"""Design request of the axially loaded column."""
from pydantic import Field

from apps.core.schemas import Text
from apps.modules.compression_member.schema import CompressionMemberInput, Number, SectionList
from osdag_core.Common import (
    KEY_ACTUAL_LEN_YY,
    KEY_ACTUAL_LEN_ZZ,
    KEY_AXIAL,
    KEY_END1_Y,
    KEY_END2_Y,
    KEY_SECSIZE,
)


class AxiallyLoadedColumnInput(CompressionMemberInput):
    section_designation: SectionList = Field(alias=KEY_SECSIZE)
    actual_length_zz: Number = Field(alias=KEY_ACTUAL_LEN_ZZ)
    actual_length_yy: Number = Field(alias=KEY_ACTUAL_LEN_YY)
    end_condition_1_y: Text = Field(alias=KEY_END1_Y)
    end_condition_2_y: Text = Field(alias=KEY_END2_Y)
    axial_load: Number = Field(alias=KEY_AXIAL)
