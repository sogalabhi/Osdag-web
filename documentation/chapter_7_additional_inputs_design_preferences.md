# Chapter 7: Additional Inputs & Design Preferences

Osdag-Web provides an advanced configuration panel known as **Additional Inputs** or **Design Preferences**. This panel allows developers and structural engineers to override default design settings—such as safety factors, bolt clearances, weld types, and detailing gap parameters—separate from the main input dock.

---

## 7.1 The Additional Inputs Modal State Machine

The preferences modal panel [DesignPrefSections.jsx](../frontend/src/modules/shared/components/DesignPrefSections.jsx) orchestrates draft edits, server validation, and override saves. The state is managed via two distinct layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Engineering Page Context                     │
│  inputs: Basic Input Dock State                                 │
│  designPrefOverrides: Permanent preference overrides stored     │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Opens Modal
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                DesignPrefSections (Modal Open)                  │
│  • designPrefInputs (State): Local draft copy of overrides      │
│  • sectionDetails (State): Geometrical properties from database│
└───────────────────────────────┬─────────────────────────────────┘
         │ Save Click           │ Discard/Close        │ Defaults Click
         ▼                      ▼                      ▼
┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│  POST /sync/     │    │ Revert Draft    │    │ POST /defaults/  │
│  (operation=save)│    │ & Close Modal   │    │ (reset state)    │
└──────────────────┘    └─────────────────┘    └──────────────────┘
```

### 1. State Hooks
* **`designPrefInputs`:** A local draft state containing the active tab inputs. This state is updated immediately as the user modifies values inside the modal tabs.
* **`designPrefOverrides`:** The permanent overrides state stored in the parent page context. Draft values are only promoted to `designPrefOverrides` when the user clicks the **Save** button.
* **`sectionDetails`:** Stores structural characteristics (sectional area, radius of gyration, root/toe radii) resolved by the backend database for the active sections.

### 2. State Actions & Buttons
* **Open Modal (`open`):** On mount, the modal dispatches a `POST` request to `/api/design-pref/sync/` with `operation: "open"` (core-keyed `inputs` and the module id, see section 2.3c) to retrieve the initial structural sections and material data.
* **Defaults Button (`defaults`):** Fetches the default configuration parameters from `/api/design-pref/defaults/` and resets both the local draft inputs and active overrides.
* **Discard/Cancel:** Closes the modal without applying modifications, discarding the local `designPrefInputs` draft.
* **Save Button (`save`):** Triggers `saveCoreInputs()`. It checks that no value the dialog holds is blank (`findEmptyPrefField` in [designPrefValidation.js](../frontend/src/modules/shared/utils/designPrefValidation.js)), dispatches a sync query with `operation: "save"` to the backend, updates the parent context overrides, invalidates old design outputs (triggering a redesign requirement), and closes the modal.

---

## 7.2 Tab-by-Tab Configuration Spec

The Additional Inputs modal displays configuration controls divided into tabs based on the active module:

| Tab Name | Configured Sub-elements & Key Fields |
| :--- | :--- |
| **Column Section\*** | Material grade dropdown, ultimate tensile strength ($f_u$), and yield strength ($f_y$). Displays sectional drawings and dimensions (Depth $D$, Flange Width $B$, Flange Thickness $T$, Web Thickness $t_w$). |
| **Beam Section\*** | Material grade dropdown, ultimate tensile strength ($f_u$), and yield strength ($f_y$) for the beam. Displays identical cross-sectional parameter cards. |
| **Angle Section** | Visual properties (Leg lengths $A \times B$, thickness $t$, root radius $R_1$, toe radius $R_2$) and material configurations for structural angles. |
| **Connector** | Material grade selectors for plates, cleats, or splice components. |
| **Cleat Angle** | Specific designation selector and material grades for cleat connectors. |
| **Seated Angle Connection** | Detailing configurations for seated angle dimensions and mechanical properties (elastic modulus, Poisson's ratio). |
| **Bolt** | Bolt hole types (Standard, Over-sized), slip factor, and bolt tension types (Pre-tensioned, Non pre-tensioned). |
| **Base Plate** | Specific base plate steel grades and thickness list entries. |
| **Stiffener/Shear Key** | Weld configurations and material selections for base plate stiffener sections. |
| **Anchor Bolt** | Visual configurations for Anchor Bolts (Outer Column Flange - OCF, Inner Column Flange - ICF) including length, galvanization, and material grade. |
| **Weld** | Weld fabrication choices (Shop Weld, Field Weld) and weld electrode strength overrides. |
| **Detailing** | Detailing gap spacing (mm), edge types (Sheared, Machine flame-cut), and corrosive environment status (Yes/No). |
| **Optimization** | Optimization parameters and limits. |
| **Design** | Design methodology parameters (Limit State Design vs. Working Stress Design). |

---

## 7.3 Bidirectional Material Sync & Reseed Logic

Changes in the basic inputs dock can impact advanced preferences (and vice versa). For instance, updating the **Connector Material** in the main input dock must update the ultimate/yield strengths ($f_u, f_y$) of the connector in the design preferences modal. 

Osdag-Web resolves this through a bidirectional sync state machine using the [useDesignPrefSync.js](../frontend/src/modules/shared/hooks/useDesignPrefSync.js) hook:

```
┌─────────────────────────────────┐
│     Main Input Dock Driver      │
│  e.g. connector_material change  │
└────────────────┬────────────────┘
                 │ Triggers Hook (200ms debounce)
                 ▼
