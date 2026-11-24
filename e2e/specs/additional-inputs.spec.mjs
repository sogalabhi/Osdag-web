// Additional Inputs (design preferences) on every module: Save without changes, dock Material
// followed by the dialog's material rows, one change per tab then Defaults, each saved.
import { test, expect, expectClean } from '../lib/fixtures.mjs';
import { selectedModules, slugOf } from '../lib/modules.mjs';
import { changeDockSelect, openModule } from '../lib/app.mjs';
import { changeOneValue, openPrefs, readAllTabs, readTab, saveAndExpectClosed, selectTab } from '../lib/prefs.mjs';
import { dockMaterialTargets } from '../lib/prefTables.mjs';
import { KNOWN_LOST_CHANGES, RACY_DEFAULT_KEYS } from '../lib/known-issues.mjs';
import { expectSnapshot } from '../lib/snapshots.mjs';

const strip = (tabs) => tabs.map(({ name, rows }) => ({ name, rows: rows.map(({ h5Index: _h5Index, ...row }) => row) }));

for (const module of selectedModules()) {
  test.describe(`additional inputs ${slugOf(module)}`, () => {
    test(`Save without changes saves and closes [${module.id}]`, async ({ newPage }) => {
      const page = await newPage();
      await openModule(page, module);
      const dialog = await openPrefs(page);
      await saveAndExpectClosed(page, dialog);
      expectClean(page);
    });

    const targets = dockMaterialTargets(module.id);
    test(`the dock Material moves the dialog's material rows [${module.id}]`, async ({ newPage }) => {
      test.skip(targets.length === 0, 'the core copies no dock material in this module');
      const page = await newPage();
      await openModule(page, module);
      const { to } = await changeDockSelect(page, /^Material\b/);

      const dialog = await openPrefs(page);
      const tabs = await readAllTabs(dialog);
      const following = tabs.flatMap(({ name, rows }) => rows
        .filter((row) => row.kind === 'select' && /^Material\b/.test(row.label) && row.value === to)
        .map(() => name));
      expect(following.length, `Material rows showing "${to}" (core copies: ${targets.join(', ')}); tabs: ${JSON.stringify(strip(tabs).map((t) => [t.name, t.rows.filter((r) => /^Material\b/.test(r.label)).map((r) => r.value)]))}`).toBeGreaterThanOrEqual(targets.length);
      expectClean(page);
    });

    // Pressing Defaults on a dialog that was just opened should leave its values as they are: both
    // are the defaults of the same module. In many modules it does not (see README, "Known drift"):
    // the differences are recorded in snapshots/defaults-drift/ so a fix or a new difference shows
    // up as a snapshot change to review.
    test(`Defaults right after opening [${module.id}]`, async ({ newPage }) => {
      const page = await newPage();
      await openModule(page, module);
      const dialog = await openPrefs(page);
      const before = strip(await readAllTabs(dialog));
      await dialog.getByRole('button', { name: 'Defaults' }).click();
      await expect(page.getByText('Preferences reset to defaults')).toBeVisible();
      await page.watch.settled();
      const after = strip(await readAllTabs(dialog));
      expect(after.map((tab) => tab.name), 'Defaults keeps the tabs').toEqual(before.map((tab) => tab.name));
      const drift = [];
      before.forEach((tab, index) => {
        const rowsAfter = after[index].rows;
        tab.rows.forEach((row, rowIndex) => {
          const now = rowsAfter[rowIndex];
          if (!now || now.label !== row.label) drift.push(`${tab.name} / ${row.label}: row changed to ${now ? now.label : 'nothing'}`);
          else if (now.value !== row.value) drift.push(`${tab.name} / ${row.label}: ${JSON.stringify(row.value)} -> ${JSON.stringify(now.value)}`);
        });
      });
      // Where the materials of Additional Inputs are set late and not always (RACY_DEFAULT_KEYS), what
      // the freshly opened dialog shows for them depends on that race, so their rows are left out.
      const racy = RACY_DEFAULT_KEYS[module.id] ? /\/ (Material|Ultimate Strength|Yield Strength)/ : null;
      expectSnapshot('defaults-drift', slugOf(module), racy ? drift.filter((line) => !racy.test(line)) : drift);
      expectClean(page);
    });

    test(`one change per tab, Save, Defaults, Save [${module.id}]`, async ({ newPage }) => {
      const page = await newPage();
      await openModule(page, module);
      let dialog = await openPrefs(page);
      const original = strip(await readAllTabs(dialog));

      const changes = [];
      for (let index = 0; index < original.length; index += 1) {
        await selectTab(dialog, index);
        const change = await changeOneValue(page, dialog, original[index].name, { skipMaterial: changes.some((done) => /^Material/.test(done.label)) });
        if (change) changes.push({ ...change, index });
      }
      expect(changes.length, 'at least one tab has a value to change').toBeGreaterThan(0);
      await saveAndExpectClosed(page, dialog);

      // The saved values come back when the dialog is opened again.
      dialog = await openPrefs(page);
      const lost = [];
      for (const change of changes) {
        await selectTab(dialog, change.index);
        const rows = await readTab(dialog);
        if (!rows.map((row) => row.value).includes(change.to)) lost.push(`${change.tab} / ${change.label}: ${change.from} -> ${change.to} not kept`);
      }
      expect(lost, 'changes the dialog did not keep after Save (known ones are listed in lib/known-issues.mjs)').toEqual(KNOWN_LOST_CHANGES[module.id] || []);

      // Defaults, then Save again. (What Defaults puts back is recorded by the drift test above.)
      await dialog.getByRole('button', { name: 'Defaults' }).click();
      await expect(page.getByText('Preferences reset to defaults')).toBeVisible();
      await page.watch.settled();
      await saveAndExpectClosed(page, dialog);
      expectClean(page);
    });
  });
}
