# Chapter 8: Frontend State Management Architecture

Osdag-Web implements a modular state management architecture designed to coordinate complex engineering inputs, asynchronous design computations, real-time 3D CAD visualization, and user configuration preferences. State is bifurcated into a lightweight global catalog shell and a highly specialized design module engine.

---

## 8.1 Global Application Context

The global application context coordinates identity verification (described in Chapter 3), homepage directory routing, and active connection subcategory listing.

### Catalog Selection Tree State
Implemented in [GlobalState.jsx](../frontend/src/context/GlobalState.jsx) and parsed through [AppReducer.jsx](../frontend/src/context/AppReducer.jsx), this context handles the tree traversal of the connections catalog.

```mermaid
graph TD
    A[Catalog Root] -->|fetchCatalogRoot| B[GlobalContext: data]
    B -->|getDesignTypes| C[results: Shear/Moment...]
    C -->|getSubDesignTypes| D[subDesignTypes: Beam-Beam/Beam-Column...]
    D -->|getLeafLevelDesignType| E[leafLevelDesignType: FinPlate/CleatAngle...]
```

* **`data`**: Initial root array holding primary catalog categories fetched from backend option endpoints.
* **`results`**: Structural connection types mapped to the active root selection (e.g., Moment Connection, Shear Connection, Tension Member, Truss Connection).
* **`subDesignTypes` & `leafLevelDesignType`**: Deep-tree state variables identifying exact engineering specifications and routing endpoints.
* **`fetch_cache`**: String representation of the last connectivity URL fetched, preventing repetitive network round-trips when components trigger page updates.

---

## 8.2 ModuleState & ModuleReducer Deep Dive

The core of Osdag-Web's state resides in the module context. Declared in [ModuleState.jsx](../frontend/src/context/ModuleState.jsx) and processed via [ModuleReducer.jsx](../frontend/src/context/ModuleReducer.jsx), this state machine manages the database drop-down arrays, active engineering calculations, CAD model variables, and overridden preference configurations.

### 1. State Variables Architecture
* **Structural Drop-downs**: State arrays like `beamList`, `columnList`, `materialList`, `boltDiameterList`, `thicknessList`, `propertyClassList`, `angleList`, and `weldSizeList` are populated based on the active connection type.
* **Design Output & Logs**:
  * `designData`: Evaluated computational results returned by Django adapters.
  * `designLogs`: Iterative warning and validation logs parsed during python execution.
  * `displayPDF` & `blobUrl`: State controlling report preview rendering.
* **CAD Path Mapping**:
  * `renderCadModel`: Boolean flag indicating to the React Three Fiber (R3F) canvas that geometry calculations are complete.
  * `cadModelPaths`: Map storing absolute static paths to generated BREP/STL parts.
  * `hoverDict`: Map linking component parts (e.g., `Beam`, `Column`, `Plate`, `Weld`) to dimensions and hover metadata.
* **Design Preferences Snapshotting**:
  * `designPrefData`: The server-side default and loaded preference properties.
  * `lastKnownGoodDesignPrefSnapshot`: Fallback snapshot representing the last successfully validated synchronization state.
  * `designOutputsInvalidated`: Flag indicating that the user updated preferences or driving variables after a design computation, prompting a recalculation.

### 2. Module Context API
The state provider exposes 8 core callbacks to coordinate design module operations:

| Callback Function | Description | Core Operations |
| :--- | :--- | :--- |
| `getModuleData` | Universal options fetcher. | Queries `/options/` to populate all drop-down and material lists for a module in a single request. |
| `getConnectivityData` | Connectivity lists loader. | Filters listings based on beam-to-column or beam-to-beam orientation rules. |
| `manageCustomMaterials` | Custom section register. | Dispatches updates to state caches and triggers option refetches. |
| `createDesign` | Computation orchestrator. | Coordinates inputs submission and dispatches output state saves. |
| `createCADModel` | CAD model compiler. | Sends verified inputs to CAD engines and dispatches paths and `hoverDict`. |
| `downloadCADModel` | Export helper. | Downloads compiled assemblies in STEP, IGES, or STL formats. |
| `generateReport` | Report exporter. | Generates download links for PDF or CSV representations of calculated values. |
| `manageDesignPreferences` | Configuration synchronizer. | Modifies section properties and material limits. |

### 3. Design Output Invalidation Flow
When a user updates overrides or driving dimensions *after* running calculations, the output becomes invalid. To guarantee consistency:
1. Submitting preferences or changes in material inputs dispatches `INVALIDATE_DESIGN_OUTPUTS`.
2. The reducer clears `designData`, `designLogs`, `cadModelPaths`, `hoverDict`, and sets `renderCadModel = false`.
3. The state flags `designOutputsInvalidated = true`.
4. The frontend UI displays helper prompts signaling to the engineer that design recalculations are needed.

