// @vitest-environment jsdom
/**
 * The plate girder's own Additional Inputs tabs (`PlateGirderPrefTabs.jsx`): what each shows, which rows the dialog
 * holds (girder material, Optimisation values) and which it only shows from the main form, read only and in the
 * core's spelling, with the core's options (`plateGirderPrefOptions.js`, checked against the core by
 * backend/apps/core/tests/test_plate_girder_pref_options.py).
 *
 * The values used are made up for the test and never compared with the module's defaults.
 */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  KEY_DISP_CLASS,
  KEY_DISP_DESIGN_LOAD,
  KEY_DISP_EFFECTIVE_AREA_PARA,
  KEY_DISP_FU,
  KEY_DISP_FY,
  KEY_DISP_IntermediateStiffener,
  KEY_DISP_IntermediateStiffener_spacing,
  KEY_DISP_IntermediateStiffener_thickness,
  KEY_DISP_IS_IT_SYMMETRIC,
  KEY_DISP_LOAD,
  KEY_DISP_LongitudnalStiffener,
  KEY_DISP_LongitudnalStiffener_thickness,
  KEY_DISP_MATERIAL,
  KEY_DISP_MAX_DEFL,
  KEY_DISP_MEMBER_OPTIONS,
  KEY_DISP_OVERALL_DEPTH_PG,
  KEY_DISP_STR_TYPE,
  KEY_DISP_SUPPORTING_OPTIONS,
  KEY_DISP_SYM,
  KEY_DISP_UNSYM,
  KEY_DISP_WEB_THICKNESS_PG,
  KEY_DISPP_LENGTH_OVERWRITE,
  KEY_ShearBuckling,
} from "../constants/generated/coreKeys";
import {
  AdditionalGirderDataTab,
  DeflectionTab,
  GirderOptimisationTab,
  GirderPropertiesTab,
  StiffenersTab,
} from "../modules/flexuralMember/plateGirder/components/PlateGirderPrefTabs";
import { plateGirderConfig } from "../modules/flexuralMember/plateGirder/configs/plateGirderConfig";
import {
  PG_ALLOW_CLASS_OPTIONS,
  PLATE_GIRDER_DOCK_FIELDS,
  PLATE_GIRDER_OPTIMISATION_DEFAULTS,
  calculateMaxDeflection,
  coreSpelling,
  memberOptionsFor,
  supportingOptionsFor,
} from "../modules/flexuralMember/plateGirder/configs/plateGirderPrefOptions";
import { getDesignPrefConfig } from "../modules/shared/config/designPrefModuleConfig";
import { PrefTabHost, isSelectDisabled, optionsOf, pick, prefsNow, rowLabels, shownIn, textInputOf } from "./componentHarness";

const texts = (options) => options.map((option) => option.text);
const MATERIALS = [
  { id: 1, Grade: "E 250 (Fe 410 W)A", Ultimate_Tensile_Stress: 410, Yield_Stress_less_than_20: 250, Yield_Stress_between_20_and_neg40: 240, Yield_Stress_greater_than_40: 230 },
  { id: 2, Grade: "E 350 (Fe 490)", Ultimate_Tensile_Stress: 490, Yield_Stress_less_than_20: 350, Yield_Stress_between_20_and_neg40: 330, Yield_Stress_greater_than_40: 320 },
];
const dock = (changes = {}) => ({ ...plateGirderConfig.defaultInputs, ...changes });
const SESSION = plateGirderConfig.sessionName;

describe("Girder Properties tab", () => {
  const show = (props = {}) =>
    render(
      <PrefTabHost
        Tab={GirderPropertiesTab}
        initial={{ girder_material: "E 250 (Fe 410 W)A" }}
        inputs={dock({ web_thickness: ["12"] })}
        materialList={MATERIALS}
        isInputLocked={false}
        {...props}
      />,
    );

  it("shows the girder material with the strengths the core reads for the web thickness", () => {
    show();
    expect(shownIn(KEY_DISP_MATERIAL)).toBe("E 250 (Fe 410 W)A");
    expect(textInputOf(KEY_DISP_FU).value).toBe("410");
    expect(textInputOf(KEY_DISP_FY).value).toBe("250"); // 12 mm web: below 20 mm
    expect(textInputOf(KEY_DISP_FU).readOnly).toBe(true);
    expect(textInputOf(KEY_DISP_FY).readOnly).toBe(true);
  });

  it("takes Fy of the 20-40 mm band for a thicker web", () => {
    show({ inputs: dock({ web_thickness: ["25"] }) });
    expect(textInputOf(KEY_DISP_FY).value).toBe("240");
  });

  it("writes a material back and shows its strengths", () => {
    show();
    expect(texts(optionsOf(KEY_DISP_MATERIAL))).toEqual(MATERIALS.map((m) => m.Grade));
    pick(KEY_DISP_MATERIAL, "E 350 (Fe 490)");
    expect(prefsNow()).toEqual({ girder_material: "E 350 (Fe 490)" });
    expect(textInputOf(KEY_DISP_FU).value).toBe("490");
  });

  it("shows the main form's dimensions read only", () => {
    show({ inputs: dock({ total_depth: "1111", web_thickness: ["14"] }) });
    expect(textInputOf(KEY_DISP_OVERALL_DEPTH_PG).value).toBe("1111");
    expect(textInputOf(KEY_DISP_WEB_THICKNESS_PG).value).toBe("14");
    expect(textInputOf(KEY_DISP_OVERALL_DEPTH_PG).readOnly).toBe(true);
  });

  it("changes nothing when the dialog is locked", () => {
    show({ isInputLocked: true });
    expect(isSelectDisabled(KEY_DISP_MATERIAL)).toBe(true);
  });
});

