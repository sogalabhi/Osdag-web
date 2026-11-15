# Keys From One Source: Phased Plan

**Date:** 2026-11-15 | **Base:** `origin/25april` | **Goal:** `osdag_core/Common.py` is the only place a design-input key string is written; everything else imports a constant. Covers items 1.3–1.6 of `16-keys-and-schemas-plan.md`.

Produced by an Opus planning pass that re-ran the audit. Counts below replace the Oct 24 ones.

## Decisions
| # | Decision | Status |
|---|---|---|
| D3 | Keys the core lacks (about 40 output and request-only ones) live in one file, `backend/apps/core/web_keys.py` (`WEB_` prefix, no imports), generated into `frontend/src/constants/generated/webKeys.js` | assumed (recommended) |
| D4 | Named imports (`KEY_D`), not `Common.KEY_D` | assumed |
| D5 | Codemods are committed during the migration and deleted in the last phase | assumed |
| D7 | Undotted keys (`Module`, `Material`, `End_1`, …) are in scope, from a curated list only | assumed |
| D1 | Plate girder `Design.*`, base plate `Anchor.*` and cantilever `Flexure.*` web aliases become core keys | approved 2026-11-15 |
| D2 | Delete the `.osi` spelling variants (also fixes the export, see Findings) | approved 2026-11-15 |
| D6 | `sync_merge.py:60` maps to `Design.Design_For`; the core key is `Design.For`. Separate small PR after a browser check | approved 2026-11-15 |

## Phases
| Phase | Work | PRs | Behaviour change | Run by | Checkpoint for the user |
|---|---|---|---|---|---|
| **1 Tooling and guardrails** | Both codemods, choices file, `web_keys.py`, `webKeys.js` generator, backend guard test, ESLint rule with a "not converted" list. **No key is converted.** | A | no | Sonnet high, then reviewed | `report` reproduces the counts below; gates pass |
| **2 Pilot** | Convert backend `tension_member` (about 117 keys) to prove the codemod on real code | B | no | Sonnet high | review the diff by hand before continuing |
| **3 Shims and aliases** | Remove the `End_1` shim; then plate girder, base plate and cantilever aliases; osi spelling variants | C, D | **yes** | Sonnet high, reviewed by me | browser checks: struts, plate girder, base plate, cantilever, `.osi` export and import |
| **4 Backend families** | shear + simple; moment; compression + flexure + base plate | E1, E2, F | no | Sonnet high, parallel worktrees | gates only |
| **5 Backend core utils** | `osi_files.py`, `output_dialogs.py`, `sync_merge.py`, `cad_helpers.py`, `cad_model_api.py` | G | no | Sonnet high | gates; `sync_merge` keys reported, not changed |
| **6 Frontend** | All `*Config.js` and `coverPlateConfigFactory.js`; then shared code (registry, modals, osi utilities); delete dead `buildOsiContent` | H, I | no | Sonnet high | gates; design-preference modal and `.osi` load in the browser |
| **7 Finish** | Guardrails cover everything, delete the not-converted lists and both codemods, final docs | J | no | Sonnet high | lint and guard test have no exemptions except purlin |

**Order and dependencies:** 1 → 2 → 3 → (4, 5, 6 can run in parallel, but only in separate worktrees) → 7. Within Phase 4, E1/E2 may start right after Phase 2; F and Phase 5 need Phase 3. Frontend struts config needs Phase 3 (C), plate girder and base plate configs need D.

**Estimate:** about 22 to 26 hours of agent time in total (A 6–8, B 1–1.5, C 2, D 3–4, E1 1.5, E2 1.5, F 2, G 1.5, H 2, I 2, J 1).

## Findings that shape the work
- **Counts (purlin and tests excluded):**
  - Backend `apps/modules`: 1,376 real dotted keys (1,111 map to one name, 93 to two or more, 172 not in `Common.py`), about 280 undotted, plus 171 in core utilities (`osi_files` 78, `output_dialogs` 46, `sync_merge` 43, `cad_helpers` 2, `cad_model_api` 2). Per family: moment 326, shear 243, flexure 224, simple 193, compression 186, base plate 111, tension 93.
  - Frontend: 524 dotted keys (443 one name, 22 ambiguous, 59 unknown, one false positive `"Outputs.csv"`), 313 in `configs/*Config.js`, 211 elsewhere, plus about 65 undotted and 35 inside template literals in dead code. A selector with 9 key prefixes would miss 145 of them, so lint uses a general pattern.
