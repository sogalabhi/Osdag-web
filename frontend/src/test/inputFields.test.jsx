// @vitest-environment jsdom
/**
 * Fields of `InputSection` that the real configs rely on: the section profile list (and what choosing a
 * profile does to the designation, the location and the picture), the dynamic dropdown, pictures that
 * follow the inputs (profile, end conditions, connectivity, end plate type), and the keys of the two angle
 * lists of the seated angle connection. Each test renders a section of a real config.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useCallback, useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../modules/shared/components/CustomMaterialModal", () => ({ default: () => null }));

import { ModuleContext } from "../context/ModuleState";
import { InputSection } from "../modules/shared/components/InputSection";
import { axiallyLoadedColumnConfig } from "../modules/compressionMember/configs/axiallyLoadedColumnConfig";
import { strutsBoltedConfig } from "../modules/compressionMember/configs/strutsBoltedConfig";
import { strutsWeldedConfig } from "../modules/compressionMember/configs/strutsWeldedConfig";
import { boltedToEndConfig } from "../modules/TensionMembers/BoltedToEnd/configs/boltedToEndConfig";
import { weldedToEndConfig } from "../modules/TensionMembers/WeldedToEnd/configs/weldedToEndConfig";
import { beamToColumnEndPlateConfig } from "../modules/beamToColumnEndPlate/configs/beamToColumnEndPlateConfig";
import { beamBeamEndPlateConfig } from "../modules/beamBeamEndPlate/configs/beamBeamEndPlateConfig";
import { seatedAngleConfig } from "../modules/shearConnection/seatAngle/configs/seatedAngleConfig";
import { finPlateConfig } from "../modules/shearConnection/finPlate/configs/finPlateConfig";
import { cleatAngleConfig } from "../modules/shearConnection/cleatAngle/configs/cleatAngleConfig";
import { endPlateConfig } from "../modules/shearConnection/endPlate/configs/endPlateConfig";
import { CONN_CFBW, CONN_CWBW, KEY_END1, KEY_END2 } from "../constants/generated/coreKeys";
import { LISTS } from "./cases/shared";

import FIXED_FIXED from "../assets/CompressionMember/RRRRstrut.png";
import FIXED_HINGED from "../assets/CompressionMember/RFRFstrut.png";
import HINGED_FIXED from "../assets/CompressionMember/RRRFstrut.png";
import STRUT_ANGLES from "../assets/CompressionMember/bA.png";
import STRUT_CHANNELS from "../assets/CompressionMember/bC.png";
import STRUT_STAR_ANGLES from "../assets/CompressionMember/bSA.png";
import COLUMN_FIXED_FIXED from "../assets/CompressionMember/6.RRRR.PNG";
import COLUMN_HINGED_HINGED from "../assets/CompressionMember/3.RFRF.PNG";
import FLUSH from "../assets/flush_ep.png";
import ONE_WAY from "../assets/owe_ep.png";
import BOTH_WAYS from "../assets/extended.png";
import BC_CF_FLUSH from "../assets/BC_CF-BW-Flush.png";
import BC_CF_ONE_WAY from "../assets/BC_CF-BW-EOW.png";
import BC_CF_BOTH_WAYS from "../assets/BC_CF-BW-EBW.png";
import BC_CW_FLUSH from "../assets/BC_CW-BW-Flush.png";
import BC_CW_ONE_WAY from "../assets/BC_CW-BW-EOW.png";
import BC_CW_BOTH_WAYS from "../assets/BC_CW-BW-EBW.png";
import FIN_CFBW from "../assets/ShearConnection/sc_fin_plate/fin_cf_bw.png";
import FIN_CWBW from "../assets/ShearConnection/sc_fin_plate/fin_cw_bw.png";
import FIN_BEAM_BEAM from "../assets/ShearConnection/sc_fin_plate/fin_beam_beam.png";

const PROFILES = ["Angles", "Back to Back Angles", "Star Angles", "Channels", "Back to Back Channels"];
const DATA = { ...LISTS, sectionProfileList: PROFILES, connectivityList: [CONN_CFBW, CONN_CWBW, "Beam-Beam"] };

/** Holds the form state the way the module does and shows it. */
function Host({ section, inputs: initialInputs = {}, extra = {}, selection = {}, contextData = DATA, spies = {} }) {
  const [inputs, setInputsState] = useState(initialInputs);
  const [extraState, setExtraState] = useState(extra);
  const [selectionStates, setSelectionStates] = useState(selection);
  const setInputs = useCallback((next) => setInputsState((prev) => (typeof next === "function" ? next(prev) : next)), []);
  const setExtra = useCallback((next) => setExtraState((prev) => (typeof next === "function" ? next(prev) : next)), []);
  const updateSelectionState = useCallback(
    (key, value) => {
      spies.updateSelectionState?.(key, value);
      setSelectionStates((prev) => ({ ...prev, [key]: value }));
    },
    [spies],
  );
  return (
    <ModuleContext.Provider value={{ materialList: [] }}>
      <InputSection
        section={section}
        inputs={inputs}
        setInputs={setInputs}
        isInputLocked={false}
        selectionStates={selectionStates}
        updateSelectionState={updateSelectionState}
        updateModalState={spies.updateModalState ?? (() => {})}
        toggleAllSelected={() => {}}
        contextData={contextData}
        extraState={extraState}
        setExtraState={setExtra}
        updateSelectedItems={() => {}}
        setModalDynamicSrc={() => {}}
        onRefetchModuleOptions={() => {}}
      />
      <output data-testid="inputs">{JSON.stringify(inputs)}</output>
      <output data-testid="extra">{JSON.stringify(extraState)}</output>
    </ModuleContext.Provider>
  );
}