describe("Optimisation tab", () => {
  const initial = { allowable_class: "No", effective_area_parameter: "0.8", length_overwrite: "1.2" };
  const show = (props = {}) =>
    render(
      <PrefTabHost
        Tab={GirderOptimisationTab}
        initial={initial}
        inputs={dock({ loading_condition: "Destabilizing" })}
        isInputLocked={false}
        {...props}
      />,
    );

  it("lists the core's four rows", () => {
    show();
    expect(rowLabels()).toEqual([KEY_DISP_EFFECTIVE_AREA_PARA, KEY_DISP_CLASS, KEY_DISP_LOAD, KEY_DISPP_LENGTH_OVERWRITE]);
  });

  it("writes its own values back", () => {
    show();
    expect(texts(optionsOf(KEY_DISP_CLASS))).toEqual(PG_ALLOW_CLASS_OPTIONS);
    pick(KEY_DISP_CLASS, "Yes");
    fireEvent.change(textInputOf(KEY_DISP_EFFECTIVE_AREA_PARA), { target: { value: "0.9" } });
    fireEvent.change(textInputOf(KEY_DISPP_LENGTH_OVERWRITE), { target: { value: "NA" } });
    expect(prefsNow()).toEqual({ allowable_class: "Yes", effective_area_parameter: "0.9", length_overwrite: "NA" });
  });

  it("shows the main form's loading condition read only", () => {
    show();
    expect(shownIn(KEY_DISP_LOAD)).toBe("Destabilizing");
    expect(isSelectDisabled(KEY_DISP_LOAD)).toBe(true);
  });

  it("changes nothing when the dialog is locked", () => {
    show({ isInputLocked: true });
    expect(isSelectDisabled(KEY_DISP_CLASS)).toBe(true);
    expect(textInputOf(KEY_DISP_EFFECTIVE_AREA_PARA).disabled).toBe(true);
    expect(textInputOf(KEY_DISPP_LENGTH_OVERWRITE).disabled).toBe(true);
  });
});

describe("Stiffeners tab", () => {
  const show = (inputs) => render(<PrefTabHost Tab={StiffenersTab} initial={{}} inputs={inputs} isInputLocked={false} />);

  it("shows the main form's stiffener values read only, in the core's spelling", () => {
    show(dock({ intermediate_stiffener: "Yes", intermediate_stiffener_spacing: "1500", longitudinal_stiffener: "Yes and 1 stiffener" }));
    expect(shownIn(KEY_DISP_IntermediateStiffener)).toBe("Yes");
    expect(textInputOf(KEY_DISP_IntermediateStiffener_spacing).value).toBe("1500");
    expect(shownIn(KEY_DISP_LongitudnalStiffener)).toBe("Yes and 1 stiffener");
    // The main form says Standard; the core lists All (and reads anything but Customized as the standard list).
    expect(shownIn(KEY_DISP_IntermediateStiffener_thickness)).toBe("All");
    expect(shownIn(KEY_DISP_LongitudnalStiffener_thickness)).toBe("All");
    expect(shownIn(KEY_ShearBuckling.trim())).toBe("Simple Post Critical");
    for (const label of [KEY_DISP_IntermediateStiffener, KEY_DISP_LongitudnalStiffener, KEY_DISP_IntermediateStiffener_thickness, KEY_ShearBuckling.trim()]) {
      expect(isSelectDisabled(label), label).toBe(true);
    }
    expect(textInputOf(KEY_DISP_IntermediateStiffener_spacing).readOnly).toBe(true);
    expect(rowLabels().some((label) => label.includes("Values"))).toBe(false);
  });

  it("lists the customized thickness values the main form holds", () => {
    show(dock({ intermediate_stiffener_thickness: "Customized", intermediate_stiffener_thickness_val: ["10", "12"] }));
    expect(shownIn(KEY_DISP_IntermediateStiffener_thickness)).toBe("Customized");
    expect(textInputOf("Intermediate Stiffener Thickness Values").value).toBe("10, 12");
  });
});

describe("Additional Girder Data tab", () => {
  it.each([["Symmetrical", KEY_DISP_SYM], ["Unsymmetrical", KEY_DISP_UNSYM]])("shows %s as the core's %s, read only", (value, core) => {
    render(<PrefTabHost Tab={AdditionalGirderDataTab} initial={{}} inputs={dock({ symmetry: value })} />);
    expect(shownIn(KEY_DISP_IS_IT_SYMMETRIC)).toBe(core);
    expect(isSelectDisabled(KEY_DISP_IS_IT_SYMMETRIC)).toBe(true);
  });
});

