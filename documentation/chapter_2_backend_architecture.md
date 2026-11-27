# Chapter 2: Backend Architecture & Configuration

The Django backend serves as the orchestration layer of Osdag-Web. It handles API requests, database interactions, user authentication, and dispatches heavy computations to Celery.

---

## 2.1 Django Application Structure

Osdag-Web uses a clean modular app structure inside the `backend` folder:

```
backend/
├── apps/
│   ├── core/                  # Base platform logic
│   │   ├── api/               # Platform REST endpoints (projects, OSI, tasks)
│   │   ├── health.py          # /api/health/ endpoint (PostgreSQL + Redis check)
│   │   ├── models.py          # PostgreSQL core models (Project, UserAccount, OsiFile, CustomMaterials)
│   │   ├── catalog.py         # Read-only steel-section/material catalog from osdag_core's SQLite
│   │   ├── middleware.py      # Token auth parsing and user synchronization
│   │   └── tasks.py           # Celery tasks wrappers
│   ├── modules/               # Engineering design modules
│   │   ├── base_plate/
│   │   ├── shear_connection/  # Fin plate, cleat angle, seated angle, etc.
│   │   ├── tension_member/
│   │   └── views.py           # Central dispatch API views for calculations/options
│   └── sections/              # Structural steel section helpers
└── config/                    # Main project settings, URLs, and Celery setup
```

### Core Separation
* **`apps/core`:** Holds standard web platform tables, tasks, and middlewares. It has no structural engineering dependencies.
* **`apps/core` health check:** `GET /api/health/` reports `200` when PostgreSQL and Redis are reachable and `503` otherwise. Docker healthchecks and the deploy smoke test use it (see 11.8).
* **`apps/modules`:** Acts as the host for individual steel design modules. Every module contains submodules with specific `adapter.py` files to bridge web API requests to the `osdag_core` mathematical libraries.

---

## 2.2 Celery & Redis Integration

Celery handles design calculation (with its 3D model) and report compilation tasks out-of-process.

### 1. Connection Configurations
In `backend/config/settings.py`, Celery links to Redis via URL environment variables:
```python
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_TASK_ROUTES = {
    'apps.core.tasks.run_design_calculation_task': {'queue': 'calculations'},
    'apps.core.tasks.run_report_generation_task': {'queue': 'reports'},
}
```

### 2. Task Dispatching
Celery tasks are defined in `backend/apps/core/tasks.py`. They invoke the corresponding adapter methods inside the worker process:
```python
@shared_task(bind=True)
def run_design_calculation_task(self, module_name, submodule_slug, inputs, project_id=None, user_email=None, user_id=None):
    ServiceClass = get_service_class(module_name, submodule_slug)

    with user_rows(user_id):
        WebMainRegistry.start_recording()
        try:
            result = ServiceClass.calculate(inputs=inputs, ...)   # the design runs once
        finally:
            instances = WebMainRegistry.stop_recording()          # every Main created while it ran

        solver = _solved_module(instances)                        # last recorded, with a design_status
        result["design_status"] = bool(solver.design_status)

        if safe:
            _publish_design_ready(self.request.id, result)        # outputs go out first
            cad = generate_cad_models(ServiceClass, inputs, module=solver,
                                      sections=get_default_sections(...), session_id=self.request.id)
            result.update(files=cad["files"], hover_dict=cad["hover_dict"], warnings=cad["warnings"])
    return result
```

**One task for design and 3D model.** `run_design_calculation_task` calculates the design once and builds every CAD section and the hover text from the solved module it recorded, as the desktop app does with its `main` object. The result holds the outputs, logs and `design_status` plus `files`, `hover_dict` and `warnings` (empty for an unsafe or failed design, which builds no CAD). If building the model raises, the design results are still returned with a `cad_error` string. There is no separate CAD task or `/cad/` endpoint.

