# Chapter 12: Load Test Monitoring & Observability

This chapter details the observability and performance metrics monitoring stack used to stress-test Osdag-Web (e.g. running 50 concurrent design simulations). 

Osdag-Web ships a complete time-series diagnostics setup leveraging **InfluxDB v2** as the telemetry database and **Grafana** for real-time visualization dashboarding with a 5-second automatic refresh rate.

---

## 12.1 Collected Telemetry Data Schema

The collection pipeline aggregates system performance, queue load, database indicators, and application response metrics every second:

| Telemetry Measurement | Collector Source | Key Monitored Fields / Metrics |
|:---|---|---|
| **`osdag_system`** | Sidecar script (every **0.5 s**) | Per-core CPU %, average host CPU %, RAM usage (used, available, %), SWAP memory usage. |
| **`osdag_tasks`** | Sidecar + Celery event listeners | Queue depth (calculations, cad, reports), task execution durations (ms), and task state counts (success, failure, retry). |
| **`osdag_redis`** | Sidecar script (`INFO` queries, every **1 s**) | Connected client socket count, PubSub channel counts (equal to active Django WebSockets), Redis operations/sec, memory usage, keyspace hits/misses. |
| **`osdag_websockets`** | Django Channels Consumers | `active_connections` gauge (real-time live users), connection connect/disconnect event rates, WebSocket `close_code`. |
| **`osdag_requests`** | Django custom middleware | URI paths, methods, HTTP status codes, response durations (ms), design module tags, and user email identities. |
| **`osdag_threads`** | Sidecar script (every **2 s**) | Active process PID thread states (running, sleeping, other), grouped by application roles: `gunicorn`, `celery-worker`, `daphne`, `celery-beat`, `python-other`. |

---

## 12.2 Observability Stack Run Guide

### Option A: Using Docker Compose (Recommended)

When running inside Docker, all monitoring containers (`influxdb`, `grafana`, `metrics-collector`) are automatically provisioned and configured:

1. **Launch the entire stack**:
   ```bash
   docker compose up --build -d
   ```
2. **Access local diagnostic consoles**:
   * **Grafana Dashboard**: `http://localhost:3001` (Username: `admin`, Password: `osdag_grafana`, or access anonymously as a Viewer).
   * **InfluxDB Explorer**: `http://localhost:8086` (Username: `osdag_admin`, Password: `osdag_password_123`).

Upon launching Grafana, the **"Osdag-web Load Test — Live Monitor"** dashboard is auto-provisioned and ready.

---

### Option B: Manual Observability Setup (No Docker)

To run the telemetry collectors against a native development setup (Option B or C in the main guide):

#### Step 1: Start InfluxDB
Launch the InfluxDB container to collect metrics:
```bash
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
Verify the container is healthy:
```bash
curl http://localhost:8086/health
```

#### Step 2: Start Grafana
Launch Grafana with the Osdag provisioning mapping:
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

#### Step 3: Run the Metrics Sidecar Collector
1. Navigate to the monitoring sidecar directory:
   ```bash
   cd monitoring/
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Start the telemetry script:
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

#### Step 4: Export Backend Variables
Inject the connection details into the environment before starting Gunicorn or the Celery workers to enable database hook writes:
```bash
export INFLUXDB_URL=http://localhost:8086
export INFLUXDB_TOKEN=osdag-super-secret-token
export INFLUXDB_ORG=osdag
export INFLUXDB_BUCKET=osdag_metrics
```

> [!NOTE]
> Django telemetry hooks fail silently if InfluxDB is offline, preventing network errors from impacting regular operations.

---

## 12.3 Post-Test Offline Analysis

To export collected time-series metrics into a CSV file for statistical analysis (e.g. Pandas or Excel):
```bash
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
Alternatively, download datasets directly using the **InfluxDB Data Explorer** export panel at `http://localhost:8086`. Since the bucket has a `retention = 0` rule, telemetry data persists across restarts.
