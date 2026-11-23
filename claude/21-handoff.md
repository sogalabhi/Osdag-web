# Handoff: State at End of Phase 8 (2026-11-24)

Read this first in a new session. Plans: `claude/23` (keys, Phases 1-7), `claude/24` (Phase 8), `claude/25` (Phases 9-14, what is next).

## Where things are
- **`25april` (fork `sogalabhi/Osdag-web`)** is the only branch. Linear, one commit per change. CI works again (since 2026-11-23): backend lint and QA, frontend QA, CodeQL, gitleaks.
- **Workflows disabled on the fork:** `CD` (live self-hosted runner and Production environment) and `Release Please`.
- **Local dev:** `./osdagweb.sh` (conda env `osdag-web`, Postgres and Redis as services, Vite). After pulling run `pip install -r requirements.txt` and `npm ci`. Restart the whole script after code changes (Celery does not reload).
- **Backup of the old fork branches:** `~/coding/osdag/osdag-web-fork-branches-backup.bundle`.

## How keys and forms work now
- **Keys:** every design-input key is a `Common.py` constant (or a `WEB_` constant in `backend/apps/core/web_keys.py` for the few the core lacks). A backend test and an ESLint rule fail on a key written as a string. Generated files: `frontend/src/constants/generated/{coreKeys,webKeys,designPrefTables}.js` (`scripts/gen_core_keys.py`; CI checks they are fresh).
- **Field to core key:** each module config declares `coreKeys` (form field to core key or keys; shared Additional Inputs fields in `shared/config/prefCoreKeys.js`). `test/coreKeyMap.test.js` checks it against what `buildSubmissionParams` sends. See `shared/config/CORE_KEYS_README.md`.
- **One loader / one save format:** `.osi` files and saved projects hold the flat core-keyed design dictionary (`shared/utils/designDictionary.js`, `osiSave.js`; backend `osi_files.py`). Desktop-readable. The form state still uses web field names; renaming them is optional (plan 24 S5).
- **Additional Inputs sync:** core keys and module id; `backend/apps/core/design_dictionary.py` (port of the desktop design dictionary), `sync_merge.py` (documented `LEGACY_*` override tables where the web differed from the core), frontend `shared/utils/prefSyncKeys.js`. Chapter 2 section 2.3c.
- **Output dock and errors** as before: server-built from `output_values()`; every error is `{"error": {"code", "message", "fields"}}`.

## Tests
- Backend: about 1,390 tests; `cd backend && ... python -m pytest --ds=config.settings -q` (see commands below).
- Frontend: about 690 Vitest tests: payload parity (58), `.osi` load (65), `.osi` to request (64), project round trip, `.osi` save, key map, sync keys. Update a snapshot only after reading the diff.
- Sync goldens: `backend/apps/core/tests/fixtures/design_pref_sync_golden.json` (24 modules x 12 cases); regenerate command in the test's docstring.

## Standing rules (also in memory)
- No Claude co-author trailer on commits, no "Generated with Claude Code" footer on PRs.
- PRs land by rebase merge. No issue/PR numbers, "phase" or tracker context in code, comments or shipped docs.
- Every PR updates the docs it affects.
- Module ids are desktop names (`KEY_DISP_*`). No backward compatibility: all data is test data.
- **Purlin cannot be opened at present: do nothing for it** (no checks, fixes or reports).
- Worktrees go in `.claude/worktrees/`. Force-push only PR branches with `--force-with-lease`. Tests must never queue Celery tasks to the user's Redis on `localhost:6379` (eager mode, or a separate broker such as `CELERY_BROKER_URL=memory://`).
- Usage is tight: small tasks directly, Sonnet agents for long implementation after an Opus plan.

## Next
Plan 25, in order: Phase 9 (follow-ups: base plate inside-flange anchors on load, Beam Cover Plate Bolted material rows, Save blocks on simply supported beam and seated angle, the four wire bugs, plate girder thickness gap, core defaults, triage of plans 00-13), 10 (tests: kept Playwright sweep, component tests), 11 (project/design/CAD flow), 12 (schemas and shared field components), 13 (accessibility, desktop gaps, browser checks), 14 (cleanup).

## Waiting on the user
- Check Redis (`localhost:6379`, db 0) for a stray Celery message from an agent's first Design click on 2026-11-24 (no worker was running).
- `./osdagweb.sh doctor|update|start|stop|test`? Port the logger fix (`clear_logs()` in 25 `set_osdag_logger` methods) to the desktop repo? Deploy `.env` (`SECRET_KEY`, `DATABASE_PASSWORD`, `REDIS_PASSWORD`, `ALLOWED_HOSTS`) and re-enable CD? Turn off 10 unused claude.ai skills.
- `claude/22-security-review-inventory.md` stays unpublished (the repo is public).

## Useful commands
```bash
# backend tests like CI (separate DB on port 5470)
DATABASE_PASSWORD=password SECRET_KEY=x INFLUXDB_TOKEN=x INFLUXDB_ADMIN_PASSWORD=x GRAFANA_ADMIN_PASSWORD=x DB_HOST_PORT=5470 \
  docker compose -p osdag-test up -d db redis
cd backend && DATABASE_HOST=localhost DATABASE_PORT=5470 DATABASE_NAME=postgres_Intg_osdag DATABASE_USER=osdagdeveloper \
  DATABASE_PASSWORD=password SECRET_KEY=x QT_QPA_PLATFORM=offscreen python -m pytest --ds=config.settings -q
docker compose -p osdag-test down -v

# frontend checks
cd frontend && npm run lint && npm test && npm run build

# generated keys must be fresh
QT_QPA_PLATFORM=offscreen python scripts/gen_core_keys.py && git diff --exit-code frontend/src/constants/generated/
ruff check backend --select E9,F63,F7,F82
```
