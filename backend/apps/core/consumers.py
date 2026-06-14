import json
from channels.generic.websocket import AsyncWebsocketConsumer
from celery.result import AsyncResult

class TaskStatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.task_id = self.scope['url_route']['kwargs']['task_id']
        self.group_name = f"task_{self.task_id}"

        # Join the task group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

        # Check if the task is already completed (race condition mitigation)
        task_result = AsyncResult(self.task_id)
        if task_result.ready():
            state = task_result.status
            result_val = None
            error_val = None
            if task_result.successful():
                result_val = task_result.result
            else:
                error_val = str(task_result.result)

            await self.send(text_data=json.dumps({
                "status": state,
                "result": result_val,
                "error": error_val
            }))

    async def disconnect(self, close_code):
        # Leave the task group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # Receive message from task group and forward it to WebSocket client
    async def task_update(self, event):
        await self.send(text_data=json.dumps({
            "status": event["status"],
            "result": event.get("result"),
            "error": event.get("error")
        }))
