# Chapter 6: Dynamic UI Form Engine

Osdag-Web implements a declarative, configuration-driven UI form engine. Rather than hardcoding forms, the interface dynamically renders inputs, binds validation rules, fetches options, visualizes output docks, and updates contextual drawings based on module-specific schemas.

---

## 6.1 Dynamic Option Loading (`/options/` endpoints)

When an engineering module page loads, the frontend must populate the dropdown selectors with standard structural sections (Beams, Columns, Channels, Angles) and material values (Steel grades, Bolt grades, Plate thicknesses) from the database:

1. **Option Queries:** The application issues a GET request to `/api/options/<module_id>/` on load.
2. **Stateless Options Resolution:** The backend queries standard catalogs (such as the Indian Standard structural tables) and returns arrays of JSON records matching the active submodule's requirements.
3. **Frontend Caching:** The returned catalog lists (e.g. `boltDiameterList`, `thicknessList`, `beamList`) are saved in the module's React state context.

---

## 6.2 Custom Dropdowns & Section Merging

Osdag-Web allows users to import or create custom structural sections. These custom shapes must be injected into the standard options dropdowns immediately without requiring a full page refresh:

### 1. The custom section event:
When a user adds a section via the Section Catalog database, the system dispatches a global window event:
```javascript
window.dispatchEvent(
  new CustomEvent("osdag:custom-section-added", {
    detail: { table: "Columns", designation: "CUSTOM_COL_300" },
  })
);
```

### 2. Live hook merging:
The hook [useModuleData.js](../frontend/src/modules/shared/hooks/useModuleData.js) intercepts this event and updates its local state list:
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
This merges user-defined designations dynamically into the React state lists (`columnList`, `beamList`, etc.), updating the select menus in real time.

---

## 6.3 Interdependent Fields & Conditional Logic

Form input components can depend on other field values. For example, in a Fin Plate Shear Connection:
* If **Connectivity** is set to `Column Flange-Beam-Web`, the form must display selectors for **Column Section** and **Beam Section**.
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
    return connectivity === "Column Flange-Beam-Web" || connectivity === "Column Web-Beam-Web";
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
7. **`image`**: Displays contextual diagram shapes dynamically.

---

### 6.5.2 Output Dock Field & Layout Types (`BaseOutputDock.jsx` & `OutputModalLayouts.jsx`)
The output dock displays solver results. If a calculation fails (`Design.status: false`), the dock highlights warning logs in red. The outputs are categorized into two main field styles:

1. **Standard Value Boxes**: Read-only, grey-bordered boxes displaying final computed parameters (e.g., `Weld.Size` or `Bolt.Capacity`).
2. **Modal Trigger Inputs**: Renders a button instead of a value box. Clicking this button triggers a pop-up modal showing detailed output calculations mapped to one of these dynamic layout components:
   * **`single-column` / `two-column`**: A plain vertical tabular list of labels and calculated values (e.g., listing bolt grade, shear, and bearing capacities) paired with a static diagram.
   * **`capacity-complex`**: Lists yielding, rupture, and block shear capacities grouped by failure mode alongside visual block-shear pattern images.
   * **`spacing-diagram`**: Renders a dynamic, SVG-based detailed engineering sketch.

---

### 6.5.3 The Dynamic Spacing Diagram SVG Canvas (`SpacingDiagram.jsx`)
When a user opens Spacing Details, Osdag-Web does not display a static image. Instead, it renders **[SpacingDiagram.jsx](../frontend/src/modules/shared/components/SpacingDiagram.jsx)**, which draws an SVG layout dynamically:

* **Dynamic Scaling:** Calculates a scaling factor to fit the plate's dimensions (`plateWidth` $\times$ `plateHeight` in mm) into a standard $600 \times 400$ SVG view box.
* **Component Drawing:**
  * Draws the main connecting steel plate as a scaled gray `<rect>`.
  * Draws the weld line as a crimson `<rect>` if `weldSize > 0`.
  * Distributes and draws bolt holes as `<circle>` coordinates calculated from the number of columns (`cols`), rows (`rows`), gauge spacings, and pitch distances.
* **Dynamic Dimension Labels:** Computes offsets and draws SVG dimension lines, arrow heads, and text labels depicting the exact calculated Pitch (`pitch`), End distance (`end`), Edge distance (`edge`), and Gauge (`gauge`) computed by the backend. This provides a real-time scaled engineering schematic of the bolt pattern.

---

## 6.6 `EngineeringModule` Orchestration Controller

The component [EngineeringModule.jsx](../frontend/src/modules/shared/components/EngineeringModule.jsx) acts as the central orchestration controller. It ties together hooks, input forms, outputs, calculations, logs, and three-dimensional renders:

1. **State Orchestration:** Connects to `useEngineeringModule` to manage state hooks for `inputs`, `outputs`, `logs`, `status` (calculating/rendering), and `designPrefOverrides`.
2. **Form Interactivity Lock:** When calculations complete successfully, the component sets `isInputLocked = true` to freeze editing.
3. **Re-Design Confirmation Loop:** If a user modifies inputs while locked, a confirmation modal warning is shown. Confirming the unlock clears calculation outputs, resets CAD states, and restores edit permissions.
4. **Calculations Lifecycle Hooking:** Launches asynchronous task polling on submit and guides the docks from input to calculating to output visualization.
5. **Layout Responsiveness:** Manages view panels based on device sizing (e.g., mobile layout toggles between CAD view and form tabs, while desktop splits views into multi-column layouts).

---

## 6.7 Module Input & Output Configurations (`*Config.js`, `*OutputConfig.js`)

Each engineering module defines its interface declaratively:

### 1. `*Config.js` (e.g., [finPlateConfig.js](../frontend/src/modules/shearConnection/finPlate/configs/finPlateConfig.js))
* **`defaultInputs`:** Defines default key-value pairs for the module forms.
* **`validateInputs`:** Client-side check before submission to confirm that all required structural variables are filled.
* **`buildSubmissionParams`:** Converts flat snake_case frontend inputs back into PascalCase dotted parameters expected by the Python desktop engine.
* **`inputSections`:** Declares form sections, groups, field types (select, customizable, number), and display visibility conditions.

### 2. `*OutputConfig.js` (e.g., [finPlateOutputConfig.js](../frontend/src/modules/shearConnection/finPlate/configs/finPlateOutputConfig.js))
* **`sections`:** Lists the output groups (e.g. Bolt, Plate, Weld) and fields to show.
* **`modals` & `modalTypes`:** Configures output sub-modals (spacing calculations, yielding capacities) and their visual layout classes.
* **`modalData`:** Declares lists of properties to display within each capacity detail sub-modal.

---

## 6.8 Shared Display Configurations (`sectionDisplayConfig.js` & `outputImageMap.js`)

To keep visual layouts consistent across all modules, helper files map section profiles and calculate outputs to dynamic display configurations:

* **[sectionDisplayConfig.js](../frontend/src/modules/shared/config/sectionDisplayConfig.js):** Defines dimension configurations (e.g., Flange Width $B$, Web Thickness $t$, Root Radius $R_1$) and properties (Mass, Elastic Moduli, Section Areas) for Columns, Beams, Angles, and Channels to display on profile selection cards.
* **[outputImageMap.js](../frontend/src/modules/shared/config/outputImageMap.js):** Resolves which sketch diagram or detailing overlay image to load inside output docks or capacity modals based on selected choices (e.g., checking if column sections include "SHS" or "RHS" and returning corresponding weld schemas).

---

## 6.9 Architectural Observations & Areas of Improvement

During the code review of the Form Engine components, two critical implementation vulnerabilities were identified:

### 1. Keyboard Navigation Lock Bypass (Security & Usability Bug)
* **The Problem:** When a calculation completes successfully, Osdag-Web marks the input dock as locked (`isInputLocked = true`). This applies a transparent click-interceptor overlay and the Tailwind class `pointer-events-none` to block mouse input. However, the form controls (inputs and select boxes) inside `InputSection.jsx` **do not** receive `disabled={isInputLocked}` or `readOnly={isInputLocked}` flags.
* **The Risk:** Keyboard-navigating users can press the `Tab` key to focus on text fields or dropdown menus. They can type or make selections, changing input values while the dock is locked. This bypasses the lock overlay without triggering the re-design warning confirmation modal, leaving the browser form state out of sync with the rendered 3D CAD graphics.
* **Proposed Fix:** Bind the `disabled` prop on text `<input>` controls and the `isDisabled` prop on React `<Select>` elements to the `isInputLocked` state passed from the orchestrator.

### 2. Redundant Network Re-fetches on Custom Section Events (Performance Issue)
* **The Problem:** In the hook [useModuleData.js](../frontend/src/modules/shared/hooks/useModuleData.js), `localCustomSections` is included in the dependency array of the options-fetching `useEffect` block.
* **The Risk:** Whenever a user registers a new custom section (dispatching `osdag:custom-section-added`), `localCustomSections` changes. This triggers the entire effect to re-run, firing a redundant, heavy API network fetch to `/api/options/<module_id>/` even though the server options catalog hasn't changed.
* **Proposed Fix:** Remove `localCustomSections` from the `useEffect` dependency array, reserving the API request only for module load or manual resets. Implement client-side merging by wrapping the `mergeLocalCustomSections` call in a `useMemo` block that reacts to updates in either base options or local custom entries:
  ```javascript
  const mergedOptions = useMemo(() => {
    return mergeLocalCustomSections(moduleData, localCustomSections);
  }, [moduleData, localCustomSections]);
  ```
