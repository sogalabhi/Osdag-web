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
            result_val = retval
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