describe("Deflection tab", () => {
  it("shows the main form's criteria read only and the maximum deflection they give", () => {
    const inputs = dock({ structure_type: "Other Building", design_load: "Live load", member_options: "Floor and roof", supporting_options: "Element susceptible to cracking" });
    render(<PrefTabHost Tab={DeflectionTab} initial={{}} inputs={inputs} />);
    expect(shownIn(KEY_DISP_STR_TYPE)).toBe("Other Building");
    expect(shownIn(KEY_DISP_DESIGN_LOAD)).toBe("Live load");
    expect(shownIn(KEY_DISP_MEMBER_OPTIONS)).toBe("Floor and roof");
    expect(shownIn(KEY_DISP_SUPPORTING_OPTIONS)).toBe("Element susceptible to cracking");
    expect(textInputOf(KEY_DISP_MAX_DEFL).value).toBe("Span/360");
    expect(textInputOf(KEY_DISP_MAX_DEFL).readOnly).toBe(true);
    for (const label of [KEY_DISP_STR_TYPE, KEY_DISP_DESIGN_LOAD, KEY_DISP_MEMBER_OPTIONS, KEY_DISP_SUPPORTING_OPTIONS]) {
      expect(isSelectDisabled(label), label).toBe(true);
    }
  });

  it("derives the maximum deflection as the core's max_defl_change does", () => {
    expect(calculateMaxDeflection("Highway Bridge", "Live load", "Simple Span", "Not Applicable")).toBe("Span/600");
    expect(calculateMaxDeflection("Railway Bridge", "Live load", "Cantilever Span", "Not Applicable")).toBe("Span/400");
    expect(calculateMaxDeflection("Railway Bridge", "Dead load", "Simple Span", "Not Applicable")).toBe("Span/800");
    expect(calculateMaxDeflection("Industrial Structure", "Live load", "Simple span", "Elastic cladding")).toBe("Span/240");
    expect(calculateMaxDeflection("Industrial Structure", "Dead load", "Simple span", "Elastic cladding")).toBe("NA");
    expect(calculateMaxDeflection("Industrial Structure", "Crane load(Electric operation over 50t)", "Gantry", "Crane")).toBe("Span/1000");
  });

  it("narrows the member and supporting options as the core does", () => {
    expect(memberOptionsFor("Other Building")).toEqual(["Floor and roof", "Cantilever"]);
    expect(supportingOptionsFor("Highway Bridge", "Simple Span")).toEqual(["Not Applicable"]);
    expect(supportingOptionsFor("Industrial Structure", "Rafter Supporting")).toEqual(["Profiled Metal sheeting", "Plastered sheeting"]);
  });
});

describe("the plate girder dialog state", () => {
  const prefConfig = getDesignPrefConfig(SESSION);

  it("holds the girder material and the Optimisation and Design values, never a main-form field", () => {
    const prefs = prefConfig.getInitialPrefs(dock({ material: "E 350 (Fe 490)", design_method: "Limit State Design" }), SESSION);
    expect(prefs).toEqual({ girder_material: "E 350 (Fe 490)", design_method: "Limit State Design", ...PLATE_GIRDER_OPTIMISATION_DEFAULTS });
    const mainForm = plateGirderConfig.inputSections.flatMap((section) => section.fields.map((field) => field.key));
    expect(Object.keys(prefs).filter((field) => mainForm.includes(field))).toEqual([]);
    // Every field a read-only row shows is a main-form field.
    for (const field of Object.values(PLATE_GIRDER_DOCK_FIELDS).flat()) expect(mainForm, field).toContain(field);
  });

  it("starts from a saved girder material and saved Optimisation values", () => {
    const saved = { girder_material: "E 250 (Fe 410 W)A", allowable_class: "No", effective_area_parameter: "0.7", length_overwrite: "1.1" };
    expect(prefConfig.getInitialPrefs(dock({ material: "E 350 (Fe 490)", ...saved }), SESSION)).toMatchObject(saved);
  });

  it("Defaults gives the core's Optimisation values over saved ones", () => {
    const answered = { girder_material: "E 350 (Fe 490)", design_method: "Limit State Design", allowable_class: "No" };
    expect(prefConfig.getDefaultPrefs(dock({ material: "E 350 (Fe 490)" }), SESSION, answered)).toEqual({
      girder_material: "E 350 (Fe 490)",
      design_method: "Limit State Design",
      ...PLATE_GIRDER_OPTIMISATION_DEFAULTS,
    });
  });

  it("spells two main-form values the core's way", () => {
    expect(coreSpelling("symmetry", "Symmetrical")).toBe(KEY_DISP_SYM);
    expect(coreSpelling("intermediate_stiffener_thickness", "Standard")).toBe("All");
    expect(coreSpelling("structure_type", "Other Building")).toBe("Other Building");
  });
});
