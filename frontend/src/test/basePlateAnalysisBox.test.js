/**
 * The base plate's Design tab of Additional Inputs has the two boxes the desktop has (`design_values` in
 * design_type/connection/base_plate_connection.py): Design Method and Base Plate Analysis. Other modules keep one.
 * The value was already on the design request; the backend test
 * backend/apps/core/tests/test_base_plate_analysis_options.py checks the options against the core.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { KEY_DISP_DP_DESIGN_BASE_PLATE, KEY_DP_DESIGN_BASE_PLATE } from "../constants/generated/coreKeys";
import DesignSectionModal from "../modules/shared/components/DesignSectionModal";
import { getDesignPrefConfig } from "../modules/shared/config/designPrefModuleConfig";
import { BASE_PLATE_ANALYSIS_OPTIONS } from "../modules/shared/config/prefOptions";
import { basePlateConfig } from "../modules/basePlate/configs/basePlateConfig";
import { boltedToEndConfig } from "../modules/TensionMembers/BoltedToEnd/configs/boltedToEndConfig";
import openDefaults from "./fixtures/designPrefOpenDefaults.json";

const render = (config, prefs) =>
  renderToStaticMarkup(
    createElement(DesignSectionModal, {
      module: config.sessionName,
      designPrefInputs: prefs,
      setDesignPrefInputs: () => {},
      isInputLocked: false,
    }),
  );

describe("Design tab of the base plate", () => {
  it("is labelled Base Plate Analysis, as in the core", () => {
    expect(KEY_DISP_DP_DESIGN_BASE_PLATE).toBe("Base Plate Analysis");
  });

  it("offers the core's one method and starts on it", () => {
    expect(BASE_PLATE_ANALYSIS_OPTIONS).toEqual(["Effective Area Method"]);
    // The dialog opens on what the server's "open" sync took from the core (the form holds no Additional Inputs).
    const opened = { ...basePlateConfig.defaultInputs, ...openDefaults[basePlateConfig.sessionName] };
    const prefs = getDesignPrefConfig(basePlateConfig.sessionName).getInitialPrefs(opened, basePlateConfig.sessionName);
    expect(BASE_PLATE_ANALYSIS_OPTIONS).toContain(prefs[KEY_DP_DESIGN_BASE_PLATE]);
  });

  it("shows the box with its value for the base plate only", () => {
    const prefs = { design_method: "Limit State Design", [KEY_DP_DESIGN_BASE_PLATE]: "Effective Area Method" };
    const basePlate = render(basePlateConfig, prefs);
    expect(basePlate).toContain("Design Method");
    expect(basePlate).toContain(KEY_DISP_DP_DESIGN_BASE_PLATE);
    expect(basePlate).toContain("Effective Area Method");

    const tension = render(boltedToEndConfig, prefs);
    expect(tension).toContain("Design Method");
    expect(tension).not.toContain(KEY_DISP_DP_DESIGN_BASE_PLATE);
  });
});