* **The solved module.** `WebMainRegistry` records every `Main` constructed while `calculate` runs. `_solved_module` takes the last recorded one that has a `design_status`. Moment connection services used to build a throwaway module before `generate_output` built the real one; that extra solve was removed so each module solves once.
* **Sharing one module.** `create_cad_model(input_values, section, session, export_formats=None, module=None)` in each adapter, and `get_cad_model(inputs, section, session, module=None)` in each service, build from `module` when it is given and recalculate with `create_from_input` when it is not (report images and CAD export still do). The sections read the shared module without changing the geometry: STL output of every section was identical to the old one-module-per-section output.
* **Early message.** As soon as the calculation finishes, the task `group_send`s to `task_{task_id}` with status `DESIGN_READY` and the design result (no CAD files). `TaskStatusConsumer.task_update` forwards any status unchanged, and `subscribeToTask(taskId, { onProgress })` passes non-final messages to the callback. Only clients already connected receive it; the final result (task state `SUCCESS`) always repeats the outputs, so a late client works from it alone. When the final result is larger than 500 KB `on_task_postrun` leaves it out of the broadcast and the client fetches `api/tasks/<id>/`.
* **Queue.** The task runs on the `calculations` queue. That worker writes `file_storage/cad_models/` (it mounts `file_storage_volume`) and runs with `--max-tasks-per-child=10`, because pythonocc-core can leak memory. No task time limit is configured for any queue.

**Designs must not keep state between runs.** A worker process runs many designs one after another, so anything a design leaves behind (a logger that keeps its messages, a class attribute or module-level list that is mutated, a cache) leaks into the next design's result. Create state on the design instance, or reset it when the design is set up. `backend/apps/core/tests/test_design_state_isolation.py` enforces this: it runs every design-input fixture through its adapter in one process, in sorted and in reversed order, and fails if any result differs between the two passes.

### 3. Django Channels & WebSocket Event Broadcast
To support real-time status updates without polling overhead, the backend integrates **Django Channels** for WebSocket routing:
- **Protocol Router (`asgi.py`)**: Configured to wrap standard Django HTTP application with `ProtocolTypeRouter`, forwarding WebSocket connection requests (`ws/tasks/<task_id>/`) to channels consumers.
- **WebSocket Consumer (`consumers.py`)**: Implements `TaskStatusConsumer` which subscribes the user's connection to a Redis channel group `task_{task_id}`. On socket connection, it queries `AsyncResult` immediately to push results if the task is already finished, mitigating race conditions.
- **Signals Broadcast (`signals.py`)**: Subscribes to Celery's `task_postrun` signal. When any Celery task completes, this handler automatically fetches the channel layer and broadcasts the state and results to the respective `task_{task_id}` channel group, immediately pushing the update to the client.
- **Plate girder optimisation (`ws/optimize/plate-girder/`)**: `PSOOptimizationConsumer` starts `run_pso_optimization` (Celery, calculation queue) and forwards its `pso_update`, `pso_heartbeat`, `pso_complete` and `pso_error` events. Guests may optimise; a signed-in client sends its Firebase token in the start message so its custom materials are used. Limits (`plate_girder/optimization_limits.py`, tests in `apps/core/tests/test_pso_websocket_limits.py`):
  - A start message larger than 64 KB, or with a thickness list of more than 100 values or a bound that is not a number, is refused with `pso_error`. The input then goes through the plate girder adapter's `validate_input()`, as a design request does. The swarm size (50) and iteration count (100) are fixed in osdag_core.
  - A connection runs one optimisation at a time: a new start revokes the running task. Each task event carries `task_id`, so events of a replaced run are dropped.
  - One client (the signed-in user, or for guests the address nginx puts in `X-Real-IP`, falling back to `X-Forwarded-For` and the socket address) may have `PSO_MAX_RUNNING_PER_CLIENT` optimisations running at once (default 3, environment variable of the same name). The count is kept in the Django cache (Redis in production) and freed when the run completes, fails or its socket closes; a count left by a dead worker expires after the task time limit.
  - The task stops after 600 s (soft limit, reported as `pso_error`) and is killed at 660 s. A run with the page's default inputs takes about 10 s.

