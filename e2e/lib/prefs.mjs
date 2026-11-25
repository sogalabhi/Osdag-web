// Helpers for the Additional Inputs dialog (design preferences).
import { expect, test } from '@playwright/test';

export const prefDialog = (page) => page.getByRole('dialog', { name: 'Additional Inputs' });

/** Opens Additional Inputs and waits for its first sync to finish (tabs enabled). */
export const openPrefs = async (page) => {
  const dialog = prefDialog(page);
  // Now and then the first click opens nothing (about 1 open in 100); a user clicks again.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.getByRole('button', { name: 'Additional Inputs', exact: true }).click();
    try {
      await expect(dialog.getByRole('button', { name: 'Defaults' })).toBeVisible({ timeout: 8_000 });
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      test.info().annotations.push({ type: 'Additional Inputs did not open', description: 'clicked again after 8s' });
    }
  }
  await expect(dialog.getByTestId('pref-tab').first()).toBeEnabled();
  await page.watch.settled();
  return dialog;
};

export const tabNames = (dialog) => dialog.getByTestId('pref-tab').allInnerTexts();

export const selectTab = async (dialog, index) => {
  const tab = dialog.getByTestId('pref-tab').nth(index);
  await tab.click();
  await expect(tab).toHaveClass(/active-tabs/);
};

/** The labelled rows of the open tab: [{ h5Index, label, value, kind: 'input' | 'select', editable }]. */
export const readTab = (dialog) => dialog.locator('.design-pref-cont').evaluate((root) => {
  const rows = [];
  [...root.querySelectorAll('h5')].forEach((heading, h5Index) => {
    const row = heading.parentElement;
    const select = row.querySelector('.ant-select');
    const input = [...row.querySelectorAll('input')].find((el) => el.getAttribute('role') !== 'combobox' && el.type !== 'file');
    if (select) {
      rows.push({
        h5Index,
        label: heading.textContent.trim(),
        kind: 'select',
        value: select.innerText.trim(),
        editable: !select.classList.contains('ant-select-disabled'),
      });
    } else if (input) {
      rows.push({ h5Index, label: heading.textContent.trim(), kind: 'input', value: input.value, editable: !input.disabled && !input.readOnly });
    }
  });
  return rows;
});

/** Every tab's rows, keyed by tab name (tab names can repeat in a module, so by position too). */
export const readAllTabs = async (dialog) => {
  const names = await tabNames(dialog);
  const tabs = [];
  for (let index = 0; index < names.length; index += 1) {
    await selectTab(dialog, index);
    tabs.push({ name: names[index], rows: await readTab(dialog) });
  }
  return tabs;
};

const isNumber = (text) => /^-?\d+(\.\d+)?$/.test(text);

// Material properties are derived from the chosen material and snap back when typed over
// (they only open for a Custom material), so they are not what a test changes.
const DERIVED = /Strength|Elasticity|Rigidity|Poisson|Thermal Expansion/i;

/**
 * Changes one value of the open tab and returns what changed ({ tab, label, from, to }) or null
 * when the tab has nothing to change (the Design tab lists one usable method, and the base plate's Base Plate Analysis one method).
 * A section tab (it has a Designation row) changes its Material: the dimensions shown there are
 * the catalog's and are not saved. The materials of a module are linked (changing one moves the
 * others), so pass `skipMaterial` after the first material change of a pass. Other tabs prefer a numeric text field (gap, weld strength),
 * then a dropdown moved to another option.
 */
export const changeOneValue = async (page, dialog, tabName, { skipMaterial = false } = {}) => {
  const rows = await readTab(dialog);
  const isSection = rows.some((row) => row.label === 'Designation');
  const rowOf = (row) => dialog.locator('.design-pref-cont h5').nth(row.h5Index).locator('xpath=..');

  if (!isSection) {
    for (const row of rows.filter((candidate) => candidate.kind === 'input' && candidate.editable && isNumber(candidate.value) && !DERIVED.test(candidate.label))) {
      const to = String(Number(row.value) + 1);
      const field = rowOf(row).locator('input:not([role="combobox"])').first();
      await field.fill(to);
      try {
        await expect(field).toHaveValue(to, { timeout: 1500 });
        return { tab: tabName, label: row.label, from: row.value, to };
      } catch {
        // The field takes only certain values (a weld grade) and put the old one back: try the next.
        await field.fill(row.value);
      }
    }
  }
  for (const row of rows) {
    if (row.kind !== 'select' || !row.editable || row.label === 'Designation') continue;
    if (skipMaterial && /^Material/.test(row.label)) continue;
    if (isSection && !/^Material/.test(row.label)) continue; // the rest of a section tab is catalog data, not saved
    const control = rowOf(row).locator('.ant-select').first();
    await control.click();
    const options = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option:not(.ant-select-item-option-disabled)');
    const texts = (await options.allInnerTexts()).map((text) => text.trim());
    const target = texts.find((text) => text !== row.value && !/custom/i.test(text));
    if (!target) {
      await page.keyboard.press('Escape');
      // Wait for the list to close: while it fades out, the next dropdown's options would be read together with it.
      await expect(page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')).toHaveCount(0);
      continue;
    }
    await options.filter({ hasText: target }).first().click();
    await expect(control).toContainText(target);
    return { tab: tabName, label: row.label, from: row.value, to: target };
  }
  return null;
};

/** Presses Save and checks the toast and that the dialog closes. */
export const saveAndExpectClosed = async (page, dialog) => {
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Preferences saved')).toBeVisible();
  await expect(dialog).toBeHidden();
};