const sectionWith = (config, key) => {
  const section = config.inputSections.find((candidate) => candidate.fields.some((field) => field.key === key));
  if (!section) throw new Error(`no section has a field "${key}"`);
  return section;
};

async function show(config, key, props = {}) {
  const view = render(<Host section={sectionWith(config, key)} {...props} />);
  await act(async () => {});
  return view;
}

const inputsNow = () => JSON.parse(screen.getByTestId("inputs").textContent);
const extraNow = () => JSON.parse(screen.getByTestId("extra").textContent);
const pictures = () => screen.queryAllByAltText("Connection type").map((img) => img.getAttribute("src"));
const picture = () => {
  const all = pictures();
  expect(all).toHaveLength(1);
  return all[0];
};

const rowOf = (text) => {
  const heading = screen.getAllByRole("heading", { level: 4 }).find((h) => h.textContent.replace(/\s*\*$/, "") === text);
  if (!heading) throw new Error(`no field labelled "${text}"`);
  return heading.parentElement;
};
const controlOf = (text) => rowOf(text).querySelector(".react-select__control");
const shown = (text) => rowOf(text).querySelector(".react-select__single-value")?.textContent;
const openMenu = (text) => fireEvent.mouseDown(controlOf(text).querySelector("input") ?? controlOf(text));
const menuOptions = () => [...document.body.querySelectorAll(".react-select__option")].map((option) => option.textContent);
function optionsOf(text) {
  openMenu(text);
  const options = menuOptions();
  fireEvent.keyDown(controlOf(text), { key: "Escape" });
  return options;
}
function pick(text, option) {
  openMenu(text);
  const element = [...document.body.querySelectorAll(".react-select__option")].find((candidate) => candidate.textContent === option);
  if (!element) throw new Error(`"${text}" has no option "${option}": ${JSON.stringify(menuOptions())}`);
  fireEvent.click(element);
}

describe.each([
  ["struts, bolted", strutsBoltedConfig],
  ["struts, welded", strutsWeldedConfig],
  ["tension member, bolted", boltedToEndConfig],
  ["tension member, welded", weldedToEndConfig],
])("the section profile of %s", (_name, config) => {
  it("offers the profiles of the module data and shows the one held", async () => {
    await show(config, "section_profile", { inputs: { section_profile: "Channels" } });
    expect(shown("Section Profile")).toBe("Channels");
    expect(optionsOf("Section Profile")).toEqual(PROFILES);
  });

  it("writes the profile, empties the designation list and sets the connection location", async () => {
    await show(config, "section_profile", { inputs: { section_profile: "Angles", section_designation: ["50 x 50 x 6"], location: "Short Leg" } });
    pick("Section Profile", "Channels");
    expect(inputsNow()).toMatchObject({ section_profile: "Channels", section_designation: [], location: "Web" });
    expect(extraNow().selectedProfile).toBe("Channels");
  });

  it("goes back to the first location of the angle profiles", async () => {
    await show(config, "section_profile", { inputs: { section_profile: "Channels", section_designation: [], location: "Web" } });
    pick("Section Profile", "Angles");
    expect(inputsNow()).toMatchObject({ section_profile: "Angles", section_designation: [], location: "Long Leg" });
  });

  it("changes the location the dropdown offers with the profile", async () => {
    await show(config, "section_profile", { inputs: { section_profile: "Angles", location: "Long Leg" } });
    expect(optionsOf("Conn_Location")).toEqual(["Long Leg", "Short Leg"]);
    pick("Section Profile", "Channels");
    expect(optionsOf("Conn_Location")).toEqual(["Web"]);
    expect(shown("Conn_Location")).toBe("Web");
  });
});

