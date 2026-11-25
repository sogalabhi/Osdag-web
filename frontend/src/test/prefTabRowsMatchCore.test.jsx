// @vitest-environment jsdom
/**
 * The rows of the Bolt, Weld, Detailing and Design tabs of every module, against the keys the core lists on the
 * tab of the same name (`input_dictionary_design_pref()`, generated into `designPrefTables.js`).
 *
 * The desktop shows one field per key of a tab. The web decides the rows of a tab from the module name, so a
 * module can show a field the core does not have or miss one it has. Rows are read from the rendered tabs.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  KEY_DP_BOLT_HOLE_TYPE,
  KEY_DP_BOLT_SLIP_FACTOR,
  KEY_DP_BOLT_TYPE,
  KEY_DP_DESIGN_BASE_PLATE,
  KEY_DP_DESIGN_METHOD,
  KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
  KEY_DP_DETAILING_EDGE_TYPE,
  KEY_DP_DETAILING_GAP,
  KEY_DP_DETAILING_PACKING_PLATE,
  KEY_DP_WELD_FAB,
  KEY_DP_WELD_MATERIAL_G_O,
  KEY_DP_WELD_TYPE,
  KEY_DISP_DP_DESIGN_BASE_PLATE,
  KEY_DISP_DP_DETAILING_PACKING_PLATE,
} from "../constants/generated/coreKeys";
import { DESIGN_PREF_TABLES } from "../constants/generated/designPrefTables";
import BoltSectionModal from "../modules/shared/components/BoltSectionModal";
import DesignSectionModal from "../modules/shared/components/DesignSectionModal";
import DetailingSectionModal from "../modules/shared/components/DetailingSectionModal";
import WeldSectionModal from "../modules/shared/components/WeldSectionModal";
import { getDesignPrefTabs } from "../modules/shared/config/designPrefModuleConfig";
import { MODULES } from "./cases";
import { PrefTabHost, rowLabels } from "./componentHarness";

/** tab: the web tab id, the core's tab name, the component, and the key each row label (start) stands for. */
const TABS = {
  Bolt: {
    id: 6,
    Tab: BoltSectionModal,
    keys: { Type: KEY_DP_BOLT_TYPE, "Hole Type": KEY_DP_BOLT_HOLE_TYPE, "Slip Factor": KEY_DP_BOLT_SLIP_FACTOR },
  },
  Weld: {
    id: 10,
    Tab: WeldSectionModal,
    keys: {
      Type: KEY_DP_WELD_TYPE,
      "Type of Weld Fabrication": KEY_DP_WELD_FAB,
      "Material Grade Overwrite": KEY_DP_WELD_MATERIAL_G_O,
    },
  },
  Detailing: {
    id: 11,
    Tab: DetailingSectionModal,
    keys: {
      "Edge Preparation Method": KEY_DP_DETAILING_EDGE_TYPE,
      [KEY_DISP_DP_DETAILING_PACKING_PLATE]: KEY_DP_DETAILING_PACKING_PLATE,
      "Gap Between": KEY_DP_DETAILING_GAP,
      "Are the Member Exposed": KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
    },
  },
  Design: {
    id: 13,
    Tab: DesignSectionModal,
    keys: { "Design Method": KEY_DP_DESIGN_METHOD, [KEY_DISP_DP_DESIGN_BASE_PLATE]: KEY_DP_DESIGN_BASE_PLATE },
  },
};

const keyOfRow = (keys, label) => {
  const stands = Object.keys(keys).filter((start) => label === start || label.startsWith(start));
  // "Type" is also the start of "Type of Weld Fabrication": the longest match wins.
  return keys[stands.sort((a, b) => b.length - a.length)[0]];
};

/** The keys the core lists on a tab; the weld tab's fabrication row is `Weld.Fab` or, for the joints, `Weld.Type`. */
const coreKeys = (designType, tabName) =>
  DESIGN_PREF_TABLES[designType].prefTabs.filter(([name]) => name === tabName).flatMap(([, , keys]) => keys).sort();

const webKeys = ({ Tab, keys }, sessionName) => {
  const { unmount } = render(<PrefTabHost Tab={Tab} module={sessionName} initial={{}} isInputLocked={false} />);
  const found = rowLabels().map((label) => keyOfRow(keys, label));
  unmount();
  return found.sort();
};

/**
 * Differences of today, per module and tab: `webOnly` keys the web shows that the core does not list on that tab,
 * `coreOnly` keys it lists that the web does not show. Everything else agrees. A module whose core class has no
 * tab of that name at all is not compared here (see prefTabsMatchCore.test.js).
 */
const CORE_DETAILING_GAP_ONLY = { webOnly: [KEY_DP_DETAILING_CORROSIVE_INFLUENCES, KEY_DP_DETAILING_EDGE_TYPE], coreOnly: [] };
const KNOWN_DIFFERENCES = {
  // The core's Detailing tab of the welded cover plates is the gap alone; the web shows the bolted cover plates' tab.
  "beam-beam cover plate welded|Detailing": CORE_DETAILING_GAP_ONLY,
  "column-column cover plate welded|Detailing": CORE_DETAILING_GAP_ONLY,
  // The core's Detailing tab of the base plate has no gap row.
  "base plate|Detailing": { webOnly: [KEY_DP_DETAILING_GAP], coreOnly: [] },
};

describe.each(Object.entries(TABS))("%s tab rows against the core's keys", (tabName, tab) => {
  const modules = MODULES.filter(
    ({ config }) =>
      getDesignPrefTabs(config.sessionName).some(({ id }) => id === tab.id) && coreKeys(config.designType, tabName).length > 0,
  );

  it("is compared for most modules", () => {
    expect(modules.length).toBeGreaterThan(8);
  });

  it.each(modules.map(({ name, config }) => [name, config]))("%s", (name, config) => {
    const web = webKeys(tab, config.sessionName);
    const core = coreKeys(config.designType, tabName);
    const known = KNOWN_DIFFERENCES[`${name}|${tabName}`] ?? { webOnly: [], coreOnly: [] };
    expect({
      webOnly: web.filter((key) => !core.includes(key)),
      coreOnly: core.filter((key) => !web.includes(key)),
    }).toEqual(known);
  });
});
