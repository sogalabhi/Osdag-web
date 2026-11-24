# Osdag-Web browser sweep

A Playwright sweep that drives the real frontend in Chromium against an isolated stack that the
run starts and stops itself. It opens every module as a guest, exercises Additional Inputs, saves
and loads `.osi` files, and checks the Design request each page sends.

It is a regression net for the UI: change a module config, a key, or a shared component and run it
to see what moved. Documentation: `documentation/chapter_14_browser_sweep.md`.

## What it starts

| Part | How | Default |
| :--- | :--- | :--- |
| Django | `conda run -n osdag-web python manage.py runserver <port> --noreload` | `127.0.0.1:8030` |
| Vite | `frontend/node_modules/.bin/vite` with `VITE_PROXY_BACKEND_URL` pointing at that Django | `127.0.0.1:5230` |
| Database | Postgres database `osdag_e2e` on `localhost:5470` (user `osdagdeveloper`), created when missing and migrated on every run | |

Node note: the stack starts Vite with `--no-turbo-fast-api-calls`, because Node 26 can abort the dev
server ("Lazy deopt after a fast API call") while it sends a large module, which turns the rest of a
run into connection errors. If a run shows `net::ERR_CONNECTION_REFUSED` look at `artifacts/logs/vite.log`.

Django runs with `DEBUG=True ALLOWED_HOSTS=* CELERY_BROKER_URL=memory:// CELERY_RESULT_BACKEND=cache+memory:// REDIS_URL=redis://127.0.0.1:1 QT_QPA_PLATFORM=offscreen SECRET_KEY=x`
and the anonymous rate limit raised (the sweep is quick and shares one address). Vite uses its own
dependency cache in `e2e/artifacts/vite-cache` and does not watch files, so it never touches a
developer's own Vite cache.

The sweep never uses your Redis (6379), Django (8000) or Vite (5173). It refuses to start when a
port is taken, and refuses the reserved ports above. Logs of both servers are in
`e2e/artifacts/logs/`.

## Setup (once)

```bash
cd e2e
npm ci                # @playwright/test 1.64.0
```

Browsers are not downloaded by this project. Playwright finds Chromium in `~/.cache/ms-playwright`
(`PLAYWRIGHT_BROWSERS_PATH` moves it); `E2E_CHROMIUM=/path/to/chrome` uses a specific binary. If you
have no Chromium yet, `npx playwright install chromium` fetches one.

The backend needs its conda environment (`osdag-web`) and the frontend needs `npm ci` in
`frontend/`.

## Run

```bash
npm run e2e                                   # everything: 24 modules, about 189 tests, about 7 minutes on 4 workers
npm run e2e:smoke                             # four modules + the app specs: 45 tests, about 2 minutes
E2E_MODULES=fin_plate npm run e2e             # one module: words that match a module path or id
E2E_MODULES=tension,plate_girder npm run e2e  # several
npx playwright test specs/osi.spec.mjs        # one spec file
npx playwright test -g "round trip"           # tests by name
E2E_UPDATE=1 npm run e2e                      # create or update snapshots (see below)
npm run e2e:drop-db                           # drop the osdag_e2e database
npm run e2e:serve                             # keep the stack up for fast re-runs (see below)
```

`npm run e2e:serve` prints the stack URL; in another terminal run specs against it with
`E2E_BASE_URL=http://127.0.0.1:5230 npx playwright test ...`. With `E2E_BASE_URL` set the run starts
nothing, so only point it at a stack that is yours.

Settings (environment variables):

| Variable | Default | |
| :--- | :--- | :--- |
| `E2E_BACKEND_PORT`, `E2E_FRONTEND_PORT` | `8030`, `5230` | |
| `E2E_CONDA_ENV` | `osdag-web` | conda environment of the backend |
| `E2E_PYTHON` | unset | full command replacing `conda run -n <env> python`, e.g. `python` or `/path/to/env/bin/python` |
| `E2E_DB_HOST`, `E2E_DB_PORT`, `E2E_DB_USER`, `E2E_DB_PASSWORD`, `E2E_DB_NAME` | `localhost`, `5470`, `osdagdeveloper`, `password`, `osdag_e2e` | |
| `E2E_WORKERS` | `4` | parallel Playwright workers (each module test uses its own guest page) |
| `E2E_MODULES` | all | comma separated words matching a module's path or id |
| `E2E_ALL_EXAMPLES` | unset | `1` loads every desktop design example instead of one per module |
| `E2E_UPDATE` | unset | `1` writes snapshots |
| `E2E_CHROMIUM` | unset | path of a Chromium/Chrome binary |

