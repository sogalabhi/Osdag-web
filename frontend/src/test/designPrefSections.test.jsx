// @vitest-environment jsdom
/**
 * The Additional Inputs dialog (`DesignPrefSections`) with the real wire code (`prefSyncKeys`, the datasource) in
 * front of a fake backend that answers in core keys, the way `/api/design-preferences/sync/` and `/defaults/` do:
 * the dialog opens with an `open` sync; a change of the dock Material refreshes the linked rows; Save sends the
 * draft; Defaults shows what the server answered; Yes / No / Cancel close it.
 *
 * Values are made up here and never compared with a module's defaults.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { useCallback, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiClient = vi.hoisted(() => vi.fn());
vi.mock("../utils/apiClient", () => ({ apiClient, subscribeToTask: vi.fn() }));
vi.mock("../utils/auth", () => ({ isGuestUser: () => true }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));

import { ModuleContext } from "../context/ModuleState";
import {
  KEY_ALLOW_CLASS,
  KEY_CONNECTOR_MATERIAL,
  KEY_DISP_CLASS,
  KEY_DISP_FINPLATE,
  KEY_DISP_MATERIAL,
  KEY_DISP_MEMBER_OPTIONS,
  KEY_DISP_PLATE_GIRDER_WELDED,
  KEY_DISP_STR_TYPE,
  KEY_DP_BOLT_HOLE_TYPE,
  KEY_DP_BOLT_SLIP_FACTOR,
  KEY_DP_BOLT_TYPE,
  KEY_DP_DESIGN_METHOD,
  KEY_DP_DETAILING_CORROSIVE_INFLUENCES,
  KEY_DP_DETAILING_EDGE_TYPE,
  KEY_DP_DETAILING_GAP,
  KEY_DP_WELD_FAB,
  KEY_DP_WELD_MATERIAL_G_O,
  KEY_EFFECTIVE_AREA_PARA,
  KEY_IntermediateStiffener,
  KEY_LOAD,
  KEY_MATERIAL,
  KEY_MAX_DEFL,
  KEY_SEC_MATERIAL,
  KEY_STR_TYPE,
  KEY_SUPTDSEC_MATERIAL,
  KEY_SUPTNGSEC_MATERIAL,
} from "../constants/generated/coreKeys";
import { DESIGN_PREFERENCES } from "../datasources/endpoints";
import DesignPrefSections from "../modules/shared/components/DesignPrefSections";
import { plateGirderConfig } from "../modules/flexuralMember/plateGirder/configs/plateGirderConfig";
import { finPlateConfig } from "../modules/shearConnection/finPlate/configs/finPlateConfig";
import { InPlace, optionsOf, pick, shownIn, textInputOf } from "./componentHarness";

const GRADE = "E 165 (Fe 290)";
const OTHER_GRADE = "E 350 (Fe 490)";
const MATERIALS = [
  { id: 1, Grade: GRADE },
  { id: 2, Grade: OTHER_GRADE },
  { id: -1, Grade: "Custom" },
];
const LINKED_ROWS = [KEY_SUPTNGSEC_MATERIAL, KEY_SUPTDSEC_MATERIAL, KEY_CONNECTOR_MATERIAL];
// What the server fills in for an Additional Input the request does not carry (the core's own defaults).
const CORE_DEFAULTS = {
  [KEY_DP_BOLT_TYPE]: "Pre-tensioned",
  [KEY_DP_BOLT_HOLE_TYPE]: "Standard",
  [KEY_DP_BOLT_SLIP_FACTOR]: "0.3",
  [KEY_DP_WELD_FAB]: "Shop Weld",
  [KEY_DP_WELD_MATERIAL_G_O]: "410",
  [KEY_DP_DETAILING_EDGE_TYPE]: "Sheared or hand flame cut",
  [KEY_DP_DETAILING_GAP]: "10",
  [KEY_DP_DETAILING_CORROSIVE_INFLUENCES]: "No",
  [KEY_DP_DESIGN_METHOD]: "Limit State Design",
};
// What the Defaults endpoint answers for the Bolt tab, different from the above so the two cannot be mixed up.
const SERVER_DEFAULTS = {
  [KEY_DP_BOLT_TYPE]: "Non pre-tensioned",
  [KEY_DP_BOLT_HOLE_TYPE]: "Over-sized",
  [KEY_DP_BOLT_SLIP_FACTOR]: "0.52",
};

/** What the fake backend has seen and what it should do next. */
let server;