---

## 2.3 The Adapter Pattern for Osdag Desktop Modules

Because the underlying core Osdag logic was designed for a desktop environment (using PyQt inputs and outputs), Osdag-Web utilizes an **Adapter Pattern** (`adapter.py` in each module directory) to normalize data flows.

A typical `adapter.py` implements the following key interfaces:

### 1. `get_required_keys() -> List[str]`
Defines the required inputs schema. This is used by validation utilities to check incoming payloads.

Every key it returns should be a value of a string constant in `osdag_core/Common.py`; `backend/apps/core/tests/test_required_keys_in_core.py` checks this for all adapters. Every adapter takes the core keys directly: no request name is mapped to a core key inside an adapter, and the test has no exceptions. The frontend gets its copy of the core keys from `frontend/src/constants/generated/coreKeys.js`, generated from `Common.py` (see [Chapter 6, section 6.7](./chapter_6_dynamic_ui_form_engine.md)). See [2.3b Key constants](#23b-key-constants) for how adapters write keys.

### 2. `validate_input(input_values: Dict[str, Any]) -> None`
Checks the existence and types of incoming values, raising `MissingKeyError` or `InvalidInputTypeError` on mismatch.

**Pydantic request models.** The tension member (bolted and welded) and the shear connections (fin plate, header plate, cleat angle, seated angle) do not hand-write these two functions. Each submodule has a `schema.py` with one Pydantic model (a `DesignInput` from `backend/apps/core/schemas/`) whose fields use the core key constants as aliases; its `validate_input()` is `Model.validate_request(...)`, and the required keys are `Model.required_keys()`. The service class names the model in `input_model`, and `trigger_async_design` validates the request with it (after filling the Additional Inputs, as the task does) before it enqueues the task, so a bad request is a `400 validation_error` with one `fields` entry per bad key instead of a `202` followed by a failed task. The field types (`Text`, `IntStr`, `FloatStr`, `YesNo`, `IntStrList`, ...) accept what the old checks accepted. The shear connections share a family base, `ShearConnectionInput`, in `apps/modules/shear_connection/schema.py`. The other modules still use the hand-written pair above until they get a model.

**Input fixtures.** Every adapter has known-good request bodies in `backend/apps/core/tests/fixtures/design_inputs/<module>/`, generated from each frontend config's real `buildSubmissionParams` and from desktop `.osi` examples. `apps/core/tests/test_design_input_fixtures.py` checks that `validate_input()` accepts all of them (no database needed), so a change to validation or to a frontend config that alters what is accepted shows up as a test failure. Regenerate the fixtures after changing a config's `buildSubmissionParams` or `defaultInputs`, and add a fixture when adding a module; see the [fixtures README](../backend/apps/core/tests/fixtures/design_inputs/README.md) for the format and the generator.

### 3. `create_from_input(input_values: Dict[str, Any]) -> SolverInstance`
Creates the native computational solver class (e.g., `FinPlateConnection`), links loggers, and populates properties.

### 4. `generate_output(input_values: Dict[str, Any]) -> Tuple[Dict, List]`
Executes calculations on the solver instance and extracts output arrays (including spacings, capacities, and logging steps) into a unified JSON-serializable dictionary format.

**Safe and unsafe designs.** The solver's `output_values(flag)` and the detail-table methods it links to (`spacing`, `capacities`, ...) take the design status as `flag`, as the desktop app does: with `True` they read the computed results, with `False` they return every field empty. Many of those results only exist when a design was found, so reading them for a design that failed raises `AttributeError`. Each adapter therefore reads `design_status = bool(getattr(module, "design_status", False))` once after the module has run and passes it to every output method, and to `build_raw_output_dict(rows, design_status)`, which only follows the detail-table buttons for a finished design.

An unsafe design is a normal result, not an error. When no combination of the selected sections, bolts or plates passes, `generate_output` returns the output dictionary with empty values, the logs that explain the failure, and the calculation task reports `design_status: False` (taken from the solver instance). The frontend (`useDesignSubmission`) shows the logs together with "Design is unsafe / failed" instead of an error message, and does not save the project outputs; the task builds no CAD model for it. `apps/core/tests/test_unsafe_design_output.py` runs the customized-list fixtures of the affected modules through the design task to keep this behaviour.

### 5. `create_cad_model(input_values: Dict[str, Any], section: str, session: str, export_formats=None, module=None) -> str`
Creates the CAD geometry objects using `CommonDesignLogic` (from `osdag_core.cad`). When the requested section is `"Model"`, it merges shapes of components (Beams, Columns, Plates, Bolts, Welds) into a single TopoDS compound, writing a merged `.brep` and `.stl` file.

---

## 2.3a API Error Format

Every API error response has one shape:

```json
{"error": {"code": "missing_key", "message": "Please specify Bolt.Diameter in input values.",
           "fields": {"Bolt.Diameter": "Please specify Bolt.Diameter in input values."}}}
```

* `code` is a stable `snake_case` identifier (`validation_error`, `missing_key`, `invalid_type`, `not_found`, `not_authenticated`, `permission_denied`, `throttled`, `internal_error`, ...).
* `message` is human readable and safe to show to the user.
* `fields` is optional and keyed by the input key a message belongs to, so a form can highlight the input. Nested serializer errors use dotted keys; errors not tied to a field use `non_field_errors`.

The format is defined once in `apps/core/utils/api_errors.py`:

* `error_response(code, message, status, fields=None)` builds a DRF `Response`; `error_json_response(...)` builds a `JsonResponse` for plain Django views. Extra keyword arguments become top-level keys next to `error` (used only for legacy flags such as `success: False` and for extra context such as `allowed_scopes`).
* `exception_handler` is `REST_FRAMEWORK["EXCEPTION_HANDLER"]`. It converts DRF exceptions (`ValidationError` to `fields`, `NotAuthenticated`, `PermissionDenied`, `NotFound`, `Throttled`, ...) and the `OsdagApiException` family (`MissingKeyError` -> `missing_key`, `InvalidInputTypeError` -> `invalid_type`, `RangeValidationError` -> `out_of_range`) to this shape. Any other exception becomes a 500 `internal_error` with a generic message; the traceback is logged, never returned.

* Exception text, file paths and class names are never put into a response. A handler that catches everything uses `internal_error_response(context)` (or `internal_error_json_response`) in the `except` block: it logs the exception with its traceback on the server and returns a 500 `internal_error` with the generic message `An unexpected error occurred.` Errors the user can fix (an invalid `.osi` file, an over-long project name, a missing key) are reported separately with a specific message and a 400 (`invalid_osi`, `validation_error`, `missing_key`, ...).

Views should raise or return through these helpers instead of building `{'error': ...}` dicts by hand. `apps/core/tests/test_error_format_guard.py` enforces this: it fails when any backend module returns a 4xx or 5xx `Response` or `JsonResponse` with a dict-literal or empty body. On the frontend, `apiClient.js` (via `utils/apiError.js`) throws an `Error` whose `message` is `error.message`, with `code`, `status`, `fields` and the raw `data` attached. A body in any other shape gives no message, and the client falls back to `HTTP <status>`.

**Not covered.** Celery task results (`{'success': False, 'error': msg}`, delivered over the task WebSocket or `GET /api/tasks/<id>/`) are a separate channel with their own shape. Input errors found while a task runs are reported through that channel, not in the HTTP response. The `error` text follows the same rule as the HTTP errors: `failure_result(exc, context)` keeps the message of an `OsdagApiException` (invalid input, written for the user) and gives any other exception the generic message and a log entry. A failed Celery task, the 3D model error (`cad_error`), the per-section CAD warnings and the plate girder optimization socket messages carry only fixed text as well.

---

## 2.3b Key Constants

A design-input key such as `Bolt.Diameter` is defined once, as a string constant in `osdag_core/Common.py` (`KEY_D`). Adapters and the other backend modules import the constant instead of typing the string:

```python
from osdag_core.Common import KEY_D, KEY_GRD

bolt_diameter = input_values[KEY_D]
```

* **Core keys.** Constants named `KEY_*`, `DISP_*` and `CONN_*` in `Common.py`. Some strings have several names (`Bolt.Diameter` is `KEY_D` and `KEY_OUT_D_PROVIDED`); use the one that names the same thing. `Common.py` also assigns a few names twice, so always read the value from the imported module, never from the file text.
* **Web keys.** A key the core does not have (request names the web layer defines, and output keys that only the web uses) goes in `backend/apps/core/web_keys.py` as a `WEB_<NAME>` constant, grouped by module family. The file imports nothing. `scripts/gen_core_keys.py` copies it to `frontend/src/constants/generated/webKeys.js`, so both sides use the same names. `backend/apps/core/tests/test_no_inline_keys.py` fails if a `WEB_` value equals a `Common.py` value, if two names share a value, or if a name does not match `WEB_[A-Z0-9_]+`.
* **The guard.** `test_no_inline_keys.py` reads every module under `apps/modules` and `apps/core` and fails when a dotted key (a string matching `^[A-Z][A-Za-z0-9_]*( [A-Z][A-Za-z0-9_]*)?(\.[A-Za-z0-9_]+)+$`) or one of the undotted keys (`Module`, `Material`, `Connectivity`, `Conn_Location`, `End_1`, `End_2`, `End_1_Y`, `End_2_Y`, `PlateWidth`, `Plate1Thickness`, `Plate2Thickness`, `EndPlateType`, `End Condition`, `" Out_of_Plane"`, `" In_Plane"`) in a key position is written as a string. Docstrings, the literal parts of f-strings and annotations are not checked, and purlin is skipped. There is no exceptions list. `ALLOWED` holds reviewed strings that only look like keys.

## 2.3c Design Dictionary and Preference Sync

The desktop builds the dict it designs from (`design_fn` in `osdag_gui/ui/windows/template_page.py`) from tables every core class declares: `input_values()` (dock keys), `input_dictionary_design_pref()` (Additional Inputs tabs), `input_dictionary_without_design_pref()` (`'Input Dock'` rows copy a dock value into pref keys; `None` rows are answered by `get_values_for_design_pref`) and `refresh_input_dock()` (where each section designation is looked up). The web reads the same tables instead of keeping its own.

* **`apps/core/design_dictionary.py`.** `pref_tables(module_id)` returns `{dock_keys, pref_tabs, dock_copies, computed, section_sources}`; `derive(module_id, dock, prefs=None)` is a port of `design_fn` (prefs given: dock plus prefs; else the dock, the copies, and one `get_values_for_design_pref` answer per computed key). Module ids are the desktop names (`KEY_DISP_*`, `cls.module_name()`); `CORE_CLASSES` maps each to its core class (purlin is out of scope). It tolerates the core's known defects: the duplicate `KEY_DP_DETAILING_EDGE_TYPE` in `tension_bolted.py`, the duplicate dict key in `member.py`, and `KeyError` (or any error from a missing dock key) from `get_values_for_design_pref`, which leaves the key out. `scripts/gen_core_keys.py` writes the same tables to `frontend/src/constants/generated/designPrefTables.js`; CI regenerates it with the key files and fails on a diff.
* **`sync_merge.py`.** `merge_design_pref_sync(module_id, inputs, operation, ...)` works on core-keyed `inputs` and `resolved_inputs`. The dock material copies come from `dock_copies` (plus computed keys that echo the dock material), defaults from `get_values_for_design_pref`, and the section/material rows of the response from `section_sources`. Operations are `open`, `refresh`, `save` and `reset`.
* **Where the core and the old web rules disagree** (the welded strut, plate girder and axial column for the material rows; flexure, axial column, tension welded and bolted struts for section lookups; header plate and plate girder for defaults) the old behaviour stays in the `LEGACY_*` tables of `sync_merge.py`, because `test_design_pref_sync_golden.py` pins it. Each row is a decision still to be taken; `test_design_pref_sync_overrides.py` lists them and reports an override the core has caught up with. The other modules have no override and follow the core's table: the dock Material (`Material`) copies to the member and connector rows the module has (the cover plates and tension members to `Member.Material` and `Connector.Material`, the shear modules and the beam-to-column end plate to the supporting and supported sections and `Connector.Material`, the beam-to-beam end plate to the supported section and `Connector.Material`, the column-to-column end plate to `Member.Material` and `Connector.Material`, the simply supported and cantilever beams to `Member.Material`, the base plate to the column, base plate and stiffener materials), so a changed dock Material reaches those rows of Additional Inputs. The Connector tab is a target of that copy, not a driver: a grade saved there stays until the dock Material changes.
* **The request and the answer are core-keyed.** `POST /api/design-preferences/sync/` takes `{module_id, inputs, operation, design_pref_draft}` and `POST /api/design-preferences/defaults/` takes `{module_id, inputs}`, with `inputs` and the draft keyed by core key (`Material`, `Bolt.TensionType`, `Member.Supporting_Section.Material`). `module_id` is the desktop module name (`KEY_DISP_*`). `resolved_inputs` / `default_pref_inputs` and the keys in `metadata` come back in core keys, with `metadata.module_id`. The views call `sync_merge` directly; there is no web-name adapter on the server. A module id the core has no tables for (Purlin, still under development) is answered by `sync_merge.unchanged`: its inputs as sent, nothing linked or defaulted.
* **The frontend adapter.** The form still uses web field names, so `frontend/src/modules/shared/utils/prefSyncKeys.js` turns the form state into a core-keyed dict with each config's `coreKeys` (a field feeding several core keys is copied to each; the first non-empty field wins when several feed one key; a field declared as feeding nothing is not sent; a name that is not a field of the module is already a core key and passes through) and writes back only the core keys the merge added or changed, to every field that declares them (the inversion `fromDesignDictionary` uses; a key no field declares keeps its own name). The three pref material rows (`supporting_material`, `supported_material`, `connector_material`) keep their meaning in every module. The golden requests in `fixtures/design_pref_sync_inputs.json` are what that adapter builds from each config (`node backend/apps/core/tests/fixtures/dump_design_pref_sync_inputs.mjs`); `frontend/src/test/prefSyncKeys.test.js` checks they are current. The section modals stay on web field names until the form state itself moves to core keys.

## 2.4 Database Schema & Models

### 1. `Project` Model
Maintains the relational state of project designs.
* `name` (`CharField`): Custom project name.
* `module` / `submodule` (`CharField`): Identifier for routing.
* `inputs_json` (`JSONField`): Stores input dock states and Additional Inputs modal overrides.
* `outputs_json` (`JSONField`): Stores calculated outputs dictionary.
* `osi_file_path` (`TextField`): Direct path link to the saved `.osi` asset.
* `user_email` (`CharField`): Identifies the project owner.

### 2. `OsiFile` Model
Stores files uploaded or generated via input docks.
* `file` (`FileField`): Reference utilizing custom `osi_file_storage`.
* `owner_email` (`CharField`): Project owner email.
* `original_name` (`CharField`): Filename during download.
* `size_bytes` (`BigIntegerField`) & `content_type` (`CharField`).

### 3. `UserAccount` Model
Extensions for Firebase identity mapping.
* `user` (`ForeignKey`): Django built-in `User` link.
* `username` (`TextField`): Unique Firebase UID.
* `email` (`TextField`): Unique user email.
* `allInputValueFiles` (`ArrayField`): Tracked input file references.

---

## 2.5 Asset Storage Lifecycle (CAD Models & Reports)

When a design calculation is completed, users can generate:
1. **CAD Geometries:** Formatted as `.brep`, `.stl`, and optionally `.step` or `.iges` formats.
2. **Design Reports:** Formatted as compiled PDF documents.
   The design log shown in the report comes from the `logs` the frontend sends with the report request. `format_report_logs()` in `design_report_pdf_view.py` turns them into `timestamp - LEVEL - message` lines with the level in upper case, because the LaTeX report generator only prints lines containing `INFO`, `WARNING` or `ERROR`.
   User text is written to the `.tex` source as literal text. pylatex escapes the report metadata (company, team, designer, project title, subtitle, job number, client) and the design log. The section details table places its values without pylatex's escaping, so `osdag_core/design_report/reportGenerator_latex.py` passes them through `escape_latex_text()`, because the designation and material can name a user's custom section or material. The company logo is only taken from the file stored by the logo upload (`_safe_company_logo_path`). pdflatex runs with `-no-shell-escape` and a timeout, both in the core (`compile_report_tex`, 120 s) and when a customized report is compiled (60 s per pass). TeX Live's `openin_any` setting no longer restricts which files pdflatex reads, so the escaping is what keeps user text from reading files. Tests: `apps/core/tests/test_report_latex_text.py`.

### Storage Directory Structure
In the backend root directory, the system utilizes the following storage hierarchy:
* `file_storage/cad_models/`: Stores generated 3D component files. Filenames are formatted using the user session cookie or unique identifier (e.g. `{session_id}_Model.brep`).
* `media/`: Default location for user uploads, report assets, and generated PDF documents.

In production deployments, these folders are mounted as Docker host volumes (`media_volume` and `osifiles_volume`) to ensure data persists across container restarts.

---

## 2.6 Backend Architecture Assessment & Scopes of Improvement

### 1. Storage Accumulation & Memory Leaks (Resolved)
* **The Problem:** Previously, every design calculation, CAD generation, or PDF report build generated physical files written to disk. The system lacked a cleanup mechanism to purge these files after they were downloaded or after their session expired.
* **The Risk:** Over time, the host server experienced disk space exhaustion due to the accumulation of unused temporary `.brep`, `.stl`, and `.pdf` files.
* **Resolution:**
  - Configured in-memory PDF processing (`BytesIO`) to delete build folders immediately after streaming responses.
  - Setup on-demand in-memory CAD export streams, deleting the physical files from disk before returning.
  - Implemented a Celery periodic task (`clean_temporary_files`) that runs daily via Celery Beat, purging any leftover temporary CAD/report files older than 24 hours.

### 2. Redundant Debug Statements and Dead Code (Resolved)
* **The Problem:** Several module adapters contained useless stdout redirection blocks (which redirected stdout to `os.devnull` and immediately reverted it before executing code) and duplicate `validate_input_new` methods.
* **Resolution:** Removed the redundant stdout interception lines and duplicate/unused `validate_input_new` methods from all module adapters to keep logic clean and maintainable.

### 3. Multi-Node Distributed Worker Challenges (Resolved via Shared Volume)
* **The Problem:** In a containerized environment, separate containers (like the Django web backend and Celery workers) have isolated filesystems. Files generated by the Celery worker container are not visible to the Django backend container.
* **Resolution:** Defined and mounted a shared Docker volume `file_storage_volume` in `docker-compose.prod.yml` across `backend`, `celery_worker_calc`, `celery_worker_reports`, and `celery_beat` services. This ensures file visibility on a single baremetal host without needing external cloud storage (AWS S3) or self-hosted object stores (MinIO).

### 4. Database Engine Differences (Accepted - Postgres Only)
* **The Problem:** The `UserAccount` model uses PostgreSQL-specific `ArrayField` for `allInputValueFiles`, restricting local SQLite execution for unit tests or lightweight dev configurations.
* **Status:** This is an accepted design choice as Osdag-Web runs exclusively on PostgreSQL in both development and production. No SQLite compatibility is required.

