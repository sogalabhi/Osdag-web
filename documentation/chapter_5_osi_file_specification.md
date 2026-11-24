# Chapter 5: OSI File Specification & Exchange System

Osdag-Web maintains full cross-compatibility with the Osdag desktop application through support for the **Osdag Input (`.osi`) file format**.

---

## 5.1 The OSI Format Anatomy

An `.osi` file is the **design dictionary**: a flat `{ core key: value }` object holding the module's inputs and the Additional Inputs, keyed by the desktop's own keys (`Bolt.Diameter`, `Detailing.Gap`, `Module`, ...). It has no `Pref.` prefix, no `{dock, pref}` split and no web field names. The same dictionary is what a design request carries (`buildSubmissionParams`, with the "All" lists expanded) and what a saved project stores in `inputs_json` (chapter 4), so a project downloads as a `.osi` file without translation. The frontend builds it in [osiSave.js](../frontend/src/modules/shared/utils/osiSave.js) (`toDesignDictionary`) and reads it back with `fromDesignDictionary` (section 5.4). The backend utility [osi_files.py](../backend/apps/core/utils/osi_files.py) reads two formats and writes one:

### 1. The Desktop Dotted Flat Format (YAML-like)
The desktop Osdag application saves project inputs in a flat, dotted namespace format. This is the active, native file format used by the Osdag desktop application (not a legacy or deprecated format). Dictionaries are serialized into plain-text lines separated by colons, and lists are formatted with leading hyphens:
```yaml
Bolt.Bolt_Hole_Type: Standard
Bolt.Diameter:
- '20'
- '24'
Bolt.Grade:
- '4.6'
Module: Fin Plate Connection
```
* Osdag-Web reads these files with PyYAML (`_parse_flat_yaml`, a `SafeLoader` subclass), so everything YAML allows is handled: comments, quoting, and the anchors (`&id001`) and aliases (`*id001`) PyYAML writes when the same list occurs twice (for example the plate thickness lists of the cover plate modules). Each key gets its own copy of a shared list.
* Keys stay flat and dotted. Every value stays a string (`No`, `08` and `1.0` are not converted to a bool or number); lists are lists of strings; an empty value becomes an empty list.
* Text that is not a mapping, or a file without a `Module:` line, is rejected.

### 2. The JSON Envelope (read only)
`parse_osi` also reads a JSON file with a `version`, `name`, `module_id` and a flat `inputs` object of core keys. The web no longer writes it; every export is the flat YAML above.
```json
{
  "version": "1.0",
  "name": "Fin Plate Join",
  "module_id": "Fin Plate Connection",
  "inputs": {
    "Bolt.Type": "Bearing Bolt",
    "Bolt.Diameter": ["20"],
    "Detailing.Gap": "10"
  }
}
```

---

## 5.2 Exporting OSI Files

The export endpoint [SaveOsiFromInputs](../backend/apps/core/api/projects/osi_api.py) processes client export requests. The request carries the design dictionary and the writer (`osi_files._to_flat_yaml`) dumps it as flat YAML as it is: keys sorted, every value a string or a list of strings (a number is written as its string), lists written in full (no anchors). The only entry it touches is `Module`: it is filled from the module id when missing, and the header plate module is written under the desktop's name `End Plate Connection`. The file is readable by the desktop (`parse_osi` of the export gives the same dictionary back; `test_osi_export.py` checks it for the 66 desktop examples).

The Database menu's "Download Inputs CSV" (human-readable, label and value per dock field) takes each value from the same dictionary (`inputsAsRequested` in [groupedCsvExport.js](../frontend/src/modules/shared/utils/groupedCsvExport.js) calls `toDesignDictionary`), so a field the form holds as a typed value shows that value and an "All" selection shows the list the design request sends, exactly as the `.osi` file holds them. Every CSV the app downloads (inputs, outputs, raw outputs) writes its cells through one helper, `escapeCsvCell` in [csvUtils.js](../frontend/src/utils/csvUtils.js): a text cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return gets a leading single quote so a spreadsheet does not read it as a formula (the sections XLSX export does the same), while numbers and plain numeric strings such as `-12.5` are written unchanged.

