"""Design request of the beam to column end plate connection."""
from pydantic import Field

from apps.core.schemas import IntStr, Text
from apps.modules.moment_connection.schema import EndPlateInput
from osdag_core.Common import (
    KEY_CONN,
    KEY_DP_WELD_FAB,
    KEY_DP_WELD_MATERIAL_G_O,
    KEY_ENDPLATE_TYPE,
    KEY_SUPTDSEC,
    KEY_SUPTDSEC_MATERIAL,
    KEY_SUPTNGSEC,
    KEY_SUPTNGSEC_MATERIAL,
)


class BeamColumnEndPlateInput(EndPlateInput):
    connectivity: Text = Field(alias=KEY_CONN)
    end_plate_type: Text = Field(alias=KEY_ENDPLATE_TYPE)
    supported_section: Text = Field(alias=KEY_SUPTDSEC)
    supported_section_material: Text = Field(alias=KEY_SUPTDSEC_MATERIAL)
    supporting_section: Text = Field(alias=KEY_SUPTNGSEC)
    supporting_section_material: Text = Field(alias=KEY_SUPTNGSEC_MATERIAL)
    weld_fabrication: Text = Field(alias=KEY_DP_WELD_FAB)
    weld_material_grade_overwrite: IntStr = Field(alias=KEY_DP_WELD_MATERIAL_G_O)
