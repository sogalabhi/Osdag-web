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
import { CONN_CFBW, CONN_CWBW } from "../constants/generated/coreKeys";
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

describe("the connectivity picture", () => {
  const section = { title: "Connecting Members", fields: [{ key: "connectivity", label: "Connectivity", type: "connectivitySelect" }] };

  it.each([
    [CONN_CFBW, FIN_CFBW],
    [CONN_CWBW, FIN_CWBW],
    ["Beam-Beam", FIN_BEAM_BEAM],
  ])("of %s is its own picture", async (connectivity, expected) => {
    render(<Host section={section} inputs={{ connectivity }} extra={{ selectedOption: connectivity }} />);
    await act(async () => {});
    expect(picture()).toBe(expected);
  });

  it("changes when another connectivity is chosen", async () => {
    render(<Host section={section} inputs={{ connectivity: CONN_CFBW }} extra={{ selectedOption: CONN_CFBW }} />);
    await act(async () => {});
    pick("Connectivity", "Beam-Beam");
    expect(picture()).toBe(FIN_BEAM_BEAM);
  });
});

describe("the end plate picture", () => {
  const TYPES = ["Flushed - Reversible Moment", "Extended One Way - Irreversible Moment", "Extended Both Ways - Reversible Moment"];

  it.each([
    [CONN_CFBW, [BC_CF_FLUSH, BC_CF_ONE_WAY, BC_CF_BOTH_WAYS]],
    [CONN_CWBW, [BC_CW_FLUSH, BC_CW_ONE_WAY, BC_CW_BOTH_WAYS]],
  ])("of a beam-to-column end plate on %s follows the end plate type", async (connectivity, pics) => {
    await show(beamToColumnEndPlateConfig, "endPlateType", { inputs: { connectivity, endPlateType: TYPES[0] }, extra: { selectedOption: TYPES[0] } });
    expect(picture()).toBe(pics[0]);
    pick("End Plate Type", TYPES[1]);
    expect(picture()).toBe(pics[1]);
    pick("End Plate Type", TYPES[2]);
    expect(picture()).toBe(pics[2]);
  });

  it("of a beam-to-column end plate changes with the connectivity", async () => {
    await show(beamToColumnEndPlateConfig, "endPlateType", { inputs: { connectivity: CONN_CFBW, endPlateType: TYPES[0] }, extra: { selectedOption: TYPES[0] } });
    expect(picture()).toBe(BC_CF_FLUSH);
    pick("Connectivity", CONN_CWBW);
    expect(picture()).toBe(BC_CW_FLUSH);
  });

  it("of a beam-to-beam end plate follows the end plate type", async () => {
    await show(beamBeamEndPlateConfig, "endPlateType", { inputs: { endPlateType: TYPES[0] }, extra: { selectedOption: TYPES[0] } });
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

  it("share one selection state and one dialog", () => {
    const { angle, top } = fields();
    expect(top.selectionKey).toBe(angle.selectionKey);
    expect(top.modalKey).toBe(angle.modalKey);
  });

  it("Customized on the Top Angle also switches the Angle list and opens the dialog of the Angle list", async () => {
    const { angle, top } = fields();
    const spies = { updateSelectionState: vi.fn(), updateModalState: vi.fn() };
    await show(seatedAngleConfig, "topangle_list", { inputs: { angle_list: ANGLES, topangle_list: ANGLES }, spies });
    expect(shown(angle.label)).toBe("All");
    expect(shown(top.label)).toBe("All");
    pick(top.label, "Customized");
    expect(shown(top.label)).toBe("Customized");
    expect(shown(angle.label)).toBe("Customized");
    expect(spies.updateSelectionState).toHaveBeenCalledWith("angleListSelect", "Customized");
    expect(spies.updateModalState).toHaveBeenCalledWith("angleList", true);
  });
});
