// Login page, home page, the module menu and the guest's My Data page.
import { test, expect, expectClean } from '../lib/fixtures.mjs';
import { MODULES } from '../lib/modules.mjs';
import { continueAsGuest } from '../lib/app.mjs';

test.describe('home and menu', () => {
  test('the login page offers guest access and the guest lands on the home page', async ({ newPage }) => {
    const page = await newPage();
    await page.goto('/');
    await expect(page.getByText('Continue as Guest')).toBeVisible();
    await expect(page.getByText('Log in with Google')).toBeVisible();
    await page.getByText('Continue as Guest').click();
    await expect(page).toHaveURL(/\/home$/);
    for (const entry of ['Home', 'Connection', 'Tension Member', 'Compression Member', 'Flexural Member']) {
      await expect(page.getByRole('link', { name: entry }).first()).toBeVisible();
    }
    await expect(page.getByText('Projects are not available in guest mode')).toBeVisible();
    expectClean(page);
  });

  test('registry parity: the modules the sweep runs over are the registry\'s', async ({ newPage }) => {
    const page = await newPage();
    await continueAsGuest(page);
    const live = await page.evaluate(async () => {
      const registry = await import('/src/modules/registry.js');
      return registry.MODULES.map(({ id, path, apiSlug }) => ({ id, path, apiSlug }));
    });
    expect(live.length).toBeGreaterThan(0);
    expect(MODULES.map(({ id, path, apiSlug }) => ({ id, path, apiSlug }))).toEqual(live);
    // Purlin is hidden in the registry: no route, nothing to open.
    expect(live.map((module) => module.path)).not.toContain('/design/flexure/purlin');
  });

  test('the module menu lists every module under its tab and opens a module', async ({ newPage }) => {
    const page = await newPage();
    await continueAsGuest(page);
    const menu = await page.evaluate(async () => {
      const registry = await import('/src/modules/registry.js');
      return Object.entries(registry.MENU_GROUPS).map(([group, tabs]) => ({
        group,
        tabs: tabs.map((tab) => ({
          key: tab.key,
          label: tab.label,
          development: tab.status === 'development',
          sections: registry.getMenuSections(tab.key).map((section) => ({
            label: section.label,
            development: section.status === 'development',
            options: section.options.map((option) => ({ id: option.key, label: option.label })),
          })),
        })),
      }));
    });
    const shown = new Set();
    for (const { group, tabs } of menu) {
      await page.goto(`/${group}`);
      for (const tab of tabs.filter((candidate) => !candidate.development)) {
        await page.getByRole('tab', { name: tab.label, exact: true }).click();
        for (const section of tab.sections.filter((candidate) => !candidate.development && candidate.options.length)) {
          // Only the moment connections are split further into sections, each with its own button.
          if (tab.key === 'Moment') await page.getByRole('button', { name: section.label, exact: true }).click();
          for (const option of section.options) {
            await expect(page.getByRole('button', { name: `Open ${option.label}`, exact: true }), `${tab.label} / ${section.label}: ${option.label}`).toBeVisible();
            shown.add(option.id);
          }
        }
      }
    }
    expect([...shown].sort()).toEqual(MODULES.map((module) => module.id).sort());

    // A menu card opens its module page.
    await page.goto('/Connections');
    await page.getByRole('tab', { name: 'Shear Connection', exact: true }).click();
    await page.getByRole('button', { name: 'Open Fin Plate', exact: true }).click();
    await expect(page).toHaveURL(/\/design\/connections\/shear\/fin_plate$/);
    await expect(page.getByTestId('design-button')).toBeEnabled();
    expectClean(page);
  });

  test('the sidebar opens a module family page', async ({ newPage }) => {
    const page = await newPage();
    await continueAsGuest(page);
    await page.getByRole('link', { name: 'Tension Member' }).first().click();
    await expect(page).toHaveURL(/\/TensionMember$/);
    await expect(page.getByRole('button', { name: 'Open Bolted to End Gusset', exact: true })).toBeVisible();
    expectClean(page);
  });
});

test.describe('guest and My Data', () => {
  test('the guest profile menu offers login, not My Data', async ({ newPage }) => {
    const page = await newPage();
    await continueAsGuest(page);
    await page.getByRole('button', { name: 'G', exact: true }).filter({ visible: true }).click();
    await expect(page.getByText('Guest User').filter({ visible: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'My Data' })).toHaveCount(0);
  });

  test('My Data sends a guest to the home page with a sign-in note, without asking for account data', async ({ newPage }) => {
    const page = await newPage();
    await continueAsGuest(page);
    await page.goto('/my-data');
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByText('Sign in to see your saved data')).toBeVisible();
    expectClean(page);
  });
});
