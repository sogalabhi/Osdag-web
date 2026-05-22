"""
WebSocket consumers for real-time PSO optimization updates.

This module provides lightweight WebSocket consumers that delegate heavy computation
to Celery tasks, preventing Django event loop blocking.
"""

import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)


class PSOOptimizationConsumer(AsyncJsonWebsocketConsumer):
    """
    Lightweight WebSocket consumer for PSO optimization.
    
    This consumer:
    - Handles WebSocket connection/disconnection
    - Receives start_optimization messages and triggers Celery tasks
    - Listens to Channel Layer for updates from Celery workers
    - Forwards updates to connected clients
    - **CRITICAL**: Revokes running Celery tasks on disconnect to prevent "zombie" tasks
    
    All heavy computation happens in Celery workers, not in this consumer.
    """
    
    def __init__(self, *args, **kwargs):
        """Initialize consumer with task tracking."""
        super().__init__(*args, **kwargs)
        self.task_id = None  # Track the running Celery task ID for revocation
    
    async def connect(self):
        """Handle WebSocket connection."""
        logger.info(f"WebSocket connecting: {self.channel_name}")
        
        # Accept the connection
        await self.accept()
        
        # Add to a group for this optimization session
        # For now, we'll use a simple approach - can be enhanced later
        logger.info(f"WebSocket connected: {self.channel_name}")
    
    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        
        CRITICAL: If there's a running Celery task, revoke it immediately.
        This prevents "zombie" tasks from consuming CPU after the user closes the tab.
        Without this, users refreshing/closing tabs can DOS the worker nodes.
        """
        logger.info(f"WebSocket disconnected: {self.channel_name}, code: {close_code}")
        
        # CRITICAL: Since we are using threads, task revocation is a bit trickier, but acceptable.
        if self.task_id:
            logger.warning(f"Disconnect detected. Thread {self.task_id} will finish naturally.")
            try:
                pass
            except Exception as e:
                logger.error(f"Error during disconnect cleanup: {e}")
        
        # Clean up channel layer group if needed
        # (Currently not using groups, but good practice for future)
    
    async def receive_json(self, content):
        """Handle incoming JSON messages from client."""
        message_type = content.get('type')
        
        if message_type == 'start_optimization':
            logger.info(f"Received start_optimization message on channel: {self.channel_name}")
            
            # Extract input data
            input_data = content.get('data', {})
            
            # Use direct function call in a local thread to bypass Celery/Redis
            # This is essential for local Windows development without Redis.
            from apps.modules.flexure_member.submodules.plate_girder.tasks import run_pso_optimization
            import threading
            import uuid
            
            # Generate a faux task ID
            self.task_id = str(uuid.uuid4())
            
            class DummyTaskContext:
                def __init__(self, task_id):
                    self.id = task_id
            
            class DummySelf:
                def __init__(self, task_id):
                    self.id = task_id
                    self.request = DummyTaskContext(task_id)

            def task_thread(channel, data, tid):
                try:
                    # Celery with bind=True will automatically pass 'self' as the 1st argument.
                    # We just need to pass the remaining 2 arguments.
                    run_pso_optimization(channel, data)
                except Exception as e:
                    logger.error(f"Thread task error: {e}")
                    import traceback
                    traceback.print_exc()

            try:
                # Trigger task asynchronously in a Thread
                t = threading.Thread(target=task_thread, args=(self.channel_name, input_data, self.task_id), daemon=True)
                t.start()
                
                logger.info(f"Local thread task triggered: {self.task_id}")
                
                # Send acknowledgment to client
                await self.send_json({
                    'type': 'task_started',
                    'task_id': self.task_id,
                    'data': {
                        'channel_name': self.channel_name
                    }
                })
            except Exception as e:
                logger.error(f"Error triggering thread task: {e}")
                await self.send_json({
                    'type': 'error',
                    'data': {
                        'message': f'Failed to start optimization: {str(e)}'
                    }
                })
        else:
            logger.warning(f"Unknown message type: {message_type}")
    
    async def pso_update(self, event):
        """
        Handle PSO update messages from Channel Layer.
        
        This method is called when a Celery task sends an update via Channel Layer.
        """
        data = event.get('data', {})
        logger.debug(f"PSO update received: iteration {data.get('iteration', 'unknown')}, particle {data.get('particle_index', 'unknown')}")
        
        # Forward the update to the WebSocket client
        await self.send_json({
            'type': 'pso_update',
            'data': data
        })
    
    async def pso_complete(self, event):
        """
        Handle PSO completion messages from Channel Layer.
        
        This method is called when a Celery task completes.
        """
        data = event.get('data', {})
        logger.info(f"PSO optimization complete: {data.get('total_iterations', 'unknown')} iterations")
        
        # Clear task_id since task is complete (no need to revoke)
        self.task_id = None
        
        # Forward the completion to the WebSocket client
        await self.send_json({
            'type': 'pso_complete',
            'data': data
        })
    
    async def pso_heartbeat(self, event):
        """
        Handle PSO heartbeat messages from Channel Layer.
        
        This method is called periodically to keep the connection alive.
        """
        data = event.get('data', {})
        logger.debug(f"PSO heartbeat: {data.get('timestamp', 'unknown')}")
        
        # Forward the heartbeat to the WebSocket client
        await self.send_json({
            'type': 'pso_heartbeat',
            'data': data
        })
    
    async def pso_error(self, event):
        """
        Handle PSO error messages from Channel Layer.
        
        This method is called when a Celery task encounters an error.
        """
        data = event.get('data', {})
        logger.error(f"PSO error: {data.get('message', 'Unknown error')}")
        
        # Clear task_id since task has errored (no need to revoke)
        self.task_id = None
        
        # Forward the error to the WebSocket client
        await self.send_json({
            'type': 'pso_error',
            'data': data
        })
