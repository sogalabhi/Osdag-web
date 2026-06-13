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
│   │   ├── models.py          # PostgreSQL core models (Project, UserAccount, OsiFile)
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
* **`apps/modules`:** Acts as the host for individual steel design modules. Every module contains submodules with specific `adapter.py` files to bridge web API requests to the `osdag_core` mathematical libraries.

---

## 2.2 Celery & Redis Integration

Celery handles calculation, CAD rendering, and report compilation tasks out-of-process.

### 1. Connection Configurations
In `backend/config/settings.py`, Celery links to Redis via URL environment variables:
```python
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_TASK_ROUTES = {
    'apps.core.tasks.run_design_calculation_task': {'queue': 'calculations'},
    'apps.core.tasks.run_cad_generation_task': {'queue': 'cad'},
    'apps.core.tasks.run_report_generation_task': {'queue': 'reports'},
}
```

### 2. Task Dispatching
Celery tasks are defined in `backend/apps/core/tasks.py`. They invoke the corresponding adapter methods inside the worker process:
```python
@shared_task(bind=True, name="run_design_calculation_task")
def run_design_calculation_task(self, module_name, submodule_slug, inputs, project_id=None, user_email=None):
    # Retrieve the appropriate module adapter
    adapter = get_module_adapter(module_name, submodule_slug)
    
    # Run calculations
    output, logs = adapter.generate_output(inputs)
    
    # Return result to Redis backend
    return {
        "success": True,
        "data": output,
        "logs": logs,
    }
```

---

## 2.3 The Adapter Pattern for Osdag Desktop Modules

Because the underlying core Osdag logic was designed for a desktop environment (using PyQt inputs and outputs), Osdag-Web utilizes an **Adapter Pattern** (`adapter.py` in each module directory) to normalize data flows.

A typical `adapter.py` implements the following key interfaces:

### 1. `get_required_keys() -> List[str]`
Defines the required inputs schema. This is used by validation utilities to check incoming payloads.

### 2. `validate_input(input_values: Dict[str, Any]) -> None`
Checks the existence and types of incoming values, raising `MissingKeyError` or `InvalidInputTypeError` on mismatch.

### 3. `create_from_input(input_values: Dict[str, Any]) -> SolverInstance`
Creates the native computational solver class (e.g., `FinPlateConnection`), links loggers, and populates properties.

### 4. `generate_output(input_values: Dict[str, Any]) -> Tuple[Dict, List]`
Executes calculations on the solver instance and extracts output arrays (including spacings, capacities, and logging steps) into a unified JSON-serializable dictionary format.

### 5. `create_cad_model(input_values: Dict[str, Any], section: str, session: str) -> str`
Creates the CAD geometry objects using `CommonDesignLogic` (from `osdag_core.cad`). When the requested section is `"Model"`, it merges shapes of components (Beams, Columns, Plates, Bolts, Welds) into a single TopoDS compound, writing a merged `.brep` and `.stl` file.

---

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

### Storage Directory Structure
In the backend root directory, the system utilizes the following storage hierarchy:
* `file_storage/cad_models/`: Stores generated 3D component files. Filenames are formatted using the user session cookie or unique identifier (e.g. `{session_id}_Model.brep`).
* `media/`: Default location for user uploads, report assets, and generated PDF documents.

In production deployments, these folders are mounted as Docker host volumes (`media_volume` and `osifiles_volume`) to ensure data persists across container restarts.

---

## 2.6 Backend Architecture Assessment & Scopes of Improvement

### 1. Storage Accumulation & Memory Leaks (Critical)
* **The Problem:** Currently, every design calculation, CAD generation, or PDF report build generates physical files written to disk. The system **does not have a cleanup mechanism** implemented to purge these files after they are downloaded or after their session expires.
* **The Risk:** Over time, the host server will experience disk space exhaustion due to the accumulation of unused temporary `.brep`, `.stl`, and `.pdf` files.
* **Recommendation:** Implement a Celery periodic task (using `celery-beat` or a server cron job) that scans the `file_storage/cad_models/` and temporary PDF folders daily and deletes files older than 24 hours. Alternatively, serve these files via ephemeral streaming responses directly from memory without writing them to disk (when possible).

### 2. Redundant Debug Statements and Dead Code
* **Useless Stdout Interception:** In several adapters (e.g. `fin_plate/adapter.py`), there is dead code attempting to redirect stdout:
  ```python
  old_stdout = sys.stdout
  sys.stdout = open(os.devnull, "w")
  sys.stdout = old_stdout
  ```
  This immediately reverts the redirection before executing anything, serving no purpose and leaving messy lines.
* **Duplicate Validation Implementations:** Many adapters contain both `validate_input` and `validate_input_new`. Only one is active, causing code bloat.

### 3. Multi-Node Distributed Worker Challenges
* **Local Disk Write Dependencies:** Adapters write CAD `.brep`/`.stl` files directly to the local filesystem using `os.makedirs(file_path)` inside the execution container/machine.
* **The Problem:** In a distributed production cluster with multiple Celery nodes, a worker on Node B might generate the files on its local disk. If the user's HTTP request lands on the Django web server (Node A), it will fail to read or serve the CAD files.
* **Recommendation:** Refactor filesaving in `create_cad_model` to write assets using **Django's File Storage API** (or directly upload to a shared Object Storage/NFS volume like AWS S3 or MinIO) instead of local relative directory writes.

### 4. Database Engine Differences
* **PostgreSQL-Specific Fields:** The `UserAccount` model uses `django.contrib.postgres.fields.ArrayField` for `allInputValueFiles`. 
* **The Problem:** This restricts developers to running PostgreSQL in local environments. Running SQLite for unit tests or lightweight dev configurations will fail.
* **Recommendation:** Transition the `ArrayField` to a standard Django `JSONField` to support multi-database engines seamlessly.