describe("the profile picture of the struts", () => {
  it("shows the angle picture until a profile is chosen, then the picture of each choice", async () => {
    await show(strutsBoltedConfig, "section_profile", { inputs: { section_profile: "Angles" } });
    expect(picture()).toBe(STRUT_ANGLES);
    pick("Section Profile", "Channels");
    expect(picture()).toBe(STRUT_CHANNELS);
    pick("Section Profile", "Star Angles");
    expect(picture()).toBe(STRUT_STAR_ANGLES);
  });
});

describe("a dynamic dropdown", () => {
  const inputs = { end_condition_1: "Fixed", end_condition_2: "Fixed" };

  it("offers the options its config computes from the form, and writes the choice", async () => {
    await show(axiallyLoadedColumnConfig, "end_condition_2", { inputs });
    expect(shown("End 2")).toBe("Fixed");
    expect(optionsOf("End 2")).toEqual(["Fixed", "Free", "Hinged", "Roller"]);
    pick("End 2", "Roller");
    expect(inputsNow().end_condition_2).toBe("Roller");
    expect(shown("End 2")).toBe("Roller");
  });

  it("follows the field it depends on", async () => {
    await show(axiallyLoadedColumnConfig, "end_condition_2", { inputs });
    pick("End 1", "Hinged");
    expect(optionsOf("End 2")).toEqual(["Fixed", "Hinged", "Roller"]);
  });

  const ends = { contextData: { ...DATA, endConditionList: ["Fixed", "Free", "Hinged", "Roller"] } };
  const sentEnds = (formInputs) => {
    const payload = axiallyLoadedColumnConfig.buildSubmissionParams(formInputs, {}, {});
    return { end1: payload[KEY_END1], end2: payload[KEY_END2] };
  };

  it.each([
    ["Free", "Free", "Fixed", ["Fixed"]],
    ["Roller", "Free", "Fixed", ["Fixed", "Hinged"]],
    ["Hinged", "Free", "Fixed", ["Fixed", "Hinged", "Roller"]],
  ])("replaces a stale End 2 when End 1 becomes %s (End 2 was %s)", async (end1, staleEnd2, expectedEnd2, options) => {
    await show(axiallyLoadedColumnConfig, "end_condition_2", { ...ends, inputs: { end_condition_1: "Fixed", end_condition_2: staleEnd2 } });
    expect(shown("End 2")).toBe(staleEnd2);
    pick("End 1", end1);
    expect(optionsOf("End 2")).toEqual(options);
    expect(shown("End 2")).toBe(expectedEnd2);
    expect(inputsNow().end_condition_2).toBe(expectedEnd2);
    expect(sentEnds(inputsNow())).toEqual({ end1, end2: expectedEnd2 });
  });

  it("takes the first option of the new list when the user changes End 1, even if End 2 is still allowed", async () => {
    await show(axiallyLoadedColumnConfig, "end_condition_2", { ...ends, inputs: { end_condition_1: "Fixed", end_condition_2: "Hinged" } });
    pick("End 1", "Roller");
    expect(shown("End 2")).toBe("Fixed");
    expect(sentEnds(inputsNow())).toEqual({ end1: "Roller", end2: "Fixed" });
  });

  it("keeps a loaded End 2 that is valid for its End 1", async () => {
    await show(axiallyLoadedColumnConfig, "end_condition_2", { ...ends, inputs: { end_condition_1: "Roller", end_condition_2: "Hinged" } });
    expect(shown("End 2")).toBe("Hinged");
    expect(inputsNow().end_condition_2).toBe("Hinged");
  });

  it("applies the same rule to the y-y pair", async () => {
    await show(axiallyLoadedColumnConfig, "end_condition_2_y", {
      ...ends,
      inputs: { end_condition_1_y: "Fixed", end_condition_2_y: "Roller" },
    });
    pick("End 1 (y-y)", "Free");
    expect(shown("End 2 (y-y)")).toBe("Fixed");
    expect(inputsNow().end_condition_2_y).toBe("Fixed");
  });

  it("takes the first option when the stored value is missing and empties when there are no options", async () => {
    await show(axiallyLoadedColumnConfig, "end_condition_2", { inputs: { end_condition_1: "Roller" } });
    expect(inputsNow().end_condition_2).toBe("Fixed");
    expect(shown("End 2")).toBe("Fixed");
    const section = { title: "T", fields: [{ key: "x", label: "X", type: "dynamicSelect", getOptions: () => [] }] };
    render(<Host section={section} inputs={{ x: "Old" }} />);
    await act(async () => {});
    expect(screen.getAllByTestId("inputs").at(-1).textContent).toBe(JSON.stringify({ x: "" }));
  });
});

