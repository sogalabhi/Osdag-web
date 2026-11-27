"""Design request of the welded tension member."""
from pydantic import Field, StrictStr

from apps.core.schemas import IntStr, YesNo
from apps.modules.tension_member.schema import TensionMemberInput
from osdag_core.Common import (
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DETAILING_EDGE_TYPE,
    KEY_DP_DETAILING_GAP,
)


class WeldedTensionInput(TensionMemberInput):
    # The welded tension core neither derives nor reads the Detailing values: optional, but
    # checked when sent.
    corrosive_influences: YesNo = Field(default="No", alias=KEY_DP_DETAILING_CORROSIVE_INFLUENCES)
    edge_type: StrictStr = Field(default="", alias=KEY_DP_DETAILING_EDGE_TYPE)
    detailing_gap: IntStr = Field(default="0", alias=KEY_DP_DETAILING_GAP)