- **False positives are real:** 17 in `apps/modules` (a docstring sentence repeated 15 times, two f-string pieces). The codemods choose by exact value, never by regex.
- **`Common.py` reassigns 14 names** (e.g. `KEY_OUT_WELD_TYPE` is `'Stiffener.weld'` at :2487 and `'Weld.Type'` at :2560). The codemods read values from the imported module, never by parsing the file.
- **Importing `osdag_core.Common` is cheap** (about 116 ms, standard library only) and every adapter already does it.
- **Star imports** of `Common` exist in `tension_member/shared.py`, `shear_connection/shared.py`, `moment_connection/shared.py`. The codemod still adds explicit names.
- **Local copies of core constants** (equal to the core values): `base_plate/adapter.py:28-70` (43 lines), `struts_bolted/adapter.py:6` and `struts_welded/adapter.py:6` (`KEY_DISP_STRUT_*`). The codemod deletes them and imports the core name.
- **`# KEY_X` trailing comments:** 100 lines; 81 match, 19 are wrong. Remove a comment only when it equals the chosen name; report the rest.
- **`.osi` export bug:** `flatten_and_translate_keys` (`osi_files.py:44-89`) builds `reverse_aliases = {v: k}`, so the last spelling wins and it writes `Connector.Plate.Thickness_list` (core: `_List`), `Connector.Flange_Plate.Thickness_List` (core: `_list`), `Section Profile *`, `EndCondition1`. Desktop Osdag can't read these. Chapter 5's "desktop-compatible" claim is wrong. No codemod PR may change this; Phase 3 (D2) fixes it.
- **`End_1`:** the live shim is `struts_bolted/adapter.py:196-198` and `struts_welded/adapter.py:149-151`. The `axially_loaded_column` branch is dead for the web (`axiallyLoadedColumnConfig.js:146-149` already sends `End_1`).
- **Likely bug (do not fix in a codemod PR):** `sync_merge.py:60` `"Design.Design_For"` vs core `"Design.For"`.
- **Dead code:** `buildOsiContent` in `osiInputSerializer.js:56-169` (no callers); `registry.js:135` `topAngleList: "Connector.Top_Angle_List"`.
- **Safety nets:** fixture tests call `validate_input()`; `test_design_state_isolation.py` and `test_output_layout.py` run `generate_output` on every runnable fixture; the Vitest payload-parity snapshots cover every `*Config.js`. Frontend shared utilities (`osiNormalizer`, `osiMapperTracer`, the modals) have **no tests**, so the codemod's tree comparison and the browser checks are the only proof there.
- **Docs wording:** `documentation/issues.md` mentions "Phase" in an open row; rewrite when touching it.

## Every shape a key appears in
Backend (AST): list/tuple element 410, subscript `iv["K"]` 265, `InvalidInputTypeError("K", …)` argument 227, `.get("K", …)` 200, dict key 132, module-level assignment 48, dict value 46, comparison 33, other validator arguments 15. Not rewritten, only reported: docstrings and comments, f-strings that build keys (`plate_girder/adapter.py:413-415`), the `"Pref."` prefix logic, composite output-layout keys like `"Diameter (mm) + Bolt.Diameter"`, module display names in `sync_merge.py:27-48`.

Frontend: object key 429, computed member `obj["K"]` 71, property value 16, array element 8, plus 16 non-computed identifier keys (`End_1:`, `Module:`, `Material:`) and template literals in dead code. JSX text never matches.

