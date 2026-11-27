"""Design request of the bolted tension member."""
from pydantic import Field

from apps.core.schemas import FloatStr, FloatStrList, IntStr, IntStrList, Text, YesNo
from apps.modules.tension_member.schema import TensionMemberInput
from osdag_core.Common import (
    KEY_D,
    KEY_DP_BOLT_HOLE_TYPE,
    KEY_DP_BOLT_SLIP_FACTOR,
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DETAILING_EDGE_TYPE,
    KEY_DP_DETAILING_GAP,
    KEY_GRD,
    KEY_TYP,
)


class BoltedTensionInput(TensionMemberInput):
    bolt_diameter: IntStrList = Field(alias=KEY_D)
    bolt_grade: FloatStrList = Field(alias=KEY_GRD)
    bolt_type: Text = Field(alias=KEY_TYP)
    bolt_hole_type: Text = Field(alias=KEY_DP_BOLT_HOLE_TYPE)
    bolt_slip_factor: FloatStr = Field(alias=KEY_DP_BOLT_SLIP_FACTOR)
    corrosive_influences: YesNo = Field(alias=KEY_DP_DETAILING_CORROSIVE_INFLUENCES)
    edge_type: Text = Field(alias=KEY_DP_DETAILING_EDGE_TYPE)
    detailing_gap: IntStr = Field(alias=KEY_DP_DETAILING_GAP)
