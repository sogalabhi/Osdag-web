"""Design request of the beam to beam end plate connection."""
from pydantic import Field

from apps.core.schemas import IntStr, Text
from apps.modules.moment_connection.schema import EndPlateInput
from osdag_core.Common import (
    KEY_DISP_CONN,
    KEY_DP_WELD_FAB,
    KEY_DP_WELD_MATERIAL_G_O,
    KEY_ENDPLATE_TYPE,
    KEY_SUPTDSEC,
    KEY_SUPTDSEC_MATERIAL,
)


class BeamBeamEndPlateInput(EndPlateInput):
    connectivity: Text = Field(alias=KEY_DISP_CONN)
    end_plate_type: Text = Field(alias=KEY_ENDPLATE_TYPE)
    supported_section: Text = Field(alias=KEY_SUPTDSEC)
    supported_section_material: Text = Field(alias=KEY_SUPTDSEC_MATERIAL)
    weld_fabrication: Text = Field(alias=KEY_DP_WELD_FAB)
    weld_material_grade_overwrite: IntStr = Field(alias=KEY_DP_WELD_MATERIAL_G_O)
