# Projects, Design, CAD and Report Flow: Plan

**Date:** 2026-10-25 | **Scope:** how projects are saved and reopened, and how design, CAD and report are computed | **Status:** Proposed

## Summary

The web app stores each project as a database row holding the form state and the design outputs. Every Design click calculates the design twice: once for the results and again for the 3D model. A report calculates it a third time. A reopened project shows outputs but no logs, no safe/unsafe status and no 3D model.

Desktop Osdag is simpler. A project is just the `.osi` input file. Design is calculated once, and CAD and the report reuse that result.

This plan moves the web app to the desktop model. No backward compatibility is needed: existing saved projects do not have to keep opening.

## How it works today

### What is stored

`Project` (`backend/apps/core/models.py`): `name`, `module`, `submodule`, `inputs_json`, `outputs_json`, `user_email`, timestamps. Logs, safe/unsafe status, CAD files and `.osi` files are not stored.

### The flow

| Step | What happens | Code |
|---|---|---|
| Create project | Frontend saves `inputs_json = {version, name, module_id, inputs: {dock, pref}}` | `useProjectCreation.jsx` |
| Design | Frontend POSTs the core-key inputs (`Bolt.Diameter`, …). A Celery task runs `ServiceClass.calculate()`, and the result returns over the WebSocket. | `modulesDataSource.js createDesign`, `module_helpers.py trigger_async_design`, `tasks.py run_design_calculation_task` |
| Save after design | **5 s later**, the frontend PUTs `inputs_json = {dock, pref}` and `outputs_json` | `useDesignSubmission.js` (debounced `updateProject`) |
| CAD | Frontend makes a second request. A second Celery task **recalculates the whole design**, then writes 3D files to `file_storage/cad_models/` (deleted after 24 h by `clean_temporary_files`). | `createCad`, `run_cad_generation_task`, `cad_helpers.generate_cad_models` |
| CAD export | Regenerates from `input_values` again | `cad_model_export.py` |
| Report | A third task **recalculates the design**, renders CAD images and builds the LaTeX/PDF | `run_report_generation_task`, `report_customization_api.generate_initial_report_core`, `design_report_pdf_view.CreateDesignReport` |
| Open project | Loads `inputs_json` into the form through `loadStateFromOsi` and shows `outputs_json` | `useProjectLoader.js`, `useDesignSubmission.loadSavedOutputs` |
| Download `.osi` | Built from `inputs_json` at that moment | `osi_api.ProjectOsiDownload` |
| Open `.osi` | Parsed by the backend and loaded into the form; nothing is stored | `Header.jsx` → `api/open-osi/`, `osi_files.parse_osi` |

### How desktop Osdag does it

- **Save Project / Save Inputs (.osi):** a YAML dump of the input dock and design preferences, plus `Module:`. No outputs, logs or CAD (`template_page.py`, `yaml.dump(self.design_inputs)`).
- **Recent projects:** a local SQLite list of name, `.osi` path, module, and report images for the preview card. It points to the `.osi` and stores no results.
- **Load Input:** fills the form from the `.osi`. Design is clicked to recalculate everything.
- **One calculation:**
  - **Design** runs once on the module object (`main`).
  - **CAD** uses that same object: `commLogicObj.module_object = main` and `call_3DModel(status, main)`.
  - **Create Design Report** uses the same in-memory `main` and reuses `commLogicObj` for the 3D images.
- **Explicit exports, on demand:** Save Log Messages, Save Output (.csv), Save Inputs (.csv), Save 3D Model, Save CAD Image, Create Design Report.

## Problems

1. **Redundant calculation.** Design and CAD calculate twice per Design click, and the report adds a third. These are the most expensive operations on the server.
2. **Incomplete reopen.** A reopened project shows outputs, but no logs, no safe/unsafe status and no 3D model until Design is clicked.
3. **Three shapes for `inputs_json`:**
   - an envelope on create
   - `{dock, pref}` after design
   - flat core keys from the unused backend save path

   `{dock, pref}` is frontend form state (`bolt_diameter`, …), not the core keys, so a change to a module config can break saved projects.
4. **Fragile save.** The browser saves on a 5 s timer after design, so closing the tab in that window loses it. `save_to_project()` in `module_helpers.py` already saves on design, but only when the request carries `project_id`, and the frontend never sends it.
5. **Stale outputs.** `outputs_json` holds results from whatever engine version computed them.
6. **Dead code:**
   - Nothing ever creates an `OsiFile` row, so `OsiFile`, `api/open-osi/<id>/` and `api/save-osi/` (`SaveInputFileView`) are unused.
   - The backend save path from problem 4 is unused too.

## Target

1. **A project stores inputs only, as JSON in Postgres.** `inputs_json` always holds one shape: core keys and design preferences. The `module` field holds the desktop module name, which is also the module id after the module registry change. It's the same dict the adapter receives and the same content a desktop `.osi` file holds. No `.osi` files are stored on the server: `.osi` is only for import and export, built or parsed when someone downloads or opens one.
2. **Opening a project or an `.osi` follows one path.** Parse the file into that dict, fill the form, and run Design once automatically, which returns outputs, logs, safe/unsafe status and the 3D model.
3. **One task for design and CAD.** Calculate once, then build the 3D model from the same solver object in the same process, as desktop does.
4. **The report recalculates once, on demand.** It's an explicit action, as on desktop. The design object can't be kept between tasks because the OpenCascade geometry objects can't be serialised.
5. **The backend saves.** The design request carries `project_id`, and the backend writes the inputs. The browser timer goes away.
6. **No stored results.** Remove `outputs_json`. Logs, output CSV, the 3D model and the report are exports produced on demand.
7. **Remove the dead code.**

