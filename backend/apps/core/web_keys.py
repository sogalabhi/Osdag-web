"""Request and response keys the web layer defines because ``osdag_core.Common`` has none.

Every constant here is named ``WEB_<NAME>`` and holds the key string. ``scripts/gen_core_keys.py``
copies them into ``frontend/src/constants/generated/webKeys.js``, so the backend and the frontend
use the same names. A key that the core also has belongs in ``osdag_core.Common`` instead; the
tests in ``apps/core/tests/test_no_inline_keys.py`` fail when a value here matches a core key.

This module imports nothing, so the frontend generator can load it on its own.
"""

# Output and diagram keys: shear and simple connections
WEB_BEAM_WEBTHICKNESS = "Beam.WebThickness"
WEB_BOLT_COLUMNS_PROVIDED = "Bolt.Columns_Provided"
WEB_BOLT_CONNECTION_LENGTH = "Bolt.Connection_Length"
WEB_BOLT_DIAMETER_PROVIDED = "Bolt.Diameter_Provided"
WEB_BOLT_ROWS_PROVIDED = "Bolt.Rows_Provided"
WEB_BOLT_TOTAL_NUMBER = "Bolt.Total_Number"
WEB_ENDPLATE_SUPPORTEDBLOCKSHEARAXIAL = "EndPlate.SupportedBlockShearAxial"
WEB_ENDPLATE_SUPPORTEDSHEARALLOWABLE = "EndPlate.SupportedShearAllowable"
WEB_ENDPLATE_SUPPORTEDSHEARYIELD = "EndPlate.SupportedShearYield"
WEB_ENDPLATE_SUPPORTINGTENSIONYIELD = "EndPlate.SupportingTensionYield"
WEB_MEMBER_DEPTH = "Member.Depth"
WEB_PACKINGPLATE_THICKNESS = "PackingPlate.Thickness"
WEB_UTILIZATION_RATIO = "Utilization.Ratio"

# Output and diagram keys: moment connections
WEB_BEAM_DEPTH = "Beam.Depth"
WEB_BEAM_FLANGETHICKNESS = "Beam.FlangeThickness"
WEB_COLUMNENDPLATE_FLANGETHICKNESS = "ColumnEndPlate.FlangeThickness"
WEB_COLUMNENDPLATE_MIDPITCH = "ColumnEndPlate.MidPitch"
WEB_COLUMNENDPLATE_PITCH = "ColumnEndPlate.Pitch"
WEB_COLUMNENDPLATE_WEBTHICKNESS = "ColumnEndPlate.WebThickness"
WEB_DETAILING_MIDDLEBOLTS = "Detailing.MiddleBolts"
WEB_FLANGE_WELD_REDUCTION = "Flange_Weld.Reduction"
WEB_FLANGE_WELD_STRENGTH_RED = "Flange_Weld.Strength_red"
WEB_WEB_WELD_REDUCTION = "Web_Weld.Reduction"
WEB_WEB_WELD_STRENGTH_RED = "Web_Weld.Strength_red"

# Request and output keys: flexure and base plate
WEB_COLUMN_DEPTH = "Column.Depth"
WEB_COLUMN_TF = "Column.Tf"
WEB_COLUMN_TW = "Column.Tw"
WEB_COLUMN_WIDTH = "Column.Width"
WEB_DESIGN_INTERMEDIATESTIFFENER_THICKNESS_VALUES = "Design.IntermediateStiffener.Thickness_Values"
WEB_DESIGN_LONGITUDNALSTIFFENER_THICKNESS_VALUES = "Design.LongitudnalStiffener.Thickness_Values"
WEB_STIFFENERHOLLOW_B_THICKNESS = "StiffenerHollow.B.Thickness"
WEB_STIFFENERHOLLOW_D_THICKNESS = "StiffenerHollow.D.Thickness"
WEB_STIFFENERHOLLOW_OD_THICKNESS = "StiffenerHollow.OD.Thickness"

# .osi file metadata
WEB_OSDAGWEB_VERSION = "OsdagWeb.Version"

# Plate girder optimisation bounds (the backend builds these from the base key and a suffix)
WEB_TOTAL_DEPTH_LB = "Total.Depth_lb"
WEB_TOTAL_DEPTH_UB = "Total.Depth_ub"
WEB_TOTAL_DEPTH_INC = "Total.Depth_inc"
WEB_TOPFLANGE_WIDTH_LB = "Topflange.Width_lb"
WEB_TOPFLANGE_WIDTH_UB = "Topflange.Width_ub"
WEB_TOPFLANGE_WIDTH_INC = "Topflange.Width_inc"
WEB_BOTTOMFLANGE_WIDTH_LB = "Bottomflange.Width_lb"
WEB_BOTTOMFLANGE_WIDTH_UB = "Bottomflange.Width_ub"
WEB_BOTTOMFLANGE_WIDTH_INC = "Bottomflange.Width_inc"
