# Plate Girder PSO Web – Backend-Only Plan

**Scope**: This document is only about backend work for the Plate Girder PSO optimization flow  
**Out of scope**: All frontend UI / visualization / React work (listed explicitly so it can be handed to a frontend dev)

---

## 1. Current Backend Status (Plate Girder Module)

### 1.1 Completed – Normal REST Design Path

- **Adapter & Service (Normal Design) – DONE**
  - `adapter.py`: input validation, design dictionary creation, normal `PlateGirderWelded` design, CAD hook.
  - `service.py`: `calculate()`, `get_cad_model()`, `get_options()`.
  - `__init__.py`, registry, views, URLs:  
    - `POST /api/modules/flexure-member/plate-girder/design/`  
    - `GET /api/modules/flexure-member/plate-girder/options/`  
    - `POST /api/modules/flexure-member/plate-girder/cad/`

- **Frontend integration for NON-OPTIMIZED design – DONE (for context only)**
  - `PlateGirder.jsx`, `plateGirderConfig.js`, `plateGirderOutputConfig.js` wired to REST API.

### 1.2 Completed – Core PSO + Checks Imports

- **PSO algorithms import/verification – DONE**
  - File: `backend/apps/modules/flexure_member/submodules/plate_girder/pso_imports.py`
  - Imported and tested:
    - `GlobalBestPSO`
    - `IntelligentPSO`
    - Section utilities: `calc_yj`, `classify_section`, `shear_stress_unsym_I`

- **Design check modules import/verification – DONE**
  - File: `backend/apps/modules/flexure_member/submodules/plate_girder/design_checks_imports.py`
  - Imported and tested:
    - Moment: `corrected_design_bending_strength`, `moment_capacity_laterally_supported`, `calc_Mdv`, `calc_Mdv_lat_unsupported`, `bending_check_lat_unsupported`
    - Shear: `calc_K_v`, `shear_capacity_laterally_supported_thick_web`, `shear_buckling_check_simple_postcritical`, `shear_buckling_check_intermediate_stiffener`, `shear_buckling_check_tension_field`, `tension_field_intermediate_stiffener`, `tension_field_end_stiffener`, `end_panel_stiffener_calc`
    - Web buckling: `web_buckling_laterally_supported_thick_web`
    - Web crippling: `check_web_crippling`
    - Deflection: `evaluate_deflection_kNm_mm`, `deflection_from_moment_kNm_mm`
    - Welds: `design_welds_with_strength_web_to_flange`, `weld_leg_from_q_with_cl10`, `weld_for_end_stiffener`
    - Web thickness: `min_web_thickness_thick_web`
  - `verify_imports()` confirms **7/7** check modules are available and working with sample calls.

- **Core Plate Girder class available – READY TO USE**
  - `osdag_core/design_type/plate_girder/core/plate_girder.py`
  - Key methods you can call from backend:
    - `set_input_values(design_dictionary)`
    - `output_values()`
    - `optimized_method(design_dictionary, is_thick_web, is_symmetric, viz_callback=None)`
    - `design_check_optimized_version(design_dictionary)`
    - `build_variable_structure(is_thick_web, is_symmetric)`
    - `get_bounds(variable_list)`

### 1.3 Existing Infrastructure – Already in Place

- **Celery global config – DONE (project-wide)**
  - `backend/config/celery.py` and Celery wiring in `settings.py`.

- **Redis setup – DONE**
  - Broker/backend for Celery.
  - Channel layer for Django Channels.

- **WebSocket consumer & routing – DONE (generic PSO infra)**
  - `backend/apps/core/websocket/consumers.py` – `PSOOptimizationConsumer`
  - `backend/apps/core/websocket/routing.py`
  - Route: `ws/optimize/plate-girder/`
  - **Note**: Consumer expects a Celery task `run_pso_optimization` which is not implemented yet (backend TODO below).

---

## 2. Backend TODOs (Your Work Only)

This is the concrete checklist of backend work you still need to do for Plate Girder PSO.

### 2.1 Wire Optimized Mode in the Plate Girder Service/Adapter

**Goal**: When frontend sends `design_type = "Optimized"`, backend should run PSO instead of the normal deterministic design.