### Guest Users (Base64 Inline Stream)
Since guest users have no cloud database storage permissions:
1. The backend builds the `.osi` payload.
2. It serializes the text file and encodes the content into a **Base64 ASCII string**.
3. It returns the Base64 data inline inside the HTTP response.
4. The React frontend receives the string, decodes it into a blob, and triggers an in-browser local file download.

### Authenticated Users (Database Storage)
For verified authenticated users:
1. The backend writes the payload into an `.osi` text file.
2. It instantiates a database record in the `OsiFile` model.
3. It saves the physical file to disk storage (`/osifiles/`) and returns the file's static URL path to the frontend.

---

## 5.3 Importing OSI Files

When a user imports an `.osi` file via the UI:

### 1. Upload & Parsing
1. The frontend posts the file to the `/api/open-osi/` endpoint.
2. The [OpenOsiUpload](../backend/apps/core/api/projects/osi_api.py) view intercepts the stream and reads it into memory.
3. The parser detects if the file starts with a JSON brace (`{`) or a YAML dotted structure.
4. It parses the file and returns `inputs`: the file's design dictionary, keys and values exactly as written (core keys such as `Bolt.Diameter`). The backend does not translate them; the frontend reads them with the module's declared `coreKeys` (section 5.4).

### 2. Module Routing
The parsed response carries the module name from the file's `Module:` line (`module_id`). A module's id is its desktop module name (`KEY_DISP_*` in `osdag_core/Common.py`), so the frontend resolves it directly with `findModule` from [registry.js](../frontend/src/modules/registry.js) and navigates to that module's `path`. A name that matches no registry entry is rejected as an unsupported module.

Desktop compatibility notes:
* The desktop calls the shear header plate module `End Plate Connection`; the web module id is `Header Plate Connection`. `parse_osi` maps the desktop name (`DESKTOP_MODULE_NAMES` in `osi_files.py`), so those files open the header plate page.
* Names that older desktop releases used and the desktop has since renamed (for example `Beam-Beam End Plate Splice`, `Beam Coverplate Connection`, `Struts in Trusses`) are not supported and are rejected as unsupported modules.

---

## 5.4 Key Translation & Frontend Prefill Normalizer

Because the Python desktop engine uses dotted PascalCase parameters (e.g. `Bolt.TensionType`, `Detailing.Gap`) while Osdag-Web uses snake_case keys (e.g. `bolt_tension_type`, `detailing_gap`), the frontend translates these configurations during import:

1. **`fromDesignDictionary`:** [designDictionary.js](../frontend/src/modules/shared/utils/designDictionary.js) reads the design dictionary with the module config's declared `coreKeys` (field to core key or keys, see [CORE_KEYS_README.md](../frontend/src/modules/shared/config/CORE_KEYS_README.md)) backwards: a core key fills every field that declares it, so one `.osi` key can feed several fields (for example `Member.Supported_Section.Designation` fills `beam_section` and `secondary_beam`). A field declares each key the desktop can write it under, not only the one the web sends (the base plate config declares `Load.Axial_Compression` next to `Load.Axial`). Keys no field declares (desktop output-panel state such as `out_titles_status` and `Label_*`, keys of other modules) are dropped, and so are keys a config lists in `computedCoreKeys`. When several keys share one field the more specific key wins (`Material`, then `Connector.Material`, then the member and section materials). The Additional Inputs (bolt hole type, detailing gap, weld fabrication, ...) are core keys like the rest: each module declares them for their fields, so they load into the form like any other value, and the design request reads them the same way as it reads an override. A list equal to the full option list of the field is read as "All". Most option lists are held by the module data (`INPUT_KEY_TO_LIST`); the section designation of the tension, strut, column and beam modules depends on the section profile, so its list is the field's own `getDynamicDataSource`, read with the profile the file just set. The file is read once the module's option lists have loaded (the homepage "Open" prefill in `useModuleForm` and the project load in `useProjectLoader` wait for `loadingOptions` to be false), otherwise every selection would read as "Customized".
2. **`loadStateFromOsi`:** An observer utility in [osiLoader.js](../frontend/src/modules/shared/utils/osiLoader.js) that hydrates the React states with the result. It takes a design dictionary only: the parsed `.osi` file and a saved project's `inputs_json` go through the same function.
   * Restores input form states (`setInputs`).
   * Configures customized selections (`setSelectionStates` and `setSelectedItems`).
   * Recovers design preference overrides (`setDesignPrefOverrides`).
   * Sanitizes case variances and string formatting (e.g., standardizing `"Standard"` or `"Over-Sized"` hole types).
   * Selects the connectivity (or, for the end plate modules, the end plate type from `EndPlateType`) in the option dropdown.