/** The answers of the two endpoints, in core keys: linked rows follow the dock Material, a draft is applied. */
function answer(url, body) {
  const inputs = { ...body.inputs };
  const material = inputs[KEY_MATERIAL];
  if (url === DESIGN_PREFERENCES.defaults) {
    return {
      success: true,
      default_pref_inputs: {
        ...inputs,
        ...Object.fromEntries(LINKED_ROWS.map((key) => [key, material])),
        ...CORE_DEFAULTS,
        ...SERVER_DEFAULTS,
      },
      metadata: { defaulted_keys: Object.keys({ ...CORE_DEFAULTS, ...SERVER_DEFAULTS }), linked_pref_keys: LINKED_ROWS },
      material_details: {},
      section_details: {},
    };
  }
  const { operation } = body;
  for (const key of LINKED_ROWS) {
    if (operation === "refresh" || operation === "reset" || !(key in inputs)) inputs[key] = material;
  }
  for (const [key, value] of Object.entries(CORE_DEFAULTS)) {
    if (operation === "reset" || !(key in inputs)) inputs[key] = value;
  }
  if (operation === "open" || operation === "save") Object.assign(inputs, body.design_pref_draft || {});
  return {
    success: true,
    resolved_inputs: inputs,
    metadata: { operation, linked_pref_keys: LINKED_ROWS },
    material_details: { connector: [{ Grade: inputs[KEY_CONNECTOR_MATERIAL] }], supported: [], supporting: [] },
    section_details: { supporting: {}, supported: {} },
  };
}

beforeEach(() => {
  server = { calls: [], fail: null };
  apiClient.mockReset();
  apiClient.mockImplementation(async (url, options) => {
    const body = JSON.parse(options.body);
    server.calls.push({ url, body });
    const failure = server.fail?.(url, body);
    return { json: async () => failure ?? answer(url, body) };
  });
});

afterEach(() => message.destroy());

const syncs = () => server.calls.filter((call) => call.url === DESIGN_PREFERENCES.sync);
const operations = () => syncs().map((call) => call.body.operation);

const contextValue = () => ({
  materialList: MATERIALS,
  applyDesignPrefSyncBundle: vi.fn(),
  setLastKnownGoodDesignPrefSnapshot: vi.fn(),
  invalidateDesignOutputs: vi.fn(),
  lastKnownGoodDesignPrefSnapshot: null,
  manageDesignPreferences: vi.fn(),
  conn_material_details: [],
  supporting_material_details: [],
  supported_material_details: [],
});

/** The dock inputs of a fin plate with a section picked, so the section tabs do not ask the server for one. */
const dock = (changes = {}) => ({ ...finPlateConfig.defaultInputs, material: GRADE, ...changes });

const MODULE_LISTS = { beamList: ["MB 300"], columnList: ["HB 150"] };

/** Keeps the stored overrides the way the form does, so a refresh carries the rows of the earlier answers. */
function Host({ spies, ...props }) {
  const [designPrefOverrides, setOverrides] = useState({});
  const current = useRef({});
  // A stable setter, like the form's useState setter: the dialog's effects depend on it.
  const setDesignPrefOverrides = useCallback(
    (next) => {
      const value = typeof next === "function" ? next(current.current) : next;
      current.current = value;
      setOverrides(value);
      spies.setDesignPrefOverrides(value);
    },
    [spies],
  );
  return (
    <DesignPrefSections
      module={KEY_DISP_FINPLATE}
      moduleConfig={finPlateConfig}
      setInputs={spies.setInputs}
      designPrefOverrides={designPrefOverrides}
      setDesignPrefOverrides={setDesignPrefOverrides}
      setDesignPrefModalStatus={spies.setDesignPrefModalStatus}
      setConfirmationModal={spies.setConfirmationModal}
      confirmationModal={false}
      isInputLocked={false}
      moduleMaterialList={MATERIALS}
      moduleLists={MODULE_LISTS}
      onRefetchModuleOptions={spies.onRefetchModuleOptions}
      {...props}
    />
  );
}

