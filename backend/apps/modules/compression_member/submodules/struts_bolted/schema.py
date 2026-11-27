"""Design request of the bolted strut."""
from pydantic import Field

from apps.core.schemas import FloatStr, FloatStrList, IntStr, IntStrList, Present, Text, YesNo
from apps.modules.compression_member.schema import CompressionMemberInput, SectionDesignation
from osdag_core.Common import (
    KEY_AXIAL,
    KEY_CONNECTOR_MATERIAL,
    KEY_D,
    KEY_DP_BOLT_HOLE_TYPE,
    KEY_DP_BOLT_SLIP_FACTOR,
    KEY_DP_DESIGN_METHOD,
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DETAILING_EDGE_TYPE,
    KEY_DP_DETAILING_GAP,
    KEY_GRD,
    KEY_LENGTH,
    KEY_LOCATION,
    KEY_PLATETHK,
    KEY_SECSIZE,
    KEY_SEC_MATERIAL,
    KEY_TYP,
)


class BoltedStrutInput(CompressionMemberInput):
    section_designation: SectionDesignation = Field(alias=KEY_SECSIZE)
    section_material: Present = Field(alias=KEY_SEC_MATERIAL)
    plate_thickness: IntStrList = Field(alias=KEY_PLATETHK)
    bolt_diameter: IntStrList = Field(alias=KEY_D)
    bolt_grade: FloatStrList = Field(alias=KEY_GRD)
    bolt_type: Text = Field(alias=KEY_TYP)
    bolt_hole_type: Text = Field(alias=KEY_DP_BOLT_HOLE_TYPE)
    bolt_slip_factor: FloatStr = Field(alias=KEY_DP_BOLT_SLIP_FACTOR)
    connector_material: Text = Field(alias=KEY_CONNECTOR_MATERIAL)
    design_method: Text = Field(alias=KEY_DP_DESIGN_METHOD)
    corrosive_influences: YesNo = Field(alias=KEY_DP_DETAILING_CORROSIVE_INFLUENCES)
    edge_type: Text = Field(alias=KEY_DP_DETAILING_EDGE_TYPE)
    detailing_gap: IntStr = Field(alias=KEY_DP_DETAILING_GAP)
    axial_load: IntStr = Field(alias=KEY_AXIAL)
    member_length: Text = Field(alias=KEY_LENGTH)
    connection_location: Text = Field(alias=KEY_LOCATION)
