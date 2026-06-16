from celery.signals import task_postrun
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import logging

logger = logging.getLogger(__name__)

@task_postrun.connect
def on_task_postrun(task_id, task, retval, state, **kwargs):
    channel_layer = get_channel_layer()
    if channel_layer:
        logger.info(f"Celery task {task_id} completed with state {state}. Broadcasting to channel layer.")
        
        result_val = None
        error_val = None
        if state == "SUCCESS":
            import json
            try:
                serialized = json.dumps(retval)
                if len(serialized) > 500 * 1024:  # 500 KB
                    logger.info(f"Celery task {task_id} result is large ({len(serialized)} bytes). Omitting from WebSocket broadcast.")
                    result_val = None
                else:
                    result_val = retval
            except Exception as e:
                logger.error(f"Failed to serialize Celery task {task_id} result: {e}")
                result_val = None
        else:
            error_val = str(retval)

        async_to_sync(channel_layer.group_send)(
            f"task_{task_id}",
            {
                "type": "task.update",
                "status": state,
                "result": result_val,
                "error": error_val
            }
        )
    else:
        logger.error("Could not obtain Channel Layer inside Celery task_postrun signal receiver.")