function open({ inputs = dock(), ...props } = {}) {
  const spies = {
    setInputs: vi.fn(),
    onRefetchModuleOptions: vi.fn(),
    setDesignPrefOverrides: vi.fn(),
    setDesignPrefModalStatus: vi.fn(),
    setConfirmationModal: vi.fn(),
  };
  const context = contextValue();
  const tree = (nextInputs, nextProps = props) => (
    <InPlace>
      <ModuleContext.Provider value={context}>
        <Host spies={spies} inputs={nextInputs} {...nextProps} />
      </ModuleContext.Provider>
    </InPlace>
  );
  const view = render(tree(inputs));
  return { ...view, spies, context, withInputs: (next, nextProps) => view.rerender(tree(next, nextProps)) };
}

const button = (name) => screen.getByRole("button", { name });
const ready = () => waitFor(() => expect(button("Save").disabled).toBe(false));
const goTo = (tab) => fireEvent.click(screen.getAllByTestId("pref-tab").find((element) => element.textContent === tab));
const lastOverrides = (spies) => spies.setDesignPrefOverrides.mock.calls.at(-1)[0];

describe("rows the server rejected", () => {
  const rejected = [{ coreKey: KEY_DP_BOLT_HOLE_TYPE, field: "bolt_hole_type", message: "Hole type is not allowed", tabId: 6 }];

  it("opens on the tab that holds the row and shows the message there", async () => {
    open({ prefErrors: rejected });
    await ready();
    const active = screen.getAllByTestId("pref-tab").find((tab) => tab.className.includes("active-tabs"));
    expect(active.textContent).toBe("Bolt");
    expect(screen.getByTestId("pref-errors").textContent).toBe("Hole type is not allowed");
  });

  it("shows the message on its own tab only", async () => {
    open({ prefErrors: rejected });
    await ready();
    goTo("Weld");
    expect(screen.queryByTestId("pref-errors")).toBeNull();
    goTo("Bolt");
    expect(screen.getByTestId("pref-errors")).toBeTruthy();
  });
});

describe("opening", () => {
  it("syncs once with `open`, in core keys, and holds Save and Defaults until the answer is in", async () => {
    open();
    expect(button("Save").disabled).toBe(true);
    expect(button("Defaults").disabled).toBe(true);
    await ready();
    expect(button("Defaults").disabled).toBe(false);
    expect(server.calls).toHaveLength(1);
    const { url, body } = server.calls[0];
    expect(url).toBe(DESIGN_PREFERENCES.sync);
    expect(body).toMatchObject({ module_id: KEY_DISP_FINPLATE, operation: "open", design_pref_draft: null });
    expect(body.inputs[KEY_MATERIAL]).toBe(GRADE);
    expect(Object.keys(body.inputs)).not.toContain("material");
  });

  it("shows what the server resolved on the tabs", async () => {
    open();
    await ready();
    goTo("Connector");
    expect(shownIn("Material")).toBe(GRADE);
  });

  it("lists the grades of the module without the Custom entry the dock has", async () => {
    open();
    await ready();
    goTo("Connector");
    expect(optionsOf("Material").map((option) => option.text)).toEqual([GRADE, OTHER_GRADE]);
  });

  it("offers one tab per section the module has, the core's names", async () => {
    open();
    await ready();
    expect(screen.getAllByTestId("pref-tab").map((tab) => tab.textContent)).toEqual([
      "Column Section*",
      "Beam Section*",
      "Connector",
      "Bolt",
      "Weld",
      "Detailing",
      "Design",
    ]);
  });

  it("does not sync again while nothing it depends on changes", async () => {
    const { withInputs } = open();
    await ready();
    withInputs(dock({ load_shear: "123" }));
    await waitFor(() => expect(button("Save").disabled).toBe(false));
    expect(operations()).toEqual(["open"]);
  });

  it("tells the user when the server refuses, and gives the buttons back", async () => {
    server.fail = () => ({ success: false, error: "the core is unavailable" });
    const { context } = open();
    expect(await screen.findByText("the core is unavailable")).toBeTruthy();
    await ready();
    expect(context.applyDesignPrefSyncBundle).toHaveBeenCalled();
  });
});