**Undotted keys (curated list only, key positions only):** `Module`→KEY_MODULE, `Material`→KEY_MATERIAL, `Connectivity`→KEY_CONN, `Conn_Location`→KEY_LOCATION, `End_1/End_2/End_1_Y/End_2_Y`→KEY_END1/2/1_Y/2_Y, `PlateWidth`→KEY_PLATE_WIDTH, `Plate1Thickness`/`Plate2Thickness`→KEY_PLATE1/2_THICKNESS, `EndPlateType`→KEY_ENDPLATE_TYPE, `End Condition`→KEY_END_CONDITION, `" Out_of_Plane"`/`" In_Plane"` (leading space)→KEY_Buckling_Out_plane/In_plane. Key positions: dict key, subscript, first argument of `.get/.pop/.setdefault`, `in` comparison, required-key list element, JS object key or computed member. Paths: backend `apps/modules/**`, `osi_files.py`, `sync_merge.py`; frontend `src/modules/**`. Excluded: `"Grade"` (coincides with `KEY_OUT_DISP_INTER_GRD_PROVIDED`), `"Material"` in `catalog.py` and `osdag_overrides.py` (a table name), values like `"Plastic"`, snake_case form fields, labels.

## Codemod design (Phase 1)
**Files:** `scripts/codemod_keys.py` (run with `conda run -n osdag-web python`), `scripts/codemod_keys.mjs` (run with `node`; loads `espree` and `eslint-scope` from `frontend/node_modules` via `createRequire`), `scripts/codemod_key_choices.json`. No new dependencies. Both codemods have the same CLI:
```
report  [paths]               # per-file counts: one / ambiguous / unknown / skipped; --json
apply   paths [--dry-run]     # rewrite, then verify the result; --dry-run prints a unified diff
verify  paths --base <rev>    # self-check of the working tree against git show <rev>:<path>
```
Hard rules: refuse any path containing `/purlin/`; never touch tests, `migrations`, `constants/generated`, `__snapshots__`, fixtures, `web_keys.py`, `webKeys.js`.

**Name map:** value → names from `vars(osdag_core.Common)` for names with prefix `KEY_`, `DISP_`, `CONN_`, plus `WEB_*` from `apps/core/web_keys.py` (backend) or the generated `webKeys.js` (frontend). Eligible: values matching `^[A-Z][A-Za-z0-9_]*( [A-Z][A-Za-z0-9_]*)?(\.[A-Za-z0-9_]+)+$` that are in the map, plus the undotted list in key positions. One name → use it. Several → the choices file (ordered rules `{path glob, enclosing-function regex} → name`, then a `default`; unresolved aborts the file). Not in the map → report and leave.

**Backend rewriting:**
1. Read as `utf-8-sig`; keep the BOM and newline style.
2. `ast.parse`, build a parent map, collect string `ast.Constant`s.
3. Skip docstrings, anything inside `JoinedStr`, annotations, `match` patterns.
4. Replace the exact source span. `col_offset` counts UTF-8 bytes, so slice the encoded line.
5. Assert the span is a single `STRING` token (no implicit concatenation, no prefix) and `ast.literal_eval(span) == value`.
6. Hint comments: delete a trailing `# <chosen name>` comment; report comments naming a different `KEY_`.
7. Local copies: a module-level `NAME = "lit"` where `Common.NAME == "lit"` is deleted and `NAME` imported; a different value aborts the file.
8. Imports: always add explicit names, even with a star import (avoids new F405). Merge into the first module-level `from osdag_core.Common import …` without a star; if it has inner comments, add a second statement after it; otherwise insert after the last top-level import. Assert the insertion precedes every module-level use. One line if it fits in 100 columns, else parenthesised, one name per line, trailing comma, sorted. Same rules for `from apps.core.web_keys import …`. Leave function-local imports alone.
9. Shadowing: collect every name bound in the file; abort if an inserted name is bound by anything except a `Common`/`web_keys` import or a deleted local copy.

**Frontend rewriting (espree with `range`):**
| Shape | Becomes |
|---|---|
| `Property.key` Literal, or non-computed non-shorthand Identifier (undotted list only) | `[NAME]` |
| computed `MemberExpression.property` | `NAME` |
| value, array element, argument or operand Literal | `NAME` |
| JSXAttribute Literal | `{NAME}` (none today) |
| TemplateLiteral with no expressions | `NAME` |

