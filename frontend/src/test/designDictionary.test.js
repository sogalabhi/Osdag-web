/**
 * `fromDesignDictionary`: a design dictionary (core key -> value) read into form state with a
 * module's declared `coreKeys`. The desktop examples are pinned in osiLoad.test.js; these cover
 * the rules on small configs.
 */
import { describe, expect, it } from "vitest";

import { fromDesignDictionary } from "../modules/shared/utils/designDictionary";

const config = {
  defaultInputs: { bolt_diameter: [], bolt_type: "Bearing_Bolt", bolt_tension_type: "Non Pre-tensioned", material: "E 250" },
  selectionConfig: [{ key: "boltDiameterSelect", inputKey: "bolt_diameter", defaultValue: "All" }],
  inputSections: [{ fields: [{ key: "bolt_type", options: [{ value: "Bearing_Bolt" }, { value: "Friction_Grip_Bolt" }] }] }],
  coreKeys: {
    bolt_diameter: "Bolt.Diameter",
    bolt_type: "Bolt.Type",
    bolt_tension_type: "Bolt.TensionType",
    beam_section: "Member.Supported_Section.Designation",
    secondary_beam: "Member.Supported_Section.Designation",
    connector_material: ["Connector.Material", "Material"],
    material: "Material",
    load_axial: ["Load.Axial", "Load.Axial_Compression"],
    ui_only: null,
  },
};
const LISTS = { boltDiameterList: ["12", "16", "20"], materialList: [{ Grade: "E 250" }, { Grade: "E 300" }] };

describe("fromDesignDictionary", () => {
  it("fills every field that declares a key, and drops keys nobody declares", () => {
    const { inputs } = fromDesignDictionary(config, {
      "Member.Supported_Section.Designation": " MB 300 ", "Load.Axial_Compression": "100", "out_titles_status": "1", "Foo.Bar": "x",
    }, LISTS);
    expect(inputs.beam_section).toBe("MB 300");
    expect(inputs.secondary_beam).toBe("MB 300");
    expect(inputs.load_axial).toBe("100");
    expect(inputs).not.toHaveProperty("out_titles_status");
    expect(inputs).not.toHaveProperty("foo_bar");
  });

  it("lets the more specific material key win", () => {
    const { inputs } = fromDesignDictionary(config, { "Connector.Material": "E 300", Material: "E 250" }, LISTS);
    expect(inputs.connector_material).toBe("E 300");
  });

  it("drops the keys no field declares, the module name stamp and web field names; no overrides come back", () => {
    const skipped = { ...config, computedCoreKeys: ["Deflection.Max"], notLoadedFromDictionary: ["beam_section"] };
    const { inputs, designPrefOverrides } = fromDesignDictionary(skipped, {
      Module: "Fin Plate Connection", "OsdagWeb.Version": "1.0", out_titles_status: "1", bolt_diameter: ["12"],
      "Deflection.Max": "1", "Member.Supported_Section.Designation": "MB 300", "Bolt.Material_Grade_OverWrite": "410",
    }, LISTS);
    expect(designPrefOverrides).toEqual({});
    expect(inputs.bolt_diameter).toEqual([]);
    expect(inputs).not.toHaveProperty("bolt_grade");
  });

  it("detects 'All' by comparing a list with the full option list", () => {
    const all = fromDesignDictionary(config, { "Bolt.Diameter": ["12", "16", "20"] }, LISTS);
    expect(all.allSelected).toEqual({ bolt_diameter: true });
    expect(all.selectionStates).toEqual({ boltDiameterSelect: "All" });
    expect(all.selectedItems).toEqual({ bolt_diameter: [] });

    const some = fromDesignDictionary(config, { "Bolt.Diameter": ["16"] }, LISTS);
    expect(some.allSelected).toEqual({ bolt_diameter: false });
    expect(some.selectionStates).toEqual({ boltDiameterSelect: "Customized" });
    expect(some.selectedItems).toEqual({ bolt_diameter: ["16"] });
    expect(some.inputs.bolt_diameter).toEqual(["16"]);
  });

  it("maps the desktop spellings of a few values to the web options", () => {
    const { inputs } = fromDesignDictionary(config, {
      "Bolt.Type": "Friction Grip Bolt", "Bolt.TensionType": "Pretensioned", Material: "E 300 (Fe 440)",
    }, LISTS);
    expect(inputs.bolt_type).toBe("Friction_Grip_Bolt");
    expect(inputs.bolt_tension_type).toBe("Pre-tensioned");
    expect(inputs.material).toBe("E 300");
  });

  it("skips computedCoreKeys and notLoadedFromDictionary fields", () => {
    const skipped = { ...config, computedCoreKeys: ["Load.Axial"], notLoadedFromDictionary: ["beam_section"] };
    const { inputs } = fromDesignDictionary(skipped, {
      "Load.Axial": "1", "Load.Axial_Compression": "2", "Member.Supported_Section.Designation": "MB 300",
    }, LISTS);
    expect(inputs.load_axial).toBe("2");
    expect(inputs).not.toHaveProperty("beam_section");
    expect(inputs.secondary_beam).toBe("MB 300");
  });

  it("sets the option dropdown and the section profile image state", () => {
    const withImage = {
      ...config,
      coreKeys: { ...config.coreKeys, connectivity: "Connectivity", section_profile: "Member.Profile" },
      getSectionImage: (profile) => `img:${profile}`,
    };
    const { extraState, inputs } = fromDesignDictionary(withImage, { Connectivity: "Beam-Beam", "Member.Profile": "Channels" }, LISTS);
    expect(extraState).toEqual({ selectedOption: "Beam-Beam", selectedProfile: "Channels", imageSource: "img:Channels" });
    expect(inputs.location).toBe("Web");
  });
});
