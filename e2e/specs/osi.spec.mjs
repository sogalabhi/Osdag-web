// .osi files: a saved file loads back to the same form and the same Design request, and the
// desktop's design examples load and send the request recorded in snapshots/examples/.
import path from 'node:path';
import { test, expect, expectClean } from '../lib/fixtures.mjs';
import { selectedModules, slugOf } from '../lib/modules.mjs';
import { clickDesign, clickDesignOrValidation, downloadOsi, loadOsi, openModule, readDock } from '../lib/app.mjs';
import { DESKTOP_NAMES, readExamples, selectedExamples } from '../lib/examples.mjs';
import { expectSnapshot } from '../lib/snapshots.mjs';
import { KNOWN_ROUND_TRIP_ROW_DIFFS } from '../lib/known-issues.mjs';

/** Moves the first plain numeric field of the dock by one, so the file does not hold the defaults. */
const changeFirstNumber = async (page) => {
  const fields = page.getByTestId('input-dock').locator('input[type="text"]:not([class*="react-select"])');
  const count = await fields.count();
  for (let index = 0; index < count; index += 1) {
    const field = fields.nth(index);
    const value = await field.inputValue();
    if (!(await field.isEditable()) || !/^\d+(\.\d+)?$/.test(value) || Number(value) < 1) continue;
    const to = String(Number(value) + 1);
    await field.fill(to);
    await expect(field).toHaveValue(to);
    return { from: value, to };
  }
  return null;
};

for (const module of selectedModules()) {
  test(`save and load round trip [${module.id}]`, async ({ newPage }, testInfo) => {
    const pageA = await newPage();
    await openModule(pageA, module);
    const change = await changeFirstNumber(pageA);
    const rowsBefore = await readDock(pageA);

    const saved = await downloadOsi(pageA);
    expect(saved.name).toMatch(/\.osi$/);
    const desktopName = Object.entries(DESKTOP_NAMES).find(([, id]) => id === module.id)?.[0];
    expect(saved.text, 'the file names the module (under the desktop name where it has another)').toMatch(new RegExp(`^Module: ${desktopName || module.id}$`, 'm'));
    const requestBefore = await clickDesign(pageA);
    expect(requestBefore.status).toBe(202);

    // A fresh page (fresh form) loads the file through File > Load Input.
    const pageB = await newPage();
    await openModule(pageB, module);
    expect(await loadOsi(pageB, saved.path)).toBe(200);
    const rowsAfter = await readDock(pageB);
    const requestAfter = await clickDesign(pageB);

    expect(requestAfter.body, 'the Design request is the same after loading the file').toEqual(requestBefore.body);
    const rowDiffs = rowsBefore.flatMap((row, index) => {
      const after = rowsAfter[index];
      return !after || after.label !== row.label || after.value !== row.value
        ? [`${row.label}: ${JSON.stringify(row.value)} -> ${after ? JSON.stringify(after.value) : 'missing'}`] : [];
    });
    expect(rowsAfter.length, 'the same number of fields').toBe(rowsBefore.length);
    expect(rowDiffs, 'fields that show another value after loading the file (known ones are listed in lib/known-issues.mjs)').toEqual(KNOWN_ROUND_TRIP_ROW_DIFFS[module.id] || []);
    testInfo.annotations.push({ type: 'changed', description: change ? `${change.from} -> ${change.to}` : 'no numeric field to change' });
    expectClean(pageA);
    expectClean(pageB);
  });
}

const examples = selectedExamples().filter((example) => selectedModules().includes(example.module));
for (const example of examples) {
  test(`design example ${example.name} [${example.module.id}]`, async ({ newPage }) => {
    const page = await newPage();
    await openModule(page, example.module);
    expect(await loadOsi(page, example.file)).toBe(200);
    const rows = await readDock(page);
    expect(rows.length).toBeGreaterThan(0);
    // The desktop ships some examples with empty loads: Design then refuses, and the message is what is recorded.
    const outcome = await clickDesignOrValidation(page);
    const name = `${slugOf(example.module)}__${path.basename(example.name, '.osi')}`;
    if (outcome.request) {
      expect(outcome.request.status, 'the server accepts the request an example sends').toBe(202);
      expect(outcome.request.body.inputs.Module).toBe(example.module.id);
      expectSnapshot('examples', name, { url: outcome.request.url, body: outcome.request.body });
    } else {
      expectSnapshot('examples', name, { validation: outcome.validation });
    }
    expectClean(page);
  });
}

test('every design example of the desktop either belongs to a web module or is listed as unsupported', () => {
  const unsupported = readExamples().filter((example) => !example.module).map((example) => `${example.name}: ${example.desktopModule}`);
  expectSnapshot('examples', '_unsupported', unsupported);
});