describe("a change of the dock Material", () => {
  it("refreshes the linked rows with the new grade, replacing the grade the dialog held", async () => {
    const { withInputs } = open();
    await ready();
    goTo("Connector");
    expect(shownIn("Material")).toBe(GRADE);

    withInputs(dock({ material: OTHER_GRADE }));
    await waitFor(() => expect(operations()).toEqual(["open", "refresh"]));
    await ready();

    const refresh = syncs()[1].body;
    expect(refresh.inputs[KEY_MATERIAL]).toBe(OTHER_GRADE);
    // The request still carries the old grade of the rows; the answer is what replaces it.
    expect(refresh.inputs[KEY_CONNECTOR_MATERIAL]).toBe(GRADE);
    expect(shownIn("Material")).toBe(OTHER_GRADE);
  });

  it("stores the refreshed rows as overrides, without the dock Material", async () => {
    const { withInputs, spies } = open();
    await ready();
    withInputs(dock({ material: OTHER_GRADE }));
    await waitFor(() => expect(operations()).toEqual(["open", "refresh"]));
    await ready();
    const stored = lastOverrides(spies);
    expect(stored.connector_material).toBe(OTHER_GRADE);
    expect(stored.supported_material).toBe(OTHER_GRADE);
    expect(stored.supporting_material).toBe(OTHER_GRADE);
    expect(stored).not.toHaveProperty("material");
  });

  it("keeps the last good answer when the refresh fails", async () => {
    const { withInputs, context } = open();
    await ready();
    goTo("Connector");
    server.fail = (url, body) => (body.operation === "refresh" ? { success: false, error: "refresh refused" } : null);
    withInputs(dock({ material: OTHER_GRADE }));
    expect(await screen.findByText("refresh refused")).toBeTruthy();
    await ready();
    expect(context.applyDesignPrefSyncBundle).toHaveBeenCalled();
    expect(shownIn("Material")).toBe(GRADE);
  });
});

describe("Save", () => {
  it("sends the dialog's values as the draft, then closes the dialog and drops the stale outputs", async () => {
    const { spies, context } = open();
    await ready();
    goTo("Bolt");
    pick("Hole Type", "Over-sized");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(operations()).toEqual(["open", "save"]));

    const { design_pref_draft: draft } = syncs()[1].body;
    expect(draft[KEY_DP_BOLT_HOLE_TYPE]).toBe("Over-sized");
    await waitFor(() => expect(spies.setDesignPrefModalStatus).toHaveBeenCalledWith(false));
    expect(spies.setConfirmationModal).toHaveBeenCalledWith(false);
    expect(context.invalidateDesignOutputs).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Preferences saved. Run design again to refresh outputs.")).toBeTruthy();
    expect(lastOverrides(spies)[KEY_DP_BOLT_HOLE_TYPE] ?? lastOverrides(spies).bolt_hole_type).toBe("Over-sized");
  });

  it("does not send an empty value, and names the field", async () => {
    const { spies, context } = open();
    await ready();
    goTo("Weld");
    fireEvent.change(textInputOf("Material Grade Overwrite"), { target: { value: "" } });
    fireEvent.click(button("Save"));
    expect(await screen.findByText("Please fill in the additional input: weld material grade")).toBeTruthy();
    expect(operations()).toEqual(["open"]);
    expect(spies.setDesignPrefModalStatus).not.toHaveBeenCalled();
    expect(context.invalidateDesignOutputs).not.toHaveBeenCalled();
  });

  it("leaves the dialog open when the server refuses", async () => {
    const { spies, context } = open();
    await ready();
    server.fail = (url, body) => (body.operation === "save" ? { success: false, error: "save refused" } : null);
    fireEvent.click(button("Save"));
    expect(await screen.findByText("save refused")).toBeTruthy();
    expect(spies.setDesignPrefModalStatus).not.toHaveBeenCalled();
    expect(context.invalidateDesignOutputs).not.toHaveBeenCalled();
  });
});

