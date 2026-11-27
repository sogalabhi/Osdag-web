"""Design request keys that every shear connection submodule shares."""
from pydantic import Field

from apps.core.schemas import DesignInput, FloatStr, FloatStrList, IntStr, IntStrList, Text, YesNo
from osdag_core.Common import (
    KEY_CONN,
    KEY_CONNECTOR_MATERIAL,
    KEY_D,
    KEY_DP_BOLT_HOLE_TYPE,
    KEY_DP_BOLT_SLIP_FACTOR,
    KEY_DP_BOLT_TYPE,
    KEY_DP_DESIGN_METHOD,
    KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    KEY_DP_DETAILING_EDGE_TYPE,
    KEY_DP_DETAILING_GAP,
    KEY_GRD,
    KEY_MATERIAL,
    KEY_MODULE,
    KEY_SHEAR,
    KEY_SUPTDSEC,
    KEY_SUPTDSEC_MATERIAL,
    KEY_SUPTNGSEC,
    KEY_SUPTNGSEC_MATERIAL,
    KEY_TYP,
)


class ShearConnectionInput(DesignInput):
    bolt_hole_type: Text = Field(alias=KEY_DP_BOLT_HOLE_TYPE)
    bolt_diameter: IntStrList = Field(alias=KEY_D)
    bolt_grade: FloatStrList = Field(alias=KEY_GRD)
    bolt_slip_factor: FloatStr = Field(alias=KEY_DP_BOLT_SLIP_FACTOR)
    bolt_tension_type: Text = Field(alias=KEY_DP_BOLT_TYPE)
    bolt_type: Text = Field(alias=KEY_TYP)
    connectivity: Text = Field(alias=KEY_CONN)
    connector_material: Text = Field(alias=KEY_CONNECTOR_MATERIAL)
    design_method: Text = Field(alias=KEY_DP_DESIGN_METHOD)
    corrosive_influences: YesNo = Field(alias=KEY_DP_DETAILING_CORROSIVE_INFLUENCES)
    edge_type: Text = Field(alias=KEY_DP_DETAILING_EDGE_TYPE)
    detailing_gap: IntStr = Field(alias=KEY_DP_DETAILING_GAP)
    shear_load: IntStr = Field(alias=KEY_SHEAR)
    material: Text = Field(alias=KEY_MATERIAL)
    supported_section: Text = Field(alias=KEY_SUPTDSEC)
    supported_section_material: Text = Field(alias=KEY_SUPTDSEC_MATERIAL)
    supporting_section: Text = Field(alias=KEY_SUPTNGSEC)
    supporting_section_material: Text = Field(alias=KEY_SUPTNGSEC_MATERIAL)
    module: Text = Field(alias=KEY_MODULE)