- **Tasks**
  1. **Extend adapter to support an “optimization request” path**
     - In `adapter.py`, add a separate function, for example:
       - `create_optimization_input(inputs)` – builds the same design dictionary but marked/intended for PSO.
     - Ensure it:
       - Sets `Total.Design_Type` to `"Optimized"` or some flag recognized by `PlateGirderWelded`.
       - Still fills basic load, material, web philosophy, restraints, etc.
  2. **Extend service to expose an optimization entry point**
     - (preferred for web sockets): you do NOT add a new REST endpoint; instead, WebSocket will send `input_data` directly to Celery task.
  3. **Clearly define the “optimization input payload”**
     - The JSON that the Celery task expects:
       - Exactly the same keys as the current REST design dictionary **plus**:
         - `design_type = "Optimized"`
         - (Optionally) optimization bounds if you want them to be user-configurable later.

> Outcome: You have a clean Python function that, given `input_data` from the WebSocket/Celery task, returns a ready-to-use `design_dictionary` for `PlateGirderWelded.optimized_method()`.

### 2.2 Implement Celery Task: `run_pso_optimization` (CRITICAL)

**Goal**: Run PSO in a Celery worker and stream progress back over Channels.

- **File to create**
  - `backend/apps/modules/flexure_member/submodules/plate_girder/tasks.py`

- **Core task structure**
  - Use `@shared_task(bind=True, max_retries=3)`:

```python
@shared_task(bind=True, max_retries=3)
def run_pso_optimization(self, channel_name, input_data):
    """
    Celery task that runs Plate Girder PSO optimization and streams results
    to a single WebSocket channel identified by `channel_name`.
    """
    ...
```

- **Internals**
  1. **Initialize Redis / Channel layer**
     - `from channels.layers import get_channel_layer`
     - `channel_layer = get_channel_layer()`
  2. **Instantiate PlateGirderWelded and prepare design dictionary**
     - From your adapter-like helper:
       - `design_dict = create_optimization_input(input_data)`
     - Figure out:
       - `is_thick_web` from `Design.Web_Philosophy`
       - `is_symmetric` from `symmetry`
  3. **Define PSO progress callback**
     - Signature called from `optimized_method`:
       - `viz_callback(depth, ur, weight_kg, iteration, particle_idx, position, variable_list, lb, ub)`
     - Wrap this as a closure inside the Celery task that:
       - Buffers/aggregates particles.
       - Throttles sends to **≤ 10 FPS**.
       - Maintains a **sequence number** for every message.
       - Uses `async_to_sync(channel_layer.group_send)(...)` to push:

```python
{
  "type": "pso.update",
  "sequence": seq,
  "iteration": iteration,
  "particle_index": particle_idx,
  "depth": depth,
  "ur": ur,
  "weight_kg": weight_kg,
  "variables": position,
  "variable_names": variable_list,
  "bounds": {"lb": lb, "ub": ub},
}
```

  4. **Heartbeat & error handling**
     - Every **2 seconds**, send:

```python
{
  "type": "pso.heartbeat",
  "sequence": seq,
  "status": "alive"
}
```

     - On any exception:
       - Log full traceback.
       - Send:

```python
{
  "type": "pso.error",
  "sequence": seq,
  "error": "Human-readable message",
}
```

  5. **Run optimization**
     - Call:

```python
girder = PlateGirderWelded()
girder.set_input_values(design_dict)
result = girder.optimized_method(
    design_dict,
    is_thick_web=is_thick_web,
    is_symmetric=is_symmetric,
    viz_callback=pso_progress_callback,
)
```

  6. **Send final result**
     - Extract optimized design, UR, weight, etc. from `result` / `girder.output_values()`.
     - Send:

```python
{
  "type": "pso.complete",
  "sequence": seq,
  "result": { ... final optimized design dict ... }
}
```

> Outcome: Given a channel name + input_data, the Celery worker runs PSO and streams `pso.update`, `pso.complete`, `pso.heartbeat`, `pso.error` messages to Channels.

### 2.3 Connect WebSocket Consumer to Celery Task

**Goal**: When frontend opens `ws/optimize/plate-girder/` and sends a “start” message, consumer enqueues the Celery task.

- **Where**: `backend/apps/core/websocket/consumers.py` – `PSOOptimizationConsumer`

- **Tasks**
  1. **Import the task**

```python
from apps.modules.flexure_member.submodules.plate_girder.tasks import run_pso_optimization
```

  2. **Handle “start optimization” message**
     - Decide a simple message protocol, for example:

```json
{ "action": "start", "module": "plate-girder", "input_data": { ...same as REST design... } }
```

     - In `receive_json` or equivalent:
       - Validate `module == "plate-girder"`.
       - Extract `input_data`.
       - Call:

