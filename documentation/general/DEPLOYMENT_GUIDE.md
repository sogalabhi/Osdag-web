# Docker Deployment Guide for Osdag-Web

This guide documents the current Docker setup in this repository for Osdag-Web.

## Overview

Osdag-Web runs as multiple containers:

- `frontend`: React app (`Vite` in dev, `Nginx` in prod)
- `backend`: Django API (Conda + pip hybrid environment)
- `celery_worker`: asynchronous worker using Redis broker/backend
- `db`: PostgreSQL
- `redis`: message broker and cache backend

## Desktop Conda vs Web Docker

Osdag has two different installation tracks:

- **Desktop Osdag (manual Conda/installer flow)**:
  - install and run desktop application locally (`osdag` command)
  - uses desktop-oriented installation docs/process
- **Osdag-Web (this repository)**:
  - run services using Docker Compose
  - backend image still uses Conda for heavy compatibility dependencies, plus pip for web app dependencies

Do not mix desktop runtime commands with the web Docker workflow.

## Repository Files Used

- `Dockerfile` (backend hybrid image: Conda + pip)
- `docker-compose.yml` (development stack)
- `docker-compose.prod.yml` (production-oriented stack)
- `frontend/Dockerfile` (frontend development image)
- `frontend/Dockerfile.prod` (frontend production image)
- `frontend/nginx.conf` (frontend production routing/proxy)
- `requirements.txt` (deduplicated Python dependencies + Celery/Redis)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2 (`docker compose`)

Verify:

```bash
docker --version
docker compose version
```

## Environment Variables

Create a `.env` file at repo root (or export variables in your shell):

```env
DEBUG=True
SECRET_KEY=dev-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1

DATABASE_NAME=postgres_Intg_osdag
DATABASE_USER=osdagdeveloper
DATABASE_PASSWORD=password
DATABASE_HOST=db
DATABASE_PORT=5432

REDIS_URL=redis://127.0.0.1:6379/0
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0
USE_REDIS_CACHE=false
```

## Development Setup

Start:

```bash
docker compose up --build
```

Expected dev services:

- `db`
- `redis`
- `backend`
- `celery_worker`
- `frontend`

Useful commands:

```bash
# follow logs
docker compose logs -f

# stop containers
docker compose down

# stop and remove volumes
docker compose down -v
```

## Production Setup

Build and run:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Useful commands:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml down
```

## Celery / Redis Verification

Check worker starts:

```bash
docker compose logs -f celery_worker
```

Run a quick task test from backend container:

```bash
docker compose exec backend python -c "from apps.core.tasks import healthcheck_task; print(healthcheck_task.delay().id)"
```

You should see task execution in `celery_worker` logs.

## Backend Hybrid Packaging Notes

Backend Docker image intentionally keeps a hybrid approach:

- Conda environment (`myenv`) for compatibility-sensitive scientific/CAD dependencies
- pip install from `requirements.txt` for Django/web/runtime libraries

Service commands explicitly activate Conda before running Django/Celery.

## Troubleshooting

### Backend cannot connect to Postgres

- ensure `db` is healthy: `docker compose ps`
- verify `DATABASE_HOST=db` and password variables
- inspect logs: `docker compose logs -f db backend`

### Celery worker not consuming tasks

- verify Redis is healthy: `docker compose ps`
- confirm `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND`
- inspect worker logs: `docker compose logs -f celery_worker`

### Frontend API calls fail in production

- check `frontend/nginx.conf` proxy rules
- confirm backend service is reachable from frontend container
- verify backend container is running and healthy

## Security Notes

- never commit production secrets in `.env`
- use strong database passwords and Django `SECRET_KEY`
- tighten `ALLOWED_HOSTS` for production
- expose only required ports