Skip `__proto__` keys, directives, import sources. Import from a relative specifier with no extension and double quotes (e.g. `../../../../constants/generated/coreKeys`); merge into an existing import resolving to the same file (sorted, wrapped at 100 columns, two-space indent, trailing comma), else insert after the last `ImportDeclaration`. Shadowing check with `eslint-scope`.

**Self-check (inside `apply`; `verify` runs it alone):** the new file parses; every inserted name resolves to a value equal to the replaced literal; **tree comparison**: in old and new tree, replace every identifier that refers to an imported key name with its value, delete the key-import statements, drop deleted local copies (JS: turn computed Literal keys and non-computed Identifier keys into a non-computed Literal key, ignore `raw`), then `ast.dump(old) == ast.dump(new)` (JS: JSON of the trees without positions); and a second `apply` changes nothing. A file that fails any check is left untouched, and the codemod prints the first differing node.

## Ambiguity rules (`codemod_key_choices.json`)
The choice never changes behaviour (the strings are identical); it only affects how the code reads. First matching rule wins.
| Value | Candidates | Rule |
|---|---|---|
| `Bolt.Diameter` | KEY_D, KEY_OUT_D_PROVIDED | `core/utils/output_dialogs.py` → KEY_OUT_D_PROVIDED; function `map_tuple_list` → KEY_OUT_D_PROVIDED; default **KEY_D** (required lists, `validate_input`, `create_from_input`, hover fallbacks, osi alias tables, all 12 frontend uses) |
| `Weld.Type` | KEY_WELD_TYPE, KEY_DP_WELD_TYPE, KEY_OUT_WELD_TYPE | `map_tuple_list` / `generate_output` → KEY_OUT_WELD_TYPE; `modules/simple_connection/**` → **KEY_DP_WELD_TYPE**; default **KEY_WELD_TYPE** (base plate, end plates, cover-plate weld; all 8 frontend uses) |
| `Weld.Size` | KEY_WELD_SIZE, KEY_DP_WELD_SIZE, KEY_OUT_WELD_SIZE | `output_dialogs.py`, or function `generate_output` / `map_tuple_list` → KEY_OUT_WELD_SIZE; default **KEY_WELD_SIZE** |
| `Plate.Thickness` | KEY_OUT_PLATETHK, KEY_OUT_CLEATTHK | **KEY_OUT_PLATETHK** |
| `Stiffener.Height`, `Stiffener.Thickness` | KEY_OUT_STIFFENER_*, *_CHS | **non-CHS** |
| `Plate.Height` (core) | KEY_OUT_PLATE_HEIGHT, KEY_OUT_CLEAT_HEIGHT | **KEY_OUT_PLATE_HEIGHT** |
| `ColumnEndPlate.p2_flange` (core) | KEY_PITCH_2_FLANGE, KEY_PITCH_2_FLANGE1 | **KEY_PITCH_2_FLANGE1** |
| `Material` (undotted) | KEY_MATERIAL, KEY_MATERIAL_ST_SK, KEY_DISP_BASE_PLATE_MATERIAL | **KEY_MATERIAL** |

