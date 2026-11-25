/**
 * The Bolt tab of Additional Inputs shows and sends the core's spellings of the bolt tension type
 * (Bolt.TensionType): 'Pre-tensioned' and 'Non pre-tensioned' (lowercase p), the options of
 * `bolt_values` in osdag_core/design_type/main.py. The backend test
 * backend/apps/core/tests/test_bolt_tension_type_values.py checks them against the core.
 */
import { describe, expect, it } from "vitest";

import { KEY_DP_BOLT_TYPE } from "../constants/generated/coreKeys";
import { BOLT_NON_PRE_TENSIONED, BOLT_PRE_TENSIONED, BOLT_TENSION_TYPE_OPTIONS } from "../modules/shared/config/prefOptions";
import { fromDesignDictionary } from "../modules/shared/utils/designDictionary";
import { MODULES } from "./cases";
import { LISTS } from "./cases/shared";

describe("bolt tension type options are the core's spellings", () => {
  it("offers Pre-tensioned and Non pre-tensioned", () => {
    expect(BOLT_TENSION_TYPE_OPTIONS).toEqual(["Pre-tensioned", "Non pre-tensioned"]);
  });

  for (const { name, config } of MODULES) {
    if (!("bolt_tension_type" in config.defaultInputs)) continue;
    it(`${name}: the default is one of the options`, () => {
      expect(BOLT_TENSION_TYPE_OPTIONS).toContain(config.defaultInputs.bolt_tension_type);
    });
  }
});

describe("an .osi spelling of the bolt tension type opens as the core's spelling", () => {
  const config = {
    defaultInputs: { bolt_tension_type: BOLT_PRE_TENSIONED },
    coreKeys: { bolt_tension_type: KEY_DP_BOLT_TYPE },
  };
  const opened = (value) => fromDesignDictionary(config, { [KEY_DP_BOLT_TYPE]: value }, LISTS).inputs.bolt_tension_type;

  it.each(["Non pre-tensioned", "Non Pre-tensioned", "Non-pretensioned", "Nonpretensioned"])("%s", (value) => {
    expect(opened(value)).toBe(BOLT_NON_PRE_TENSIONED);
  });

  it.each(["Pre-tensioned", "Pretensioned"])("%s", (value) => {
    expect(opened(value)).toBe(BOLT_PRE_TENSIONED);
  });
});
