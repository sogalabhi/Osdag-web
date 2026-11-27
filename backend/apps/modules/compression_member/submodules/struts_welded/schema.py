"""Design request of the welded strut."""
from pydantic import Field, StrictStr

from apps.core.schemas import IntStr, Present, Text
from apps.modules.compression_member.schema import CompressionMemberInput, IntStrOrList, SectionDesignation
from osdag_core.Common import (
    KEY_AXIAL,
    KEY_CONNECTOR_MATERIAL,
    KEY_DP_DESIGN_METHOD,
    KEY_LENGTH,
    KEY_LOCATION,
    KEY_PLATETHK,
    KEY_SECSIZE,
    KEY_SEC_MATERIAL,
)


class WeldedStrutInput(CompressionMemberInput):
    section_designation: SectionDesignation = Field(alias=KEY_SECSIZE)
    section_material: Present = Field(alias=KEY_SEC_MATERIAL)
    # The gusset thickness of the Optimization tab: one int string, or a list of them.
    plate_thickness: IntStrOrList = Field(alias=KEY_PLATETHK)
    design_method: Text = Field(alias=KEY_DP_DESIGN_METHOD)
    axial_load: IntStr = Field(alias=KEY_AXIAL)
    member_length: Text = Field(alias=KEY_LENGTH)
    connection_location: Text = Field(alias=KEY_LOCATION)
    # The welded strut core neither derives nor reads the connector material: optional, but
    # checked when sent.
    connector_material: StrictStr = Field(default="", alias=KEY_CONNECTOR_MATERIAL)
