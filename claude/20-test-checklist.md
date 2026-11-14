# Test Checklist: 25april After the October Refactors

**Date:** 2026-10-25 | **Scope:** everything merged today (#125, #143, #145–#151, #153, #155, #163–#165, and the security hardening merge) | **How:** run the app locally and check each item in a real browser where possible

Mark each item **PASS**, **FAIL** (with what happened), or **BLOCKED** (with why, e.g. needs a signed-in user).

## A. Start-up and health
- [ ] A1. The app starts from a clean checkout of `25april` with only `.env.example` values filled in. Backend, Celery, Redis, Postgres and frontend all come up.
- [ ] A2. `GET /api/health/` returns 200 with DB and Redis ok, and 503 if Redis is stopped.
- [ ] A3. Migrations apply cleanly on an empty database.
- [ ] A4. `/metrics` is **not** reachable through the frontend/nginx (404), but is reachable inside the Docker network.
- [ ] A5. The browser console shows no errors on the homepage.

## B. Homepage and module menu
- [ ] B1. All tabs (Connections, Tension, Compression, Flexure, …) show the same cards as before, with images, labels and "development" badges.
- [ ] B2. Every module card opens its page. That's 26 modules; list each URL that opened.
- [ ] B3. An unknown URL shows the error page, not a blank screen.
- [ ] B4. Opening a module URL directly (page refresh on `/design/...`) works.

## C. Every module page (defaults)
For each of the 26 modules:
- [ ] C1. The page loads with default inputs and the diagram image shows.
- [ ] C2. Labels show **one** `*` on required fields. Axial force fields have no `*` and default to `0`.
- [ ] C3. Clicking Design with the defaults gives outputs, logs and the 3D model (where the module has CAD). Record any module that fails.
- [ ] C4. Base plate designs instead of being rejected.
- [ ] C5. Struts bolted/welded: changing End 1 / End 2 changes the end-condition image (Fixed/Hinged combinations).

## D. Unsafe designs
- [ ] D1. Beam-beam cover plate bolted, beam-beam cover plate welded, beam-beam end plate, seated angle and tension bolted: narrow the customizable lists to a few values that can't pass. Design shows **"Design is unsafe / failed"** with logs, not an error toast or 500.
- [ ] D2. In an unsafe design, the output fields are empty, not values left over from earlier runs.

## E. Logs don't carry over
- [ ] E1. Run the same module twice and then a different module. Each result's logs belong only to that design, with no earlier messages repeated.

## F. Error messages (one error format)
Each case must show a readable message, never blank, `[object Object]` or a raw JSON dump:
- [ ] F1. Click Design with a required field empty: "Please fill: <field>".
- [ ] F2. A design the backend rejects, e.g. an unknown material typed into the payload.
- [ ] F3. Open a project ID that doesn't exist.
- [ ] F4. Upload a file that isn't an `.osi`, or a corrupt `.osi`.
- [ ] F5. Wrong login credentials (if sign-in is available).

## G. Opening desktop `.osi` files
Use files from `osdag_core/data/ResourceFiles/design_example/`:
- [ ] G1. `fin1.osi`, `cleat_1.osi`, `EP-1.osi` (header plate), `SA-1.osi`: the right module opens, **connectivity is selected** and the diagram matches.
- [ ] G2. `baseplate_2.osi`: base plate opens with loads and anchor bolt fields filled.
- [ ] G3. `beam_bolted4.osi` and `column_welded2.osi`: plate thickness lists are real lists, not `&id001`.
- [ ] G4. `tension_b_angle.osi`, `tension_w_channels.osi`: tension modules open filled.
- [ ] G5. `bb_ep_splice_1.osi` (legacy name): shows "unsupported module", doesn't crash.
- [ ] G6. After opening an example, click Design and get a result.
- [ ] G7. Download `.osi` from the web for a module, then open it again: the same inputs come back.

## H. Signed-in features (may be BLOCKED without Firebase credentials)
- [ ] H1. Create a project, design, reopen it: inputs come back.
- [ ] H2. Custom material and custom section: create them, use them in a design, and the design uses their values.
- [ ] H3. Delete a custom row that a design uses: a clear error, not a crash.
- [ ] H4. Project list and search on the homepage work, and the module names show as desktop names.

## I. Reports and exports
- [ ] I1. Generate a design report for fin plate and one moment connection. The PDF downloads.
- [ ] I2. Download outputs as CSV for a safe and an unsafe design.
- [ ] I3. Download the 3D model (if offered).

## J. Security hardening
- [ ] J1. Report customization rejects an invalid report ID with a 400, not a server error.
- [ ] J2. A company logo upload with a bad path or type is rejected.
- [ ] J3. A CSV/Excel export cell that starts with `=`, `+`, `-` or `@` is neutralised (formula injection).
- [ ] J4. nginx sends the security headers (check the response headers on `/`).

## Results summary
| Section | Pass | Fail | Blocked |
|---|---|---|---|
| A | | | |
| B | | | |
| C | | | |
| D | | | |
| E | | | |
| F | | | |
| G | | | |
| H | | | |
| I | | | |
| J | | | |

## Failures found
(one row per failure: item, steps, expected, actual, likely file)
