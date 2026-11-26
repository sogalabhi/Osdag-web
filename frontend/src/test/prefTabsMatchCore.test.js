/**
 * The tabs of the Additional Inputs dialog of every module, against the tabs the core class lists
 * (`input_dictionary_design_pref()`, generated into `designPrefTables.js`).
 *
 * The desktop shows one tab per name the core lists. The web builds its tab list from
 * `designPrefModuleConfig.js` by hand, so a module can get a tab the core does not have or miss one it has.
 * The differences of today are pinned below, module by module and exactly: a new difference fails, and so
 * does fixing one without removing it from the table.
 */
import { describe, expect, it } from "vitest";

import { DESIGN_PREF_TABLES } from "../constants/generated/designPrefTables";
import { getDesignPrefTabs } from "../modules/shared/config/designPrefModuleConfig";
import { MODULES } from "./cases";

/** The core's tab name for each web tab name; the web writes "Column Section*", the core "Column Section *". */
const normal = (name) => name.replace(/\s*\*$/, "*").replace("Optimisation", "Optimization");

const webTabs = (sessionName) => getDesignPrefTabs(sessionName).map((tab) => normal(tab.name));
const coreTabs = (designType) => [...new Set(DESIGN_PREF_TABLES[designType].prefTabs.map(([name]) => normal(name)))];

/**
 * What differs today. `webOnly`: tabs the web shows that the core does not list; `coreOnly`: tabs the core lists
 * that the web does not show. Anything missing here has the same tabs as the core.
 */
const KNOWN_DIFFERENCES = {
  // The core has a Channel Section tab next to the Angle Section tab; the web's Angle Section tab serves both.
  "tension bolted": { webOnly: [], coreOnly: ["Channel Section"] },
  "tension welded": { webOnly: ["Detailing"], coreOnly: ["Channel Section"] },
  "struts bolted": { webOnly: [], coreOnly: ["Channel Section"] },
  // The core's welded strut has no Connector or Detailing tab, but an Optimization tab.
  "struts welded": { webOnly: ["Connector", "Detailing"], coreOnly: ["Optimization"] },
};

const sortedDiff = (a, b) => a.filter((name) => !b.includes(name)).sort();

describe("Additional Inputs tabs against the core's tabs", () => {
  it("covers every module", () => {
    expect(MODULES.length).toBeGreaterThan(20);
    for (const { config } of MODULES) expect(DESIGN_PREF_TABLES[config.designType], config.designType).toBeDefined();
  });

  it.each(MODULES.map(({ name, config }) => [name, config]))("%s", (name, config) => {
    const web = webTabs(config.sessionName);
    const core = coreTabs(config.designType);
    const difference = { webOnly: sortedDiff(web, core), coreOnly: sortedDiff(core, web) };
    const known = KNOWN_DIFFERENCES[name] ?? { webOnly: [], coreOnly: [] };
    expect(difference).toEqual({ webOnly: [...known.webOnly].sort(), coreOnly: [...known.coreOnly].sort() });
  });

  it("lists only modules that exist in the pinned differences", () => {
    const names = MODULES.map((module) => module.name);
    for (const name of Object.keys(KNOWN_DIFFERENCES)) expect(names).toContain(name);
  });

  it("shows the plate girder's tabs in the core's order", () => {
    const { config } = MODULES.find((module) => module.name === "plate girder");
    expect(webTabs(config.sessionName)).toEqual(coreTabs(config.designType));
  });

  it("shows no tab twice", () => {
    for (const { config } of MODULES) {
      const tabs = webTabs(config.sessionName);
      expect(new Set(tabs).size, config.sessionName).toBe(tabs.length);
    }
  });
});