## What the specs check

| Spec | Checks |
| :--- | :--- |
| `specs/app.spec.mjs` | login page and guest entry; the module list the sweep uses equals the registry (read from the running app); the module menu lists every module under its tab and opens one; the guest profile menu; My Data as a guest (sent to the home page with a note) |
| `specs/modules.spec.mjs` | per module: the page loads with its defaults as a guest with no page error, no 4xx or 5xx from `/api`, no failed module import and no console error; the default Design request is accepted (202), equals `snapshots/default-design/<module>.json`, and carries every key of the frontend's `payloadParity.test.js.snap` entry |
| `specs/additional-inputs.spec.mjs` | per module: Save without changes shows "Preferences saved" and closes; the dock Material moves the material rows of the dialog (modules where the core copies it); one change per tab, Save, reopen (the change is kept), Defaults, Save; Defaults right after opening, with the differences recorded in `snapshots/defaults-drift/` |
| `specs/osi.spec.mjs` | per module: File > Download Osi, then File > Load Input of that file in a fresh page gives the same form fields and the same Design request; one desktop design example per module loads and its Design request equals `snapshots/examples/<module>__<file>.json` |

The Design click is always the last step of a page: results cannot complete here, so tests assert
the request that Design sends (and that the server accepts it with 202), never the result.

## Snapshots

`snapshots/` holds JSON that the specs compare to. A missing or different snapshot fails the test
with a message; nothing is created or changed unless `E2E_UPDATE=1`:

```bash
E2E_UPDATE=1 npm run e2e        # writes what is missing or different
git diff e2e/snapshots          # review it, then commit it
```

Update them when a change to a module config, the catalog or a default is intended. The default
Design request is compared to the committed snapshots by key, and to the frontend payload parity
snapshot by key (every key of its "all" entry must be sent; values that differ there come from the
unit test's filled-in fixtures and are listed as annotations only).

## Failures

Playwright's output goes to `e2e/artifacts/` (git-ignored): `results/` (screenshots), `report/`
(`npx playwright show-report artifacts/report`), `failures/<test>/` (console log and screenshot per
page) and `logs/` (Django and Vite).

## Known bugs it documents

Bugs the sweep found and that are not fixed are recorded so that the run stays green while they
stay as they are and turns red when the behaviour changes (fixed or worse):

* Defaults drift: pressing Defaults on a freshly opened Additional Inputs dialog changes values in
  many modules (Detailing edge preparation, weld strength, bolt type, anchor bolt and section
  details blanked, ...). Recorded in `snapshots/defaults-drift/`.
* The four cover plate modules do not keep a changed section Material after Save and reopening
  (`KNOWN_LOST_CHANGES` in `lib/known-issues.mjs`).
* Intermittent races in the app, seen with four browsers in parallel (they are why the sweep has
  the small allowances listed here):
  * Defaults not filled: in about 3 loads in 100 a module opens with defaults missing for good
    ("Type" shows "Select..." in cleat angle, base plate and beam-to-column end plate; the plate
    thicknesses of the butt joints are empty). A reload fixes it, so `openModule` reloads (up to three
    times) and records an annotation ("defaults missing after load").
  * Additional Inputs does not open on the first click, about 1 time in 100: the helper clicks again
    after 8 seconds and records an annotation.
  * Design clicked and nothing happens (no request, no message), about 2 loads in 100: the helper
    clicks once more after 10 seconds and records an annotation.
* Some desktop design examples (base plate, cover plates) ship with empty loads, so Design refuses
  with "Please fill in ..."; the message is what `snapshots/examples/` records for them.

## What it cannot cover

* Design results: no Redis, so no Channels and no Celery worker; `/ws/tasks` fails and the Design
  POST answers 202 without ever finishing. Results, the output dock, the 3D model, reports and
  everything after Design are untested.
* Sign-in: Firebase needs a real account; only guests are used. Saved projects, My Data content,
  custom sections and materials need a signed-in user.
* Redis-backed behaviour (task progress, caching), and the production build (the sweep runs the Vite
  dev server).

## A CI job would need

Not wired into `.github/workflows`. It would need: Node 22 with `npm ci` in `frontend/` and `e2e/`;
`npx playwright install --with-deps chromium`; the backend environment (conda env or the pip
requirements plus the system libraries `osdag_core` imports, `QT_QPA_PLATFORM=offscreen`); a Postgres
service (set `E2E_DB_*`, and `E2E_PYTHON=python` when not using conda); upload of `e2e/artifacts` on
failure. No Redis service is needed. Use `E2E_WORKERS=2` on small runners.
