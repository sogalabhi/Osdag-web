/**
 * A selection saved as "All" reopens as "All", and a smaller selection reopens as "Customized".
 *
 * "All" is the whole option list of the field. For most fields that is a list the module data holds
 * (`INPUT_KEY_TO_LIST`); the section designation of the tension, strut, column and beam modules depends
 * on the section profile, so its list is the field's `getDynamicDataSource`.
 */
import { describe, expect, it } from "vitest";

import { MODULES } from "./cases";
import { LISTS, caseState, wire } from "./cases/shared";
import { fromDesignDictionary } from "../modules/shared/utils/designDictionary";
import { toDesignDictionary } from "../modules/shared/utils/osiSave";
import { weldedToEndConfig } from "../modules/TensionMembers/WeldedToEnd/configs/weldedToEndConfig";

// The tension welded request always carries the whole section list, whatever the selection, so a smaller
// selection cannot come back from a save of it.
const SENDS_WHOLE_LIST = new Set([weldedToEndConfig]);

// The anchor lists of the test lists are exactly what the base plate case picks, so give them one more option.
const LONGER_LISTS = { ...LISTS, anchorDiameterList: [...LISTS.anchorDiameterList, "M30"], anchorGradeList: [...LISTS.anchorGradeList, "10.9"] };

const reopen = (module, selection, connectivity) => {
  const lists = selection === "all" ? LISTS : LONGER_LISTS;
  const state = caseState(module, selection, connectivity);
  // The plate girder takes its thicknesses from the lists only in the "Optimized" design type.
  const inputs = "design_type" in state.inputs ? { ...state.inputs, design_type: "Optimized" } : state.inputs;
  const dictionary = wire(toDesignDictionary({
    moduleConfig: module.config, inputs, allSelected: state.allSelected, contextData: lists, extraState: state.extraState, designPrefOverrides: {},
  }));
  return { state: fromDesignDictionary(module.config, dictionary, lists), dictionary };
};

describe("a saved selection reopens as it was", () => {
  for (const module of MODULES) {
    const connectivity = (module.connectivities || [null])[0];
    const fields = (module.config.selectionConfig || []).map((s) => s.inputKey);

    it(`${module.name}: "All" reopens as "All"`, () => {
      const { state, dictionary } = reopen(module, "all", connectivity);
      // A field the request sends as a single value (the seated angle's supported beam) is not a selection.
      const isList = (field) => [].concat(module.config.coreKeys[field] ?? []).some((key) => Array.isArray(dictionary[key]));
      const loaded = fields.filter((field) => field in state.allSelected && isList(field));
      for (const field of loaded) {
        expect(state.allSelected[field], field).toBe(true);
      }
      expect(loaded.length, "at least one selection field is saved").toBeGreaterThan(0);
    });

    const customized = SENDS_WHOLE_LIST.has(module.config) ? it.skip : it;
    customized(`${module.name}: a smaller selection reopens as "Customized"`, () => {
      const { state } = reopen(module, "customized", connectivity);
      for (const field of fields) {
        if (field in state.allSelected) expect(state.allSelected[field], field).toBe(false);
      }
    });
  }
});