### Connectivity names

The web forms use the desktop connectivity names throughout (`CONN_CFBW` = `Column Flange-Beam Web`, `CONN_CWBW` = `Column Web-Beam Web`, `Beam-Beam`; generated into `coreKeys.js` from `osdag_core/Common.py`). The backend options endpoints serve the same values (`VALUES_CONN`, `VALUES_CONN_1`), the form submits the selection unchanged, and an `.osi` file's `Connectivity` is loaded as is. No conversion table is needed in either direction.

### Desktop keys the web has no field for

The desktop saves design preferences the web forms do not expose: `Bolt.Material_Grade_OverWrite`, and for the base plate `Base_Plate.*`, `Stiffener_Key.*`, `Member.Fu/Fy/Material` and `DesignPreferences.*`. `fromDesignDictionary` drops them (the desktop would keep them as design preferences, which is not done yet), so a desktop file opened and saved again on the web loses them; `osiRoundTrip.test.js` pins the keys each of the 64 examples loses, adds or changes. The base plate's Additional Inputs are declared for its fields but its builder never sends them, so they are lost too. Where the desktop keeps separate materials (`Material`, `Connector.Material`, `Member.*.Material`) and the web has one field, the member or section material is kept.

---

## 5.5 Project-to-OSI Export

A project's `inputs_json` is the design dictionary, so `ProjectOsiDownload` has nothing to translate: it passes the stored dictionary to the same writer as `SaveOsiFromInputs` and streams the YAML. `build_osi_payload` only checks the name, the module id and that the inputs are an object. Both the old key tables (`FIELD_TO_OSI_KEY`, `flatten_and_translate_keys`) and the `Pref.` prefix are gone.

Projects saved before this change stored form state (`{ dock, pref }` keyed by web field names). They cannot be read any more: migration `0018_clear_field_state_project_inputs` sets their `inputs_json` to null (the project row, name and module stay; the next design run saves the dictionary).

---

## 5.6 Stateless Backend-Assisted Import & Frontend Configs

Osdag-Web relies on a hybrid flow that uses **backend-assisted parsing** combined with **frontend configuration normalization**:

### 1. In-Memory Stateless Parsing (Backend)
When a user uploads a `.osi` file using the **Load Input** option:
* **Backend parsing is required:** The frontend **does** dispatch the raw file payload directly to the `POST /api/open-osi/` endpoint (mapped to `OpenOsiUpload` on the backend). The Python backend parses the raw `.osi` file (handling both native desktop flat dotted syntax and nested JSON syntax) in-memory and returns a clean, parsed input JSON payload in the HTTP response.
* **No Database Operations:** The backend database is completely untouched during this process. Because this parsing is stateless, guest users can import and populate their input docks without needing a relational account or verified database record.

### 2. Frontend Configuration Normalizer & Hydrator (Frontend)
Once the backend returns the parsed dictionary:
* **Client-Side Key Resolution:** The frontend uses each module's declared `coreKeys` (in the `*Config.js` files, read by `designDictionary.js`) to map the parsed core keys onto the form fields and normalise standard dropdown inputs.
* This separates concerns: the backend performs raw file format deserialization, while the frontend handles visual form binding, default values, and interface state hydration.

