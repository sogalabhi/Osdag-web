"""Limits on the plate girder optimisation started over the WebSocket.

Guests may optimise, as they may design. Each start is validated like a design
request, the message size and thickness lists are capped, a connection runs one
optimisation at a time, and one client can only have a few running at once.

The Celery task is replaced by a stub (no optimisation runs and nothing is
queued), revoking is stubbed, and the channel layer is in memory (conftest).
"""
import copy
import itertools
import json
from pathlib import Path
from unittest.mock import patch

import pytest
from apps.core import consumers
from apps.modules.flexure_member.submodules.plate_girder import optimization_limits as limits
from apps.modules.flexure_member.submodules.plate_girder import tasks as pg_tasks
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator

from osdag_core.Common import (
    KEY_LENGTH,
    KEY_OVERALL_DEPTH_PG,
    KEY_OVERALL_DEPTH_PG_TYPE,
    KEY_WEB_THICKNESS_PG,
)

FIXTURE = (Path(__file__).resolve().parent / "fixtures" / "design_inputs"
           / "flexure_member__plate_girder" / "defaults-all.json")


pytestmark = pytest.mark.django_db(transaction=True)


def ui_payload():
    data = json.loads(FIXTURE.read_text(encoding="utf-8"))["inputs"]
    data[KEY_OVERALL_DEPTH_PG_TYPE] = "Optimized"
    return data


class FakeTask:
    def __init__(self):
        self.started = []
        self._ids = itertools.count(1)

    def delay(self, channel_name, input_data, user_id=None):
        task_id = f"task-{next(self._ids)}"
        self.started.append((task_id, channel_name, user_id))
        return type("Result", (), {"id": task_id})()


@pytest.fixture
def env(settings):
    from django.core.cache import cache
    cache.clear()
    settings.PSO_MAX_RUNNING_PER_CLIENT = 2
    fake = FakeTask()
    revoked = []

    async def no_material_error(input_data, user_id):
        return None

    async def guest(token):
        return None

    with patch.object(pg_tasks, "run_pso_optimization", fake), \
            patch.object(consumers, "_unknown_material_error", no_material_error), \
            patch.object(consumers, "_user_id_from_token", guest), \
            patch("config.celery.app.control.revoke", lambda task_id, **kw: revoked.append(task_id)):
        yield fake, revoked
    cache.clear()


def communicator(ip="203.0.113.5"):
    return WebsocketCommunicator(
        consumers.PSOOptimizationConsumer.as_asgi(),
        "/ws/optimize/plate-girder/",
        headers=[(b"x-forwarded-for", ip.encode())],
    )


async def _start(comm, data):
    await comm.send_json_to({"type": "start_optimization", "data": data})
    return await comm.receive_json_from(timeout=5)


def run(coro_fn):
    return async_to_sync(coro_fn)()


def test_guest_start_with_the_page_payload_is_accepted(env):
    fake, _ = env

    async def scenario():
        comm = communicator()
        assert (await comm.connect())[0]
        reply = await _start(comm, ui_payload())
        await comm.disconnect()
        return reply

    reply = run(scenario)
    assert reply["type"] == "task_started"
    assert len(fake.started) == 1
    assert fake.started[0][2] is None


def test_oversized_message_is_rejected(env):
    fake, _ = env
    data = ui_payload()
    data["padding"] = "x" * (limits.MAX_MESSAGE_CHARS + 1)

    async def scenario():
        comm = communicator()
        await comm.connect()
        reply = await _start(comm, data)
        await comm.disconnect()
        return reply

    reply = run(scenario)
    assert reply["type"] == "pso_error"
    assert fake.started == []


def test_overlong_thickness_list_is_rejected(env):
    fake, _ = env
    data = ui_payload()
    data[KEY_WEB_THICKNESS_PG] = ["10"] * (limits.MAX_LIST_ITEMS + 1)

    async def scenario():
        comm = communicator()
        await comm.connect()
        reply = await _start(comm, data)
        await comm.disconnect()
        return reply

    reply = run(scenario)
    assert reply["type"] == "pso_error"
    assert fake.started == []


def test_input_the_design_endpoint_rejects_is_rejected(env):
    fake, _ = env
    data = ui_payload()
    data[KEY_LENGTH] = "long"

    async def scenario():
        comm = communicator()
        await comm.connect()
        reply = await _start(comm, data)
        await comm.disconnect()
        return reply

    reply = run(scenario)
    assert reply["type"] == "pso_error"
    assert fake.started == []


def test_new_start_on_a_connection_replaces_the_running_one(env, settings):
    fake, revoked = env
    settings.PSO_MAX_RUNNING_PER_CLIENT = 1

    async def scenario():
        comm = communicator()
        await comm.connect()
        first = await _start(comm, ui_payload())
        second = await _start(comm, ui_payload())
        await comm.disconnect()
        return first, second

    first, second = run(scenario)
    assert first["type"] == second["type"] == "task_started"
    assert revoked[0] == "task-1"
    assert len(fake.started) == 2