## Keys that are not in `Common.py`
| Class | Keys | Where the constant lives |
|---|---|---|
| (a) Web request names the adapter maps to a core key | `Member.End_1/2`, `Member.End_1_Y/2_Y`; plate girder `Design.Design_Type_Flexure`, `Torsional_Restraint`, `Warping_Restraint`, `Max_Deflection`, `Allow_Class`, `Web_Philosophy`, `Support_Width`, `IntermediateStiffener(.Spacing/.Thickness)`, `LongitudnalStiffener(.Thickness)`, `ShearBucklingOption`, `Effective_Area_Parameter`, `Length_Overwrite`, `Loading.Bending_Moment_Shape`; base plate `Anchor.Diameter/.OCF/.ICF`, `Anchor.Grade/.OCF/.ICF`, `Anchor.Type`; on-cantilever fallbacks `Flexure.Support_Restraint/Top_Restraint` | **None.** Phase 3 makes the frontend send the core key and deletes the mapping. If D1 is rejected, put them in `web_keys.py` with a `WEB_ALIASES` map and test that every target is a core value. |
| (b) Spelling or case variants of a core key | `Connector.Plate.Thickness_list`, `Connector.Flange_Plate.Thickness_List`, `Connector.Web_Plate.Thickness_list`, `Connector.Top_Angle_List`, `Member.Section_Profile`, `Supported_/Supporting_Section.Designation`, `Load.Shear.Force`, `Member.Length_zz/yy`, `"End 1"`, `Section Profile *`, `Member.Profile *`, `TopFlange.Width`/`BottomFlange.Width`, `sync_merge.py:60 Design.Design_For`, `:94 Base_Plate.Material_St_Sk` | **None.** Delete them in Phase 3 (D2). Hand `sync_merge` to the user. |
| (c) Genuinely web-only (about 40 values) | base plate `Column.Depth/Width/Tf/Tw`, `StiffenerHollow.D/B/OD.Thickness`; header plate `Beam.WebThickness`, `EndPlate.Supported*`, `EndPlate.Supporting*`; end plates `Beam.Depth/FlangeThickness/WebThickness`, `Detailing.MiddleBolts`, `ColumnEndPlate.Pitch/MidPitch/WebThickness/FlangeThickness`; welded cover plates `Flange_Weld.Reduction/Strength_red`, `Web_Weld.Reduction/Strength_red`; lap/butt bolted `Bolt.Diameter_Provided/Total_Number/Rows_Provided/Columns_Provided/Connection_Length`, `PackingPlate.Thickness`, `Utilization.Ratio`, `Member.Depth`; plate girder `Design.*Stiffener*.Thickness_Values`; frontend bounds `Total.Depth_lb/_ub/_inc`, `Topflange.Width_*`, `Bottomflange.Width_*`; `OsdagWeb.Version` | **`backend/apps/core/web_keys.py`** (no imports, `WEB_` prefix, grouped by family), generated into `webKeys.js` by `scripts/gen_core_keys.py` (covered by the existing `git diff --exit-code frontend/src/constants/generated/` check). Pinning tests: no `WEB_` value equals a `Common.py` string (if the core adds it, switch), values unique, names match `^WEB_[A-Z0-9_]+$`. |

Not keys: the docstring sentence, f-string pieces, `"Outputs.csv"` (`groupedCsvExport.js:178`; add `eslint-disable-next-line … -- file name, not a key`), labels like `"No. of Rows"`, `"CHS 355.6 x 12"`.

## Guardrails (Phase 1)
**ESLint:** enable the rule for all of `src/` from the start, with a shrinking `KEYS_NOT_CONVERTED` list. Add after the existing block in `frontend/eslint.config.js` (nothing else uses `no-restricted-syntax` today; a later block that set it would replace these entries):
```js
const DOTTED_KEY = String.raw`/^[A-Z][A-Za-z0-9_]*( [A-Z][A-Za-z0-9_]*)?(\.[A-Za-z0-9_]+)+$/`
const UNDOTTED_KEY = String.raw`/^(Module|Material|Connectivity|Conn_Location|End_1|End_2|End_1_Y|End_2_Y|EndPlateType|PlateWidth|Plate1Thickness|Plate2Thickness)$/`
const KEY_MESSAGE = 'Import design-input keys from src/constants/generated/coreKeys.js (or webKeys.js) instead of writing the string.'
const KEYS_NOT_CONVERTED = [ /* one per line, sorted */ ]
{
  files: ['src/**/*.{js,jsx}'],
  ignores: ['src/constants/generated/**', 'src/test/**', 'src/**/*.test.js',
            'src/modules/flexuralMember/purlin/**', ...KEYS_NOT_CONVERTED],
  rules: {
    'no-restricted-syntax': ['error',
      { selector: `Literal[value=${DOTTED_KEY}]`, message: KEY_MESSAGE },
      { selector: `TemplateLiteral[expressions.length=0] > TemplateElement[value.raw=${DOTTED_KEY}]`, message: KEY_MESSAGE },
      { selector: `Property[computed=false][shorthand=false] > Identifier.key[name=${UNDOTTED_KEY}]`, message: KEY_MESSAGE },
      { selector: `Property[computed=false] > Literal.key[value=${UNDOTTED_KEY}]`, message: KEY_MESSAGE },
      { selector: `MemberExpression[computed=true] > Literal.property[value=${UNDOTTED_KEY}]`, message: KEY_MESSAGE },
    ],
  },
},
```
The selectors were tested in memory with ESLint's `Linter`: they flag string keys, `obj["K"]`, JSX attribute strings and key-only templates, and do not flag JSX text or `{Module}` shorthand. Initial `KEYS_NOT_CONVERTED` (all under `src/modules/`, 26 files): `basePlate/configs/basePlateConfig.js`; the configs of `beamBeamEndPlate`, `beamToColumnEndPlate`, `columnColumnEndPlate`; `compressionMember/configs/{axiallyLoadedColumn,strutsBolted,strutsWelded}Config.js`; `flexuralMember/{onCantilever,plateGirder,simplySupportedBeam}/configs/*Config.js`; `shearConnection/{cleatAngle,endPlate,finPlate,seatAngle}/configs/*Config.js`; `registry.js`; `shared/components/{AnchorBoltSectionModal,BasePlateSectionModal,DesignPrefSections,DesignReportModal,StiffenerSectionModal}.jsx`; `shared/config/{coverPlateConfigFactory,designPrefModuleConfig}.js`; `shared/utils/{osiMapperTracer,osiNormalizer,osiInputSerializer}.js`. Regenerate this list from `codemod_keys.mjs report` and the ESLint output, since it is the source of truth.