describe("the end condition pictures", () => {
  it.each([
    ["struts, bolted", strutsBoltedConfig],
    ["struts, welded", strutsWeldedConfig],
  ])("of %s follow both end conditions", async (_name, config) => {
    await show(config, "end_condition_1", { inputs: { end_condition_1: "Fixed", end_condition_2: "Fixed" } });
    expect(picture()).toBe(FIXED_FIXED);
    pick("End 2 Condition", "Hinged");
    expect(picture()).toBe(FIXED_HINGED);
    pick("End 1 Condition", "Hinged");
    pick("End 2 Condition", "Fixed");
    expect(picture()).toBe(HINGED_FIXED);
  });

  it("of the struts start on the first option of each end condition when the form is empty", async () => {
    await show(strutsBoltedConfig, "end_condition_1", { inputs: {} });
    expect(inputsNow()).toMatchObject({ end_condition_1: "Fixed", end_condition_2: "Fixed" });
    expect(picture()).toBe(FIXED_FIXED);
  });

  const columnInputs = { end_condition_1: "Fixed", end_condition_2: "Fixed", end_condition_1_y: "Hinged", end_condition_2_y: "Hinged" };

  it("of the axially loaded column follow the z-z pair of ends", async () => {
    await show(axiallyLoadedColumnConfig, "end_condition_1", { inputs: columnInputs });
    expect(picture()).toBe(COLUMN_FIXED_FIXED);
    pick("End 1", "Hinged");
    pick("End 2", "Hinged");
    expect(picture()).toBe(COLUMN_HINGED_HINGED);
  });

  it("of the axially loaded column follow the y-y pair of ends", async () => {
    await show(axiallyLoadedColumnConfig, "end_condition_1_y", { inputs: columnInputs });
    expect(picture()).toBe(COLUMN_HINGED_HINGED);
    pick("End 1 (y-y)", "Fixed");
    pick("End 2 (y-y)", "Fixed");
    expect(picture()).toBe(COLUMN_FIXED_FIXED);
  });
});

describe.each([
  ["fin plate", finPlateConfig],
  ["cleat angle", cleatAngleConfig],
  ["seated angle", seatedAngleConfig],
  ["end plate", endPlateConfig],
])("the connectivity picture of the %s connection", (_name, config) => {
  it.each([
    [CONN_CFBW, FIN_CFBW],
    [CONN_CWBW, FIN_CWBW],
    ["Beam-Beam", FIN_BEAM_BEAM],
  ])("of %s is its own picture", async (connectivity, expected) => {
    await show(config, "connectivity", { inputs: { connectivity } });
    expect(picture()).toBe(expected);
  });

  it("changes when another connectivity is chosen", async () => {
    await show(config, "connectivity", { inputs: { connectivity: CONN_CFBW } });
    pick("Connectivity", "Beam-Beam");
    expect(picture()).toBe(FIN_BEAM_BEAM);
  });
});

describe("the fields that depend on the connectivity", () => {
  const section = sectionWith(finPlateConfig, "column_section");
  const labels = () => screen.queryAllByRole("heading", { level: 4 }).map((h) => h.textContent.replace(/\s*\*$/, ""));

  it("show the column and beam sections for a column connectivity and the two beams for Beam-Beam", async () => {
    const { unmount } = render(<Host section={section} inputs={{ connectivity: CONN_CFBW }} />);
    await act(async () => {});
    expect(labels()).toEqual(expect.arrayContaining(["Column Section", "Beam Section"]));
    expect(labels()).not.toContain("Primary Beam Section");
    unmount();
    render(<Host section={section} inputs={{ connectivity: "Beam-Beam" }} />);
    await act(async () => {});
    expect(labels()).toEqual(expect.arrayContaining(["Primary Beam Section", "Secondary Beam Section"]));
    expect(labels()).not.toContain("Column Section");
  });
});