describe("Defaults", () => {
  it("shows the values the server answered, not the form's", async () => {
    const { spies, context } = open();
    await ready();
    fireEvent.click(button("Defaults"));
    await waitFor(() => expect(server.calls.at(-1).url).toBe(DESIGN_PREFERENCES.defaults));
    await ready();

    const request = server.calls.at(-1).body;
    expect(request.inputs[KEY_MATERIAL]).toBe(GRADE);
    expect(request).not.toHaveProperty("operation");

    goTo("Bolt");
    expect(shownIn("Type")).toBe(SERVER_DEFAULTS[KEY_DP_BOLT_TYPE]);
    expect(shownIn("Hole Type")).toBe(SERVER_DEFAULTS[KEY_DP_BOLT_HOLE_TYPE]);
    expect(shownIn("Slip Factor")).toBe(SERVER_DEFAULTS[KEY_DP_BOLT_SLIP_FACTOR]);

    const stored = lastOverrides(spies);
    expect(stored.bolt_hole_type).toBe(SERVER_DEFAULTS[KEY_DP_BOLT_HOLE_TYPE]);
    expect(stored).not.toHaveProperty("material");
    expect(context.invalidateDesignOutputs).toHaveBeenCalledTimes(1);
    expect(spies.setConfirmationModal).toHaveBeenCalledWith(false);
    expect(await screen.findByText("Preferences reset to defaults.")).toBeTruthy();
  });

  it("undoes a change the user made in the dialog", async () => {
    open();
    await ready();
    goTo("Bolt");
    pick("Hole Type", "Standard");
    expect(shownIn("Hole Type")).toBe("Standard");
    fireEvent.click(button("Defaults"));
    await waitFor(() => expect(shownIn("Hole Type")).toBe(SERVER_DEFAULTS[KEY_DP_BOLT_HOLE_TYPE]));
  });

  it("gives the linked rows the dock Material as it is now", async () => {
    const { withInputs } = open();
    await ready();
    withInputs(dock({ material: OTHER_GRADE }));
    await waitFor(() => expect(operations()).toEqual(["open", "refresh"]));
    await ready();
    fireEvent.click(button("Defaults"));
    await waitFor(() => expect(server.calls.at(-1).url).toBe(DESIGN_PREFERENCES.defaults));
    await ready();
    expect(server.calls.at(-1).body.inputs[KEY_MATERIAL]).toBe(OTHER_GRADE);
    goTo("Connector");
    expect(shownIn("Material")).toBe(OTHER_GRADE);
  });

  it("keeps what is on screen when the server refuses", async () => {
    const { spies, context } = open();
    await ready();
    goTo("Bolt");
    pick("Hole Type", "Standard");
    server.fail = (url) => (url === DESIGN_PREFERENCES.defaults ? { success: false, error: "defaults refused" } : null);
    fireEvent.click(button("Defaults"));
    expect(await screen.findByText("defaults refused")).toBeTruthy();
    await ready();
    expect(context.invalidateDesignOutputs).not.toHaveBeenCalled();
    expect(spies.setConfirmationModal).not.toHaveBeenCalled();
  });
});

describe("a locked dialog", () => {
  it("cannot Save or reset to Defaults", async () => {
    open({ isInputLocked: true });
    await waitFor(() => expect(operations()).toEqual(["open"]));
    await waitFor(() => expect(screen.getAllByTestId("pref-tab")[0].disabled).toBe(false));
    expect(button("Save").disabled).toBe(true);
    expect(button("Defaults").disabled).toBe(true);
  });
});

