# Chapter 14: Browser Sweep (`e2e/`)

The unit tests (Vitest, pytest) check the frontend and the backend separately. The browser sweep in
`e2e/` checks them together: it drives the real frontend in Chromium (Playwright) against an
isolated stack that the run starts and stops itself, and it is kept in the repository so that it
does not have to be written again for each change. Its own instructions are in
[`e2e/README.md`](../e2e/README.md); this chapter says what it is for and how it is built.

---

## 14.1 The Isolated Stack

`e2e/global-setup.mjs` (using `e2e/lib/stack.mjs`) starts, per run:

* **Django** on its own port (default 8030) with `DEBUG=True ALLOWED_HOSTS=* CELERY_BROKER_URL=memory:// CELERY_RESULT_BACKEND=cache+memory:// REDIS_URL=redis://127.0.0.1:1 QT_QPA_PLATFORM=offscreen SECRET_KEY=x`, started with `conda run -n <env> python manage.py runserver --noreload` (the environment name is `E2E_CONDA_ENV`, default `osdag-web`; `E2E_PYTHON` replaces the whole command).
* A **separate Postgres database** `osdag_e2e` on the development Postgres (`localhost:5470`), created when missing (`e2e/lib/db.py`) and migrated each run; `npm run e2e:drop-db` removes it.
* **Vite** on its own port (default 5230) with `VITE_BASE_URL=undefined` and `VITE_PROXY_BACKEND_URL` pointing at that Django, using `e2e/vite.e2e.config.mjs` (the frontend config with a private dependency cache and no file watching).

It never uses the developer's Redis (6379), Django (8000) or Vite (5173) and refuses to start on a port that is taken. Without Redis there are no Channels and no Celery worker, so a Design request is accepted with 202 and never completes: the specs assert the request Design sends and always click Design last on a page.

## 14.2 What the Specs Cover

| Spec | Coverage |
| :--- | :--- |
| `app.spec.mjs` | Login and guest entry, the module list against the live registry, the module menu, the guest profile menu, guest My Data |
| `modules.spec.mjs` | Every module in `registry.js` (Purlin is hidden there and cannot be opened): loads with defaults as a guest with no page error, no 4xx/5xx from `/api`, no failed module import; the default Design request against `e2e/snapshots/default-design/` and the keys of `payloadParity.test.js.snap` |
| `additional-inputs.spec.mjs` | Save without changes, dock Material against the dialog's material rows (from `DESIGN_PREF_TABLES[...].dockCopies`), one change per tab with Save, reopen, Defaults and Save, and what Defaults changes on a fresh dialog (`snapshots/defaults-drift/`) |
| `osi.spec.mjs` | File > Download Osi then File > Load Input gives the same form and the same Design request; one desktop design example per module against `snapshots/examples/` |

The module list is read from `frontend/src/modules/registry.js` (`e2e/lib/modules.mjs`), and a test compares it with the registry the running app loads, so a new module is picked up and a parser that no longer reads the file fails.

## 14.3 Snapshots and Known Issues

Snapshots under `e2e/snapshots/` are compared as JSON and are never written without `E2E_UPDATE=1`; review the diff and commit it as for the Vitest snapshots. Bugs the sweep found and that are not fixed are recorded where a fix shows up as a change to review: `e2e/lib/known-issues.mjs` for Additional Inputs changes that are not kept, and the `defaults-drift` snapshots. The intermittent races that remain (an Additional Inputs click or a Design click that does nothing) are listed in `e2e/README.md`.

## 14.4 Writing a Spec

Use the `test` of `e2e/lib/fixtures.mjs`: `newPage()` hands out a guest-ready page that records page errors, console errors and failed `/api` calls, and `expectClean(page)` fails on them. Wait on what the page does (a response, a visible text, `page.watch.settled()` for quiet /api traffic), not on time: `waitForLoadState('networkidle')` returns at once once the page has been idle one time, so it does not wait for a later click's requests. Prefer roles, labels and text; the few `data-testid` hooks added for the sweep are `input-dock`, `design-button` and `pref-tab`.

## 14.5 Limits

No Design results, no sign-in (Firebase), no Redis-backed behaviour, development server only.

## 14.6 CI

`.github/workflows/browser-sweep.yml` runs the sweep; `ci.yml` calls it as the job `browser-sweep` on every push and pull request with the smoke subset (`npm run e2e:smoke`: Fin Plate, Bolted to End Gusset, Base Plate and Plate Girder plus the app specs, about 2 minutes of tests). The job runs in parallel with `backend-qa` and, because the CD workflow waits for CI, a red sweep also stops a deploy. A nightly schedule runs the full sweep (`npm run e2e`, about 7 minutes of tests) on the default branch, and the workflow can be started by hand with `smoke` or `full`.

The job needs no Redis: it starts a Postgres service container (the sweep creates its own `osdag_e2e` database in it), builds the same conda environment as `backend-qa`, runs `npm ci` in `frontend/` and `e2e/`, installs Chromium with `npx playwright install --with-deps chromium` (cached in `~/.cache/ms-playwright`) and runs the sweep on its default ports. It has a timeout of 25 minutes (45 for the full sweep). On failure the Playwright report, per-test failure folders, screenshots and the Django and Vite logs are uploaded as the artifact `browser-sweep-<suite>-<attempt>`. See [`e2e/README.md`](../e2e/README.md) for the settings.