**Backend:** `backend/apps/core/tests/test_no_inline_keys.py`, AST style like `test_error_format_guard.py`, no database. Scans `apps/modules/**` and `apps/core/**`; skips `tests/`, `migrations/`, `__pycache__`, `purlin/`, `apps/core/web_keys.py`. Flags a string `Constant` matching the dotted pattern (docstrings and f-string parts excluded) and curated undotted values in key positions inside the undotted paths. `NOT_CONVERTED = {"apps/modules/…/adapter.py": <count>}`: a count may only go down; the test fails if a count goes up, if a listed file reaches 0 ("remove it from NOT_CONVERTED"), or if an entry is stale. `ALLOWED = {(path, value): reason}` for reviewed non-keys, starts empty with the same stale check. Failure message names every candidate constant: `apps/modules/x/adapter.py:57: inline key 'Bolt.Diameter'; import KEY_D from osdag_core.Common (for a key the core doesn't have, add it to apps/core/web_keys.py)`. Also the `web_keys` pinning tests above. `test_required_keys_in_core.py` stays; its `KNOWN_EXCEPTIONS` shrinks in Phase 3 and is deleted.

## Removing the `End_1` shim (Phase 3, PR C)
The core reads `End_1`/`End_2` directly (`compression_bolted.py:883-884` `.get(KEY_END1, 'Fixed')`; `compression_welded.py:1092-1093` required key), so the struts adapters need no mapping. One commit, in this order:
1. **Frontend:** `strutsBoltedConfig.js:161-162` and `strutsWeldedConfig.js:146-147`: `"Member.End_1": …` → `[KEY_END1]: …` (and 2), import from coreKeys; `osiMapperTracer.js:108-111` delete the `Member.End_*` aliases; `osiNormalizer.js:117,119,121,123` drop the `flatObj["Member.End_*"] ||` operands.
2. **Backend:** `struts_bolted/adapter.py`: `:50-51` required keys → `KEY_END1`/`KEY_END2`, `:154-157` validation, delete `:196-198`. `struts_welded/adapter.py`: `:42-43`, `:104-107`, delete `:149-151`. `axially_loaded_column/adapter.py`: delete the alias blocks `:85-110` and `:222-247` (the web sends core keys) and fix the comment `:204-215`; keep the explicit dict at `:258-261`. `osi_files.py:147-150`: delete the `Member.End_*` aliases; keep `End_1` → `end_condition_1` (`:151-154`), which desktop `.osi` loading needs.
3. `test_required_keys_in_core.py:27-34`: delete both struts entries.
4. **Fixtures:** `Member.End_1/2` → `End_1/End_2` in `compression_member__struts_bolted/defaults-all.json:213-214`, `defaults-customized.json:16-17`, and the same files under `struts_welded`.
5. **Snapshot:** `npm test -- -u`. The only allowed change is `Member.End_1/2` → `End_1/2` in the 4 struts snapshots; check at JSON level (pretty-format sorts keys, so lines move): parse old and new `.snap` (`git show origin/25april:…`) and diff the key sets, expecting exactly 8 keys changed.
6. **Docs:** `chapter_2_backend_architecture.md:103` (drop the struts exception), `issues.md` (rewrite the open row without "Phase"), `chapter_5` alias section if it lists them.

