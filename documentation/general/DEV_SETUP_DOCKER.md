# Osdag-Web Developer Setup (Docker)

This is the quickest path for developers to run Osdag-Web locally using Docker.

## What You Get

The development stack starts:

- `frontend` (Vite dev server)
- `backend` (Django API)
- `celery_worker` (async worker)
- `db` (PostgreSQL)
- `redis` (broker/cache)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2

Check:

```bash
docker --version
docker compose version
```

## 1) Go to Project Root

```bash
cd /path/to/Osdag-web
```

## 2) Create `.env` (Recommended)

Create `.env` at project root:

```env
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
```

## 3) Build Images

```bash
docker compose build backend celery_worker frontend
```

First build can take a while because backend includes heavy dependencies.

## 4) Start Services

```bash
docker compose up -d db redis backend celery_worker frontend
```

## 5) Verify Services

```bash
docker compose ps
docker compose logs --tail=100 backend celery_worker
```

## 6) Verify Celery

```bash
docker compose exec backend python -c "from apps.core.tasks import healthcheck_task; print(healthcheck_task.delay().id)"
docker compose logs --tail=100 celery_worker
```

You should see the task in worker logs.

## Access URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

## Common Issues

### Build takes very long

Expected on first run due to large backend dependency layers. Later builds are faster with Docker cache.

### Containers not starting

Check:

```bash
docker compose ps
docker compose logs -f
```

### Reset local state

```bash
docker compose down -v
```

## Stop / Restart

```bash
# stop
docker compose down

# restart
docker compose up -d
```

## Related Docs

- `documentation/general/DEPLOYMENT_GUIDE.md` (dev + prod overview)
