"""
Celery task for Plate Girder PSO optimization.

Runs PlateGirderWelded.optimized_method() inside a Celery worker and streams
progress updates to a WebSocket channel via Django Channels.
"""
import time
import logging
import traceback
import json
from typing import Any, Dict, List, Tuple

from celery import shared_task
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import numpy as np

# ---------------------------------------------------------------------------
# Local imports
# ---------------------------------------------------------------------------
from apps.modules.flexure_member.submodules.plate_girder.adapter import (
    create_optimization_input,
    determine_optimization_flags,
    create_module,
)
from osdag_core.Common import (
    KEY_MATERIAL, KEY_LENGTH, KEY_SHEAR, KEY_MOMENT, KEY_WEB_PHILOSOPHY,
    KEY_TOP_FLANGE_THICKNESS_PG, KEY_BOTTOM_FLANGE_THICKNESS_PG, KEY_WEB_THICKNESS_PG
)

logger = logging.getLogger(__name__)

SEND_INTERVAL = 0.10  # 10 FPS max for progress updates
HEARTBEAT_INTERVAL = 2.0  # seconds


def _to_output_dict(raw_output: List[List[Any]]) -> Dict[str, Dict[str, Any]]:
    """
    Convert PlateGirderWelded.output_values(True) result to a dict.
    """
    output: Dict[str, Dict[str, Any]] = {}
    for param in raw_output or []:
        if len(param) >= 4:
            key, label, param_type, value = param[0], param[1], param[2], param[3]
            if param_type == "TextBox" and key is not None:
                if hasattr(value, "item"):
                    value = value.item()
                output[key] = {"key": key, "label": label, "val": value}
    return output


