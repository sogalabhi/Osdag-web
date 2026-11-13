# Chapter 6: Dynamic UI Form Engine

Osdag-Web implements a declarative, configuration-driven UI form engine. Rather than hardcoding forms, the interface dynamically renders inputs, binds validation rules, fetches options, builds the output docks from the engine's own output lists, and updates contextual drawings based on module-specific schemas.

---

## 6.1 Dynamic Option Loading (`/options/` endpoints)

When an engineering module page loads, the frontend must populate the dropdown selectors with standard structural sections (Beams, Columns, Channels, Angles) and material values (Steel grades, Bolt grades, Plate thicknesses) from the backend catalog:

1. **Option Queries:** The application issues a GET request to `/api/options/<module_id>/` on load.
2. **Stateless Options Resolution:** The backend reads the standard catalog (the Indian Standard structural tables bundled with `osdag_core`, via `apps/core/catalog.py`) and returns arrays of JSON records matching the active submodule's requirements.
3. **Frontend Caching:** The returned catalog lists (e.g. `boltDiameterList`, `thicknessList`, `beamList`) are saved in the module's React state context.

---

## 6.2 Custom Dropdowns & Section Merging

Osdag-Web allows users to import or create custom structural sections. These custom shapes must be injected into the standard options dropdowns immediately without requiring a full page refresh.

### 1. The Custom Section Event

When a user adds a section via the Section Catalog database, the browser dispatches a global `CustomEvent` on the `window` object using the `notifyCustomSectionAdded` helper exported from [useModuleData.js](../frontend/src/modules/shared/hooks/useModuleData.js):

```javascript
// Called by the Section Catalog component after saving a new entry
export const notifyCustomSectionAdded = ({ table, designation }) => {
  window.dispatchEvent(
    new CustomEvent("osdag:custom-section-added", {
      detail: { table, designation },
    })
  );
};
```

The event `detail` payload carries:
- **`table`** — the IS section catalog table name (`"Columns"`, `"Beams"`, `"Angles"`, `"Channels"`)
- **`designation`** — the unique section label string (e.g. `"CUSTOM_COL_300"`)

### 2. `localCustomSections` State

The hook maintains a dedicated piece of React state, `localCustomSections`, whose shape is a dictionary mapping each section table to its list of registered custom designations:

```javascript
// Example runtime shape
localCustomSections = {
  Columns: ["CUSTOM_COL_300", "CUSTOM_COL_400"],
  Beams:   ["MY_BEAM_600"],
};
```

This state is populated exclusively by the event listener registered in a mount-only `useEffect` (empty dependency array), so it is **not** affected by module load or API refresh cycles:

```javascript
useEffect(() => {
  const handleCustomSectionAdded = (event) => {
    const { table, designation } = event.detail || {};
    if (!table || !designation || !SECTION_TABLE_TO_LIST_KEYS[table]) return;
    setLocalCustomSections((prev) => ({
      ...prev,
      [table]: appendUnique(prev[table], designation),
    }));
  };

  window.addEventListener("osdag:custom-section-added", handleCustomSectionAdded);
  return () => window.removeEventListener("osdag:custom-section-added", handleCustomSectionAdded);
}, []); // Registered once on mount, never re-fires
```

### 3. `SECTION_TABLE_TO_LIST_KEYS` — Catalog Table to Dropdown Key Mapping

Because one section table can feed multiple dropdown lists in the form engine, a static lookup table maps each IS catalog table name to the list of React state keys it should populate:

```javascript
const SECTION_TABLE_TO_LIST_KEYS = {
  Columns:  ["columnList", "sectionDesignation"],
  Beams:    ["beamList",   "sectionDesignation"],
  Angles:   ["angleList",  "topAngleList"],
  Channels: ["channelList"],
};
```

For example, adding a custom `Columns` entry appends the designation to **both** `columnList` (the column selector dropdown) and `sectionDesignation` (the generic profile selector used in some modules).

### 4. `appendUnique` — Deduplication Guard

