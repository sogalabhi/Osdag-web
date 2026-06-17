# Osdag-Web Application

Osdag-Web is the web-based version of Osdag, providing professional-grade design, 3D CAD modeling, and report generation for structural steel connections and members. 

Under the hood, Osdag-Web uses an asynchronous architecture powered by **Django**, **Celery**, and **Redis** to offload heavy calculations and CAD/PDF rendering to background workers, ensuring high availability and responsive UI interactions under concurrent user load.

---

## Architecture Overview

1. **Vite + React Frontend**: Initiates calculations, CAD modeling, and report requests. When the backend triggers an asynchronous task, the frontend receives a `202 Accepted` status with a `task_id` and establishes a WebSocket connection to receive real-time status transitions and results.
2. **Django Backend**: Exposes the REST API, validates input files, and submits background tasks to the Celery queue.
3. **Redis**: Serves as the message broker and result backend for Celery.
4. **Celery Worker**: Consumes calculation, CAD generation, and PDF report compilation tasks in background worker threads, freeing up Django to serve web requests.

---

## Developer Documentation

For a comprehensive guide to the codebase topology, API adapters, frontend state management, 3D CAD visualization pipeline, and containerization setup, refer to the [Osdag-Web Code & Architecture Documentation Index](documentation/INDEX.md).

---

## How to Run Osdag-Web

You can run the Osdag-Web application either using **Docker Compose** (recommended, as it automatically sets up Redis and databases) or **Native Local Development**.

### Firebase Configuration (Prerequisite)

Before running the application via either Docker or Native setups, you must add the Firebase service account credentials JSON file for authentication:

1. Obtain your service account key JSON file from the Firebase Console (Project Settings -> Service Accounts -> Generate new private key).
2. Save this file as `firebase-service-account.json` and place it inside the `backend/` directory of this repository:
   ```
   backend/firebase-service-account.json
   ```

### Option A: Using Docker Compose (Recommended)

To run the entire stack (Postgres, Redis, Django, Celery Worker, React frontend) in containers:

1. Build and run all services:
   ```bash
   docker compose up --build
   ```
2. Navigate to `http://localhost:5173/` in your browser.

---

### Option B: Native Local Development (No Docker)

> [!WARNING]
> **`python manage.py runserver` cannot be used for load testing.**
> It is single-process, single-threaded, and does not support WebSockets (Django Channels).
> Under concurrent load it will queue all requests behind each other, producing completely misleading results.
> Use **gunicorn + uvicorn** (shown below) for any real testing.

#### Prerequisites
1. **Redis**: Ensure a Redis server is installed and running:
   ```bash
   sudo apt-get install redis-server
   sudo systemctl start redis-server
   ```
2. **Postgres**: Make sure Postgres is running and the database is configured according to the [Installation Instructions](documentation/installation.md).

#### Step-by-Step Setup

1. **Start the Celery Worker**:
   Open a new terminal session, navigate to the `backend` folder, activate the conda environment, and start the Celery worker:
   ```bash
   cd backend
   conda activate osdag-web
   celery -A config worker -Q calculations,cad,reports,celery --loglevel=info --concurrency=4
   ```

2. **Start the Django Backend (ASGI — required for load testing)**:
   Use **gunicorn with uvicorn workers** — this is the same server the Docker setup uses and the only one that correctly handles concurrent requests and WebSocket connections.
   ```bash
   cd backend
   conda activate osdag-web
   # Run migrations first (only needed once or after model changes)
   python manage.py migrate

   # Start gunicorn with uvicorn ASGI workers
   gunicorn config.asgi:application \
     --bind 0.0.0.0:8000 \
     --workers 2 \
     --worker-class uvicorn.workers.UvicornWorker \
     --timeout 120 \
     --log-level info
   ```

   > [!NOTE]
   > Increase `--workers` to match your CPU core count for heavier tests.
   > A common rule of thumb is `2 × CPU cores + 1`.
   > Each worker is a separate OS process that handles requests concurrently.

   > [!TIP]
   > **For quick day-to-day development only** (single user, no WebSocket, no concurrency),
   > you may still use `python manage.py runserver 8000`. Never use it for performance testing.

