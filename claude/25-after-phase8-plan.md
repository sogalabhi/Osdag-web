# Plan After Phase 8: Phases 9 to 14

**Date:** 2026-11-23 | **Status:** Proposed | Sizes are agent hours, not calendar time; sizes from the older plans are estimates.

Everything open after the keys work (plan 23, Phases 1–8), gathered from plans 15, 16, 19, 20 and the review notes, in the order to do it. Rules as before: one PR per slice, rebase merge, no co-author trailer, Purlin skipped, docs updated in the same PR, verified locally and now also by CI (CI works again since 2026-11-23). Plans 00–13 (per-module review notes) have not been re-read; Phase 9 starts by doing that.

## Why this order
1. Finish what Phase 8 left (bugs and defaults) while its context is fresh.
2. Build the browser and component tests before the big flow and form changes, so those changes are safe.
3. Change how projects, design and CAD work (server side) before the forms, because the forms' schemas depend on the stored dict.
4. Then the forms (schemas, shared components), then polish and checks, then cleanup.

## Phase 9: Phase 8 follow-ups and triage
Depends on: Phase 8 through S4 (S7 for the merge).
- **9.0 Triage (3 h).** Read plans 00–13 and 15, mark each item done, still open or obsolete against the current code; write one deduplicated list in `claude/26-open-items.md` with sizes. Fold anything big into the phases below.
- **9.1 Likely wire bugs, one small PR each (1–2 h each).** Confirm each in the browser first, then fix with the wire diff shown:
  - shear modules send the dock `Material` from `connector_material` after the pref merge
  - tension and struts drop the section-material pref (the builder sends `Material`)
  - simply supported beam sends `section_material`
  - base plate prefs never reach the wire (the adapter defaults them)
- **9.2 Round-trip gaps from S0 (3 h).** "All" section lists not restored on reopen (tension bolted, struts, beams: the list is dynamic and not in the option-list table); plate girder thickness lists after a create-time save. Remove the entries from `KNOWN_GAPS`.
- **9.3 S6: core defaults (6–10 h, your sign-off per module).** `derive()` fills pref defaults on the server; the frontend stops sending pref defaults. Default results change; a before/after comparison per module goes to you.
- **9.4 S5 decision.** Revisit the full rename (about 1,700 edits) after 9.3; do it only if forms are not going to be generated from the core (Phase 12).
- **Verify:** the S0/S1 snapshots, backend suite, CI, a browser sweep of every module.

## Phase 10: Test coverage
Can start in parallel with Phase 8 S3 or S4 (new files only).
- **10.1 Playwright sweep as a kept script (6–8 h).** `e2e/` with a seeded test stack (separate Postgres, port, Celery in eager mode or its own Redis). Per module: design with defaults; Additional Inputs open, one change per tab, save, design; Defaults; `.osi` save and reopen; project save and reopen; one desktop example. Screenshots and console errors collected. Runs on demand, and as an optional CI job.
- **10.2 Component tests (6–8 h).** Testing Library for `InputSection`, the Additional Inputs modals, the output dock and the hooks (`useModuleForm`, `useDesignPrefSync`, `useProjectLoader`), using the case files from S0.
- **10.3 Backend gaps (3 h).** Core-class sync for Header Plate and Plate Girder (not in `_CORE_CLASS_MAP`); butt and lap joint material rules; output dock for every module in one parametrised test.
- **10.4 Local pre-push script (1 h).** Backend suite, lint, Vitest, build (`./osdagweb.sh test` if you want that command).
- **Verify:** the new suites pass on a clean checkout and in CI; deliberately break a key and see each suite fail.

## Phase 11: Project, design and CAD flow (plan 19, steps 2–8)
Step 1 (inputs stored as the design dict) is done by Phase 8 S3.
- **11.1 One task for design and CAD (6–8 h).** `run_design_calculation_task` builds CAD from the solver it already has; CAD only when the design is safe; the frontend reads CAD files from the design result. Biggest server-load win.
- **11.2 CAD naming hygiene (plan 15) (3 h).** Drop the dead `Endplate` section from the tension entries; fix or remove the struts-bolted `Plate` and the purlin leftovers; remove the legacy `/api/design/cad` view and routes; send the frontend `cadOptions` as the sections so one list is the source of truth.
- **11.3 Backend saves on design (3 h).** Send `project_id` with the design request; `trigger_async_design` saves for signed-in owners; remove the debounced `updateProject` and its refs.
- **11.4 Open runs Design (2 h).** After a project or `.osi` opens, design once.
- **11.5 Exports like desktop (3 h).** Check the output dock offers design report, output CSV, logs, 3D model download and CAD image; add the missing ones as on-demand exports.
- **11.6 Dead code (3 h).** `OsiFile` model and migration, `OpenOsiById`, `SaveInputFileView`, `outputs_json`, `loadSavedOutputs`, the delete-account cleanup of `OsiFile`.
- **11.7 Docs.** Chapters 2, 4, 5, 9, INDEX.
- **Verify:** Phase 10 sweep, backend suite, a timing comparison of a design run before and after (server load), CAD files for every module.