def _sanitize_for_channels(obj: Any) -> Any:
    """
    Recursively convert objects to msgpack-serializable types.
    - numpy scalars -> Python scalars
    - numpy arrays -> lists of scalars
    """
    if isinstance(obj, dict):
        return {k: _sanitize_for_channels(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_for_channels(v) for v in obj]
    if isinstance(obj, tuple):
        return tuple(_sanitize_for_channels(v) for v in obj)

    # Numpy scalar
    if isinstance(obj, np.generic):
        return obj.item()

    # Numpy array
    if isinstance(obj, np.ndarray):
        return [_sanitize_for_channels(v) for v in obj.tolist()]

    return obj


@shared_task(bind=True, max_retries=3)
def run_pso_optimization(self, channel_name: str, input_data: Dict[str, Any]):
    """
    Celery task that runs Plate Girder PSO optimization and streams results
    to a WebSocket channel identified by `channel_name`.
    
    Logs comprehensive information for debugging:
    - Task start/end with timing
    - Input summary (span, loads, bounds)
    - Each throttled send (iteration, particle count)
    - Heartbeats
    - Exceptions with full stack traces
    """
    # Track statistics for logging
    update_count = 0
    throttled_count = 0
    
    task_start_time = time.time()
    logger.info("=" * 80)
    logger.info("🚀 PSO Optimization Task STARTED")
    logger.info("=" * 80)
    logger.info(f"Task ID: {self.request.id}")
    logger.info(f"Channel: {channel_name}")
    logger.info(f"Input keys: {list(input_data.keys())[:10]}...")  # Log first 10 keys
    
    channel_layer = get_channel_layer()
    seq = 0
    last_send = 0.0
    last_heartbeat = 0.0
    current_iteration = -1  # Track current iteration
    particles_in_batch = 0
    last_iteration_first_particle_sent = -1  # Track if we've sent first particle for this iteration

    def send_update_event(payload: Dict[str, Any]):
        nonlocal seq, last_send, update_count, current_iteration, particles_in_batch
        seq += 1
        payload["sequence"] = seq
        update_count += 1
        current_iteration = payload.get("iteration", current_iteration)
        particles_in_batch += 1
        
        async_to_sync(channel_layer.send)(
            channel_name,
            {
                "type": "pso_update",
                "data": _sanitize_for_channels(payload),
            },
        )
        last_send = time.time()
        
        # Log throttled send with iteration and particle info
        logger.debug(
            f"📊 PSO Update #{update_count} sent | "
            f"Iteration: {current_iteration}, "
            f"Particle: {payload.get('particle_index', 'N/A')}, "
            f"Depth: {payload.get('depth', 0):.1f}mm, "
            f"UR: {payload.get('ur', 0):.4f}, "
            f"Weight: {payload.get('weight_kg', 0):.2f}kg"
        )

    def send_heartbeat_if_needed():
        nonlocal last_heartbeat
        now = time.time()
        if now - last_heartbeat >= HEARTBEAT_INTERVAL:
            async_to_sync(channel_layer.send)(
                channel_name,
                {
                    "type": "pso_heartbeat",
                    "data": {
                        "sequence": seq + 1,
                        "status": "alive",
                        "timestamp": now,
                    },
                },
            )
            last_heartbeat = now
            logger.debug(f"💓 Heartbeat sent | Iteration: {current_iteration}, Updates sent: {update_count}")

    try:
        # Build design dictionary and flags
        logger.info("📋 Building design dictionary from input data...")
        logger.info(f"📋 Input data keys: {list(input_data.keys())}")
        logger.info(f"📋 Input data sample: {json.dumps({k: v for k, v in list(input_data.items())[:10]}, indent=2)}")
        
        design_dict = create_optimization_input(input_data)
        is_thick_web, is_symmetric = determine_optimization_flags(input_data)
        
        # Log input summary
        logger.info("📊 INPUT SUMMARY:")
        logger.info(f"  Span Length: {input_data.get('Member.Length', 'N/A')} m")
        logger.info(f"  Load - Moment: {input_data.get('Load.Moment', 'N/A')} kNm")
        logger.info(f"  Load - Shear: {input_data.get('Load.Shear', 'N/A')} kN")
        logger.info(f"  Material: {input_data.get('Material', 'N/A')}")
        logger.info(f"  Web Philosophy: {input_data.get('Design.Web_Philosophy', 'N/A')}")
        logger.info(f"  Is Thick Web: {is_thick_web}")
        logger.info(f"  Is Symmetric: {is_symmetric}")
        
        # Extract bounds info (will be logged after module creation)
        logger.info("🔧 Creating PlateGirderWelded module...")
        module = create_module()
        
        # Apply custom optimization bounds if provided
        from .adapter import apply_optimization_bounds
        apply_optimization_bounds(module, input_data)
        
        # CRITICAL: For optimization, we need to call set_input_values() BUT with scalar thickness values
        # Then override the thickness lists for PSO to use
        logger.info("⚙️ Calling set_input_values with scalar thickness values...")
        
        # Create a modified design_dict with scalar thickness values (first element of each list)
        scalar_design_dict = design_dict.copy()
        scalar_design_dict[KEY_TOP_FLANGE_THICKNESS_PG] = design_dict[KEY_TOP_FLANGE_THICKNESS_PG][0] if isinstance(design_dict[KEY_TOP_FLANGE_THICKNESS_PG], list) else design_dict[KEY_TOP_FLANGE_THICKNESS_PG]
        scalar_design_dict[KEY_BOTTOM_FLANGE_THICKNESS_PG] = design_dict[KEY_BOTTOM_FLANGE_THICKNESS_PG][0] if isinstance(design_dict[KEY_BOTTOM_FLANGE_THICKNESS_PG], list) else design_dict[KEY_BOTTOM_FLANGE_THICKNESS_PG]
        scalar_design_dict[KEY_WEB_THICKNESS_PG] = design_dict[KEY_WEB_THICKNESS_PG][0] if isinstance(design_dict[KEY_WEB_THICKNESS_PG], list) else design_dict[KEY_WEB_THICKNESS_PG]
        
        # Call set_input_values with scalar values to initialize all attributes
        module.set_input_values(scalar_design_dict)
        
        # Now override the thickness lists for PSO optimization
        logger.info("⚙️ Overriding thickness lists for PSO optimization...")
        module.top_flange_thickness_list = design_dict[KEY_TOP_FLANGE_THICKNESS_PG]
        module.bottom_flange_thickness_list = design_dict[KEY_BOTTOM_FLANGE_THICKNESS_PG]
        module.web_thickness_list = design_dict[KEY_WEB_THICKNESS_PG]
        
        # Import stiffener thickness keys
        from osdag_core.Common import KEY_IntermediateStiffener_thickness_val, KEY_LongitudnalStiffener_thickness_val
        
        # Override stiffener thickness lists
        module.int_thickness_list = design_dict.get(KEY_IntermediateStiffener_thickness_val, [])
        module.long_thickness_list = design_dict.get(KEY_LongitudnalStiffener_thickness_val, [])
        
        logger.info(f"  Top flange thicknesses: {module.top_flange_thickness_list}")
        logger.info(f"  Bottom flange thicknesses: {module.bottom_flange_thickness_list}")
        logger.info(f"  Web thicknesses: {module.web_thickness_list}")
        logger.info(f"  Intermediate stiffener thicknesses: {module.int_thickness_list}")
        logger.info(f"  Longitudinal stiffener thicknesses: {module.long_thickness_list}")
        
        # Log initial bounds (if available from module)
        if hasattr(module, 'bounds_map'):
            logger.info("📏 OPTIMIZATION BOUNDS:")
            for var, bounds in module.bounds_map.items():
                if len(bounds) >= 2:
                    logger.info(f"  {var}: [{bounds[0]}, {bounds[1]}]" + 
                              (f" step={bounds[2]}" if len(bounds) > 2 else ""))

        # Progress callback from optimized_method
        def viz_callback(depth, ur, weight_kg, iteration, particle_idx, position, variable_list, lb, ub):
            nonlocal last_send, throttled_count, current_iteration, particles_in_batch, last_iteration_first_particle_sent
            now = time.time()
            
            # Check if this is a new iteration
            is_new_iteration = (iteration != current_iteration)
            
            if is_new_iteration:
                # New iteration: reset counters and mark that we haven't sent first particle yet
                current_iteration = iteration
                particles_in_batch = 0
                last_iteration_first_particle_sent = -1
            
            # CRITICAL FIX: Always send at least the first particle of each iteration
            # This ensures we have one frame per iteration for replay
            is_first_particle = (particles_in_batch == 0)
            should_send = False
            
            if is_first_particle:
                # Always send first particle of each iteration (ensures frame cache has all iterations)
                should_send = True
                last_iteration_first_particle_sent = iteration
                logger.debug(f"🎯 Sending first particle of iteration {iteration} (guaranteed)")
            elif now - last_send >= SEND_INTERVAL:
                # Throttle check: only send if enough time has passed
                should_send = True
            else:
                # Throttled: skip this particle
                throttled_count += 1
                send_heartbeat_if_needed()
                particles_in_batch += 1  # Still count it for tracking
                return
            
            # Send the update
            send_update_event(
                {
                    "iteration": iteration,
                    "particle_index": particle_idx,
                    "depth": depth,
                    "ur": ur,
                    "weight_kg": weight_kg,
                    "variables": position,
                    "variable_names": variable_list,
                    "bounds": {"lb": lb, "ub": ub},
                }
            )
            send_heartbeat_if_needed()

        # Run optimization
        logger.info("🎯 Starting PSO optimization...")
        logger.info(f"  PSO Type: {'IntelligentPSO' if module.use_intelligent_pso else 'GlobalBestPSO'}")
        logger.info(f"  Max Iterations: 100 (hardcoded in optimized_method)")
        logger.info(f"  Particles: 50 (hardcoded in optimized_method)")
        optimization_start = time.time()
        
        result = module.optimized_method(
            design_dict,
            is_thick_web=is_thick_web,
            is_symmetric=is_symmetric,
            viz_callback=viz_callback,
        )
        
        optimization_duration = time.time() - optimization_start
        logger.info(f"✅ PSO optimization completed in {optimization_duration:.2f} seconds")
        logger.info(f"  Final Iteration: {current_iteration}")
        logger.info(f"  Total Updates Sent: {update_count}")
        logger.info(f"  Throttled (dropped): {throttled_count}")
        logger.info(f"  PSO Result: {result}")

        # Prepare final output
        logger.info("📤 Preparing final output...")
        raw_output = module.output_values(True)
        output = _to_output_dict(raw_output)
        
        logger.info(f"  Output parameters: {len(output)}")
        logger.info("  Key outputs:")
        for key in list(output.keys())[:5]:  # Log first 5 output keys
            logger.info(f"    - {key}: {output[key].get('val', 'N/A')}")

        # Final completion message
        seq += 1
        async_to_sync(channel_layer.send)(
            channel_name,
            {
                "type": "pso_complete",
                "data": {
                    "sequence": seq,
                    "result": _sanitize_for_channels(
                        {
                            "design": output,
                            "raw": raw_output,
                            "pso_result": result,
                        }
                    ),
                },
            },
        )
        
        total_duration = time.time() - task_start_time
        logger.info("=" * 80)
        logger.info("✅ PSO Optimization Task COMPLETED")
        logger.info("=" * 80)
        logger.info(f"Total Duration: {total_duration:.2f} seconds")
        logger.info(f"Optimization Duration: {optimization_duration:.2f} seconds")
        logger.info(f"Total Updates Sent: {update_count}")
        logger.info(f"Throttled Updates: {throttled_count}")
        logger.info(f"Final Sequence Number: {seq}")
        logger.info("=" * 80)

    except Exception as e:
        total_duration = time.time() - task_start_time
        error_traceback = traceback.format_exc()
        
        logger.error("=" * 80)
        logger.error("❌ PSO Optimization Task FAILED")
        logger.error("=" * 80)
        logger.error(f"Task ID: {self.request.id}")
        logger.error(f"Channel: {channel_name}")
        logger.error(f"Duration before failure: {total_duration:.2f} seconds")
        logger.error(f"Exception Type: {type(e).__name__}")
        logger.error(f"Exception Message: {str(e)}")
        logger.error("Full Traceback:")
        logger.error(error_traceback)
        logger.error("=" * 80)
        
        async_to_sync(channel_layer.send)(
            channel_name,
            {
                "type": "pso_error",
                "data": {
                    "sequence": seq + 1,
                    "message": str(e),
                    "traceback": error_traceback,
                },
            },
        )
        raise