## Steps

### 1. Project inputs in desktop format (backend + frontend)
- `Project`:
  - Keep `inputs_json`, always in one shape (core keys and preferences), and remove `outputs_json`. `module` holds the module id.
  - Drop `submodule` if the module id alone identifies the module.
  - New migration. Existing rows are dropped or cleared; no conversion.
- Project API (`project_api.py`): create, update and read `inputs_json`.
- Frontend:
  - `useProjectCreation.jsx` saves the core-key inputs (the output of the module's `buildSubmissionParams`, plus preferences), not `{dock, pref}`.
  - `useProjectLoader.js` loads them through the same function the `.osi` import uses.
- `.osi` download writes `inputs_json` in desktop YAML format, so desktop can open it. `.osi` open parses it into the same dict. Keep both: they are how guests keep their work and how files move between web and desktop.
- One loader turns a core-key dict into form state. It replaces the `{dock, pref}` handling in `osiLoader.js`, `osiNormalizer.js`, `normalize_osi_keys` and `flatten_and_translate_keys`. Each module config maps core key ↔ field once; that mapping is the `coreKey` per field from the module config cleanup.

### 2. Backend saves on design
- The frontend sends `project_id` with the design request.
- `trigger_async_design` saves the inputs with `save_to_project()` (it already does when `project_id` is present). Signed-in owners only; guests never save.
- Remove the debounced `updateProject` call and its `pendingSaveRef` / `saveTimeoutRef` from `useDesignSubmission.js`.

### 3. One task for design and CAD
- `run_design_calculation_task` calculates, then calls `generate_cad_models` with the solver instance it already has (not `create_from_input` again), and returns outputs, logs, `design_status`, CAD `files` and `hover_dict` in one result.
- CAD is built only when the design is safe, matching today's frontend behaviour; otherwise CAD files are empty.
- Frontend: `submitDesign` reads CAD files from the design result and drops the separate `createCad` call.
- Remove `run_cad_generation_task` and the `/cad` module endpoints if nothing else uses them. Keep CAD export (format conversion), but have it use the stored CAD files of the run (`request_id`) where possible, not regenerate.
- Keep the 24 h cleanup of `file_storage/cad_models/`.

### 4. Open runs Design
- `useProjectLoader.js`: after filling the form, call `submitDesign` once (no confirmation). It shows outputs, logs, status and the 3D model.
- The same applies after opening an `.osi` file.

### 5. Report on demand
- No change in behaviour: one recalculation when the user asks for a report.
- Optional later: if a report is requested right after a design, the same worker could cache the solver for a few minutes keyed by the inputs hash. Only worth it if reports become frequent.

### 6. Exports like desktop
- Check the web output dock offers: design report, output CSV, logs, 3D model download, CAD image. Add whichever are missing as on-demand exports, with no storage.

### 7. Remove dead code
- `OsiFile` model, its storage and its migration (with a migration that drops the table).
- `OpenOsiById`, `SaveInputFileView` (`api/save-osi/`), `api/open-osi/<id>/`.
- `outputs_json` and `loadSavedOutputs`.
- Old `inputs_json` shapes and the code that handles them.
- The delete-account cleanup of `OsiFile`.

### 8. Docs
- Chapter 4 (project lifecycle and CRUD): new storage model, backend save, open runs Design.
- Chapter 5 (`.osi` specification): the project's `inputs_json` is the `.osi` content; desktop compatibility.
- Chapter 2 (Celery tasks): one design + CAD task; report recalculates.
- Chapter 9 (CAD): CAD comes from the design task.
- INDEX entries for each.

## Order and dependencies

1. **After the module registry change**, so the module id stored on a project is the desktop module name from the start.
2. Step 3 (one task) is independent of steps 1–2 and can go first. It's the biggest server-load win.
3. Step 1 needs one core key ↔ field mapping per module. Until the module config cleanup lands, the existing `buildSubmissionParams` (form → core keys) plus the current `.osi` loader (core keys → form) are used. Opening desktop `.osi` files fixes the same loader, so do that first or together.
4. Steps 2, 4, 6 and 7 follow step 1.

## Effect

| | Today | After |
|---|---|---|
| Calculations per Design click | 2 (design, CAD) | 1 |
| Calculations per report | +1 | +1 (on demand, as desktop) |
| Stored per project | form state, outputs (stale-prone) | core-key inputs only (= `.osi`) |
| Reopened project shows | outputs only | outputs, logs, status, 3D model |
| `inputs_json` shapes | 3 | 1 |
| Save | browser timer, 5 s | backend, on design |
| `.osi` download | built from frontend form state | the stored inputs, desktop format |

## Risks

| Risk | Mitigation |
|---|---|
| Opening a project costs one design run | Same as desktop; design takes seconds. The calculation queue is already sized for it. |
| A combined design + CAD task is slower before results appear | Send outputs over the WebSocket as soon as the calculation finishes, then CAD in a second message from the same task. The result appears as fast as today. |
| CAD can fail where design succeeds | Return design results even if CAD fails, with a CAD error, as today. |
| Existing saved projects stop opening | Accepted: no backward compatibility. Announce before deploying. |

## Open questions

- Should opening a project run Design automatically, or show a "Run design" prompt? Desktop needs a click; this plan runs it automatically.
- Keep `submodule` on `Project`, or derive everything from the module id?
- Which desktop exports does the web output dock still lack?
