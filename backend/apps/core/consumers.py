import json
import threading
import time
import os
import logging

from channels.generic.websocket import AsyncWebsocketConsumer
from celery.result import AsyncResult

logger = logging.getLogger(__name__)

# ─── Shared active-connection counter (atomic via threading.Lock) ─────────────
_active_ws_lock  = threading.Lock()
_active_ws_count = 0  # live gauge: total open WS connections across all workers

INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET", "osdag_metrics")
INFLUXDB_ORG    = os.getenv("INFLUXDB_ORG",    "osdag")


def _write_ws_point_sync(event: str, task_id: str, channel_name: str,
                          active_count: int, close_code: int = 0):
    """Synchronous InfluxDB write — runs in a daemon thread."""
    url   = os.getenv("INFLUXDB_URL",   "http://influxdb:8086")
    token = os.getenv("INFLUXDB_TOKEN", "osdag-super-secret-token")
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
        task_result = AsyncResult(self.task_id)
        if task_result.ready():
            state      = task_result.status
            result_val = None
            error_val  = None
            if task_result.successful():
                result_val = task_result.result
            else:
                error_val = str(task_result.result)

            await self.send(text_data=json.dumps({
                "status": state,
                "result": result_val,
                "error":  error_val,
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
