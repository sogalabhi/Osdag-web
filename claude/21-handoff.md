# Handoff: State at End of Session (2026-11-15)

Read this first in a new session. Details live in the linked plans and issues.

## Where things are
- **`25april` (fork `sogalabhi/Osdag-web`)** is the only branch on the fork. It is linear, one commit per change, and the latest merged PR is **#183**.
  - **Merged this session:** #179 (project module on save), #180 (custom section values as floats), #181 (output dock from the engine, safe defaults for six modules, 3D hover text), #182 (Vitest payload parity tests), #183 (one error format, legacy code removed).
  - **Branch backup:** the 15 old unmerged fork branches were deleted. A full copy is in `~/coding/osdag/osdag-web-fork-branches-backup.bundle` (`git bundle`, refs `refs/remotes/origin/<name>`; restore with `git fetch <bundle> '+refs/remotes/origin/*:refs/remotes/old/*'`).
- **CI is locked.** GitHub reports "your account is locked due to a billing issue" and no job starts. Nothing has had a green CI run since #179, so #180–#183 were merged on local results (backend suite, lint, tests, build). After the lock lifts, check that CI is green on `25april`. Copilot is not the cause (the subscription has ended); look at Billing and licensing, other paid items and spending limits.
- **Workflows disabled on the fork:** `CD` (the fork has a live self-hosted runner and a Production environment, so it would really deploy) and `Release Please`.
- **Local dev:** native, run with `./osdagweb.sh` (conda env `osdag-web`, Postgres and Redis as system services, Vite). After pulling, run `conda run -n osdag-web pip install -r requirements.txt` and `npm ci` in `frontend/`. Restart the whole script after code changes, because Celery doesn't reload.

## How the app works now (changed this session)
- **Output dock:** built on the server from each module's own `output_values()` list (`output_layout.py`), with popups and drawing dialogs from `output_dialogs.py`. There are no `*OutputConfig.js` files. Every adapter needs a `create_module()` for the empty dock. See `documentation/chapter_6_dynamic_ui_form_engine.md`, 6.5.2.
- **Errors:** every HTTP error is `{"error": {"code", "message", "fields"}}`. `test_error_format_guard.py` fails on any hand-built 4xx or 5xx body. Celery task results keep their own `{success, error}` shape.
- **Payload tests:** `npm test` runs `frontend/src/test/payloadParity.test.js`, 58 snapshots of what each module's `buildSubmissionParams` sends for its defaults. Update a snapshot on purpose with `npm test -- -u`. New modules must be added to its `MODULES` table.

## Standing rules (also in memory)
- No Claude co-author trailer on commits, and no "Generated with Claude Code" footer on PRs.
- PRs land by **rebase merge** (linear history).
- No issue/PR numbers, "phase" or tracker context in code, comments or shipped docs.
- Every PR updates the docs it affects: `documentation/` chapters, `INDEX.md`, install guides.
- Module ids are desktop names (`KEY_DISP_*` from `osdag_core/Common.py`). No backward compatibility for old ids, URLs, `.osi` names or data: all current data is test data.
- Purlin is still in development: skip it in checks, fixes and reports.
- Rebase stacked branches; force-push only PR branches, with `--force-with-lease`. Make worktrees in `.claude/worktrees/`, not `/tmp`. Never switch branches in the main checkout while the app is running from it.
- Tests must never queue Celery tasks to the user's Redis on `localhost:6379`: use eager mode (pytest does) or a separate compose project and port.
- Usage is tight. Prefer doing small tasks directly; use agents only when needed.