describe("the end plate type default", () => {
  it.each([
    ["beam-to-column", beamToColumnEndPlateConfig],
    ["beam-to-beam", beamBeamEndPlateConfig],
  ])("of the %s end plate is the first type of the list", async (_name, config) => {
    await show(config, "endPlateType", { inputs: {} });
    expect(inputsNow().endPlateType).toBe("Flushed - Reversible Moment");
  });
});

describe("the end plate picture", () => {
  const TYPES = ["Flushed - Reversible Moment", "Extended One Way - Irreversible Moment", "Extended Both Ways - Reversible Moment"];

  it.each([
    [CONN_CFBW, [BC_CF_FLUSH, BC_CF_ONE_WAY, BC_CF_BOTH_WAYS]],
    [CONN_CWBW, [BC_CW_FLUSH, BC_CW_ONE_WAY, BC_CW_BOTH_WAYS]],
  ])("of a beam-to-column end plate on %s follows the end plate type", async (connectivity, pics) => {
    await show(beamToColumnEndPlateConfig, "endPlateType", { inputs: { connectivity, endPlateType: TYPES[0] } });
    expect(picture()).toBe(pics[0]);
    pick("End Plate Type", TYPES[1]);
    expect(picture()).toBe(pics[1]);
    pick("End Plate Type", TYPES[2]);
    expect(picture()).toBe(pics[2]);
  });

  it("of a beam-to-column end plate changes with the connectivity", async () => {
    await show(beamToColumnEndPlateConfig, "endPlateType", { inputs: { connectivity: CONN_CFBW, endPlateType: TYPES[0] } });
    expect(picture()).toBe(BC_CF_FLUSH);
    pick("Connectivity", CONN_CWBW);
    expect(picture()).toBe(BC_CW_FLUSH);
  });

  it("of a beam-to-beam end plate follows the end plate type", async () => {
    await show(beamBeamEndPlateConfig, "endPlateType", { inputs: { endPlateType: TYPES[0] } });
    expect(picture()).toBe(FLUSH);
    pick("End Plate Type", TYPES[1]);
    expect(picture()).toBe(ONE_WAY);
    pick("End Plate Type", TYPES[2]);
    expect(picture()).toBe(BOTH_WAYS);
  });
});

describe("the two angle lists of the seated angle connection", () => {
  const ANGLES = LISTS.angleList;
  const fields = () => {
    const section = sectionWith(seatedAngleConfig, "topangle_list");
    return { angle: section.fields.find((f) => f.key === "angle_list"), top: section.fields.find((f) => f.key === "topangle_list") };
  };

  it("each have their own selection state and dialog", () => {
    const { angle, top } = fields();
    expect(top.selectionKey).not.toBe(angle.selectionKey);
    expect(top.modalKey).not.toBe(angle.modalKey);
  });

  it("each name a selection state and a dialog the module declares for them", () => {
    const { angle, top } = fields();
    for (const field of [angle, top]) {
      expect(seatedAngleConfig.selectionConfig.find((item) => item.key === field.selectionKey)?.inputKey).toBe(field.key);
      expect(seatedAngleConfig.modalConfig.find((item) => item.key === field.modalKey)?.inputKey).toBe(field.key);
    }
  });

  it("Customized on the Top Angle leaves the Angle list on All and opens only its own dialog", async () => {
    const { angle, top } = fields();
    const spies = { updateSelectionState: vi.fn(), updateModalState: vi.fn() };
    await show(seatedAngleConfig, "topangle_list", { inputs: { angle_list: ANGLES, topangle_list: ANGLES }, spies });
    expect(shown(angle.label)).toBe("All");
    expect(shown(top.label)).toBe("All");
    pick(top.label, "Customized");
    expect(shown(top.label)).toBe("Customized");
    expect(shown(angle.label)).toBe("All");
    expect(spies.updateSelectionState).toHaveBeenCalledWith("topAngleSelect", "Customized");
    expect(spies.updateSelectionState).not.toHaveBeenCalledWith("angleListSelect", expect.anything());
    expect(spies.updateModalState).toHaveBeenCalledWith("topAngle", true);
    expect(spies.updateModalState).not.toHaveBeenCalledWith("angleList", expect.anything());
  });

  it("Customized on the Angle list leaves the Top Angle on All", async () => {
    const { angle, top } = fields();
    await show(seatedAngleConfig, "angle_list", { inputs: { angle_list: ANGLES, topangle_list: ANGLES } });
    pick(angle.label, "Customized");
    expect(shown(angle.label)).toBe("Customized");
    expect(shown(top.label)).toBe("All");
  });
});
