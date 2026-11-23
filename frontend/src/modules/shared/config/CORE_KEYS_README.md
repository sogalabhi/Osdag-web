# Declared core-key map

Every module config lists, for each form field, the core key(s) it feeds. This is the single, tested place that says "this field is that core key". The `.osi` loader reads it backwards (`utils/designDictionary.js`, `fromDesignDictionary`): a core key in a design dictionary fills every field that declares it. It also builds the Additional Inputs sync and defaults requests (`utils/prefSyncKeys.js`): form state to core keys and the module id out, and the answer back to field names.
Every module config lists, for each form field, the core key(s) it feeds. This is the single, tested place that says "this field is that core key". The `.osi` loader reads it backwards (`utils/designDictionary.js`, `fromDesignDictionary`): a core key in a design dictionary fills every field that declares it. The save reads it forwards (`toDesignDictionary` in `utils/osiSave.js`): an Additional Inputs override the design request does not carry is written under the core key its field declares. Declaring it changes no wire body.

## Format

```js
import { MATERIAL_CORE_KEYS, PREF_CORE_KEYS } from "../../../shared/config/prefCoreKeys";

export const finPlateConfig = {
  defaultInputs: { ... },
  coreKeys: {
    ...PREF_CORE_KEYS,        // bolt/weld/detailing/design prefs, same in every module
    ...MATERIAL_CORE_KEYS,    // plain material rows; override the ones the module treats differently
    bolt_diameter: KEY_D,
    beam_section: KEY_SUPTDSEC,
    secondary_beam: KEY_SUPTDSEC,          // two fields, one core key (per connectivity)
    connector_material: [KEY_CONNECTOR_MATERIAL, KEY_MATERIAL],  // one field, two core keys
    material: null,                        // feeds no core key
  },
};
```

- Key: the form field name (`inputs.<field>`), as a plain identifier.
- Value: a key constant imported from `constants/generated/coreKeys.js` or `webKeys.js` (never a string literal; ESLint blocks it), an array of them, or `null`.
- `null` means the field feeds no core key: pure UI state (images, `module`-style constants, leftovers the builder never reads). Write a short comment saying why.
- List every field of the form: each `defaultInputs` key, each `inputSections[].fields[].key`, each `selectionConfig`/`modalConfig` `inputKey`, and the Additional Inputs fields the module uses. A field you declare that the form does not have is reported as unknown (usually a typo).
- Shared prefs live in `prefCoreKeys.js`: `PREF_CORE_KEYS` (bolt_tension_type, bolt_hole_type, bolt_slip_factor, weld_fab, weld_material_grade, detailing_*, design_method, design_for) and `MATERIAL_CORE_KEYS` (material, connector_material, supported_material, supporting_material in their one-to-one meaning). Spread them, then write the module's own entries after the spread so they win. Only add a row there if it means the same in every module.
- Put the field's core key where the wire carries it, not where it "should" go: `connector_material` feeds `Material` in the shear modules because `buildSubmissionParams` sends it there. Keep such quirks and comment them. Do not fix them here.

## How to fill a module

1. Open the config and its builder (`buildSubmissionParams`, or the factory that makes it).
2. Start with `...PREF_CORE_KEYS, ...MATERIAL_CORE_KEYS`, then add every other field.
3. Delete the module's line from `PENDING` in `src/test/coreKeyMap.test.js`.
4. Run `cd frontend && npx vitest run src/test/coreKeyMap.test.js` and read the failures: they name the field, the variant and the key the wire carries that you did not declare.
5. Run the whole suite (`npm test`): existing snapshots must not change. Never run it with `-u`.

For a factory (cover plate, simple connection), put `coreKeys` in the factory output; fields that differ per variant take their variant's keys from a factory argument or a spread of a per-variant object.

## What the test checks (`src/test/coreKeyMap.test.js`)

For each module and each payloadParity variant (every connectivity on "All", plus the customized selection) it replaces one form field at a time with a sentinel string, runs `buildSubmissionParams`, and finds the wire keys whose value carries it. For an "All" selection the option lists the field owns (`dataSource`) return the sentinel too. Then:

- every wire key that came from a field is among that field's declared keys;
- every declared key is a real export of `coreKeys.js` / `webKeys.js` (a misspelled import is `undefined` and is reported);
- every form field is declared, and nothing unknown is;

The check is one way: a declared key the builder never sends is allowed (prefs the builder ignores, `.osi`-only keys). A module without `coreKeys` fails unless it is in `PENDING`, where it shows as a todo; a module that has `coreKeys` but is still in `PENDING` fails, so the list only shrinks.

## How the loader uses it

- A key in the file fills every field that declares it, so a field has to declare each key the desktop file can carry it under, not only the one the builder sends (`load_axial: [KEY_AXIAL, KEY_AXIAL_BP]`: the builder sends `Load.Axial`, the desktop file writes `Load.Axial_Compression`).
- A field declared with `null`, or not declared, is never filled from a file. A key no field declares is dropped.
- Declare a field only if the form has it. A spread row for a field the form lacks (`material` in a module whose dock has `connector_material`) is loaded as a stray input; give the module `material: null`.
- `computedCoreKeys: [KEY]` on a config lists keys the builder derives from several fields (plate girder `Deflection.Max`); a file's value is never read back into them. The fields it comes from must each be saved under a key of their own (plate girder `Structure.Type`), or a reopened form cannot rebuild them.
- `notLoadedFromDictionary: [field]` lists fields a file must not fill. Base plate uses it for the two inside-flange anchor lists, which the old loader never filled; remove the entry to fix that.
- When several keys feed one field, the more specific key wins: `Material`, then `Connector.Material`, then the rest (`keyPriority`).

## Pitfalls

- A field the builder reshapes before sending (`Number(x)`, `parseFloat`, an object built from it) loses the sentinel, so the test cannot see it; declare it from the code, not from a green run. String edits (`replaceAll`, `String()`, template strings) are fine.
- A field that only selects a branch (`bolt_type`, `weld_type`, `connectivity`) is traced only through the key that carries its value. The connectivity field is traced through `extraState.selectedOption`.
- Fields fed by an "All" list need `dataSource` on the field or on its `modalConfig` entry; without it the sentinel never reaches the wire and the field is untested.
- One core key can come from several fields (shear sections by connectivity) and one field can feed several keys. Declare both; there is no "primary" key.
- The same web field name can mean a different core key in another module (`material` is `Material` in one, `Section.Material` in another). That is why materials are not forced into the shared table.
- Field names that look like core keys (`Module`, `Material`) are blocked as bare property names by ESLint; use the lower-case field names the configs already have.
- Purlin is out of scope; leave it alone.