```mermaid
sequenceDiagram
    participant UI as Form Engine
    participant S as ModuleState
    participant R as ModuleReducer
    UI->>S: Input/Preference modified
    S->>R: Dispatch(INVALIDATE_DESIGN_OUTPUTS)
    R-->>S: Set designOutputsInvalidated = true, Clear outputs
    S-->>UI: Force re-computation alert shown
```

### 4. Strict Linked Reseed Pattern (`APPLY_STRICT_LINKED_RESEED`)
Updates to parent input components (e.g., Column Section Material) trigger linked changes. To keep overridden configurations valid, the reseed logic updates matching fields in the additional inputs context without clearing overrides of independent components.

---

## 8.3 Hooks Architecture

Osdag-Web encapsulates business logic in custom React hooks to isolate DOM rendering from computations.

```
+-------------------------------------------------------------+
|                     useEngineeringModule                    |
|  (Central Orchestrator)                                     |
+--------+-----------------+------------------+---------------+
         |                 |                  |
         v                 v                  v
+-----------------+ +-------------+ +-------------------------+
|  useModuleForm  | |useModuleData| |   useDesignSubmission   |
|  (Input Form)   | |(API Lists)  | |  (Calculations / CAD)   |
+--------+--------+ +-------------+ +------------+------------+
         |                                       |
         v                                       v
+-----------------+                 +-------------------------+
|useDesignPrefSync|                 |  DESIGN_STATUS Machine  |
| (Sync Material) |                 |  (IDLE -> VALIDATING...)|
+-----------------+                 +-------------------------+
```

### 1. `useEngineeringModule.js`
The main orchestrator. It imports context APIs and initiates local state coordinators:
* Loads data via `useModuleData`.
* Coordinates forms and preferences overrides via `useModuleForm`.
* Executes submissions and monitors progress via `useDesignSubmission`.
* Integrates `useDependentData` and `useDesignPrefSync` hooks to track input changes.
* Evaluates change states to block navigation via `useNavigationGuard`.

### 2. `useModuleForm.js`
Manages inputs, dropdown choices, customization selection checkboxes, and modal overlays:
* **OSI Loading**: Uses `loadStateFromOsi` on initial render to translate and map imported file keys to React forms.
* **Default Seeding**: Ensures dropdown selectors fallback to first available database options if not prefilled.
* **Overrides Cache**: Stores temporary preferences modifications within `designPrefOverrides` prior to submission.

### 3. `useDesignSubmission.js`
Manages the validation and asynchronous execution pipeline. It models state updates using the `DESIGN_STATUS` state machine:

```javascript
export const DESIGN_STATUS = {
  IDLE: 'IDLE',
  VALIDATING: 'VALIDATING',
  CALCULATING: 'CALCULATING',
  CAD_GENERATING: 'CAD_GENERATING',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR'
};
```

#### The Submission Pipeline
1. **Validate**: Iterates through `inputSections`, checking for missing fields. Checks conditional logic rules to skip inactive inputs and validates custom options checklist counts.
2. **Build Parameters**: Triggers `buildSubmissionParams` mapping form units into backend-compatible structures.
3. **Calculate**: Enters `CALCULATING`, invoking `service.createDesign`. Checks response variables for safe/unsafe status flags.
4. **Persist**: If a `projectId` is present, it calls `service.updateProject` to save inputs and results into the PostgreSQL database.
5. **CAD Build**: Enters `CAD_GENERATING` and calls `service.createCADModel`. Returns generated files, updates `cadModelPaths`, and registers `hoverDict` tooltips.
6. **Finalize**: Transition to `COMPLETE`, resetting the status to `IDLE` after 1 second.

### 4. `useDependentData.js`
Listens for changes to structural section profiles and designations. When values are modified, it queries the `/design-preferences/` endpoint to retrieve physical dimensions, mechanical limits, and thickness attributes needed for validation.

### 5. `useDesignPrefSync.js`
Acts as a passive material parity synchronizer. It listens to dock drivers (e.g., `connector_material`) and sends sync calls to the backend. It merges returned values back into input fields via `mergeLinkedParityKeysIntoInputs`.

---

## 8.4 Observations & Areas of Improvement

During the code review of Osdag-Web's state architecture, several design anti-patterns and performance bottlenecks were identified:

### 1. Global State Cache Mutation
In `GlobalState.jsx`, the request cache tracker is modified via direct object property mutation:
```javascript
const getDesignTypes = async (conn_type) => {
  const URL_KEY = `designTypes:${conn_type}`;
  if (initialValue.fetch_cache === URL_KEY) return;
  initialValue.fetch_cache = URL_KEY; // Direct mutation of configuration object
  // ...
};
```
> [!WARNING]
> Directly mutating `initialValue.fetch_cache` bypasses React's render cycles. If multiple catalog selectors are mounted, it may cause cache-clobbering and state race conditions.
>
> **Recommended Fix**: Implement the cache variable inside a React `useRef` or local state.