## Phase 3, PR D (after D1 and D2 are answered)
- **Frontend:** `plateGirderConfig.js:347-389` sends the core constants (KEY_DESIGN_TYPE_FLEXURE, KEY_BENDING_MOMENT_SHAPE, KEY_TORSIONAL_RES, KEY_WARPING_RES, KEY_MAX_DEFL, KEY_ALLOW_CLASS, KEY_WEB_PHILOSOPHY, KEY_SUPPORT_WIDTH, KEY_IntermediateStiffener(_spacing/_thickness), KEY_LongitudnalStiffener(_thickness), KEY_ShearBucklingOption, KEY_EFFECTIVE_AREA_PARA, KEY_LENGTH_OVERWRITE), same values. `basePlateConfig.js:102-105` sends `KEY_DIA_ANCHOR_OCF/ICF` and `KEY_GRD_ANCHOR_OCF/ICF`; `DesignReportModal.jsx:168-173` likewise.
- **Backend:** plate girder adapter `:56-151`, `:234-254`, `:491-494` and `tasks.py` read those constants; delete the `TopFlange/BottomFlange.Width` aliases `:408-409`. Base plate adapter `:217-247` reads the core keys with the same defaults, drops the `Anchor.*` and `Bolt.Diameter` fallbacks. On-cantilever: delete the `:102-104` and `:121-123` fallbacks.
- **osi alias tables:** delete the class (b) variants in `osi_files.py` (merge its two copies into one module-level dict), `osiMapperTracer.js`, `osiNormalizer.js`. Add a `test_osi_files` case proving `flatten_and_translate_keys` now emits `Connector.Plate.Thickness_List`, `Connector.Flange_Plate.Thickness_list`, `Member.Profile`.
- Empty and delete `KNOWN_EXCEPTIONS`; add class (c) keys to `web_keys.py`; regenerate; update plate girder and base plate fixtures and the snapshot (key renames only, shown with the same JSON diff).
- Browser: plate girder, base plate and cantilever designs, plus an `.osi` save and load.

## Gates (GitHub CI is locked, so every PR is verified locally)
**Backend gate (BG):** (1) `conda run -n osdag-web python scripts/codemod_keys.py verify <paths> --base origin/25april` prints OK; (2) a second `apply` changes nothing; (3) `ruff check backend --select E9,F63,F7,F82`; (4) `ruff check --output-format concise <touched files> | wc -l` is no higher than at `origin/25april` (the full rule set already has 1,681 errors, so compare per touched file); (5) the full pytest run: **1190 passed**, same skips and xfails; (6) `git diff --exit-code origin/25april -- backend/apps/core/tests/fixtures frontend/src/test/__snapshots__` is empty (except Phase 3).

**Frontend gate (FG):** (1) `node scripts/codemod_keys.mjs verify <paths> --base origin/25april`; (2) `cd frontend && npm run lint && npm test && npm run build`; (3) the snapshot and fixture diff is empty (except Phase 3); (4) `QT_QPA_PLATFORM=offscreen conda run -n osdag-web python scripts/gen_core_keys.py && git diff --exit-code frontend/src/constants/generated/`.

Backend pytest command: `cd backend && DATABASE_HOST=localhost DATABASE_PORT=5470 DATABASE_NAME=postgres_Intg_osdag DATABASE_USER=osdagdeveloper DATABASE_PASSWORD=password SECRET_KEY=x QT_QPA_PLATFORM=offscreen conda run -n osdag-web python -m pytest --ds=config.settings -q -p no:cacheprovider` (a Postgres is up on port 5470; about 3.5 minutes; pytest runs Celery eagerly).