## Phase 12: Input fields and forms (plan 16)
- **12.1 Pydantic schema per module (10–14 h).** One model per module, validating the request so bad input returns 400 with per-field errors. Start with tension (the pilot), then one family per PR.
- **12.2 Per-field errors on the form (4 h).** `fields` in the error body shows under the right input; keep the toast for non-field errors.
- **12.3 Shared field components (8–10 h).** One set of input, dropdown, multi-select and modal components replacing per-module wiring in `InputSection.jsx` and the modals; explicit field props instead of name heuristics.
- **12.4 Config cleanup (4–6 h).** Remove `MODULE_DATA_LIST_KEYS`, `API_KEY_MAP`, the unread `backendKeys` maps; each field declares its option list; merge the endpoint files; fold `sessionName` into module ids.
- **12.5 Generated types (4 h).** Field types generated from the schemas.
- **12.6 Option: forms from the core's `input_values()`.** Decide after 12.3 whether hand-written configs can be generated; it would also settle Phase 9.4.
- **Verify:** schema tests per module, the Phase 10 suites, payload snapshots unchanged (wire is stable), CI.

## Phase 13: Accessibility, desktop gaps and browser checks
- **13.1 Desktop gaps (3 h).** Unsaved-changes prompt and fu/fy validation in the Additional Inputs modal.
- **13.2 Accessibility (6–8 h).** Labels, keyboard use, focus order and focus trap in modals, contrast, screen-reader names; automated check (axe) in Phase 10's sweep.
- **13.3 Checks never done (4 h with the script).** `claude/20` sections A, B, F; dark mode; phone width; saved projects; hyphenated connectivity names in the design-preferences request; comparison with the desktop (#142).
- **13.4 Missing custom-section message on `.osi` open** (you said to leave; listed in case it comes back).
- **Verify:** axe results, the full browser checklist with results written back to `claude/20`.

## Phase 14: Cleanup and housekeeping
- **14.1 print to logging (4–6 h).** Replace 938 `print` calls with the logger (core code left alone unless it is the web copy).
- **14.2 `alert()` calls (2 h).** Replace with the in-page message.
- **14.3 Dead readers (1 h).** `data.error ||` on 2xx bodies in `osiDataSource.js`, `modulesDataSource.js`, `reportsDataSource.js`, `useEngineeringService.js`, `UnifiedDropdownMenu.jsx`.
- **14.4 Purlin (when Purlin is finished).** `purlinOutputConfig.js`, the missing `create_module()`, the config on web names; remove the exemptions.
- **14.5 Issues (2 h).** Close the 55 old issues that the checklist shows fixed; update `documentation/issues.md`.
- **14.6 Docs sweep and handoff (2 h).** Chapters 2, 4–8, INDEX, `CONTRIBUTING.md`, `claude/21-handoff.md`.

## Not scheduled (decide later)
- **Preview server (`claude/17`).** On hold until you want branch previews.
- **Security inventory (`claude/22`).** Stays unpublished; the repo is public.
- **Deploy.** Server `.env` (`SECRET_KEY`, `DATABASE_PASSWORD`, `REDIS_PASSWORD`, `ALLOWED_HOSTS`), re-enable CD, decide `./osdagweb.sh doctor|update|start|stop|test`.
- **Desktop repo.** Port the logger fix (`clear_logs()` in 25 `set_osdag_logger` methods)?
- **claude.ai skills.** Turn off the 10 unused ones (your account setting).

## Order at a glance
Phase 8 (in progress) then 9 (follow-ups, triage), 10 (tests, may overlap Phase 8), 11 (flow), 12 (forms), 13 (accessibility, checks), 14 (cleanup). Rough total, excluding Phase 8 and your reviews: about 120–160 agent hours.