### 2. Redundant Legacy Reducer Actions
`ModuleReducer.jsx` retains several redundant legacy actions alongside consolidated ones:
* `SAVE_CM_DETAILS`, `SAVE_SDM_DETAILS`, and `SAVE_STM_DETAILS` perform isolated updates that are already handled by `SAVE_MATERIAL_DETAILS`.
* `UPDATE_SUPPORTING_ST_DATA` and `UPDATE_SUPPORTED_ST_DATA` duplicate calculations that are unified under `UPDATE_SECTION_DATA`.
> [!NOTE]
> Maintaining deprecated reducer branches increases bundle size and complicates codebase audits. These legacy functions should be removed.

### 3. Typing-Induced Network Spams in Dependent Data
In `useDependentData.js`, state updates on input parameters trigger immediate API requests:
```javascript
useEffect(() => {
  loadSupportedData();
}, [inputs.section_designation, inputs.member_designation, inputs.section_profile]);
```
> [!IMPORTANT]
> If a user enters text or toggles custom section parameters rapidly, this useEffect fires multiple API queries concurrently. This can lead to database connection bottlenecks.
>
> **Recommended Fix**: Add a debounce delay of 250ms to `useDependentData` before firing backend API fetches.

### 4. OSI Prefill Timing Race Hazard
In `useModuleForm.js`, imported OSI files prefill forms via a sessionStorage hook. Once loaded, the code deletes the session cache using a fixed timeout:
```javascript
if (hasLoadedLists) {
  setTimeout(() => {
    sessionStorage.removeItem(`prefill:${moduleKey}`);
  }, 1000); // Arbitrary timeout
}
```
> [!CAUTION]
> If API network requests for dropdown options take longer than 1000ms (due to high database load), the prefill storage is cleared *before* form inputs map to their corresponding list values. This results in form inputs reverting to empty selections.
>
> **Recommended Fix**: Clear the prefill cache only after the parent list options are successfully loaded and the inputs are mapped.

### 5. Pervasive Debug `console.log` Statements Left in Production Code
Multiple files contain debug-only `console.log` statements that fire on high-frequency code paths in every production session:

| File | Location | Trigger Frequency |
|---|---|---|
| [`api.js`](../frontend/src/api.js) | Line 6 — `console.log(rawBase)` | Once per page load (module import time), leaks `VITE_BASE_URL` env variable to the browser console |
| [`ModuleReducer.jsx`](../frontend/src/context/ModuleReducer.jsx) | Lines 91–96 — 5 logs in `SET_HOVER_DICT` | Every CAD model render — dumps the full hover dictionary key list to the console |
| [`ModuleState.jsx`](../frontend/src/context/ModuleState.jsx) | Lines 223–239 — ~8 `[cadissue]`-tagged logs in `createCADModel` | Every CAD generation call — logs full input data keys, response structure, and CAD file keys |
| [`useModuleForm.js`](../frontend/src/modules/shared/hooks/useModuleForm.js) | Line 119 — `['diameter check']` log | Every module options reload — prints `boltDiameterList` to the console |
| [`useDesignSubmission.js`](../frontend/src/modules/shared/hooks/useDesignSubmission.js) | Lines 84, 199, 262, 281, 284 | Every design calculation and CAD build sequence |

> [!WARNING]
> Debug logs in reducers and high-frequency hooks add measurable overhead to production rendering cycles and expose internal API structure in browser DevTools. The `console.log(rawBase)` in `api.js` is especially problematic as it runs at module import time before the app even mounts.
>
> **Recommended Fix**: Remove all debug `console.log` statements from production paths. Use conditional `if (import.meta.env.DEV)` guards for development-only diagnostics.

---

### 6. Dead Code: `normalizedFiles` Computation in CAD Submission Path
In [`useDesignSubmission.js`](../frontend/src/modules/shared/hooks/useDesignSubmission.js), a `normalizedFiles` object is computed (lines 286–295) to remap lowercase CAD file keys (`beam`, `column`, `plate`) to their PascalCase equivalents (`Beam`, `Column`, `Plate`):
```javascript
const normalizedFiles = {};
Object.entries(cadResult.files || {}).forEach(([key, value]) => {
  const normKey = key.trim();
  const mapped = normKey === 'beam' ? 'Beam' : normKey === 'column' ? 'Column' : normKey === 'plate' ? 'Plate' : normKey;
  normalizedFiles[mapped] = value;
});

setCadModelPaths(cadResult.files || {}); // Uses raw files, NOT normalizedFiles!
```
The `normalizedFiles` object is computed but never used — `setCadModelPaths` ignores it and writes the raw `cadResult.files` directly.