## Brief for every implementer (paste in)
- Repo `/home/abhijith/coding/osdag/Osdag-web`, base `origin/25april`. Work in `.claude/worktrees/<name>`; never switch branches in the main checkout.
- One commit, a plain message, **no co-author trailer, no "Generated with" footer**, no issue/PR numbers or "phase" wording in code, comments or docs. Every PR updates the docs it affects. PRs are rebase-merged by the user's instruction; do not merge, report instead.
- Do not edit `osdag_core/`, purlin, test files, fixtures or snapshots (except where the phase says so). Never change a key's string.
- Run the codemod; do not hand-edit literals. If `apply` or `verify` fails on a file, do not edit by hand to make it pass: rerun with that file excluded, leave it in the not-converted list, and report the codemod output. The same applies to an unknown key the brief doesn't mention, a stale `# KEY_` comment, or a shadowing abort.
- Report: files changed; replacement counts from `report` before and after; codemod warnings; the tails of the gate output (test counts); anything skipped.
- **Reviewer spot-check (for me):** only literal→name swaps, import edits, removed `# KEY_X` comments and deleted local copies; ten random swaps checked against `Common.py` at runtime; every ambiguous swap follows the table; no fixture or snapshot change in codemod PRs; the not-converted lists shrank by exactly the converted files; every `report` unknown is explained.

## Per-phase notes
- **Phase 1:** implement the codemod design, choices file, empty `web_keys.py` with a docstring, `gen_core_keys.py` writing `webKeys.js` (add `backend/` to `sys.path`; same header and sort), the guard test with `NOT_CONVERTED` filled from `report`, and the ESLint block. Unit-test the codemods on small cases (implicit concatenation, a non-ASCII column, star import, merging an existing import, shadowing, a local copy, an ambiguous value with no rule); these tests live in `scripts/` and are removed with the codemods. Docs: chapter 2 gets a "Key constants" subsection; chapter 6 section 6.7.3 (`webKeys`, the lint rule, `CONN_*`); `INDEX.md`; `CONTRIBUTING.md` (the rule and how to run the codemods); the key examples in `documentation/general/ADDING_MODULES_AND_SUBMODULES_BACKEND.md`. Finish with `apply --dry-run` on tension as a demonstration, not committed. Done when all gates pass and `report` reproduces the counts above.
- **Phase 2:** `apply backend/apps/modules/tension_member`. Expect about 117 changes in two adapters, all comment hints matching, no unknowns, 4 `Plate.Thickness` → KEY_OUT_PLATETHK and 3 `Bolt.Diameter` → KEY_D. Remove the two paths from `NOT_CONVERTED`.
- **Phase 4:** `apply <family>`; F also deletes the 43 local copies in `base_plate/adapter.py` and the two struts `KEY_DISP_STRUT_*` copies.
- **Phase 5:** check by hand that `sync_merge.py:60` and `:94` are reported as unknown and left alone.
- **Phase 6:** H confirms axially loaded column's `End_1:` identifier keys become `[KEY_END1]:`. I first deletes `buildOsiContent` and `getFinPlateMemberData`/`formatArrayForText` if they become unused (lint says), then runs the codemod.
- **Phase 7:** delete both lists and the code that reads them, the codemods, the choices JSON and their tests; the ESLint `ignores` become generated, tests and purlin only; docs describe the final rule.

## Risks
Keys built at runtime (f-strings, the `"Pref."` prefix) are reported, not changed; the tight pattern excludes sentences and file names; the shadowing check aborts on any name collision; long import lists (fin plate needs about 40 names) are accepted; duplicate dict keys keep their semantics but ruff's warning moves from F601 to F602; tests that assert literal keys (116 in backend core tests, the JSON fixtures, the snapshots) stay literal on purpose, since they pin the wire format independently of the constants; no backend test covers `sync_merge.py` against the core, and no frontend test covers the shared osi utilities, so the tree comparison plus the browser checks are the proof; purlin is skipped by path in the codemods, the guard and ESLint.

**Rollback:** each PR is one rebase-merged commit, so `git revert <sha>`. A revert puts the list entries back, and for Phase 3 it restores the aliases, fixtures and snapshot.
