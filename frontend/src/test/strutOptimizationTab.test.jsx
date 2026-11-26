// @vitest-environment jsdom
/**
 * The Optimization tab of the welded strut (`optimization_tab_strut_design` in the core): the rows it lists
 * for each section profile, its defaults, and that what it holds is what the design request carries. The
 * core's tab lists the same keys as `designPrefTables.js` (`input_dictionary_design_pref`).
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  KEY_ALLOW_LOAD,
  KEY_ALLOW_UR,
  KEY_BOLT_Number,
  KEY_Buckling_In_plane,
  KEY_Buckling_Out_plane,
  KEY_DISP_EFFECTIVE_AREA_PARA,
  KEY_DISP_LOAD,
  KEY_DISP_UR,
  KEY_EFFECTIVE_AREA_PARA,
  KEY_PLATETHK,
} from "../constants/generated/coreKeys";
import { DESIGN_PREF_TABLES } from "../constants/generated/designPrefTables";
import StrutOptimizationSectionModal from "../modules/shared/components/StrutOptimizationSectionModal";
import { getDesignPrefConfig, getDesignPrefTabs } from "../modules/shared/config/designPrefModuleConfig";
import {
  STRUT_LOAD_CONCENTRIC,
  STRUT_LOAD_LEG,
  STRUT_OPTIMIZATION_FIELDS,
  STRUT_PROFILE_ANGLES,
  STRUT_PROFILE_OPPOSITE_SIDE,
  STRUT_PROFILE_SAME_SIDE,
  strutOptimizationDefaults,
  strutOptimizationLayout,
} from "../modules/shared/config/prefOptions";
import { MODULES } from "./cases";
import { caseState, designRequest } from "./cases/shared";
import { PrefTabHost, optionsOf, pick, prefsNow, rowLabels, shownIn, textInputOf } from "./componentHarness";

const OPTIMIZATION_TAB = 12;
const module = MODULES.find((m) => m.name === "struts welded");
const { config } = module;
const prefConfig = getDesignPrefConfig(config.sessionName);
const tables = DESIGN_PREF_TABLES[config.designType];

const FIELD_KEYS = {
  allow_ur: KEY_ALLOW_UR,
  effective_area_parameter: KEY_EFFECTIVE_AREA_PARA,
  buckling_out_of_plane: KEY_Buckling_Out_plane,
  buckling_in_plane: KEY_Buckling_In_plane,
  load_type: KEY_ALLOW_LOAD,
  bolt_number: KEY_BOLT_Number,
  plate_thickness: KEY_PLATETHK,
};
const PROFILES = [STRUT_PROFILE_ANGLES, STRUT_PROFILE_SAME_SIDE, STRUT_PROFILE_OPPOSITE_SIDE];

const show = (profile, initial = prefConfig.getInitialPrefs({ ...config.defaultInputs, section_profile: profile }, config.sessionName)) =>
  render(<PrefTabHost Tab={StrutOptimizationSectionModal} profile={profile} initial={initial} isInputLocked={false} />);

describe("welded strut Optimization tab: tabs and keys", () => {
  it("is the tab list of the core: Angle Section, Optimization, Weld, Design", () => {
    expect(getDesignPrefTabs(config.sessionName).map((tab) => tab.name)).toEqual(["Angle Section", "Optimization", "Weld", "Design"]);
    expect(getDesignPrefTabs(config.sessionName).map((tab) => tab.id)).toContain(OPTIMIZATION_TAB);
  });

  it("holds exactly the keys the core lists on its Optimization tab", () => {
    const core = tables.prefTabs.filter(([name]) => name === "Optimization").flatMap(([, , keys]) => keys);
    // The core lists the two load types as keys of the combobox as well (Load_type1, Load_type2): values, not keys.
    expect([...new Set(Object.values(FIELD_KEYS))].sort()).toEqual(
      core.filter((key) => key !== STRUT_LOAD_CONCENTRIC && key !== STRUT_LOAD_LEG).sort(),
    );
    expect(STRUT_OPTIMIZATION_FIELDS.sort()).toEqual(Object.keys(FIELD_KEYS).sort());
    for (const [field, key] of Object.entries(FIELD_KEYS)) expect(config.coreKeys[field], field).toBe(key);
  });

  it("is not on the dock any more: the dock lists no plate thickness or optimisation field", () => {
    const dockFields = config.inputSections.flatMap((section) => section.fields.map((field) => field.key));
    for (const field of STRUT_OPTIMIZATION_FIELDS) expect(dockFields).not.toContain(field);
  });
});

describe("welded strut Optimization tab: rows per profile (the core's tab is built from the profile)", () => {
  it("single angle: both buckling factors, concentric or leg load, number of bolts", () => {
    show(STRUT_PROFILE_ANGLES);
    expect(rowLabels()).toEqual([
      KEY_DISP_UR,
      KEY_DISP_EFFECTIVE_AREA_PARA,
      "Out of Plane",
      "In Plane",
      KEY_DISP_LOAD,
      "Number of Bolts",
    ]);
    expect(optionsOf(KEY_DISP_LOAD).map((option) => option.text)).toEqual([STRUT_LOAD_CONCENTRIC, STRUT_LOAD_LEG]);
  });

  it("back to back angles on the same side: leg load only, a gusset thickness and the number of bolts", () => {
    show(STRUT_PROFILE_SAME_SIDE);
    expect(rowLabels()).toEqual([
      KEY_DISP_UR,
      KEY_DISP_EFFECTIVE_AREA_PARA,
      "Out of Plane",
      "In Plane",
      KEY_DISP_LOAD,
      "Thickness (mm)",
      "Number of Bolts",
    ]);
    expect(optionsOf(KEY_DISP_LOAD).map((option) => option.text)).toEqual([STRUT_LOAD_LEG]);
  });

  it("back to back angles on opposite sides: concentric load only, a gusset thickness and no number of bolts", () => {
    show(STRUT_PROFILE_OPPOSITE_SIDE);
    expect(rowLabels()).toEqual([KEY_DISP_UR, KEY_DISP_EFFECTIVE_AREA_PARA, "Out of Plane", "In Plane", KEY_DISP_LOAD, "Thickness (mm)"]);
    expect(optionsOf(KEY_DISP_LOAD).map((option) => option.text)).toEqual([STRUT_LOAD_CONCENTRIC]);
  });

  it("offers the core's gusset thicknesses", () => {
    show(STRUT_PROFILE_SAME_SIDE);
    const thicknesses = optionsOf("Thickness (mm)").map((option) => option.text);
    expect(thicknesses.slice(0, 3)).toEqual(["8", "10", "12"]);
    expect(thicknesses.length).toBeGreaterThan(3);
  });

  it("writes a change back under the field name", () => {
    show(STRUT_PROFILE_ANGLES);
    fireEvent.change(textInputOf(KEY_DISP_UR), { target: { value: "0.8" } });
    fireEvent.change(textInputOf("In Plane"), { target: { value: "0.9" } });
    pick(KEY_DISP_LOAD, STRUT_LOAD_LEG);
    expect(prefsNow()).toMatchObject({ allow_ur: "0.8", buckling_in_plane: "0.9", load_type: STRUT_LOAD_LEG });
  });

  it("changes nothing when the dialog is locked", () => {
    render(
      <PrefTabHost
        Tab={StrutOptimizationSectionModal}
        profile={STRUT_PROFILE_ANGLES}
        initial={strutOptimizationDefaults(STRUT_PROFILE_ANGLES)}
        isInputLocked
      />,
    );
    expect(textInputOf(KEY_DISP_UR).disabled).toBe(true);
    expect(shownIn(KEY_DISP_LOAD)).toBe(STRUT_LOAD_CONCENTRIC);
  });

  it("describes the buckling of the profile", () => {
    show(STRUT_PROFILE_OPPOSITE_SIDE);
    expect(screen.getByText(/connected back to back, on opposite sides of the gusset/)).toBeTruthy();
  });
});

describe("welded strut Optimization tab: defaults", () => {
  it("starts with the core's values for each profile", () => {
    for (const profile of PROFILES) {
      const prefs = prefConfig.getInitialPrefs({ ...config.defaultInputs, section_profile: profile }, config.sessionName);
      const layout = strutOptimizationLayout(profile);
      expect(prefs, profile).toMatchObject({
        allow_ur: "1.0",
        effective_area_parameter: "1.0",
        buckling_out_of_plane: "1.0",
        buckling_in_plane: profile === STRUT_PROFILE_ANGLES ? "1.0" : "0.85",
        load_type: layout.loadTypes[0],
      });
      expect(prefs.bolt_number, profile).toBe(layout.boltNumber ? "1.0" : undefined);
      expect(prefs.plate_thickness, profile).toBe(layout.gusset ? "8" : undefined);
    }
    expect(strutOptimizationDefaults(STRUT_PROFILE_SAME_SIDE).load_type).toBe(STRUT_LOAD_LEG);
    expect(strutOptimizationDefaults(STRUT_PROFILE_OPPOSITE_SIDE).load_type).toBe(STRUT_LOAD_CONCENTRIC);
  });

  it("gives a load type the profile does not offer way to the profile's own", () => {
    const prefs = prefConfig.getInitialPrefs(
      { ...config.defaultInputs, section_profile: STRUT_PROFILE_SAME_SIDE, load_type: STRUT_LOAD_CONCENTRIC },
      config.sessionName,
    );
    expect(prefs.load_type).toBe(STRUT_LOAD_LEG);
  });

  it("keeps what was saved", () => {
    const saved = { allow_ur: "0.8", buckling_in_plane: "0.7", load_type: STRUT_LOAD_LEG, bolt_number: "3" };
    const prefs = prefConfig.getInitialPrefs({ ...config.defaultInputs, section_profile: STRUT_PROFILE_ANGLES, ...saved }, config.sessionName);
    expect(prefs).toMatchObject(saved);
  });

  it("resets to the profile's defaults", () => {
    expect(prefConfig.getDefaultPrefs({ section_profile: STRUT_PROFILE_SAME_SIDE }, config.sessionName, {})).toEqual(
      strutOptimizationDefaults(STRUT_PROFILE_SAME_SIDE),
    );
  });
});

describe("welded strut Optimization tab: the design request", () => {
  const state = (overrides = {}) => ({ ...caseState(module, "all"), designPrefOverrides: overrides });

  it("carries none of them until the user saves, so the backend takes the core's", () => {
    const request = designRequest(config, state());
    for (const key of Object.values(FIELD_KEYS)) expect(request, key).not.toHaveProperty(key);
    expect(request).not.toHaveProperty("Connector.Material");
  });

  it("sends a saved value under its core key, the gusset thickness as one text value", () => {
    const saved = {
      allow_ur: "0.8",
      effective_area_parameter: "0.9",
      buckling_out_of_plane: "1.1",
      buckling_in_plane: "0.85",
      load_type: STRUT_LOAD_LEG,
      bolt_number: "2",
      plate_thickness: "12",
    };
    const request = designRequest(config, state(saved));
    for (const [field, key] of Object.entries(FIELD_KEYS)) expect(request[key], key).toBe(saved[field]);
  });
});