---

## 5.7 Bidirectional Exchange & Round-Trip Compatibility Scenarios

Osdag-Web ensures full bidirectional compatibility for three main round-trip exchange scenarios:

| Scenario | Export Source | Import Target | Processing & Formatting |
| :--- | :--- | :--- | :--- |
| **Web-to-Desktop** | Osdag-Web | Osdag Desktop | The web app exports the design dictionary through the backend writer (`SaveOsiFromInputs`, `ProjectOsiDownload`) as the desktop's flat dotted YAML, keys unchanged. The Osdag Desktop application reads the generated file directly. |
| **Desktop-to-Web** | Osdag Desktop | Osdag-Web | Osdag Desktop saves files in the native flat format. When uploaded to Osdag-Web, the backend parses the YAML-like structure into JSON statelessly (`OpenOsiUpload`). The React frontend reads the core keys into the form fields with the module's declared `coreKeys` (`fromDesignDictionary`) and hydrates forms. |
| **Web-to-Web** | Osdag-Web | Osdag-Web (later) | Users can export their design configuration from the web, and re-import it later to restore all inputs and design preferences. Hydration restores exact form values, customized selections (such as specific multi-select dropdown values), and preference overrides. |

Since the serialization and parsing logic is centralized in the Python backend, we guarantee that the same formatting rules and engineering dictionary mappings apply across both Desktop and Web, eliminating validation drift.

---

## 5.8 Architecture Assessment & Scopes of Improvement

### 1. Download OSI in Module Page (DB & Storage Accumulation) (Resolved)
* **The Problem:** When an authenticated user downloaded/exported an OSI file from a module page, the backend endpoint `SaveOsiFromInputs` generated a physical file on disk (`/osifiles/`) and registered an `OsiFile` record in the database, causing storage accumulation and DB write bloat.
* **Resolution:** Refactored `SaveOsiFromInputs` to always stream the generated OSI file directly inline in the HTTP response using Base64 encoding. This completely bypasses saving files to disk or database records for simple exports.

### 2. Download OSI in Project / Dashboard List Page (Key Flattening Drift) (Resolved)
* **The Problem:** When downloading an existing project as an `.osi` file from the dashboard, the backend endpoint `ProjectOsiDownload` read the stored nested form state (`{ dock, pref }`, web field names), translated the field names with a key table and prefixed the overrides with `Pref.`. The table drifted from the frontend and the file was not what the desktop writes.
* **Resolution:** A project stores the design dictionary, so the download writes it as it is. `FIELD_TO_OSI_KEY`, `flatten_and_translate_keys` and the `Pref.` prefix were deleted; `test_osi_export.py` checks that an export parses back to the same dictionary.

### 3. Import OSI from Homepage / Dashboard (Inconsistent Parsing Engine) (Resolved)
* **The Problem:** The homepage import flow (in `Header.jsx`) parsed the `.osi` file using client-side JavaScript (`yaml-js`), which could fail or diverge from Python's parsing behaviors on complex YAML flat structures.
* **Resolution:** Updated the onChange handler in `Header.jsx` to upload files directly to the stateless backend endpoint `/api/open-osi/`. The homepage now routes the file to the same python-based parser used on the module pages, guaranteeing parser parity, and stores the parsed inputs in `sessionStorage` for routing prefill.

### 4. Import OSI in Module Page (Key Mapping & Translation Drift) (Resolved)
* **The Problem:** The module-level import uploaded the file to the stateless parser and received raw dotted PascalCase engineering keys, leaving the translation mapping logic to be hardcoded client-side in the frontend normalizers.
* **Resolution:** Moved parsing to the backend engine inside `osi_files.py`. The `parse_osi` utility returns the file's design dictionary as written. A backend translation cannot know each module's form fields, so the frontend maps it with the module's declared `coreKeys` (section 5.4); saved projects store the same dictionary and are read the same way.