┌─────────────────────────────────┐
│     POST /sync/ (refresh)       │
│  Backend resolves linked keys   │
└────────────────┬────────────────┘
                 │ Returns resolved_inputs & metadata
                 ▼
┌─────────────────────────────────┐
│    Frontend Normalization       │
│  - mergeLinkedParityKeys        │
│  - applyStrictLinkedReseed      │
└─────────────────────────────────┘
```

1. **Active Hook Monitoring:** `useDesignPrefSync.js` monitors the dock fields that hold the driving material. `dockDriverFields(config)` (`prefSyncKeys.js`) reads them from the core's table: the fields that feed a dock material the core copies to other keys (`DESIGN_PREF_TABLES[module].dockCopies`), e.g. `connector_material` in the shear modules and `material` in tension, cover plate and flexure. The four butt and lap joints, where the core copies no material, keep the old three names (`connector_material`, `material`, `member_material`). `useModuleForm.js` and `DesignPrefSections.jsx` use the same list.
2. **Debounced Network Synchronization:** When a driver changes, the hook schedules a debounced call (200ms) to the `/api/design-preferences/sync/` endpoint with `operation: "refresh"`. The request is built by `toSyncRequest` (`prefSyncKeys.js`): core keys and the module id (`config.designType`) out, form field names back.
3. **Modal Collision Prevention (`pause` flag):** When the Additional Inputs modal is open, the hook's `pause` parameter is set to `true`. This prevents page-level sync requests from conflicting with manual configurations made inside the modal.
4. **No-Change Optimization:** When the modal closes, the hook compares the driver material with its state prior to the modal opening. If it is unchanged, the refresh call is skipped to protect manual overrides from being clobbered.
5. **Writethrough Rollbacks:** If the sync request fails due to network issues, the system rolls back to the `lastKnownGoodDesignPrefSnapshot` to prevent corrupted states.

### What the design request carries

The Design button sends the dock inputs with the saved Additional Inputs merged over them, so a material saved in Additional Inputs must not be read where the request expects the dock material. As in the desktop, `Material` is the dock Material, and each material of Additional Inputs goes out under its own key: `Connector.Material` from the Connector tab, and the section tabs under the section keys. In the shear connection modules (fin plate, cleat angle, header plate, seated angle) the dock field is `material`; it also sets `connector_material`, which stays the Connector tab's value until the dock changes. In the tension member and strut modules the section tab's material is `supported_material`, sent as `Member.Material`; until it is saved it equals the dock material.

---

## 7.4 Sync Merge Utilities (`mergeDesignPrefSyncIntoInputs.js`)

Merging backend sync responses into frontend state fields is governed by strict policies inside [mergeDesignPrefSyncIntoInputs.js](../frontend/src/modules/shared/utils/mergeDesignPrefSyncIntoInputs.js):

### 1. Linked Key Extraction
The helper `collectLinkedPrefKeysFromMetadata` inspects the backend metadata object to find fields that were copied from the basic input dock (e.g. tracking that a change in beam material has copied its value to `supported_material`):
```javascript
export function collectLinkedPrefKeysFromMetadata(metadata) {
  const copied = metadata?.copied_from_input_dock_keys || {};
  const linkedKeys = new Set();
  Object.values(copied).forEach((targets) => {
    if (Array.isArray(targets)) {
      targets.forEach((k) => linkedKeys.add(k));
    }
  });
  return linkedKeys;
}
```

### 2. Selective Merging (`mergeLinkedParityKeysIntoInputs`)
During standard `open` or `refresh` cycles, the frontend applies only the linked properties returned by the server, preserving independent user-defined overrides:
```javascript
export function mergeLinkedParityKeysIntoInputs(prev, resolvedInputs, metadata) {
  if (!resolvedInputs || typeof resolvedInputs !== "object") return { ...prev };
  const next = { ...prev };
  const keys = collectLinkedPrefKeysFromMetadata(metadata);
  keys.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(resolvedInputs, k)) {
      next[k] = resolvedInputs[k];
    }
  });
  return next;
}
```

### 3. Driver Preservation (`mergeParityIntoInputsPreservingDockDrivers`)
When performing a complete reset (e.g., after loading defaults), Osdag-Web merges all options but explicitly preserves active driving dropdown values (like `material` or `member_material`) to prevent dropdown inputs in the main view from changing unexpectedly:
```javascript
export function mergeParityIntoInputsPreservingDockDrivers(prev, resolvedInputs) {
  if (!resolvedInputs || typeof resolvedInputs !== "object") return { ...prev };
  const out = { ...prev, ...resolvedInputs };
  for (const k of ["material", "member_material"]) {
    if (Object.prototype.hasOwnProperty.call(prev, k)) {
      out[k] = prev[k];
    }
  }
  return out;
}
```

---

## 7.5 Resetting to Defaults

When a user clicks the **Defaults** button, Osdag-Web executes a two-phase reset to ensure that both server-side calculation constraints and client-side form defaults align:

1. **Server Default Retrieval:** Calls the `fetchDesignPrefDefaults` API. The Django backend returns standard code-regulated defaults (e.g., detail clearances, safety factors).
2. **Client Config Merging:** The frontend merges the backend defaults with local defaults configured in the module schema's `getDefaultPrefs()` function.
3. **State Hydration:** Hydrates `designPrefInputs`, updates parent state overrides, and immediately invalidates calculation outputs to require a redesign run.

---

## 7.6 Global Preferences Schema Mapping

The tabs displayed inside the Additional Inputs panel are mapped dynamically based on the active module name. This is driven by [designPrefModuleConfig.js](../frontend/src/modules/shared/config/designPrefModuleConfig.js):

The section tabs show the selected section's properties. If the module's list is on "All" or holds several sections, the tab previews the first one, and picking another only changes what the tab shows. The design's list changes only from the input dock. The backend's section sources in `sync_merge.py` (`core_section_sources`, plus `LEGACY_SECTION_SOURCES`) must return each module's section under the role its tab reads: tab 2 and the beam sections read `supported`, tab 0 reads `supporting`, and the cleat and seated angle tabs read `connector`.

Each module's `getInitialPrefs` lists only the values its dialog shows or the design uses, and gives every one a value (from the server, or a fallback), because Save refuses an empty value. A key a module never shows, such as the packing plate in the cleat angle, seated angle and lap joint welded modules, or the bolt and detailing values in the two flexure modules, stays out of its state. `src/test/designPrefSave.test.js` checks this for every module, on the state after opening and after Defaults.

| Module Name | Tab IDs List | Displayed Tabs | Initial Tab |
| :--- | :--- | :--- | :--- |
| **Butt Joint Bolted** | `[6, 11]` | Bolt, Detailing | Bolt (6) |
| **Lap Joint Bolted** | `[6, 11]` | Bolt, Detailing | Bolt (6) |
| **Butt Joint Welded** | `[10, 11]` | Weld, Detailing | Weld (10) |
| **Lap Joint Welded** | `[10, 11]` | Weld, Detailing | Weld (10) |
| **Column Cover Plate Bolted** | `[0, 3, 6, 11, 13]` | Column Section\*, Connector, Bolt, Detailing, Design | Column Section (0) |
| **Beam Cover Plate Bolted** | `[1, 3, 6, 11, 13]` | Beam Section\*, Connector, Bolt, Detailing, Design | Beam Section (1) |
| **Column Cover Plate Welded** | `[0, 3, 10, 11, 13]` | Column Section\*, Connector, Weld, Detailing, Design | Column Section (0) |
| **Beam Cover Plate Welded** | `[1, 3, 10, 11, 13]` | Beam Section\*, Connector, Weld, Detailing, Design | Beam Section (1) |
| **Column Column End Plate** | `[0, 3, 6, 10, 11, 13]` | Column Section\*, Connector, Bolt, Weld, Detailing, Design | Column Section (0) |
| **Beam Beam End Plate** | `[1, 3, 6, 10, 11, 13]` | Beam Section\*, Connector, Bolt, Weld, Detailing, Design | Beam Section (1) |
| **Beam to Column End Plate** | `[0, 1, 3, 6, 10, 11, 13]`| Column Section\*, Beam Section\*, Connector, Bolt, Weld, Detailing, Design | Column Section (0) |
| **Base Plate** | `[0, 7, 8, 9, 10, 11, 13]` | Column Section\*, Base Plate, Stiffener/Shear Key, Anchor Bolt, Weld, Detailing, Design | Column Section (0) |
| **Cleat Angle Connection** | `[0, 1, 4, 6, 11, 13]` | Column Section\*, Beam Section\*, Cleat Angle, Bolt, Detailing, Design | Column Section (0) |
| **Tension Member Bolted** | `[2, 3, 6, 11, 13]` | Angle Section, Connector, Bolt, Detailing, Design | Angle Section (2) |
| **Tension Member Welded** | `[2, 3, 10, 11, 13]` | Angle Section, Connector, Weld, Detailing, Design | Angle Section (2) |
| **Axially Loaded Column** | `[0, 12, 13]` | Column Section\*, Optimization, Design | Column Section (0) |
| **Struts Bolted to Gusset** | `[2, 3, 6, 11, 13]` | Angle Section, Connector, Bolt, Detailing, Design | Angle Section (2) |
| **Simply Supported Beam** | `[0, 12, 13]` | Column Section\* (Beam), Optimization, Design | Column Section (0) |
| **On Cantilever Beam** | `[0, 12, 13]` | Column Section\* (Beam), Optimization, Design | Column Section (0) |
| **Seated Angle Connection** | `[0, 1, 5, 6, 11, 13]` | Column Section\*, Beam Section\*, Seated Angle, Bolt, Detailing, Design | Column Section (0) |

---

## 7.7 Architectural Observations & Areas of Improvement

During the code review of the Design Preferences and sync subsystems, two implementation concerns were identified:

### 1. Inconsistent Driver Key Preservation (Clobbering `connector_material` on Reset) (Resolved, helper removed)
* **The Problem:** The utility `mergeParityIntoInputsPreservingDockDrivers` in [mergeDesignPrefSyncIntoInputs.js](../frontend/src/modules/shared/utils/mergeDesignPrefSyncIntoInputs.js) was meant to protect the driving material dropdowns from jumping on Defaults or Save, but it listed only `material` and `member_material`.
* **Resolution:** Nothing called it: the Additional Inputs modal never writes sync answers into the dock `inputs` (only `mergeLinkedParityKeysIntoInputs` does, and only for rows the server linked), so the dock dropdowns cannot jump. The helper and its hard-coded `DOCK_DRIVER_KEYS` list were removed; the dock driver fields are now read from the core's table (`dockDriverFields`, section 7.3).

### 2. Material Refresh State Races inside the Modal (Resolved)
* **The Problem:** In [DesignPrefSections.jsx](../frontend/src/modules/shared/components/DesignPrefSections.jsx), a `useEffect` block executes a background `runSync("refresh")` whenever the driving material variables (the dock driver fields from `dockDriverFields`: `inputs.connector_material` or `inputs.material` depending on the module) change while the modal is open.
* **The Risk:** When a user clicked **Defaults** or **Save**, the corresponding handler (`resetInputs` / `saveCoreInputs`) called `setDesignPrefOverrides(toStoredPrefOverrides(...))` after its `await` resolved. This wrote a new `connector_material` (or other material key) into the parent's `inputs` prop. Because `syncLoading` and `syncReady` were already committed to their post-operation values (`false` / `true` respectively) by the time `setDesignPrefOverrides` was called, the material `useEffect` saw valid conditions and launched a redundant `runSync("refresh")` network request in parallel — an unnecessary round-trip that could also collide with residual re-render states.
* **Resolution:** Extended the existing `skipMaterialRefresh` ref — already used to suppress the first mount-triggered refresh — to also guard the managed-operation cascades. Immediately before each `setDesignPrefOverrides` call in `saveCoreInputs` and `resetInputs`, `skipMaterialRefresh.current` is set to `true`. Because the ref is checked **synchronously during the render triggered by `setDesignPrefOverrides`**, the effect correctly detects the skip flag, returns early without firing the network request, and resets the flag to `false` for genuine future material changes. No new state variables or extra hooks are required.
