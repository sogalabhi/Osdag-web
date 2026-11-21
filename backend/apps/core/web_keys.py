"""Request and response keys the web layer defines because ``osdag_core.Common`` has none.

Every constant here is named ``WEB_<NAME>`` and holds the key string. ``scripts/gen_core_keys.py``
copies them into ``frontend/src/constants/generated/webKeys.js``, so the backend and the frontend
use the same names. A key that the core also has belongs in ``osdag_core.Common`` instead; the
tests in ``apps/core/tests/test_no_inline_keys.py`` fail when a value here matches a core key.

This module imports nothing, so the frontend generator and the key codemods can load it on its own.
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
