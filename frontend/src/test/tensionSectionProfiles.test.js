/**
 * Both tension member modules offer every section profile the core's Section Profile list has
 * (VALUES_SEC_PROFILE_2 in osdag_core/Common.py: Angles, Back to Back Angles, Star Angles,
 * Channels, Back to Back Channels), and Back to Back Channels works like Channels: a picture,
 * the Web connection location, the channel list, and the profile on the design request.
 * The list itself comes from the options endpoint (backend/apps/core/tests/test_tension_section_profiles.py).
 */
import { describe, expect, it } from "vitest";

import ErrorImg from "../assets/notSelected.png";
import { KEY_LOCATION, KEY_SECSIZE, KEY_SEC_PROFILE } from "../constants/generated/coreKeys";
import { boltedToEndConfig } from "../modules/TensionMembers/BoltedToEnd/configs/boltedToEndConfig";
import { weldedToEndConfig } from "../modules/TensionMembers/WeldedToEnd/configs/weldedToEndConfig";
import { loadStateFromOsi } from "../modules/shared/utils/osiLoader";
import examples from "./fixtures/osiExamples.json";
import { LISTS, allSelectedFor, designRequest, formRecorder } from "./cases/shared";

const BACK_TO_BACK_CHANNELS = "Back to Back Channels";

const cases = [
  { name: "bolted", config: boltedToEndConfig, example: "tension_b_bbchannel" },
  { name: "welded", config: weldedToEndConfig, example: "tension_w_bbchannels" },
];

for (const { name, config, example } of cases) {
  describe(`tension ${name}: ${BACK_TO_BACK_CHANNELS}`, () => {
    it("has its own picture, not the placeholder and not the Channels one", () => {
      const image = config.getSectionImage(BACK_TO_BACK_CHANNELS);
      expect(image).toBeTruthy();
      expect(image).not.toBe(ErrorImg);
      expect(image).not.toBe(config.getSectionImage("Channels"));
    });

    it("connects on the web and lists the channel sections", () => {
      expect(config.getLocationOptions(BACK_TO_BACK_CHANNELS)).toEqual([{ value: "Web", label: "Web" }]);
      expect(config.getDynamicSectionList(BACK_TO_BACK_CHANNELS, LISTS.angleList, LISTS.channelList)).toEqual(LISTS.channelList);
    });

    it("sends the profile, the web location and every channel when all are selected", () => {
      const inputs = { ...config.defaultInputs, section_profile: BACK_TO_BACK_CHANNELS, location: "Web", length: "1250" };
      const params = config.buildSubmissionParams(inputs, allSelectedFor(config, true), LISTS);
      expect(params[KEY_SEC_PROFILE]).toBe(BACK_TO_BACK_CHANNELS);
      expect(params[KEY_LOCATION]).toBe("Web");
      expect(params[KEY_SECSIZE]).toEqual(LISTS.channelList);
    });

    it("is kept when the desktop example for it is opened, and sent again on the design request", () => {
      const { payload } = examples[example];
      const { state, options } = formRecorder(config, LISTS);
      loadStateFromOsi(payload, options);
      expect(state.inputs.section_profile).toBe(BACK_TO_BACK_CHANNELS);
      expect(state.extraState.selectedProfile).toBe(BACK_TO_BACK_CHANNELS);
      const request = designRequest(config, state, LISTS);
      expect(request[KEY_SEC_PROFILE]).toBe(BACK_TO_BACK_CHANNELS);
      expect(request[KEY_LOCATION]).toBe("Web");
    });
  });
}
