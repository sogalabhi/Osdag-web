# Osdag-Web Installation Guide — Windows

This guide covers two ways to run **Osdag-Web** on Windows:

- **[Option A — Docker Compose (Recommended)](#option-a-docker-compose-recommended)** — spins up all services (Postgres, Redis, Django, Celery, React) in containers with a single command.
- **[Option B — Native Local Development (No Docker)](#option-b-native-local-development-no-docker)** — run services directly on your Windows machine using Conda, pip, and Node.js.

---

## Architecture Overview

| Service | Role |
|---|---|
| **Vite + React (frontend)** | UI, initiates design tasks, polls async task status |
| **Django (backend)** | REST API, input validation, task dispatch |
| **Celery worker** | Background processing (CAD, PDF, design calculations) |
| **Redis** | Message broker + Celery result backend |
| **PostgreSQL** | Persistent database |

---

## Option A: Docker Compose (Recommended)

> This is the fastest path. All services are managed by Docker; you do **not** need to install Postgres, Redis, Conda, or Python compilers manually.

### A.1 — System Requirements

- **Windows 10/11 (64-bit)**: Home, Pro, Enterprise, or Education.
- **WSL 2 (Windows Subsystem for Linux)** installed and enabled (highly recommended by Docker).
- **Docker Desktop for Windows** 4.x+
- At least **8 GB RAM** (16 GB recommended) and **25 GB free disk** (backend image is large).

### A.2 — Install WSL 2 and Docker Desktop

1. **Install WSL 2**:
   Open PowerShell or Windows Command Prompt as Administrator and run:
   ```powershell
   wsl --install
   ```
   Restart your computer when prompted.

2. **Download and Install Docker Desktop**:
   - Download the installer from the official website: [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).
   - Run the installer (`Docker Desktop Installer.exe`).
   - Ensure the option **"Use WSL 2 instead of Hyper-V (recommended)"** is checked during installation.
   - After installation, start Docker Desktop and accept the service agreement.

3. **Verify the installation**:
   Open Command Prompt (`cmd`) or PowerShell and verify:
   ```cmd
   docker --version
   docker compose version
   ```

### A.3 — Install Git for Windows

1. Download Git from [git-scm.com/download/win](https://git-scm.com/download/win) and run the installer.
2. During setup, keep the default options. Ensure **"Checkout Windows-style, commit Unix-style line endings"** is selected (crucial for Docker script compatibility).
3. Verify:
   ```cmd
   git --version
   ```

### A.4 — Clone the Repository

Open Command Prompt or Git Bash and run:
```cmd
git clone https://github.com/osdag-admin/Osdag-web.git
cd Osdag-web
```

### A.5 — Create the `.env` File

Create a `.env` file in the project root folder. 

In **PowerShell**, you can run:
```powershell
Set-Content -Path .env -Value @"
DEBUG=True
SECRET_KEY=dev-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1

DATABASE_NAME=postgres_Intg_osdag
DATABASE_USER=osdagdeveloper
DATABASE_PASSWORD=password
DATABASE_HOST=db
DATABASE_PORT=5432

REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
USE_REDIS_CACHE=false

VITE_API_URL=http://localhost:8000
"@
```
Or, open **Notepad**, copy the values above, and save it as `.env` (make sure to choose "All Files (*.*)" in the Save dialog so it does not save as `.env.txt`).

---

> [!WARNING]
> **Line Endings Gotcha on Windows**: Windows uses CRLF line endings (`\r\n`), but scripts run inside the Linux containers must use LF (`\n`). If you encounter errors like `\r: command not found` when starting containers, run the following command to configure git and re-clone the repository:
> ```cmd
> git config --global core.autocrlf input
> ```

---

### A.6 — Build and Start All Services

Run the following command in the project root directory:
```cmd
docker compose up --build
```

This single command:
1. Builds the backend image (Ubuntu 22.04 + Miniconda + Python 3.11 + pip packages)
2. Builds the frontend image (Node 20 Alpine)
3. Starts Postgres 14, Redis 7, Django backend, Celery worker, and Vite dev server
4. Runs `python manage.py migrate` on first start

> **First build** can take **20–40 minutes** depending on your internet connection and CPU, due to the large backend dependencies (TeX Live, VTK, etc.). Subsequent starts will be very fast.

### A.7 — Access the Application

| Service | URL |
|---|---|
| Frontend (React) | http://localhost:5173 |
| Backend (Django API) | http://localhost:8000 |

### A.8 — Populate the Database (First Time Only)

Once the services are up and running, open a new terminal window and run:
```cmd
docker compose exec backend bash -c "source /opt/miniconda/etc/profile.d/conda.sh && conda activate myenv && python populate_database.py"
```

### A.9 — Useful Docker Commands

```cmd
# Follow logs for all services
docker compose logs -f

# Follow logs for specific services
docker compose logs -f backend celery_worker

# Stop containers (keeps volumes/data)
docker compose stop

# Start again
docker compose up -d

# Full reset — deletes all volumes and data
docker compose down -v

# Rebuild only specific services
docker compose build backend celery_worker frontend

# Open a shell in the backend container
docker compose exec backend bash
```

### A.10 — Verify Celery Is Working

```cmd
docker compose exec backend bash -c "source /opt/miniconda/etc/profile.d/conda.sh && conda activate myenv && python -c \"from apps.core.tasks import healthcheck_task; print(healthcheck_task.delay().id)\""

# Check the celery_worker container logs to verify the task was processed:
docker compose logs --tail=50 celery_worker
```

### A.11 — Production Deployment

For production, use the production compose file:
```cmd
# Create a production .env with strong secrets
copy .env .env.prod
# Edit .env.prod: set strong SECRET_KEY, DATABASE_PASSWORD, DEBUG=False, ALLOWED_HOSTS

docker compose -f docker-compose.prod.yml up -d --build
```

---

## Option B: Native Local Development (No Docker)

Use this if you prefer to run services directly on your Windows system without virtualization.

### B.1 — System Requirements

- Windows 10/11 (64-bit)
- At least **8 GB RAM** (16 GB recommended)
- Administrator privileges (for package installations)

### B.2 — Install Visual Studio Build Tools (C++ Compiler)

Installing certain Python packages (like `cffi` or others that build native extensions) requires a C++ compiler.
1. Download the [Visual Studio Installer](https://visualstudio.microsoft.com/downloads/).
2. Select **"Desktop development with C++"** workload during installation.
3. Install and reboot.

### B.3 — Install wkhtmltopdf (required for PDF reports)

1. Download the Windows installer from the official page: [wkhtmltopdf Downloads](https://wkhtmltopdf.org/downloads.html).
2. Run the installer.
3. Add the installation binary directory (typically `C:\Program Files\wkhtmltopdf\bin`) to your **System PATH Environment Variable**.

### B.4 — Install MiKTeX (required for LaTeX report generation)

1. Download the MiKTeX installer from [miktex.org/download](https://miktex.org/download).
2. Run the installer. On the settings page, select **"Install missing packages on-the-fly: Yes / Always"** (this is important so MiKTeX downloads required LaTeX templates automatically).
3. Check that the MiKTeX installation folder is added to your environment `PATH`.
4. Verify by opening a new Command Prompt and typing:
   ```cmd
   pdflatex --version
   ```

### B.5 — Install Miniconda

1. Download the Miniconda Windows 64-bit installer for Python 3.11/latest from [repo.anaconda.com/miniconda/](https://repo.anaconda.com/miniconda/).
2. Run the installer. You can choose to add Miniconda to your PATH during setup (optional, but convenient), or use the **Anaconda Prompt** for command-line execution.
3. Open the **Anaconda Prompt** or **Anaconda PowerShell Prompt** from the Start Menu.

### B.6 — Create and Activate a Conda Environment

Run the following commands in the Anaconda Prompt:
```cmd
conda create -n osdag-web python=3.11 -y
conda activate osdag-web
```

> **Important:** Always keep this environment activated for all subsequent steps and whenever you run the Osdag backend.

### B.7 — Clone the Repository

Using Git command prompt:
```cmd
git clone https://github.com/osdag-admin/Osdag-web.git
cd Osdag-web
```

### B.8 — Install Cairo (Important for cairocffi / CairoSVG)

On Windows, the `cairocffi` library depends on the compiled Cairo C library. Installing it natively on Windows is prone to DLL load errors. 

To solve this easily, install Cairo via conda-forge inside your active environment before installing requirements:
```cmd
conda install -c conda-forge cairo -y
```
This installs the required DLL libraries (`libcairo-2.dll`, etc.) and automatically links them within the conda environment library path.

### B.9 — Install Python Dependencies

Run the following inside your active conda environment:
```cmd
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### B.10 — Install PostgreSQL

1. Download the Windows PostgreSQL installer (PostgreSQL 14 recommended) from [EnterpriseDB](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).
2. Follow the setup wizard. Make note of the password you define for the default `postgres` superuser (e.g. `password`). Use default port `5432`.
3. Add the PostgreSQL bin folder path (typically `C:\Program Files\PostgreSQL\14\bin`) to your **System PATH Environment Variable**.
4. Verify:
   ```cmd
   psql --version
   ```

### B.11 — Create PostgreSQL Role and Database

Open a standard Command Prompt or PowerShell and connect:
```cmd
psql -U postgres
```
*(Enter the password you configured during installation)*

At the `psql` command prompt, run:
```sql
CREATE ROLE osdagdeveloper PASSWORD 'password' SUPERUSER CREATEDB CREATEROLE INHERIT REPLICATION LOGIN;
CREATE DATABASE "postgres_Intg_osdag" WITH OWNER osdagdeveloper;
\q
```

### B.12 — Install Redis

Redis does not offer official native packages for Windows. You can choose one of the following two options:

- **Option 1 — WSL 2 (Highly Recommended)**:
  If you have WSL 2 enabled, open your WSL terminal (e.g. Ubuntu) and install Redis:
  ```bash
  sudo apt update
  sudo apt install redis-server -y
  sudo service redis-server start
  ```
- **Option 2 — Native Windows Port (tporadowski)**:
  Download the Redis `.msi` installer or `.zip` file from the community-maintained Windows port: [tporadowski/redis Releases](https://github.com/tporadowski/redis/releases). Run the service.

Verify that Redis is running:
```cmd
redis-cli ping
# Expected output: PONG
```

### B.13 — Configure Django Settings

Create a `.env` file at the project root `Osdag-web/` (use the configuration block from **[Step A.5](#a5--create-the-env-file)**). Update `DATABASE_PASSWORD` if you set a custom password for the database.

### B.14 — Run Django Migrations

In the active Anaconda Prompt:
```cmd
cd backend
python manage.py migrate
cd ..
```

### B.15 — Populate the Structural Database (First Time Only)

```cmd
python populate_database.py
```

### B.16 — Install Node.js (for the Frontend)

1. Download the Node.js Windows Installer (.msi) for version 20 (LTS) from [nodejs.org](https://nodejs.org/).
2. Run the installer and keep default choices.
3. Verify by opening a new command prompt:
   ```cmd
   node --version
   npm --version
   ```

### B.17 — Install Frontend Dependencies

```cmd
cd frontend
npm install
cd ..
```

### B.18 — Configure Frontend Environment

Confirm that `frontend/.env` contains:
```env
VITE_BASE_URL=http://127.0.0.1:8000/
```

### B.19 — Start All Services

You must launch **three separate command prompts/terminal windows**, ensuring conda is activated where required.

> [!IMPORTANT]
> **Celery Windows Execution Pool**: On Windows, the default Celery prefork execution pool will hang or fail due to multiprocessing limitations. You **MUST** run the Celery worker with either the `solo` pool or the `eventlet` pool (requires `pip install eventlet`). Below, we use `-P solo`.

**Terminal 1 — Django Backend:**
```cmd
conda activate osdag-web
cd Osdag-web/backend
python manage.py runserver 8000
```

**Terminal 2 — Celery Worker:**
```cmd
conda activate osdag-web
cd Osdag-web/backend
celery -A config worker --loglevel=info -P solo
```

**Terminal 3 — Vite Frontend Dev Server:**
```cmd
cd Osdag-web/frontend
npm run dev
```

### B.20 — Access the Application

Open your browser and navigate to: **http://localhost:5173**

---

### 💡 Tip: Create a `run-osdag.bat` Launcher Script

To avoid opening three terminals manually every time, you can create a single Windows batch script to launch all services in separate Command Prompt windows with the environment auto-activated.

1. Create a file named `run-osdag.bat` in a convenient directory (e.g. your desktop or the project root).
2. Open it in a text editor (Notepad) and paste the following (change `C:\path\to\Osdag-web` to the actual directory where you cloned the repo):

```bat
@echo off
:: -----------------------------------------------
:: run-osdag.bat — Start all Osdag-Web services
:: Update PROJECT_DIR to your actual project path
:: -----------------------------------------------

set PROJECT_DIR="C:\path\to\Osdag-web"
set CONDA_ENV="osdag-web"

:: Start Django Backend
start "Django Backend" cmd /k "call conda activate %CONDA_ENV% && cd /d %PROJECT_DIR%\backend && python manage.py runserver 8000"

:: Start Celery Worker (requires -P solo or eventlet pool on Windows)
start "Celery Worker" cmd /k "call conda activate %CONDA_ENV% && cd /d %PROJECT_DIR%\backend && celery -A config worker --loglevel=info -P solo"

:: Start Vite Frontend Dev Server
start "Vite Frontend" cmd /k "cd /d %PROJECT_DIR%\frontend && npm run dev"
```

Save and double-click the script to start the entire development stack at once!

---

## Troubleshooting & Common Errors

| Error | Likely Cause | Solution |
|---|---|---|
| `psycopg2.OperationalError: FATAL: password authentication failed` | Wrong database credentials | Check `DATABASE_USER`/`DATABASE_PASSWORD` in your `.env` matches what you created in PostgreSQL |
| `psql: command not found` | Postgres bin directory not in System PATH | Add `C:\Program Files\PostgreSQL\14\bin` to Windows Environment Variables PATH |
| `pdflatex: command not found` | MiKTeX not in PATH | Ensure MiKTeX installation path is added to your Environment Variables PATH |
| `OSError: no library called "cairo"` | Missing Cairo C libraries | Install Cairo inside your Conda environment using: `conda install -c conda-forge cairo -y` |
| `ConnectionRefusedError: [WinError 10061]` (Redis) | Redis service not running | Start the Redis service natively or run it in WSL 2 (`sudo service redis-server start`) |
| Celery tasks hang indefinitely | Celery worker is not running, or using default pool on Windows | Ensure the Celery worker is running in Terminal 2 and started with the `-P solo` pool flag |
| `\r: command not found` during docker run | Windows CRLF line endings in Docker | Configure Git line endings (`git config --global core.autocrlf input`) and re-clone the repository |
| Docker build takes very long | Docker has low resource limits | Open Docker Desktop → Settings → Resources and increase CPU cores and Memory allocation |
| `npm: command not found` | Node.js not installed | Install Node.js from the official site and restart your command prompt |

---

## Summary: Key Steps

### Docker Path (Recommended)

| Step | Task |
|---|---|
| A.1 | Confirm system requirements |
| A.2 | Install WSL 2 + Docker Desktop for Windows |
| A.3 | Install Git for Windows |
| A.4 | Clone repository |
| A.5 | Create `.env` file |
| A.6 | `docker compose up --build` |
| A.7 | Open http://localhost:5173 |
| A.8 | Populate DB (first time only) |

### Native Path

| Step | Task |
|---|---|
| B.1 | Confirm system requirements |
| B.2 | Install Visual Studio C++ Build Tools |
| B.3 | Install wkhtmltopdf |
| B.4 | Install MiKTeX |
| B.5 | Install Miniconda |
| B.6 | Create conda env (Python 3.11) |
| B.7 | Clone repository |
| B.8 | Install Cairo in conda (`conda install -c conda-forge cairo -y`) |
| B.9 | Install Python dependencies (`pip install -r requirements.txt`) |
| B.10 | Install PostgreSQL 14 |
| B.11 | Create Postgres role + database |
| B.12 | Install/Start Redis (WSL 2 or native port) |
| B.13 | Configure Django environment variables |
| B.14 | Run `python manage.py migrate` |
| B.15 | Run `python populate_database.py` |
| B.16 | Install Node.js 20 |
| B.17 | Install frontend dependencies (`npm install`) |
| B.18 | Configure frontend `.env` |
| B.19 | Start Django, Celery (with `-P solo`), and Vite (3 terminals) |
| B.20 | Open http://localhost:5173 |
