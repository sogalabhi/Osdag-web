"""
Limits for the plate girder optimisation started over the WebSocket.

The optimisation runs a full particle swarm in a calculation worker, so each run
is checked like a design request and the number of runs a client can have going
at once is capped:

* `optimization_input_error()` applies the design endpoint's validation and caps
  the size of the thickness lists and the optimisation bounds.
* `acquire_run_slot()` / `release_run_slot()` count the running optimisations of
  one client (the signed-in user, or the client address for guests) in the
  Django cache, so the count is shared by every ASGI worker when the cache is
  Redis.

The swarm size and iteration count are fixed in osdag_core and are not taken
from the request.
"""
import math
from typing import Any, Optional

from django.conf import settings
from django.core.cache import cache

from osdag_core.Common import (
    KEY_BOTTOM_Bflange_PG,
    KEY_BOTTOM_FLANGE_THICKNESS_PG,
    KEY_OVERALL_DEPTH_PG,
    KEY_TOP_Bflange_PG,
    KEY_TOP_FLANGE_THICKNESS_PG,
    KEY_WEB_THICKNESS_PG,
)
from apps.core.web_keys import (
    WEB_DESIGN_INTERMEDIATESTIFFENER_THICKNESS_VALUES,
    WEB_DESIGN_LONGITUDNALSTIFFENER_THICKNESS_VALUES,
)

# Largest start message accepted, in characters. The page sends about 2 KB.
MAX_MESSAGE_CHARS = 64 * 1024
# Most values a thickness list may hold. The longest list the page offers has 16.
MAX_LIST_ITEMS = 100

# Seconds an optimisation may run before Celery stops it. A run with the page's
# default inputs takes about 10 s.
SOFT_TIME_LIMIT = 600
TIME_LIMIT = SOFT_TIME_LIMIT + 60
# A slot left behind by a worker that died is dropped after this many seconds.
SLOT_TTL = TIME_LIMIT + 60

_THICKNESS_LIST_KEYS = (
    KEY_WEB_THICKNESS_PG,
    KEY_TOP_FLANGE_THICKNESS_PG,
    KEY_BOTTOM_FLANGE_THICKNESS_PG,
    WEB_DESIGN_INTERMEDIATESTIFFENER_THICKNESS_VALUES,
    WEB_DESIGN_LONGITUDNALSTIFFENER_THICKNESS_VALUES,
)
_BOUND_KEYS = tuple(
    f"{key}_{suffix}"
    for key in (KEY_OVERALL_DEPTH_PG, KEY_TOP_Bflange_PG, KEY_BOTTOM_Bflange_PG)
    for suffix in ("lb", "ub", "inc")
)


def max_running_per_client() -> int:
    return int(getattr(settings, "PSO_MAX_RUNNING_PER_CLIENT", 3))


def _positive_number(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    try:
        number = float(value)
    except (TypeError, ValueError):
        return False
    return math.isfinite(number) and number > 0


def _bound_number(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    try:
        number = float(value)
    except (TypeError, ValueError):
        return False
    return math.isfinite(number) and number >= 0


def optimization_input_error(data: Any) -> Optional[str]:
    """Message saying why `data` cannot be optimised, or None when it can."""
    if not isinstance(data, dict):
        return "Optimisation input must be an object."

    for key in _THICKNESS_LIST_KEYS:
        value = data.get(key)
        if value is None:
            continue
        if isinstance(value, list):
            if len(value) > MAX_LIST_ITEMS:
                return f"{key} may hold at most {MAX_LIST_ITEMS} values."
            if not all(_positive_number(v) for v in value):
                return f"{key} must hold positive numbers."

    for key in _BOUND_KEYS:
        value = data.get(key)
        if value in (None, ""):
            continue
        if not _bound_number(value):
            return f"{key} must be a number of zero or more."

    from apps.modules.flexure_member.submodules.plate_girder.adapter import validate_input
    try:
        validate_input(data)
    except Exception as exc:
        return str(exc)
    return None


def client_ident(scope: dict, user_id: Optional[int]) -> str:
    """The signed-in user, else the client address.

    nginx sets X-Real-IP to the address it was connected from, replacing any value
    the client sent, so it is preferred. X-Forwarded-For (which a client can
    prefix) and the socket address are fallbacks for runs without nginx.
    """
    if user_id is not None:
        return f"user:{user_id}"
    headers = dict(scope.get("headers") or [])
    real_ip = headers.get(b"x-real-ip", b"").decode("latin-1").strip()
    if real_ip:
        return f"ip:{real_ip}"
    forwarded = headers.get(b"x-forwarded-for", b"").decode("latin-1")
    if forwarded:
        return "ip:" + "".join(forwarded.split())
    client = scope.get("client") or ("unknown", 0)
    return f"ip:{client[0]}"


def _slot_key(ident: str) -> str:
    return f"pso_running:{ident}"


def acquire_run_slot(ident: str) -> bool:
    """Count one more running optimisation for `ident`; False when at the limit."""
    key = _slot_key(ident)
    cache.add(key, 0, timeout=SLOT_TTL)
    try:
        running = cache.incr(key)
    except ValueError:
        # The key expired between add() and incr().
        cache.add(key, 1, timeout=SLOT_TTL)
        running = 1
    if running > max_running_per_client():
        release_run_slot(ident)
        return False
    return True


def release_run_slot(ident: str) -> None:
    key = _slot_key(ident)
    try:
        if cache.decr(key) < 0:
            cache.set(key, 0, timeout=SLOT_TTL)
    except ValueError:
        pass