Before inserting a new designation, the `appendUnique` helper performs a strict string-equality check to prevent duplicate entries appearing in the same dropdown:

```javascript
const appendUnique = (list = [], value) => {
  if (!value) return list || [];
  const safeList = Array.isArray(list) ? list : [];
  const stringValue = String(value);
  if (safeList.some((item) => String(item) === stringValue)) return safeList; // already present
  return [...safeList, value];
};
```

### 5. Client-Side Merge via `useMemo`

Rather than merging custom sections inside the API-fetching `useEffect`, the hook uses a `useMemo` block to compute the final merged options object entirely on the client. This guarantees that adding a custom section **never triggers a network request**:

```javascript
const mergedOptions = useMemo(() => {
  return mergeLocalCustomSections(baseModuleData, localCustomSections);
}, [baseModuleData, localCustomSections]);
```

Where `mergeLocalCustomSections` applies the `SECTION_TABLE_TO_LIST_KEYS` mapping and `appendUnique` across all tracked custom entries:

```javascript
const mergeLocalCustomSections = (data, localCustomSections) => {
  const next = { ...data };
  Object.entries(localCustomSections || {}).forEach(([table, designations]) => {
    const listKeys = SECTION_TABLE_TO_LIST_KEYS[table] || [];
    listKeys.forEach((key) => {
      designations.forEach((designation) => {
        next[key] = appendUnique(next[key], designation);
      });
    });
  });
  return next;
};
```

The `mergedOptions` value is what `useModuleData` returns to the component. The select menus (`columnList`, `beamList`, etc.) are populated from this merged object, so custom sections appear in real time without any page refresh or API call.

---

## 6.3 Interdependent Fields & Conditional Logic

Form input components can depend on other field values. For example, in a Fin Plate Shear Connection:
* If **Connectivity** is set to `Column Flange-Beam Web` (`CONN_CFBW`), the form must display selectors for **Column Section** and **Beam Section**.
* If **Connectivity** is set to `Beam-Beam`, the form must hide the Column Section and display **Primary Beam** and **Secondary Beam** selectors.

Osdag-Web implements this declaratively within the module's input config file (e.g., `finPlateConfig.js`) using the `conditionalDisplay` selector callback:
```javascript
{
  key: "column_section",
  label: "Column Section",
  type: "select",
  options: "columnList",
  conditionalDisplay: (extraState) => {
    const connectivity = extraState?.selectedOption;
    return connectivity === CONN_CFBW || connectivity === CONN_CWBW;
  }
}
```
The [BaseInputDock.jsx](../frontend/src/modules/shared/components/BaseInputDock.jsx) component evaluates this callback on render. If the condition returns `false`, the field is omitted from the DOM.

---

## 6.4 Contextual Dropdown Images

To aid usability, Osdag-Web changes side panel schematic images to match active selection choices. For example:
* Adjusting the Connectivity option updates the connection schema.
* Selecting a specific hollow section type (SHS vs. CHS) updates the base plate cross-sectional layout sketch.

This is driven by reactive state observers inside [EngineeringModule.jsx](../frontend/src/modules/shared/components/EngineeringModule.jsx):
1. User changes a driver dropdown input value (e.g. `beam_section`).
2. The `onChange` observer matches the selection to structural graphics maps.
3. The component updates the `imageSource` state inside `extraState`, which immediately refreshes the visual diagram rendering below the input dock.

---

## 6.5 The Input Dock Form Engine vs. Output Dock Display

The interface splits structural configurations into two main side panels: the **BaseInputDock** (for form entry) and the **BaseOutputDock** (for displaying results).

### 6.5.1 Input Dock Field Types (`BaseInputDock.jsx` & `InputSection.jsx`)
The input form engine supports several custom declarative field types defined inside the module's `inputSections` array:

1. **`select`**: Renders a standard single-selection select dropdown (react-select). Used for materials, bolt types, etc.
2. **`connectivitySelect` / `endPlateSelect`**: Specialized single-select dropdowns that also trigger instant coordinate/graphics changes, updating the panel's descriptive schematic image when selected.
3. **`sectionProfileSelect` / `sectionProfileList`**: Dropdown selectors customized for loading structural profiles (such as Angles, Beams, and Columns) and triggering cross-sectional parameter updates.
4. **`customizable`**: Dropdowns designed for multi-select arrays. The field shows a select container with two values:
   * **`All`**: Selects all available options in the list automatically.
   * **`Customized`**: Displays a button that opens a transfer modal (Ant Design Transfer) where the user can pick multiple custom sizes (e.g. iterating through Bolt Diameters `[16, 20, 24]` or Plate Thicknesses `[8, 10, 12]`).
5. **`dynamicSelect`**: Options lists populated dynamically based on calculations or other selected variables.
6. **`number` / `text`**: Standard text input fields. They intercept key strokes to block letters, allow only positive or negative decimal numbers, and sanitize formats in real time.
7. **`image`**: Displays a diagram. Its `imageSource(extraState, inputs)` callback returns the image URL and is called on every render, so the picture can follow any input (for example the strut end conditions `end_condition_1` / `end_condition_2`) as well as `extraState`. Note the argument order: `extraState` comes first, as in `conditionalDisplay`.

---

### 6.5.2 The Output Dock Is Built From the Engine's Output List (`BaseOutputDock.jsx`)
The output dock has no per-module configuration. It shows what the desktop app shows, built from the same list: a module's `output_values(flag)` returns tuples `(key, label, type, value, visible[, show_callable])`, and the dock follows that list in order.

