"""Design request keys that the bolted and welded tension member share."""
from pydantic import Field

from apps.core.schemas import DesignInput, IntStr, IntStrList, Present, StrList, Text
from osdag_core.Common import (
    KEY_AXIAL,
    KEY_CONNECTOR_MATERIAL,
    KEY_DP_DESIGN_METHOD,
    KEY_LENGTH,
    KEY_LOCATION,
    KEY_MATERIAL,
    KEY_MODULE,
    KEY_PLATETHK,
    KEY_SECSIZE,
    KEY_SEC_MATERIAL,
    KEY_SEC_PROFILE,
)


class TensionMemberInput(DesignInput):
    section_profile: Text = Field(alias=KEY_SEC_PROFILE)
    section_designation: StrList = Field(alias=KEY_SECSIZE)
    material: Text = Field(alias=KEY_MATERIAL)
    section_material: Present = Field(alias=KEY_SEC_MATERIAL)
    plate_thickness: IntStrList = Field(alias=KEY_PLATETHK)
    connector_material: Text = Field(alias=KEY_CONNECTOR_MATERIAL)
    design_method: Text = Field(alias=KEY_DP_DESIGN_METHOD)
    axial_load: IntStr = Field(alias=KEY_AXIAL)
    member_length: Text = Field(alias=KEY_LENGTH)
    connection_location: Text = Field(alias=KEY_LOCATION)
    module: Text = Field(alias=KEY_MODULE)
