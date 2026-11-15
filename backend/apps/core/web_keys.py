"""Request and response keys the web layer defines because ``osdag_core.Common`` has none.

Every constant here is named ``WEB_<NAME>`` and holds the key string. ``scripts/gen_core_keys.py``
copies them into ``frontend/src/constants/generated/webKeys.js``, so the backend and the frontend
use the same names. A key that the core also has belongs in ``osdag_core.Common`` instead; the
tests in ``apps/core/tests/test_no_inline_keys.py`` fail when a value here matches a core key.

This module imports nothing, so the frontend generator and the key codemods can load it on its own.
"""