* `TYPE_TITLE` starts a group box. `TYPE_TEXTBOX` is a read-only label and value. `TYPE_OUT_BUTTON` is a label and a button whose value is `[popup_title, function]`.
* [output_layout.py](../backend/apps/core/utils/output_layout.py) turns the list into JSON: `build_output_layout(module, design_status, design_inputs)` returns sections in order, each `{title, visible, items}`, where an item is a `field` (`key`, `label`, `value` as `str(value)`, `visible`) or a `button` (`key`, `label`, `button_text`, `popup_title`, `visible`, `popup`, `dialog`).
* `run_design_calculation_task` stores it as `result["output_layout"]` before it sends the early `DESIGN_READY` message, so the early message and the final result both carry it. If building it fails, the failure is logged and the key is left out; the design itself is unaffected. The flat `data` dict stays as it was, because the CSV export and reports read it. (A key that appears in both a dock field and a popup is a single entry in `data`, so `data` can differ from the dock; the dock is the engine's own value.) The plate girder optimisation run sends the same `output_layout` in its `pso_complete` message.
* The frontend keeps `output_layout` with the design result (`useDesignSubmission`) and passes it to `BaseOutputDock`.

The visibility rules are the desktop app's (`output_dock.py`, `template_page.py`):

1. After a safe design every field shows `str(value)`, and a field whose value is `None` is hidden.
2. A group is hidden when none of its fields or buttons are visible. A title with no fields at all (a header) is shown only while a visible group follows it, before the next header.
3. A button with a sixth, callable element is shown only if the callable returns true for the design inputs (the cleat angle, header plate and seated angle hide `Section Details > Capacity` for a column flange to beam web connection). As on the desktop, such a button still counts as visible when deciding whether its group is shown.
4. The buttons work only after a safe design. An unsafe design leaves the dock as it was built: every group and field visible, values empty, buttons disabled.

**Before a design**, and for a saved project, which stores only the flat outputs, the dock shows the module's empty layout: the desktop dock at module open, with empty values, every field visible and no popups. `GET /api/modules/<family>/<slug>/output-layout/` ([output_layout_api.py](../backend/apps/core/api/modules/output_layout_api.py); `/api/modules/base-plate/output-layout/` for the base plate) builds it from a fresh module, `create_module()` in the module's `adapter.py`, with `build_output_layout(module, False, {})`. `useModuleData` fetches it with the module's options and returns it as `emptyOutputLayout`; `EngineeringModule` shows it until a design result brings its own layout.

**Popups.** A button's popup is built on the server from its `function(design_status)`, only when the design is safe and the button is shown. A popup is a list of rows: `note` (shown as "Note: text"), `section` (a title with an optional image `{src, width, height, caption}`), `field` (label and value), `label` (a combo box row: label only) and `image` (an extra image). [OutputPopup.jsx](../frontend/src/modules/shared/components/outputDock/OutputPopup.jsx) lays them out as [spacing_dialog.py](../../Osdag/src/osdag_gui/ui/components/dialogs/spacing_dialog.py) does: notes first, then each section's title with its fields on the left and its image and caption on the right, sized from the width and height and scaled down on narrow screens. A popup function that raises gives that popup an empty row list and `error: true`; the design and the other popups are unaffected.

**Drawing dialogs.** The desktop opens a drawing dialog for most buttons that show spacing, capacity or detailing, and the popup rows only when it has none. `output_dialogs.dialog_for` ([output_dialogs.py](../backend/apps/core/utils/output_dialogs.py)) repeats that choice from the same conditions as `output_button_connect` in the desktop `output_dock.py` (module name, button key and title, the connectivity, the base plate type) and puts the result in the button's `dialog`: `{id, note, footnote, sections, values}`. `sections` is the dialog's left panel, `values` are the numbers the drawing reads, named after the props of the drawings in `shared/components/diagrams`. A button the desktop sends to its plain list gets `dialog: null`, and so does a button whose dialog cannot be built from the module (logged); `OutputPopup.jsx` then shows the rows. [dialogDrawings.jsx](../frontend/src/modules/shared/components/outputDock/dialogDrawings.jsx) maps each dialog id to its drawings and titles, and [OutputDialog.jsx](../frontend/src/modules/shared/components/outputDock/OutputDialog.jsx) lays out the panel, the drawings or the fracture cards. The Header Plate module is the desktop End Plate module under another name; only its spacing has a dialog, because its capacity popups list other fields than the desktop dialog reads.

Popup images are the engine's own files in `osdag_core/data/ResourceFiles/images`. `GET /api/core-images/<name>` ([core_images_api.py](../backend/apps/core/api/design/core_images_api.py)) serves only files directly inside that folder: the name must match letters, digits, `_`, `-`, `.` and space and end in `png`, `jpg`, `jpeg` or `svg`; the resolved path's parent must be the folder; anything else is a 404. A popup image outside the folder gets `src: null` and shows an empty box.

Labels may contain `<sub>`, `<sup>` and `<br />`; `outputDock/LabelText.jsx` renders them as elements and shows any other text as plain text.

---

## 6.6 `EngineeringModule` Orchestration Controller

The component [EngineeringModule.jsx](../frontend/src/modules/shared/components/EngineeringModule.jsx) acts as the central orchestration controller. It ties together hooks, input forms, outputs, calculations, logs, and three-dimensional renders:

1. **State Orchestration:** Connects to `useEngineeringModule` to manage state hooks for `inputs`, `outputs`, `logs`, `status` (calculating/rendering), and `designPrefOverrides`.
2. **Form Interactivity Lock:** When calculations complete successfully, the component sets `isInputLocked = true` to freeze editing.
3. **Re-Design Confirmation Loop:** If a user modifies inputs while locked, a confirmation modal warning is shown. Confirming the unlock clears calculation outputs, resets CAD states, and restores edit permissions.
4. **Calculations Lifecycle Hooking:** Initiates WebSocket status subscriptions on submit and guides the docks from input to calculating to output visualization.
5. **Layout Responsiveness:** Manages view panels based on device sizing (e.g., mobile layout toggles between CAD view and form tabs, while desktop splits views into multi-column layouts).

---

## 6.7 Module Configurations (`*Config.js`)

Each engineering module defines its input form declaratively:

### 1. `*Config.js` (e.g., [finPlateConfig.js](../frontend/src/modules/shearConnection/finPlate/configs/finPlateConfig.js))
* **`defaultInputs`:** Defines default key-value pairs for the module forms.
* **`validateInputs`:** Client-side check before submission to confirm that all required structural variables are filled.
* **`buildSubmissionParams`:** Converts flat snake_case frontend inputs back into PascalCase dotted parameters expected by the Python desktop engine.
* **`inputSections`:** Declares form sections, groups, field types (select, customizable, number), and display visibility conditions.

### 2. The output dock has no config file
A module has only its `*Config.js`. Its output dock comes from the engine's output list (see 6.5.2), so there is no `*OutputConfig.js`.

### 3. Key Constants (`generated/coreKeys.js` and `UIStrings.js`)
The frontend takes key strings from exactly two files under `frontend/src/constants/`:

* **[generated/coreKeys.js](../frontend/src/constants/generated/coreKeys.js):** One `export const NAME = "value";` for every string constant named `KEY_*` or `DISP_*` in `osdag_core/Common.py`, sorted by name. Configs import from here instead of typing a key such as `"Bolt.Diameter"` by hand. The values are exactly the core's, including the trailing `*` that many core display labels carry; `stripRequiredMark()` in `validation.js` removes it and the renderer adds the required marker from `field.required`. Never change a key's string: it is sent to the backend and stored in `.osi` files and saved projects.
* **[UIStrings.js](../frontend/src/constants/UIStrings.js):** Labels that exist only in the UI (section titles, buttons, reworded field labels). A UI label that should differ from the core's display string is added here under its own name rather than redefining a core constant.

A module's id is also a `Common.py` constant: its desktop module name (for example `KEY_DISP_FINPLATE`, `'Fin Plate Connection'`). See the module registry below.

**Do not edit `coreKeys.js` by hand.** After `Common.py` changes, regenerate it from the repository root:

```bash
python scripts/gen_core_keys.py
```

The script imports `osdag_core.Common`, so run it in the backend environment (set `QT_QPA_PLATFORM=offscreen` on a machine without a display; the script does this by default). The `backend-qa` CI job runs the generator and then `git diff --exit-code frontend/src/constants/generated/`, so a stale file fails the build.

### 4. Module Registry (`registry.js`)
[registry.js](../frontend/src/modules/registry.js) holds one entry per design module in the `MODULES` array. The router in [App.jsx](../frontend/src/App.jsx), the module selection menu, the API slugs and the design-preference data all read from it, so a module is described in one place.

| Field | Meaning |
| :--- | :--- |
| `id` | The module's desktop name, imported from `generated/coreKeys.js` (`KEY_DISP_*`). It is also the backend `MODULE_ID`, the `designType` of the module's config, and the value stored in a project's `submodule` and in the `Module:` line of an `.osi` file. |
| `path` | The design page URL. `App.jsx` registers `${path}/:projectId?` for every entry under `ProjectAuthGuard`. |
| `title` | Page title passed to `EngineeringModule`. |
| `load` | Lazy import of the module's input config, so each module is its own chunk. [ModulePage.jsx](../frontend/src/modules/ModulePage.jsx) renders `EngineeringModule` from the result. |
| `apiSlug` | Backend URL slug for options, design, CAD and report calls (omitted when the module id is the slug). |
| `menu` | Optional `{ tab, section, label, img }` placing the module on a selection page. Entries without `menu` have a route but no card. |
| `hidden` | Optional. `true` leaves the entry out of `MODULES` and `findModule`, so it has no route or card (Purlin, which the desktop menu does not offer either). |
| `designPref` | Optional per-module design-preference data, such as the fin plate connectivity names. |

`MENU_GROUPS` in the same file lists the tabs and sections of each selection page, including entries marked `status: "development"` (Truss, PEB). Helpers: `findModule(id)`, `getModuleRoute(id)`, `getModuleSlug(id)`, `getModuleDesignPref(id)`, `loadModuleConfigs(id)` and `getMenuSections(tabKey)`. Lookups use the exact id; there are no aliases.

**Adding a module**
1. Backend: add the submodule with `MODULE_ID = KEY_DISP_...` from `osdag_core.Common` (see [ADDING_MODULES_AND_SUBMODULES_BACKEND.md](./general/ADDING_MODULES_AND_SUBMODULES_BACKEND.md)). If the desktop module has a new constant, run `python scripts/gen_core_keys.py` to add it to `coreKeys.js`.
2. Frontend: create the `*Config.js` file with `designType` set to the same constant.
3. Add one entry to `MODULES` in `registry.js`. The route, menu card, API slug and report/open-project navigation follow from it; no other file lists the module.
4. Give the module's `adapter.py` a `create_module()` that returns a new, unsolved instance. The empty output dock endpoint builds the dock from it.

---

## 6.8 Shared Display Configurations (`sectionDisplayConfig.js`)

To keep visual layouts consistent across all modules, a helper file maps section profiles to dynamic display configurations:

* **[sectionDisplayConfig.js](../frontend/src/modules/shared/config/sectionDisplayConfig.js):** Defines dimension configurations (e.g., Flange Width $B$, Web Thickness $t$, Root Radius $R_1$) and properties (Mass, Elastic Moduli, Section Areas) for Columns, Beams, Angles, and Channels to display on profile selection cards.

---

## 6.9 Architectural Observations & Areas of Improvement

During the code review of the Form Engine components, two critical implementation vulnerabilities were identified:

### 1. Keyboard Navigation Lock Bypass (Security & Usability Bug) (Resolved)
* **The Problem:** When a calculation completes successfully, Osdag-Web marks the input dock as locked (`isInputLocked = true`). This applies a transparent click-interceptor overlay and the Tailwind class `pointer-events-none` to block mouse input. However, the form controls (inputs and select boxes) inside `InputSection.jsx` **did not** receive `disabled={isInputLocked}` or `readOnly={isInputLocked}` flags, allowing keyboard users to bypass the lock using the Tab key.
* **Resolution:** Bound the `disabled` property on text `<input>` controls and the `isDisabled` property on React `<Select>` dropdown elements to the `isInputLocked` state passed from the orchestrator. All controls are now properly disabled when the input dock is locked, fully blocking keyboard navigation bypasses.

### 2. Redundant Network Re-fetches on Custom Section Events (Performance Issue) (Resolved)
* **The Problem:** In [useModuleData.js](../frontend/src/modules/shared/hooks/useModuleData.js), `localCustomSections` was included in the dependency array of the options-fetching `useEffect` block alongside `designType` and `getModuleData`.
* **The Risk:** Whenever a user registered a new custom section (dispatching `osdag:custom-section-added`), `localCustomSections` state changed. Because it was listed as a dependency, React re-ran the entire `useEffect`, firing a full `GET /api/options/<module_id>/` network request to the backend even though the server's options catalog had not changed. This caused unnecessary HTTP overhead, redundant re-render cycles, and a temporary overwrite of the dropdown lists with the server's base data, momentarily discarding any previously merged custom entries.
* **Resolution:** The two responsibilities — **fetching base options from the server** and **merging client-side custom sections** — were separated into independent reactive blocks:
  1. The `useEffect` dependency array now contains only `designType`, `getModuleData`, and `optionsRefetchKey`. The raw API response is stored in a dedicated `baseModuleData` state variable instead of the old unified `moduleData`.
  2. A `useMemo` block handles all client-side merging. It re-computes the final merged options object whenever either `baseModuleData` or `localCustomSections` changes — with zero network activity:
  ```javascript
  const mergedOptions = useMemo(() => {
    return mergeLocalCustomSections(baseModuleData, localCustomSections);
  }, [baseModuleData, localCustomSections]);
  ```
  The hook now returns `mergedOptions` directly, so consumers always receive both server-sourced options and all registered custom sections in a single, deduplicated object.