> [!NOTE]
> This dead computation adds a pointless `Object.entries` iteration on every successful CAD call. If PascalCase normalization is required, it should be applied to the argument of `setCadModelPaths`. If not required, the entire block should be removed.
>
> **Recommended Fix**: Either apply `normalizedFiles` in `setCadModelPaths(normalizedFiles)`, or remove the normalization block entirely.

---

### 7. Stale `output` State Reference in `submitDesign` Error Handler
In [`useDesignSubmission.js`](../frontend/src/modules/shared/hooks/useDesignSubmission.js), the outer `catch` block determines the error message category using:
```javascript
const hasOutput = output !== null; // Line 335
```
The goal is to distinguish between a full calculation failure (`hasOutput = false`) and a partial success where the calculation completed but CAD generation failed (`hasOutput = true`). However, `output` is the React state snapshot captured in the closure when `submitDesign` was first called — always `null` at the start of a fresh run.

The `setOutput(formattedOutput)` call at line 231 (inside the `try` block after calculation succeeds) queues a React state update, but this update has not been committed to the closure by the time execution reaches the catch block. As a result, `hasOutput` evaluates to `false` even when the calculation has successfully produced output, causing the wrong error message ("An error occurred during design" instead of "Calculation succeeded, but [CAD error]") to display.

> [!IMPORTANT]
> **Recommended Fix**: Track whether output was set using a local variable instead of reading the stale state closure:
> ```javascript
> let outputWasSet = false;
> // ... inside try block after setOutput(formattedOutput):
> outputWasSet = true;
> // ... inside catch block:
> const hasOutput = outputWasSet;
> ```

---

### 8. `resetFormState` Initialization Logic Duplication
In [`useModuleForm.js`](../frontend/src/modules/shared/hooks/useModuleForm.js), the `resetFormState` function (lines 193–235) manually re-initializes every state variable by duplicating the identical `.reduce()` calls from the `useState` declarations above:
```javascript
// useState declaration (lines 44–49):
const [selectionStates, setSelectionStates] = useState(
  (moduleConfig.selectionConfig || []).reduce((acc, selection) => {
    acc[selection.key] = selection.defaultValue || "All";
    return acc;
  }, {})
);

// resetFormState (lines 198–203 — exact same logic):
setSelectionStates(
  (moduleConfig.selectionConfig || []).reduce((acc, selection) => {
    acc[selection.key] = selection.defaultValue || "All";
    return acc;
  }, {})
);
```
This pattern repeats for `allSelected`, `selectedItems`, `modalStates`, `modalDynamicSrc`, and all scalar fields. Any new field added to `moduleConfig.modalConfig` or `moduleConfig.selectionConfig` must be manually updated in **both** the `useState` block and `resetFormState`.

> [!NOTE]
> **Recommended Fix**: Extract the initial state factories into named functions and call them from both `useState` and `resetFormState`:
> ```javascript
> const buildInitialSelectionStates = (config) =>
>   (config.selectionConfig || []).reduce((acc, s) => ({ ...acc, [s.key]: s.defaultValue || "All" }), {});
>
> const [selectionStates, setSelectionStates] = useState(() => buildInitialSelectionStates(moduleConfig));
> // In resetFormState:
> setSelectionStates(buildInitialSelectionStates(moduleConfig));
> ```

---

### 9. Unreliable Navigation Release Window in `useNavigationGuard`
In [`useNavigationGuard.js`](../frontend/src/modules/shared/hooks/useNavigationGuard.js), `performNavigation` uses an arbitrary 100ms timeout to release the navigation guard and then immediately re-locks it inside the same callback:
```javascript
const performNavigation = () => {
  setAllowNavigation(true);   // Unlocks the popstate guard
  setShowConfirmation(false);
  setConfirmationType("reset");

  setTimeout(() => {
    if (navigationSource === "home") navigate("/home");
    else if (navigationSource === "back") navigate(-1);
    setAllowNavigation(false);  // Re-locks — runs inside same timeout
    setNavigationSource(null);
  }, 100);
};
```
The `setAllowNavigation(false)` call runs inside the same `setTimeout` as the `navigate()` call. After navigation completes and the component unmounts, this cleanup runs in an unmounted component context — React will log a warning in development and the state update is lost. Additionally, if the user presses the back button a second time in the 100ms window between `setAllowNavigation(true)` being committed and the `setTimeout` firing, the `popstate` handler reads the committed `allowNavigation=true` and allows the navigation, but the `setAllowNavigation(false)` cleanup may then run on the new page's component instance.

> [!CAUTION]
> **Recommended Fix**: Use a `useRef` for the navigation lock flag instead of `useState`, so the check in `handlePopState` reads the current value synchronously without depending on React's state commit cycle. Clear the flag in a `useEffect` cleanup or by tracking the navigation completion lifecycle rather than an arbitrary timeout.

