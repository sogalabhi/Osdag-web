# Chapter 1: Architecture Overview & System Topology

Osdag-Web is designed as a modern, decoupled web application. It transitions the heavy, desktop-oriented CPU computations of the original Osdag suite into a responsive, scalable cloud architecture.

---

## 1.1 The Asynchronous Calculation Design Pattern

### The Problem
Structural engineering tasks—such as design calculations, 3D CAD model geometry compilation (using OpenCASCADE/PythonOCC), and PDF report compilation (using LaTeX)—are highly CPU-bound. If these computations were processed synchronously within Gunicorn or Uvicorn HTTP worker threads:
1. The web worker would be blocked for several seconds (or minutes) per request.
2. Under concurrent usage, all available web threads would quickly be exhausted.
3. This would lead to request timeouts, high latency, and complete unresponsiveness of the web app.

### The Asynchronous Solution
To decouple HTTP request handling from background calculation, Osdag-Web implements the **Asynchronous Calculation Design Pattern**:

1. **Immediate Acceptance:** When a user clicks **Design**, **CAD**, or **Generate Report**, the frontend submits the request payload. The Django backend instantly generates a background job, submits it to a Celery task queue, and returns an `HTTP 202 Accepted` response with a unique `task_id` (taking <50ms).
2. **Client-Side Polling:** The frontend intercepts the `task_id` and starts a non-blocking polling loop, querying the status endpoint every 1000ms.
3. **Execution & Return:** The Celery worker processes the computation out-of-process. When finished, it persists the result. The next polling query from the frontend receives a `SUCCESS` status with the computed outputs, terminating the polling loop and updating the UI state.

---

## 1.2 The Osdag Input (.osi) File Exchange Format

### What is an .osi file?
An `.osi` (Osdag Input) file is the native file storage format of the Osdag suite. It is a plain-text key-value document mapping Osdag design parameter namespaces (like `Bolt.Diameter`) to their selected or custom values (like `[20]`). 

### The Exchange Mechanism
Osdag-Web maintains strict cross-compatibility with the Osdag desktop application through this format:
1. **Desktop-to-Web Import:** Users can upload a `.osi` file generated on the desktop application into Osdag-Web. The system parses the text file and populates the web-based input form docks instantly.
2. **Web-to-Desktop Export:** Authenticated users can save their project designs directly to the cloud database (which stores the inputs as an `OsiFile` model on the disk storage) or download the current inputs locally as a `.osi` file to open and review inside the Osdag desktop software.

---

## 1.3 System Component Topology

The Osdag-Web stack comprises five key components:

```mermaid
graph TD
    Client[React Frontend - Vite]
    Django[Django ASGI Backend - Gunicorn/Uvicorn]
    Postgres[(PostgreSQL DB)]
    Redis[(Redis Message Broker & Cache)]
    Celery[Celery Background Workers]

    Client -- 1. Submit Design (HTTP POST) --> Django
    Django -- 2. Accept (HTTP 202 + Task ID) --> Client
    Django -- 3. Push Task Payload --> Redis
    Redis -- 4. Consume Task --> Celery
    Celery -- 5. Write Task Status & Result --> Redis
    Client -- 6. Poll Task Status (HTTP GET) --> Django
    Django -- 7. Check Task State --> Redis
    Django -- 8. Read/Write Project Metadata --> Postgres
```

### 1. React Frontend (Vite)
* Renders the dynamic input/output docks, forms, and custom preferences.
* Manages local UI states via React Context (`ModuleState`, `GlobalState`).
* Integrates React Three Fiber (R3F) and Three.js to render interactive 3D CAD scenes.
* Runs the client-side task polling loops and handles local file downloads (`.osi`, `.pdf`, `.dxf`, `.stp`).

### 2. Django ASGI Backend (Gunicorn + Uvicorn)
* Exposes the REST API endpoints for user authentication, project CRUD, option listings, and task triggers.
* Intercepts and validates Firebase identity tokens.
* Acts as the coordinator between PostgreSQL (relational state) and Redis/Celery (computation state).

### 3. Redis Message Broker & Result Backend
* **Message Broker:** Acts as the high-throughput queue manager storing Celery task payloads until consumed by workers.
* **Result Backend:** Stores transient task status metadata (e.g., `PENDING`, `SUCCESS`, `FAILURE`) and the serialized execution output data.