3. **Start the Vite Frontend**:
   Open a new terminal session, navigate to the `frontend` folder, and start the React dev server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the Application**:
   Navigate to `http://localhost:5173/` in your browser.



---

### Option C: Using the Launcher Script (Linux / macOS)

If you are on Linux or macOS, you can launch all three services (Celery worker, Django backend, and Vite frontend) automatically using the provided `osdagweb.sh` script:

1. Ensure the script is executable:
   ```bash
   chmod +x osdagweb.sh
   ```
2. Run the script:
   ```bash
   ./osdagweb.sh
   ```
   This will start all background processes and output their logs into the `logs/` directory. Press `Ctrl-C` at any time to shut down all processes cleanly.


---

## Running Tests

To run the backend test suite:

1. Activate the conda environment and navigate to the `backend` directory:
   ```bash
   conda activate osdag-web
   cd backend
   ```
2. Run tests with `pytest`:
   ```bash
   pytest --ds=config.settings
   ```

> [!NOTE]
> During test runs, `CELERY_TASK_ALWAYS_EAGER = True` is automatically enabled. Tasks will run synchronously in-process, allowing the test suite to execute successfully without needing a running Redis broker or worker.

---

## Load Test Monitoring & Observability

The repository ships a full observability stack for stress-testing the application (e.g. 50 concurrent design runs). All metrics are stored in **InfluxDB v2** (time-series database) and visualised live in **Grafana** with 5-second auto-refresh.

### What is collected

| Measurement | Source | Key fields |
|---|---|---|
| `osdag_system` | Sidecar (every **0.5 s**) | Per-core CPU %, average CPU, RAM used/available/%, swap |
| `osdag_tasks` | Sidecar + Celery signals | Queue depth per queue, task duration (ms), success / failure / retry count |
| `osdag_redis` | Sidecar (`REDIS INFO`, every 1 s) | `connected_clients`, `pubsub_channels` (= live WS groups), ops/sec, memory, keyspace hits/misses |
| `osdag_websockets` | Django consumer (on event) | `active_connections` live gauge, connect / disconnect event rate, `close_code` |
| `osdag_requests` | Django middleware (every request) | Path, method, HTTP status, duration (ms), module/submodule tag, user email |
| `osdag_threads` | Sidecar (every **2 s**) | `total_threads`, `process_count`, `threads_running`, `threads_sleeping`, `threads_other` — grouped by role: `gunicorn`, `celery-worker`, `daphne`, `celery-beat`, `python-other`, `all-osdag` |


---

### Option A — Docker Compose (recommended)

The monitoring services (`influxdb`, `grafana`, `metrics-collector`) are already wired into `docker-compose.yml`. No extra steps needed.

```bash
# Start everything including the monitoring stack
docker compose up --build -d
```

| Service | URL | Default credentials |
|---|---|---|
| **Grafana** (live dashboard) | `http://<server-ip>:3001` | LAN viewers: no login · Admin: `admin` / `osdag_grafana` |
| **InfluxDB** (data explorer) | `http://<server-ip>:8086` | `osdag_admin` / `osdag_password_123` |

Open Grafana → the **"Osdag-web Load Test — Live Monitor"** dashboard loads automatically.

> [!TIP]
> For LAN testers, share the Grafana URL (`http://<your-machine-IP>:3001`). Anonymous viewer access is enabled by default — no login required.

---

### Option B — Manual Setup (no Docker)

Use this if you run the app natively (Option B/C above) and want to attach the monitoring stack separately.

#### Step 1 — Start InfluxDB

```bash
# Pull and run InfluxDB v2
docker run -d --name osdag-influxdb \
  -p 8086:8086 \
  -e DOCKER_INFLUXDB_INIT_MODE=setup \
  -e DOCKER_INFLUXDB_INIT_USERNAME=osdag_admin \
  -e DOCKER_INFLUXDB_INIT_PASSWORD=osdag_password_123 \
  -e DOCKER_INFLUXDB_INIT_ORG=osdag \
  -e DOCKER_INFLUXDB_INIT_BUCKET=osdag_metrics \
  -e DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=osdag-super-secret-token \
  -e DOCKER_INFLUXDB_INIT_RETENTION=0 \
  -v osdag-influxdb-data:/var/lib/influxdb2 \
  influxdb:2.7-alpine
```

