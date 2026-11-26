// @vitest-environment jsdom
/**
 * The Angle Section and Channel Section tabs of the tension members and the bolted strut, as the core lists them
 * (`tab_list` of the tension and the bolted strut classes). The dock's section profile says which of the two tabs
 * describes the member; the other tab opens on the first section of its own table, asked of the server with that
 * table's profile in the draft, and never changes the dock's section.
 *
 * The server is a fake that answers in core keys, an angle row for an angle profile and a channel row for a channel profile.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { useCallback, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiClient = vi.hoisted(() => vi.fn());
vi.mock("../utils/apiClient", () => ({ apiClient, subscribeToTask: vi.fn() }));
vi.mock("../utils/auth", () => ({ isGuestUser: () => true }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));

import { fireEvent } from "@testing-library/react";
import { message } from "antd";

import { ModuleContext } from "../context/ModuleState";
import { KEY_MATERIAL, KEY_SEC_PROFILE, KEY_SECSIZE } from "../constants/generated/coreKeys";
import DesignPrefSections from "../modules/shared/components/DesignPrefSections";
import { getDesignPrefTabs } from "../modules/shared/config/designPrefModuleConfig";
import { boltedToEndConfig } from "../modules/TensionMembers/BoltedToEnd/configs/boltedToEndConfig";
import { weldedToEndConfig } from "../modules/TensionMembers/WeldedToEnd/configs/weldedToEndConfig";
import { strutsBoltedConfig } from "../modules/compressionMember/configs/strutsBoltedConfig";
import { strutsWeldedConfig } from "../modules/compressionMember/configs/strutsWeldedConfig";
import { InPlace } from "./componentHarness";

const GRADE = "E 250 (Fe 410 W)A";
const ANGLE_ROW = { Designation: "50 x 50 x 6", a: 57.5, b: 41.5, t: 6, R1: 6, R2: 0, Source: "IS808_Rev" };
const CHANNEL_ROW = { Designation: "MC 100", D: 137.5, B: 50, T: 7.7, tw: 5, FlangeSlope: 96, R1: 9, R2: 2.4, Source: "IS808_Rev" };
const MODULE_LISTS = { angleList: ["50 x 50 x 6", "60 x 60 x 6"], channelList: ["MC 100", "MC 125"] };
const MODULES = {
  "tension bolted": boltedToEndConfig,
  "tension welded": weldedToEndConfig,
  "struts bolted": strutsBoltedConfig,
};

let calls;

const answer = (body) => {
  const inputs = { ...body.inputs, ...(body.design_pref_draft || {}) };
  const row = String(inputs[KEY_SEC_PROFILE]).includes("Channel") ? CHANNEL_ROW : ANGLE_ROW;
  return {
    success: true,
    resolved_inputs: inputs,
    metadata: { operation: body.operation },
    material_details: { connector: [], supported: [{ Grade: GRADE }], supporting: [] },
    section_details: { supporting: {}, supported: row, connector: {} },
  };
};

beforeEach(() => {
  calls = [];
  apiClient.mockReset();
  apiClient.mockImplementation(async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, body });
    return { json: async () => answer(body) };
  });
});

afterEach(() => message.destroy());

function Host({ config, inputs, onOverrides }) {
  const [overrides, setOverrides] = useState({});
  const current = useRef({});
  const setDesignPrefOverrides = useCallback(
    (next) => {
      const value = typeof next === "function" ? next(current.current) : next;
      current.current = value;
      setOverrides(value);
      onOverrides(value);
    },
    [onOverrides],
  );
  return (
    <DesignPrefSections
      module={config.sessionName}
      moduleConfig={config}
      inputs={inputs}
      setInputs={vi.fn()}
      designPrefOverrides={overrides}
      setDesignPrefOverrides={setDesignPrefOverrides}
      setDesignPrefModalStatus={vi.fn()}
      setConfirmationModal={vi.fn()}
      confirmationModal={false}
      isInputLocked={false}
      moduleMaterialList={[{ id: 1, Grade: GRADE }]}
      moduleLists={MODULE_LISTS}
      onRefetchModuleOptions={vi.fn()}
    />
  );
}

const context = {
  materialList: [{ id: 1, Grade: GRADE }],
  applyDesignPrefSyncBundle: vi.fn(),
  setLastKnownGoodDesignPrefSnapshot: vi.fn(),
  invalidateDesignOutputs: vi.fn(),
  lastKnownGoodDesignPrefSnapshot: null,
  manageDesignPreferences: vi.fn(),
  conn_material_details: [],
  supporting_material_details: [],
  supported_material_details: [{ Ultimate_Tensile_Stress: 410, Yield_Stress_greater_than_40: 250 }],
};

function open(config, inputs) {
  const onOverrides = vi.fn();
  render(
    <InPlace>
      <ModuleContext.Provider value={context}>
        <Host config={config} inputs={{ ...config.defaultInputs, material: GRADE, ...inputs }} onOverrides={onOverrides} />
      </ModuleContext.Provider>
    </InPlace>,
  );
  return { onOverrides };
}

const ready = () => waitFor(() => expect(screen.getByRole("button", { name: "Save" }).disabled).toBe(false));
const goTo = (tab) => fireEvent.click(screen.getAllByTestId("pref-tab").find((element) => element.textContent === tab));
const previews = () => calls.filter((call) => call.body.operation === "open" && call.body.design_pref_draft);
const valueShown = (text) => waitFor(() => expect(screen.getByDisplayValue(String(text))).toBeTruthy());
const designationShown = (text) => waitFor(() => expect(document.body.textContent).toContain(text));

describe.each(Object.entries(MODULES))("%s: the tabs", (name, config) => {
  it("lists the Angle Section and the Channel Section tab, one after the other, as the core does", () => {
    const names = getDesignPrefTabs(config.sessionName).map((tab) => tab.name);
    expect(names.slice(0, 2)).toEqual(["Angle Section", "Channel Section"]);
    expect(names).toContain("Connector");
  });
});

describe("the welded strut has no Channel Section tab", () => {
  it("lists only the Angle Section tab", () => {
    const names = getDesignPrefTabs(strutsWeldedConfig.sessionName).map((tab) => tab.name);
    expect(names).toContain("Angle Section");
    expect(names).not.toContain("Channel Section");
  });
});

describe("a channel profile", () => {
  const dockInputs = { section_profile: "Channels", section_designation: ["MC 100"] };

  it("shows the dock's channel on the Channel Section tab, from the channel table", async () => {
    open(boltedToEndConfig, dockInputs);
    await ready();
    goTo("Channel Section");
    await valueShown("137.5");
    await designationShown("MC 100");
    // the dock's own section was resolved with the dock's profile, not a draft naming another one
    expect(calls[0].body.inputs[KEY_SECSIZE]).toEqual(["MC 100"]);
    expect(calls[0].body.design_pref_draft).toBeNull();
  });

  it("opens the Angle Section tab on the first angle, asked for with the angle profile, without touching the dock's section", async () => {
    const { onOverrides } = open(boltedToEndConfig, dockInputs);
    await ready();
    goTo("Angle Section");
    await valueShown("57.5");
    await designationShown("50 x 50 x 6");
    const [preview] = previews();
    expect(preview.body.design_pref_draft[KEY_SEC_PROFILE]).toBe("Angles");
    expect(preview.body.design_pref_draft[KEY_SECSIZE]).toEqual(["50 x 50 x 6"]);
    // Nothing the dialog stores takes the angle as the dock's section.
    for (const [value] of onOverrides.mock.calls) expect(JSON.stringify(value)).not.toContain("50 x 50 x 6");
  });

  it("keeps the channel on its tab after looking at the angle tab", async () => {
    open(boltedToEndConfig, dockInputs);
    await ready();
    goTo("Angle Section");
    await valueShown("57.5");
    goTo("Channel Section");
    await valueShown("137.5");
    expect(screen.queryByDisplayValue("57.5")).toBeNull();
  });
});

describe("an angle profile", () => {
  const dockInputs = { section_profile: "Angles", section_designation: ["50 x 50 x 6"] };

  it("shows the dock's angle on the Angle Section tab", async () => {
    open(boltedToEndConfig, dockInputs);
    await ready();
    goTo("Angle Section");
    await valueShown("57.5");
    expect(previews()).toHaveLength(0);
  });

  it("opens the Channel Section tab on the first channel, asked for with the channel profile", async () => {
    open(weldedToEndConfig, dockInputs);
    await ready();
    goTo("Channel Section");
    await valueShown("137.5");
    await designationShown("MC 100");
    const [preview] = previews();
    expect(preview.body.design_pref_draft[KEY_SEC_PROFILE]).toBe("Channels");
    expect(preview.body.design_pref_draft[KEY_SECSIZE]).toEqual(["MC 100"]);
    expect(calls[0].body.inputs[KEY_MATERIAL]).toBe(GRADE);
  });
});