## Next, in order
1. **Keys from one source** (`claude/16-keys-and-schemas-plan.md`, Phase 1). Measured on 2026-11-15:
   - Backend `apps/modules/`: 1,475 inline dotted keys, 1,184 replaceable by one `Common.py` constant, 94 ambiguous (6 distinct values), 197 not in `Common.py` (71 distinct, e.g. `Member.End_1/2` and the plate girder keys).
   - Frontend `src/`: 386 inline keys, 326 replaceable, 22 ambiguous, 38 not in `coreKeys.js`.
   - Plan: backend codemod one family per PR (start with tension, 95 keys), then the frontend codemod, then an ESLint `no-restricted-syntax` rule for converted files and a backend test that no adapter has an inline dotted key. The parity tests and the design-input fixtures are the safety net.
2. **Backend schemas** (Phase 3): one Pydantic model per module, validated in the request so bad input returns 400 with per-field errors (`fields` is not shown on form inputs yet).
3. **Generated types, config cleanup and field components** (Phases 4–6).
4. **Browser checks not done yet:** `claude/20-test-checklist.md` sections A, B and F, dark mode, phone width, saved projects (a saved project opens with the empty dock), and the popups of modules whose default design is unsafe or that have no output buttons.
5. Check whether the design-preferences request should send `connectivity=Column-Flange-Beam-Web` (hyphens) after the switch to desktop connectivity names.
6. Then #130–#133, #134 (accessibility) and #142 (compare with desktop). #141 (preview server) is on hold.

## Plan notes
- Phase 0 (fixtures for all 25 adapters), Phase 1.1–1.2 (generated key file, `DesignKeys.js` removed), Phase 2 (one error format), Phase 5.1 (parity tests) and Phase 6.1 (struts end-condition image, fixed earlier and checked against the desktop mapping) are done.
- Phases 4.4 and 5.6 (output labels and modal presets) are replaced by the output-dock work.

## Waiting on the user
- Build `./osdagweb.sh doctor | update | start | stop | test`?
- Port the logger fix (`clear_logs()` in 25 `set_osdag_logger` methods) to the desktop repo `~/coding/osdag/Osdag`?
- Fix the GitHub billing lock so CI runs again.
- Deploying: the server `.env` needs `SECRET_KEY`, `DATABASE_PASSWORD`, `REDIS_PASSWORD` and `ALLOWED_HOSTS`, and CD must be re-enabled.

## Small cleanups
- **Dead readers:** several datasource and hook functions read `data.error || "…"` from 2xx bodies (`osiDataSource.js`, `modulesDataSource.js`, `reportsDataSource.js`, `useEngineeringService.js`, `UnifiedDropdownMenu.jsx`). `apiClient` throws on non-2xx, so these look dead.
- **Purlin leftovers:** `purlinOutputConfig.js` is unused and the purlin adapter has no `create_module()`.
- **`moduleDataKeys.js`:** drop `MODULE_DATA_LIST_KEYS` and `API_KEY_MAP`. Move `INPUT_KEY_TO_LIST` onto fields in the config phase.
- **API routes:** merge `datasources/endpoints.js` with the API routes. Fold `sessionName` into module ids.
- **Old issues:** 55 open issues below #125. Close the ones the checklist shows fixed.

## Useful commands
```bash
# backend tests like CI (separate DB on its own port; pytest and pytest-django are installed separately)
DATABASE_PASSWORD=password SECRET_KEY=x INFLUXDB_TOKEN=x INFLUXDB_ADMIN_PASSWORD=x GRAFANA_ADMIN_PASSWORD=x DB_HOST_PORT=5470 \
  docker compose -p osdag-test up -d db redis
cd backend && DATABASE_HOST=localhost DATABASE_PORT=5470 DATABASE_NAME=postgres_Intg_osdag DATABASE_USER=osdagdeveloper \
  DATABASE_PASSWORD=password SECRET_KEY=x QT_QPA_PLATFORM=offscreen python -m pytest --ds=config.settings -q
docker compose -p osdag-test down -v

# frontend checks
cd frontend && npm run lint && npm test && npm run build

# generated keys and blocking lint
QT_QPA_PLATFORM=offscreen python scripts/gen_core_keys.py && git diff --exit-code frontend/src/constants/generated/
ruff check backend --select E9,F63,F7,F82
```
