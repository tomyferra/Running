# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

**Local dev** (requires `.env` with `GARMIN_EMAIL` and `GARMIN_PASSWORD`):
```bash
cp .env.example .env  # fill in credentials
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Docker Compose** (recommended, persists data in a named volume):
```bash
docker compose up --build
```

**Kubernetes (minikube)**:
```bash
docker build -t garmin-api:local .
minikube image load garmin-api:local
kubectl apply -f kubernetes/
```
Credentials go in `kubernetes/secret.yaml` (see `secret.yaml.example`). The PVC mounts at `/data/garmin`.

Interactive docs available at `http://localhost:8000/docs` once running.

## API usage

**Sync activities from Garmin Connect** (run this first; increase `days` for full history):
```bash
curl -X POST http://127.0.0.1:8000/api/v1/sync \
  -H "Content-Type: application/json" \
  -d '{"days": 30}'
```

**List activities** (paginated; supports `offset`, `limit`, `start_date`, `end_date`, `min_distance_km`):
```bash
curl "http://127.0.0.1:8000/api/v1/activities"
```

**Aggregate stats** (optional `start_date` / `end_date` filters):
```bash
curl "http://127.0.0.1:8000/api/v1/activities/stats"
```

**Activity detail** (includes laps and run metrics):
```bash
curl "http://127.0.0.1:8000/api/v1/activities/{activity_id}"
```

**Lap splits only**:
```bash
curl "http://127.0.0.1:8000/api/v1/activities/{activity_id}/laps"
```

## Architecture

The app is a read/write API that syncs Garmin Connect running data into a local SQLite database and exposes query endpoints. The layers are strictly ordered:

```
Routes → Controllers → Services → DAO → SQLAlchemy (async) → SQLite
                                       ↑
                         GarminClient (Garmin Connect API)
```

**`app/routes/`** — FastAPI routers. Each router wires its own dependency chain inline (DAO → Service → Controller) via `Depends`. No business logic here.

**`app/controllers/`** — Translate HTTP concerns: catch domain exceptions and raise `HTTPException`. Thin pass-through to services.

**`app/services/`** — Business logic and ORM-to-schema mapping. `ActivityService` converts `Activity` entities to Pydantic response objects. `SyncService` orchestrates the full sync flow and holds a global `asyncio.Lock` to prevent concurrent syncs.

**`app/dao/activity_dao.py`** — All SQL lives here. Uses `session.merge()` for upserts (insert-or-update by primary key). All reads return ORM objects; callers own schema conversion.

**`app/client/garmin_client.py`** — Wraps the synchronous `garminconnect` library. Every call goes through `asyncio.to_thread()` to avoid blocking the event loop. Auth tokens are cached in `{DB_DIR}/garth_tokens/` and reused across requests; re-authentication happens automatically on token expiry. The client instance is created once at module load in `app/routes/sync.py` and shared across all requests.

**`app/models/entities.py`** — Three SQLAlchemy tables: `activities` (core metrics), `run_metrics` (one-to-one running biomechanics), `activity_laps` (one-to-many per-km splits). Schema is auto-created at startup via `init_db()`.

**`app/models/schemas.py`** — Pydantic response models. Raw DB values (speeds in m/s, times in seconds, distances in meters) are stored as-is; `@computed_field` properties on schemas produce human-readable `avg_pace` (min/km string) and `elapsed_time` (HH:MM:SS string) for API consumers.

**`app/config.py`** — Single `Settings` object via `pydantic-settings`, cached with `@lru_cache`. Reads from `.env`. `database_url` and `garth_home` are derived properties.

## Key design decisions

- `DB_DIR` defaults to `./data/garmin` locally and `/data/garmin` in Docker/K8s. This directory holds both the SQLite file and Garmin auth tokens.
- The Kubernetes deployment uses `imagePullPolicy: Never` — the image must be manually loaded into minikube before applying manifests.
- There are no tests in this codebase yet.