Verify it is ready:

```bash
curl http://localhost:8086/health
# Expected: {"name":"influxdb","message":"ready for queries and writes","status":"pass",...}
```

#### Step 2 — Start Grafana

```bash
docker run -d --name osdag-grafana \
  -p 3001:3000 \
  -e GF_SECURITY_ADMIN_USER=admin \
  -e GF_SECURITY_ADMIN_PASSWORD=osdag_grafana \
  -e GF_AUTH_ANONYMOUS_ENABLED=true \
  -e GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer \
  -v "$(pwd)/monitoring/grafana/provisioning:/etc/grafana/provisioning:ro" \
  grafana/grafana:10.4.2
```

Open `http://localhost:3001` — the dashboard is auto-provisioned.

#### Step 3 — Start the metrics sidecar

Install the sidecar dependencies (use a separate virtualenv to avoid conflicts):

```bash
cd monitoring/
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run the collector (adjust `REDIS_URL` if your Redis is on a different host/port):

```bash
INFLUXDB_URL=http://localhost:8086 \
INFLUXDB_TOKEN=osdag-super-secret-token \
INFLUXDB_ORG=osdag \
INFLUXDB_BUCKET=osdag_metrics \
REDIS_URL=redis://localhost:6379/0 \
SAMPLE_INTERVAL_S=0.5 \
HOST_LABEL=osdag-server \
python metrics_collector.py
```

Keep this running in a terminal (or a `tmux` pane) throughout your test.

#### Step 4 — Configure the Django backend

Export the InfluxDB variables before starting the Django server and Celery worker so the middleware and Celery signals can write metrics:

```bash
export INFLUXDB_URL=http://localhost:8086
export INFLUXDB_TOKEN=osdag-super-secret-token
export INFLUXDB_ORG=osdag
export INFLUXDB_BUCKET=osdag_metrics
```

Then start the backend and worker as usual (Option B steps 1–3).

> [!NOTE]
> The middleware and Celery signals fail **silently** if InfluxDB is unreachable — the app keeps running normally. You will see a single `[InfluxMetrics] Could not connect` warning in the logs.

---

### Grafana dashboard panels

| Row | Panels |
|---|---|
| **System** | CPU per core (%), RAM used / available / %, Swap |
| **Application** | Requests/min, Request latency mean + p95, Celery queue depth |
| **Tasks** | Task success vs failure over time, Task execution duration by type |
| **Stats** | Total design requests, Tasks completed, Task failures, Peak RAM, Peak CPU |
| **WebSockets** | Active WS connections (live gauge), Connect / disconnect event rate |
| **Redis** | TCP clients + PubSub channels, Ops/sec + memory, Keyspace hits/misses rate |
| **Threads** | Threads by process role (gunicorn / celery-worker / daphne — stacked), Thread states: running / sleeping / other |


> [!TIP]
> During a test, set the Grafana time range to **Last 5 minutes** and auto-refresh to **5s** for the tightest live view. After the test, widen the range to **Last 1 hour** to see the full session.

---

### Post-test offline analysis

Export data from InfluxDB as CSV for analysis in Python/Excel:

```bash
# Example: export all osdag_system data from last 2 hours
influx query \
  --host http://localhost:8086 \
  --token osdag-super-secret-token \
  --org osdag \
  --raw \
  'from(bucket:"osdag_metrics")
     |> range(start: -2h)
     |> filter(fn: (r) => r._measurement == "osdag_system")' \
  > system_metrics.csv
```

Or use the **InfluxDB Data Explorer** UI at `http://localhost:8086` → Data Explorer → select your bucket → download as CSV.

> [!NOTE]
> InfluxDB is configured with `retention = 0` (keep forever), so your test data persists across restarts for later analysis.