### 4. Celery Worker Pool
* A pool of independent worker processes running inside conda environments containing native C++ bindings (OpenCASCADE, Cairo).
* Executes the CPU-bound calculations, CAD model coordinate math, and LaTeX report builds.

### 5. PostgreSQL Relational Database
* Serves as the persistent source-of-truth for registered users and project histories.
* Stores project configurations, saved inputs (`inputs_json`), and previous calculation results (`outputs_json`).

---

## 1.4 Request Lifecycle Walkthrough

Here is the exact progression of a design and CAD workflow:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as React Frontend
    participant BE as Django Backend
    participant DB as PostgreSQL
    participant Broker as Redis Queue
    participant Worker as Celery Worker

    User->>FE: Clicks "Design"
    Note over FE: Frontend validates inputs locally
    FE->>BE: POST /api/modules/shear-connection/fin-plate/design/
    BE->>DB: Save/update project input details
    BE->>Broker: Submit "run_design_calculation_task" payload
    BE-->>FE: HTTP 202 Accepted (Returns task_id & project_saved=true)
    
    loop Every 1000ms
        FE->>BE: GET /api/tasks/{task_id}/
        BE->>Broker: Fetch AsyncResult({task_id})
        BE-->>FE: HTTP 200 OK (Status: PENDING)
    end

    Broker->>Worker: Consume calculation task
    Note over Worker: Runs Osdag-core engineering solver
    Worker->>Broker: Update task status to SUCCESS & write output payload
    
    FE->>BE: GET /api/tasks/{task_id}/
    BE->>Broker: Fetch AsyncResult({task_id})
    BE-->>FE: HTTP 200 OK (Status: SUCCESS + calculation results)
    
    Note over FE: Update state context & render Output Dock
    
    FE->>BE: POST /api/modules/shear-connection/fin-plate/cad/ (Trigger CAD)
    BE->>Broker: Submit "run_cad_generation_task" payload
    BE-->>FE: HTTP 202 Accepted (Returns task_id)
    
    loop Every 1000ms
        FE->>BE: GET /api/tasks/{task_id}/
        BE->>Broker: Fetch AsyncResult({task_id})
        BE-->>FE: HTTP 200 OK (Status: PENDING)
    end
    
    Broker->>Worker: Consume CAD task
    Note over Worker: Generates STL/OBJ geometry buffers via PythonOCC
    Worker->>Broker: Update status to SUCCESS & write mesh paths
    
    FE->>BE: GET /api/tasks/{task_id}/
    BE->>Broker: Fetch AsyncResult({task_id})
    BE-->>FE: HTTP 200 OK (Status: SUCCESS + mesh URLs & hover_dict)
    
    Note over FE: Renders 3D components in R3F Canvas
```

---

## 1.5 Architecture Assessment & Improvement Analysis

### 1. Security & Privacy Vulnerabilities
* **Anonymous Task Status Access:** The `TaskStatusAPIView` endpoint (`/api/tasks/<task_id>/`) is configured with `permission_classes = [AllowAny]`. While task IDs are generated as UUID4 (practically unguessable), this is an security-through-obscurity pattern. If a task ID is leaked or intercepted, an unauthenticated third-party can fetch the entire engineering inputs and outputs payload.
  * *Recommendation:* Update the backend status checker to require authentication and verify that the logged-in user owns the project associated with that task (if the task was triggered inside an authenticated session).

### 2. Network & Performance Overhead
* **Resource Waste from HTTP Polling:** Polling at 1s intervals generates significant HTTP overhead. If 100 users are active, Gunicorn/Uvicorn is flooded with up to 100 requests per second just querying task states.
  * *Recommendation:* Transition the task status loop from HTTP polling to **WebSockets** (using Django Channels). Celery can push status transitions to a Redis channel, which is then broadcast directly to the specific user's WebSocket.
* **Celery Result Bloat in Redis:** Task results are stored in Redis as the Celery backend. If expiration is not configured, the Redis memory footprint will grow indefinitely over time.
  * *Recommendation:* Ensure `CELERY_RESULT_EXPIRES` is set in the Django settings (e.g., to 1800 seconds / 30 minutes) to automatically purge completed task payloads from memory.
