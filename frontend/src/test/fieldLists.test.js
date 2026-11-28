import { describe, expect, it } from "vitest";
import { applyFieldLists } from "../modules/shared/utils/fieldLists";
import { seatedAngleConfig } from "../modules/shearConnection/seatAngle/configs/seatedAngleConfig";
import { plateGirderConfig } from "../modules/flexuralMember/plateGirder/configs/plateGirderConfig";
import { MODULES } from "./cases";

const customizable = (config) =>
  config.inputSections.flatMap((section) => section.fields).filter((field) => field.selectionKey || field.modalKey);

describe("lists derived from the input fields", () => {
  it("builds the selection, modal and list entries of a config from its fields", () => {
    const config = applyFieldLists({
      inputSections: [
        {
          fields: [
            { key: "bolt_diameter", selectionKey: "boltSelect", modalKey: "boltModal", dataSource: "boltDiameterList" },
            { key: "section_designation", selectionKey: "sectionSelect", modalKey: "sectionModal" },
            { key: "material" },
          ],
        },
      ],
    });
    expect(config.selectionConfig).toEqual([
      { key: "boltSelect", inputKey: "bolt_diameter", defaultValue: "All" },
      { key: "sectionSelect", inputKey: "section_designation", defaultValue: "All" },
    ]);
    expect(config.modalConfig).toEqual([
      { key: "boltModal", inputKey: "bolt_diameter", dataSource: "boltDiameterList" },
      { key: "sectionModal", inputKey: "section_designation", dataSource: null },
    ]);
    expect(config.inputKeyToList).toEqual({ bolt_diameter: "boltDiameterList" });
  });

  it("adds the extra selections a module names after the ones its fields declare", () => {
    const config = applyFieldLists({ inputSections: [] }, { extraSelections: [{ key: "xSelect", inputKey: "x" }] });
    expect(config.selectionConfig).toEqual([{ key: "xSelect", inputKey: "x", defaultValue: "All" }]);
  });

  describe.each(MODULES.map((module) => [module.name, module.config]))("%s", (_name, config) => {
    it("has a selection and a dialog for every customizable field", () => {
      const fields = customizable(config);
      for (const field of fields) {
        expect(field.selectionKey, `${field.key} selectionKey`).toBeTruthy();
        expect(field.modalKey, `${field.key} modalKey`).toBeTruthy();
        expect(config.selectionConfig).toContainEqual({ key: field.selectionKey, inputKey: field.key, defaultValue: "All" });
        expect(config.modalConfig.find((modal) => modal.key === field.modalKey)?.inputKey).toBe(field.key);
      }
    });

    it("names the list of every customizable field that has a data source", () => {
      for (const field of customizable(config)) {
        if (field.dataSource && field.autoFill !== false) expect(config.inputKeyToList[field.key]).toBe(field.dataSource);
        else expect(config.inputKeyToList[field.key]).toBeUndefined();
      }
    });
  });

  it("keeps the selection of the secondary beam, which no field of the seated angle form declares", () => {
    expect(seatedAngleConfig.selectionConfig).toContainEqual({ key: "secondaryBeamSelect", inputKey: "secondary_beam", defaultValue: "All" });
    expect(customizable(seatedAngleConfig).some((field) => field.key === "secondary_beam")).toBe(false);
  });

  it("does not fill an empty All of the plate girder stiffener thickness lists", () => {
    expect(plateGirderConfig.inputKeyToList.intermediate_stiffener_thickness_val).toBeUndefined();
    expect(plateGirderConfig.inputKeyToList.longitudinal_stiffener_thickness_val).toBeUndefined();
    expect(plateGirderConfig.inputKeyToList.web_thickness).toBe("thicknessList");
    const keys = plateGirderConfig.modalConfig.map((m) => m.key);
    expect(keys).toContain("intermediateStiffenerThicknessValues");
    expect(keys).toContain("longitudinalStiffenerThicknessValues");
  });
});