def test_running_optimisations_per_client_are_capped(env):
    fake, _ = env

    async def scenario():
        comms = [communicator() for _ in range(3)]
        replies = []
        for comm in comms:
            await comm.connect()
            replies.append(await _start(comm, ui_payload()))
        # Another client is not affected.
        other = communicator(ip="198.51.100.7")
        await other.connect()
        replies.append(await _start(other, ui_payload()))
        for comm in comms + [other]:
            await comm.disconnect()
        return replies

    replies = run(scenario)
    assert [r["type"] for r in replies] == ["task_started", "task_started", "pso_error", "task_started"]
    assert len(fake.started) == 3


def test_finished_or_closed_runs_free_their_slot(env, settings):
    fake, _ = env
    settings.PSO_MAX_RUNNING_PER_CLIENT = 1

    async def scenario():
        layer = get_channel_layer()
        first = communicator()
        await first.connect()
        started = await _start(first, ui_payload())
        blocked_comm = communicator()
        await blocked_comm.connect()
        blocked = await _start(blocked_comm, ui_payload())

        # The run finishes: its slot is free again.
        await layer.send(started["data"]["channel_name"],
                         {"type": "pso_complete", "task_id": started["data"]["task_id"], "data": {}})
        assert (await first.receive_json_from(timeout=5))["type"] == "pso_complete"
        after_complete = await _start(blocked_comm, ui_payload())

        # Closing the socket of a running optimisation frees its slot as well.
        await blocked_comm.disconnect()
        after_close = await _start(first, ui_payload())
        await first.disconnect()
        return blocked, after_complete, after_close

    blocked, after_complete, after_close = run(scenario)
    assert blocked["type"] == "pso_error"
    assert after_complete["type"] == "task_started"
    assert after_close["type"] == "task_started"


def test_events_of_a_replaced_run_do_not_end_the_current_one(env, settings):
    settings.PSO_MAX_RUNNING_PER_CLIENT = 1

    async def scenario():
        layer = get_channel_layer()
        comm = communicator()
        await comm.connect()
        first = await _start(comm, ui_payload())
        await _start(comm, ui_payload())
        channel = first["data"]["channel_name"]
        await layer.send(channel, {"type": "pso_error", "task_id": first["data"]["task_id"], "data": {}})
        await layer.send(channel, {"type": "pso_heartbeat", "task_id": "task-2", "data": {}})
        forwarded = await comm.receive_json_from(timeout=5)
        # The replaced run's error was dropped, so the slot is still held.
        other = communicator()
        await other.connect()
        blocked = await _start(other, ui_payload())
        await other.disconnect()
        await comm.disconnect()
        return forwarded, blocked

    forwarded, blocked = run(scenario)
    assert forwarded["type"] == "pso_heartbeat"
    assert blocked["type"] == "pso_error"


def test_task_has_time_limits():
    task = pg_tasks.run_pso_optimization
    assert task.soft_time_limit == limits.SOFT_TIME_LIMIT
    assert task.time_limit == limits.TIME_LIMIT
    assert task.time_limit > task.soft_time_limit


@pytest.mark.parametrize("scope, user_id, expected", [
    ({"headers": [(b"x-real-ip", b"203.0.113.9"), (b"x-forwarded-for", b"1.2.3.4, 203.0.113.9")]}, None,
     "ip:203.0.113.9"),
    ({"headers": [(b"x-forwarded-for", b"203.0.113.5, 10.0.0.2")], "client": ("10.0.0.9", 1)}, None,
     "ip:203.0.113.5,10.0.0.2"),
    ({"headers": [], "client": ("10.0.0.9", 1)}, None, "ip:10.0.0.9"),
    ({"headers": [(b"x-forwarded-for", b"203.0.113.5")]}, 42, "user:42"),
])
def test_client_ident(scope, user_id, expected):
    assert limits.client_ident(scope, user_id) == expected


def test_input_checks():
    data = ui_payload()
    assert limits.optimization_input_error(data) is None
    assert limits.optimization_input_error([]) is not None
    bad = copy.deepcopy(data)
    bad[KEY_WEB_THICKNESS_PG] = ["10", "-4"]
    assert limits.optimization_input_error(bad) is not None
    bad = copy.deepcopy(data)
    bad[f"{KEY_OVERALL_DEPTH_PG}_lb"] = "nan"
    assert limits.optimization_input_error(bad) is not None
    ok = copy.deepcopy(data)
    for suffix, value in (("lb", "200"), ("ub", "2000"), ("inc", "")):
        ok[f"{KEY_OVERALL_DEPTH_PG}_{suffix}"] = value
    assert limits.optimization_input_error(ok) is None