describe("closing with unsaved changes", () => {
  const confirm = (props = {}) => open({ confirmationModal: true, ...props });

  it("asks whether to save", async () => {
    confirm();
    expect(await screen.findByText("Do you want to save the changes?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "No" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });

  it("Yes saves and closes", async () => {
    const { spies } = confirm();
    await screen.findByText("Do you want to save the changes?");
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    await waitFor(() => expect(operations()).toEqual(["open", "save"]));
    await waitFor(() => expect(spies.setDesignPrefModalStatus).toHaveBeenCalledWith(false));
  });

  it("No closes without saving", async () => {
    const { spies, context } = confirm();
    await screen.findByText("Do you want to save the changes?");
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(spies.setDesignPrefModalStatus).toHaveBeenCalledWith(false);
    expect(spies.setConfirmationModal).toHaveBeenCalledWith(false);
    expect(operations()).toEqual(["open"]);
    expect(context.invalidateDesignOutputs).not.toHaveBeenCalled();
  });

  it("Cancel goes back to the dialog", async () => {
    const { spies } = confirm();
    await screen.findByText("Do you want to save the changes?");
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(spies.setConfirmationModal).toHaveBeenCalledWith(false);
    expect(spies.setDesignPrefModalStatus).not.toHaveBeenCalled();
    expect(operations()).toEqual(["open"]);
  });
});

describe("main-form values in the stored overrides", () => {
  it("stores no copy of a main-form value the dialog did not change, so a later edit of the main form counts", async () => {
    const { spies } = open();
    await ready();
    const stored = lastOverrides(spies);
    const mainForm = finPlateConfig.inputSections.flatMap((section) => section.fields.map((field) => field.key));
    expect(Object.keys(stored).filter((field) => mainForm.includes(field))).toEqual([]);
    // What the Design button sends: the dock with the overrides merged over it.
    expect({ ...dock({ load_shear: "123" }), ...stored }.load_shear).toBe("123");
  });
});

describe("plate girder", () => {
  const girderDock = (changes = {}) => ({ ...plateGirderConfig.defaultInputs, material: GRADE, ...changes });
  const openGirder = (inputs = girderDock()) =>
    open({ inputs, module: plateGirderConfig.sessionName, moduleConfig: plateGirderConfig });

  it("shows the core's six tabs in its order, Girder Properties first", async () => {
    openGirder();
    await ready();
    expect(screen.getAllByTestId("pref-tab").map((tab) => tab.textContent)).toEqual([
      "Girder Properties",
      "Optimization",
      "Stiffeners",
      "Additional Girder Data",
      "Design",
      "Deflection",
    ]);
    expect(syncs()[0].body.module_id).toBe(KEY_DISP_PLATE_GIRDER_WELDED);
    expect(shownIn(KEY_DISP_MATERIAL)).toBe(GRADE);
  });

  it("saves the girder material and the Optimisation and Design values, and no main-form value", async () => {
    const { spies } = openGirder();
    await ready();
    pick(KEY_DISP_MATERIAL, OTHER_GRADE);
    goTo("Optimization");
    pick(KEY_DISP_CLASS, "No");
    fireEvent.click(button("Save"));
    await waitFor(() => expect(operations()).toEqual(["open", "save"]));
    const { design_pref_draft: draft } = syncs()[1].body;
    expect(draft).toMatchObject({ [KEY_SEC_MATERIAL]: OTHER_GRADE, [KEY_ALLOW_CLASS]: "No", [KEY_EFFECTIVE_AREA_PARA]: "1.0" });
    for (const key of [KEY_STR_TYPE, KEY_LOAD, KEY_IntermediateStiffener, KEY_MAX_DEFL]) expect(draft).not.toHaveProperty(key);
    await waitFor(() => expect(spies.setDesignPrefModalStatus).toHaveBeenCalledWith(false));
    const stored = lastOverrides(spies);
    expect(stored).toMatchObject({ girder_material: OTHER_GRADE, allowable_class: "No" });
    for (const field of ["structure_type", "loading_condition", "intermediate_stiffener", "symmetry"]) {
      expect(stored).not.toHaveProperty(field);
    }
  });

  it("shows the section properties the sync answers for the girder", async () => {
    server.fail = (url, body) => ({
      ...answer(url, body),
      section_details: { supporting: { Mass: "411.34", Zpz: "25082000.0" }, supported: {}, connector: {} },
    });
    openGirder();
    await ready();
    expect(textInputOf("Mass, M").value).toBe("411.34");
    expect(textInputOf("Plastic Modulus, Zpz").value).toBe("25082000.0");
  });

  it("shows a main-form value the main form changed while the dialog is open", async () => {
    const { withInputs } = openGirder();
    await ready();
    goTo("Deflection");
    expect(shownIn(KEY_DISP_STR_TYPE)).toBe("Highway Bridge");
    withInputs(girderDock({ structure_type: "Other Building", member_options: "Floor and roof" }));
    await waitFor(() => expect(shownIn(KEY_DISP_STR_TYPE)).toBe("Other Building"));
    expect(shownIn(KEY_DISP_MEMBER_OPTIONS)).toBe("Floor and roof");
  });
});
