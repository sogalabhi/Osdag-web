// One test per module (every module in the registry; Purlin is hidden there and cannot be opened):
// the page loads with its defaults as a guest without errors, and the Design request the defaults
// send is the one committed in snapshots/ and agrees with the frontend's payload parity snapshot.
import { test, expect, expectClean } from '../lib/fixtures.mjs';
import { selectedModules, slugOf } from '../lib/modules.mjs';
import { clickDesign, openModule, readDock } from '../lib/app.mjs';
import { differences, parityEntriesFor } from '../lib/parity.mjs';
import { expectSnapshot } from '../lib/snapshots.mjs';
import { RACY_DEFAULT_KEYS, withoutRacyKeys } from '../lib/known-issues.mjs';

for (const module of selectedModules()) {
  test.describe(`module ${slugOf(module)}`, () => {
    test(`loads with its defaults as a guest [${module.id}]`, async ({ newPage }) => {
      const page = await newPage();
      await openModule(page, module);

      const rows = await readDock(page);
      expect(rows.length, 'the input dock has fields').toBeGreaterThan(0);
      await expect(page.getByText('Output Dock')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Additional Inputs', exact: true })).toBeEnabled();

      expect(page.watch.consoleErrors, 'console errors').toEqual([]);
      expectClean(page);
    });

    // The race behind RACY_DEFAULT_KEYS, run on request (E2E_RACE=1): it fails when it hits.
    if (RACY_DEFAULT_KEYS[module.id]) {
      test(`default Design request carries the dock Material in the Additional Inputs materials [${module.id}]`, async ({ newPage }) => {
        test.skip(process.env.E2E_RACE !== '1', 'intermittent app bug, see lib/known-issues.mjs (E2E_RACE=1 runs it)');
        const page = await newPage();
        await openModule(page, module);
        const request = await clickDesign(page);
        for (const key of RACY_DEFAULT_KEYS[module.id]) expect(request.body.inputs[key], key).toBe(request.body.inputs.Material);
      });
    }

    test(`default Design request [${module.id}]`, async ({ newPage }) => {
      const page = await newPage();
      await openModule(page, module);
      const request = await clickDesign(page);

      expect(request.status, 'the server accepts the default request').toBe(202);
      expect(request.body.inputs.Module, 'the request names the module').toBe(module.id);
      const racy = RACY_DEFAULT_KEYS[module.id] || [];
      expectSnapshot('default-design', slugOf(module), { url: request.url, body: withoutRacyKeys(module.id, request.body) });

      // The frontend's own payload parity snapshot (unit level, short sample lists) names the keys a
      // module sends for its defaults; the browser's real request must carry every one of them.
      // Value differences are listed in the report only (see lib/parity.mjs).
      const entries = parityEntriesFor(module.id);
      expect(entries.length, 'payloadParity.test.js.snap has an "all" entry for the module').toBeGreaterThan(0);
      const best = entries
        .map((entry) => ({ entry, diff: differences(request.body.inputs, entry.payload) }))
        .sort((a, b) => a.diff.missing.length - b.diff.missing.length || a.diff.valueDiffs.length - b.diff.valueDiffs.length)[0];
      for (const line of best.diff.valueDiffs) test.info().annotations.push({ type: 'parity value', description: line });
      expect(best.diff.missing.filter((line) => !racy.some((key) => line.startsWith(`${key}:`))), `keys of payload parity "${best.entry.name}" missing from the request`).toEqual([]);
    });
  });
}