```python
run_pso_optimization.delay(self.channel_name, input_data)
```

  3. **Fan-out vs direct channel**
     - Simplest: Use **one consumer = one Celery task**, send directly to that channel via `self.channel_name`.
     - If you already use groups: ensure the Celery task sends to the right group name (e.g. `f"pso_{self.channel_name}"`).

> Outcome: WebSocket can trigger optimization with a single JSON message; backend takes care of enqueuing and streaming.

### 2.4 Logging & Observability (Backend)

**Goal**: Make debugging of PSO easier without looking at the frontend.

- **In Celery task**
  - Log:
    - Task start/end.
    - Input summary (span, loads, initial bounds).
    - Each throttled send (iteration, count of particles in batch).
    - Heartbeats.
    - Any exceptions + stack traces.

- **In `PlateGirderWelded.optimized_method` (already logs some info)**
  - You already have logging hooks; just ensure the logger is correctly configured when called from Celery (no GUI handlers).

---

## 3. Explicit Frontend Responsibilities (For Hand-off)

These are **not your tasks**; list them so you and the frontend dev are aligned.

### 3.1 WebSocket Client & Data Flow

- Implement `useWebSocket.js` hook:
  - Connect to `ws/optimize/plate-girder/`.
  - Send `{ action: "start", module: "plate-girder", input_data: ... }` when user clicks “Optimize”.
  - Listen for:
    - `pso.update`
    - `pso.complete`
    - `pso.heartbeat`
    - `pso.error`
  - Reconnect / heartbeat handling (10s timeout).

- Implement `DataProcessor.js`:
  - Maintain current iteration/swarm state.
  - Drop stale frames (lower iteration numbers).
  - Throttle rendering to ~10 FPS on the client side.

### 3.2 UI / Dashboard Components

- `useHighDPICanvas.js` – hook for high-DPI canvas.
- `ParallelCoordinates.jsx` – variables vs normalized range plot.
- `PerformanceMap.jsx` – weight vs UR scatter.
- `CrossSectionPreview.jsx` – optimized cross-section preview.
- `PSODashboard.jsx` – orchestrates the above and hooks into `useWebSocket` + `DataProcessor`.

### 3.3 Plate Girder Module Integration (Frontend)

- In `PlateGirder.jsx` (or equivalent):
  - Detect `design_type === "Optimized"`.
  - Instead of hitting normal REST endpoint, trigger WebSocket optimization with current form inputs.
  - Show PSO dashboard while optimization is in progress.
  - Display final optimized result alongside normal tabular outputs.

---

## 4. Minimal Backend/Frontend Contract

To keep things simple between your backend and the frontend dev:

- **Request (WebSocket → Backend)**

```json
{
  "action": "start",
  "module": "plate-girder",
  "input_data": {
    "...": "same fields as current REST /design/ endpoint",
    "Total.Design_Type": "Optimized"
  }
}
```

- **Streaming Messages (Backend → WebSocket)**

1. **Progress update**

```json
{
  "type": "pso.update",
  "sequence": 1,
  "iteration": 5,
  "particle_index": 12,
  "depth": 900.0,
  "ur": 0.85,
  "weight_kg": 1200.5,
  "variables": [ ... ],
  "variable_names": [ "D", "tw", "bf_top", "bf_bot", "tf_top", "tf_bot", ... ],
  "bounds": { "lb": [...], "ub": [...] }
}
```

2. **Heartbeat**

```json
{
  "type": "pso.heartbeat",
  "sequence": 15,
  "status": "alive"
}
```

3. **Completion**

```json
{
  "type": "pso.complete",
  "sequence": 100,
  "result": {
    "design": { "...": "final optimized design dict from output_values()" },
    "summary": {
      "weight_kg": 1180.0,
      "max_ur": 0.92,
      "iterations": 100
    }
  }
}
```

4. **Error**

```json
{
  "type": "pso.error",
  "sequence": 7,
  "error": "Detailed error message for UI"
}
```

---

## 5. Backend Checklist (Quick View)

- [x] Normal REST design path (adapter, service, registry, endpoints)
- [x] PSO algorithms imported & verified (`pso_imports.py`)
- [x] Design checks imported & verified (`design_checks_imports.py`)
- [x] PlateGirderWelded optimization methods available in `osdag_core`
- [x] Celery + Redis + Channels infra configured project-wide
- [ ] Wire optimization input path in adapter/service (`design_type = "Optimized"`)
- [ ] Implement `run_pso_optimization` Celery task with throttling, heartbeat, sequence numbers
- [ ] Connect WebSocket consumer to Celery task (start message → `.delay(...)`)
- [ ] Add robust logging for PSO runs and message streaming


