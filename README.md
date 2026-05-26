# Osdag-Web Application

Osdag-Web is the web-based version of Osdag, providing professional-grade design, 3D CAD modeling, and report generation for structural steel connections and members. 

Under the hood, Osdag-Web uses an asynchronous architecture powered by **Django**, **Celery**, and **Redis** to offload heavy calculations and CAD/PDF rendering to background workers, ensuring high availability and responsive UI interactions under concurrent user load.

---

## Architecture Overview

1. **Vite + React Frontend**: Initiates calculations, CAD modeling, and report requests. When the backend triggers an asynchronous task, the frontend receives a `202 Accepted` status with a `task_id` and polls the status endpoint until completion.
2. **Django Backend**: Exposes the REST API, validates input files, and submits background tasks to the Celery queue.
3. **Redis**: Serves as the message broker and result backend for Celery.
4. **Celery Worker**: Consumes calculation, CAD generation, and PDF report compilation tasks in background worker threads, freeing up Django to serve web requests.

---

## How to Run Osdag-Web

You can run the Osdag-Web application either using **Docker Compose** (recommended, as it automatically sets up Redis and databases) or **Native Local Development**.

### Option A: Using Docker Compose (Recommended)

To run the entire stack (Postgres, Redis, Django, Celery Worker, React frontend) in containers:

1. Build and run all services:
   ```bash
   docker compose up --build
   ```
2. Navigate to `http://localhost:5173/` in your browser.

---

### Option B: Native Local Development (No Docker)

#### Prerequisites
1. **Redis**: Ensure a Redis server is installed and running:
   ```bash
   sudo apt-get install redis-server
   sudo systemctl start redis-server
   ```
2. **Postgres**: Make sure Postgres is running and the database is configured according to the [Installation Instructions](documentation/installation.md).

#### Step-by-Step Setup

1. **Activate the Conda Environment**:
   ```bash
   conda activate osdag-web
   ```

2. **Start the Celery Worker**:
   Open a new terminal session, activate the conda environment, navigate to the `backend` folder, and start the Celery worker:
   ```bash
   cd backend
   celery -A config worker --loglevel=info
   ```

3. **Start the Django Backend**:
   Open a new terminal session, activate the conda environment, navigate to the `backend` folder, and start the development server:
   ```bash
   cd backend
   python manage.py runserver 8000
   ```

4. **Start the Vite Frontend**:
   Open a new terminal session, navigate to the `frontend` folder, and start the React dev server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Access the Application**:
   Navigate to `http://localhost:5173/` in your browser.

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
