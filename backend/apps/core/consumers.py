import json
import threading
import time
import os
import logging

from channels.generic.websocket import AsyncWebsocketConsumer, AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
from celery.result import AsyncResult

from apps.core.utils.api_errors import INTERNAL_ERROR_MESSAGE

logger = logging.getLogger(__name__)

# ─── Shared active-connection counter (atomic via threading.Lock) ─────────────
_active_ws_lock  = threading.Lock()
_active_ws_count = 0  # live gauge: total open WS connections across all workers

INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET", "osdag_metrics")
INFLUXDB_ORG    = os.getenv("INFLUXDB_ORG",    "osdag")


@database_sync_to_async
def _user_id_from_token(token):
    """Django user id for a Firebase ID token, or None for guests and invalid tokens."""
    if not token:
        return None
    from types import SimpleNamespace
    from apps.core.middleware.firebase_auth import FirebaseAuthentication
    try:
        result = FirebaseAuthentication().authenticate(
            SimpleNamespace(META={"HTTP_AUTHORIZATION": f"Bearer {token}"})
        )
    except Exception:
        return None
    return result[0].id if result else None


@database_sync_to_async
def _unknown_material_error(input_data, user_id):
    from apps.core.osdag_overrides import unknown_material_error
    return unknown_material_error(input_data, user_id)


@database_sync_to_async
def _check_task_status_sync(task_id: str):
    """Query Celery result backend synchronously in a thread pool."""
    task_result = AsyncResult(task_id)
    if task_result.ready():
        state      = task_result.status
        result_val = None
        error_val  = None
        if task_result.successful():
            result_val = task_result.result
        else:
            logger.error("Task %s ended as %s: %r", task_id, state, task_result.result)
            error_val = INTERNAL_ERROR_MESSAGE
        return {
            "ready": True,
            "status": state,
            "result": result_val,
            "error": error_val
        }
    return {"ready": False}


def _write_ws_point_sync(event: str, task_id: str, channel_name: str,
                          active_count: int, close_code: int = 0):
    """Synchronous InfluxDB write — runs in a daemon thread."""
    from django.conf import settings
    url   = os.getenv("INFLUXDB_URL", "http://influxdb:8086")
    token = settings.INFLUXDB_TOKEN
    if not token:
        return
    try:
        from influxdb_client import InfluxDBClient, Point, WritePrecision
        from influxdb_client.client.write_api import SYNCHRONOUS
        with InfluxDBClient(url=url, token=token, org=INFLUXDB_ORG) as client:
            write_api = client.write_api(write_options=SYNCHRONOUS)
            p = (
                Point("osdag_websockets")
                .tag("event",      event)           # "connect" | "disconnect"
                .tag("task_id",    task_id[:40])    # truncate long UUIDs
                .tag("close_code", str(close_code))
                .field("active_connections", int(active_count))
                .field("count", 1)
                .time(time.time_ns(), WritePrecision.NANOSECONDS)
            )
            write_api.write(bucket=INFLUXDB_BUCKET, org=INFLUXDB_ORG, record=p)
    except Exception as exc:
        logger.debug("[WSMetrics] write failed: %s", exc)


def _fire_ws_metric(event: str, task_id: str, channel_name: str,
                     active_count: int, close_code: int = 0):
    """Start a daemon thread so we never block the async event loop."""
    threading.Thread(
        target=_write_ws_point_sync,
        args=(event, task_id, channel_name, active_count, close_code),
        daemon=True,
    ).start()


class TaskStatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        global _active_ws_count

        self.task_id    = self.scope['url_route']['kwargs']['task_id']
        self.group_name = f"task_{self.task_id}"

        # Join the task group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

        # ── Track active connections ──────────────────────────────────────────
        with _active_ws_lock:
            _active_ws_count += 1
            current_count = _active_ws_count

        _fire_ws_metric(
            event="connect",
            task_id=self.task_id,
            channel_name=self.channel_name,
            active_count=current_count,
        )
        logger.debug("[WSMetrics] connect: task=%s  active=%d", self.task_id, current_count)

        # Check if the task is already completed (race condition mitigation)
        status_data = await _check_task_status_sync(self.task_id)
        if status_data["ready"]:
            await self.send(text_data=json.dumps({
                "status": status_data["status"],
                "result": status_data["result"],
                "error":  status_data["error"],
            }))

    async def disconnect(self, close_code):
        global _active_ws_count

        # Leave the task group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

        # ── Track active connections ──────────────────────────────────────────
        with _active_ws_lock:
            _active_ws_count = max(0, _active_ws_count - 1)
            current_count = _active_ws_count

        _fire_ws_metric(
            event="disconnect",
            task_id=self.task_id,
            channel_name=self.channel_name,
            active_count=current_count,
            close_code=close_code,
        )
        logger.debug("[WSMetrics] disconnect: task=%s  code=%s  active=%d",
                     self.task_id, close_code, current_count)

    # Receive message from task group and forward it to WebSocket client
    async def task_update(self, event):
        await self.send(text_data=json.dumps({
            "status": event["status"],
            "result": event.get("result"),
            "error":  event.get("error"),
        }))


class PSOOptimizationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time Plate Girder PSO optimization.

    Receives start_optimization requests, dispatches the heavy work to a Celery
    task, forwards streamed particle/heartbeat/completion updates back to the
    client, and revokes the running task on disconnect to avoid zombie tasks.

    Guests may optimise. Each start is validated like a design request, a
    connection runs one optimisation at a time (a new start replaces the running
    one), and one client may only have a few running at once
    (settings.PSO_MAX_RUNNING_PER_CLIENT); see plate_girder/optimization_limits.py.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.task_id = None
        self.slot_ident = None

    async def connect(self):
        logger.info(f"PSO WebSocket connecting: {self.channel_name}")
        await self.accept()

    async def disconnect(self, close_code):
        logger.info(f"PSO WebSocket disconnected: {self.channel_name}, code: {close_code}")
        if self.task_id:
            logger.warning(f"Disconnect detected. Revoking task {self.task_id} to prevent zombie task")
            await self._revoke_task()
        await self._release_slot()

    async def _revoke_task(self):
        task_id, self.task_id = self.task_id, None
        try:
            from config.celery import app

            def revoke_task():
                app.control.revoke(task_id, terminate=True)

            await sync_to_async(revoke_task)()
        except Exception as e:
            logger.error(f"Error revoking task {task_id}: {e}")

    async def _release_slot(self):
        if self.slot_ident is None:
            return
        from apps.modules.flexure_member.submodules.plate_girder.optimization_limits import release_run_slot
        ident, self.slot_ident = self.slot_ident, None
        await sync_to_async(release_run_slot)(ident)

    async def _send_error(self, message):
        await self.send_json({'type': 'pso_error', 'data': {'message': message}})

    async def receive(self, text_data=None, bytes_data=None, **kwargs):
        from apps.modules.flexure_member.submodules.plate_girder.optimization_limits import MAX_MESSAGE_CHARS
        if text_data is None:
            await self._send_error('Optimisation requests must be JSON text.')
            return
        if len(text_data) > MAX_MESSAGE_CHARS:
            await self._send_error('Optimisation request is too large.')
            return
        await super().receive(text_data=text_data, **kwargs)

    async def receive_json(self, content):
        if not isinstance(content, dict):
            await self._send_error('Optimisation request must be an object.')
            return
        message_type = content.get('type')

        if message_type == 'start_optimization':
            from apps.modules.flexure_member.submodules.plate_girder.optimization_limits import (
                acquire_run_slot,
                client_ident,
                max_running_per_client,
                optimization_input_error,
            )
            input_data = content.get('data', {})
            input_error = await sync_to_async(optimization_input_error)(input_data)
            if input_error:
                await self._send_error(input_error)
                return
            # The client sends its Firebase ID token in the message (not the URL, which gets logged).
            user_id = await _user_id_from_token(content.get('token'))
            material_error = await _unknown_material_error(input_data, user_id)
            if material_error:
                await self._send_error(material_error)
                return

            if self.task_id:
                # A new start on this connection replaces the running optimisation and keeps its slot.
                logger.info(f"Replacing PSO task {self.task_id} with a new start")
                await self._revoke_task()
            if self.slot_ident is None:
                ident = client_ident(self.scope, user_id)
                if not await sync_to_async(acquire_run_slot)(ident):
                    limit = max_running_per_client()
                    await self._send_error(
                        f'You already have {limit} optimisation{"s" if limit != 1 else ""} running. '
                        'Wait for one to finish, or close it, and try again.'
                    )
                    return
                self.slot_ident = ident

            from apps.modules.flexure_member.submodules.plate_girder.tasks import run_pso_optimization
            try:
                task_result = run_pso_optimization.delay(self.channel_name, input_data, user_id=user_id)
                self.task_id = task_result.id
                logger.info(f"PSO Celery task triggered: {self.task_id}")
                await self.send_json({
                    'type': 'task_started',
                    'data': {'task_id': self.task_id, 'channel_name': self.channel_name}
                })
            except Exception:
                logger.exception("Error triggering PSO task")
                await self._release_slot()
                await self.send_json({
                    'type': 'error',
                    'data': {'message': 'Failed to start optimization.'}
                })
        else:
            logger.warning(f"Unknown message type: {message_type}")

    def _is_current(self, event):
        """Events carry the id of the task that sent them; drop those of a replaced run."""
        task_id = event.get('task_id')
        return task_id is None or task_id == self.task_id

    async def pso_update(self, event):
        if self._is_current(event):
            await self.send_json({'type': 'pso_update', 'data': event.get('data', {})})

    async def pso_complete(self, event):
        if not self._is_current(event):
            return
        self.task_id = None
        await self._release_slot()
        await self.send_json({'type': 'pso_complete', 'data': event.get('data', {})})

    async def pso_heartbeat(self, event):
        if self._is_current(event):
            await self.send_json({'type': 'pso_heartbeat', 'data': event.get('data', {})})

    async def pso_error(self, event):
        if not self._is_current(event):
            return
        self.task_id = None
        await self._release_slot()
        await self.send_json({'type': 'pso_error', 'data': event.get('data', {})})
