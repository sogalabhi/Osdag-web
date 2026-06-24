# Axially Loaded Column Backend Load Tests

This load testing suite measures the performance and concurrency limits of the **Axially Loaded Column** calculation module. 

The test models the real user flow:
1. `POST` request to enqueue the design task (receives `task_id`).
2. Polling `GET` requests every 1 second until the task completes (`SUCCESS` or `FAILURE`).

We track two custom aggregated metrics in Locust:
* `design_enqueue`: Latency of the initial `POST` request (the queuing phase).
* `design_round_trip`: Total time from the initial `POST` to the final `SUCCESS` or `FAILURE` status (queuing + calculation time).

---

## Setup Instructions

### 1. Install Locust
It is recommended to run this in your Python virtual environment:
```bash
pip install -r requirements.txt
```

### 2. Start the Load Test Web UI
Start the Locust server locally. The target host is set to the remote backend server:
```bash
locust -f locustfile.py --host http://10.104.135.9:8000
```
Open your browser and navigate to **[http://localhost:8089](http://localhost:8089)**.

---

## Load Test Methodology (4-Tier Progression)

To evaluate server performance under increasing pressure, run the test in **4 sequential tiers**. Run each tier for **3 minutes**, then stop the test and let the Celery queue drain completely before starting the next tier.

| Tier | Concurrent Users | Spawn Rate (users/sec) | Purpose |
| :--- | :--- | :--- | :--- |
| **Tier 1** | 10 | 2 | **Baseline**: Standard operational behavior. |
| **Tier 2** | 50 | 5 | **Light Load**: Approaching Celery worker concurrency (18). |
| **Tier 3** | 100 | 10 | **Moderate Load**: Queue begins to build, testing backlog processing. |
| **Tier 4** | 200 | 20 | **Full Stress**: Maximum load, identifying capacity and bottlenecks. |

### How to Run a Tier:
1. In the Locust Web UI, enter the **Number of users** and **Spawn rate** according to the table above.
2. Click **Start swarming**.
3. Let it run for 3 minutes.
4. Click **Stop** in Locust.
5. **CRITICAL**: Wait for all active Celery tasks to finish processing (you can verify this via Grafana or by checking that the active tasks count drops to 0) before starting the next tier.

---

## Metrics to Monitor

### 1. Locust Web UI / CSV Reports (`http://localhost:8089`)
- **`design_enqueue` (POST)**: Should remain fast (typically < 500ms) regardless of the tier since it only enqueues the task in Redis.
- **`design_round_trip`**: This will increase proportionally as concurrency goes beyond the Celery worker pool size (18). Watch how it scales across the tiers.
- **Failures / Errors**: Observe if any tasks fail on the backend due to computational errors, timeouts, or connection failures.

### 2. Grafana Dashboard (`http://10.104.135.9:3001`)
- **Host CPU / RAM Utilization**: Celery worker calculations are CPU-intensive. Watch for high utilization and potential OOM issues.
- **Redis Queue Depth**: Monitor the number of queued tasks during Tiers 3 and 4 to observe the queue size and draining behavior.
- **Database Connection Pool**: Check if the PostgreSQL database connections are exhausted by the API or workers.
