// Page helpers shared by the specs. They use roles, labels and text the app already renders,
// plus the few data-testid hooks added for this sweep (input-dock, design-button, pref-tab).
import { expect, test } from '@playwright/test';

export const GUEST_BUTTON = 'Continue as Guest';

/** Sign in as a guest from the login page, as a user would. */
export const continueAsGuest = async (page) => {
  await page.goto('/');
  await page.getByText(GUEST_BUTTON).click();
  await page.waitForURL('**/home');
};

export const designButton = (page) => page.getByTestId('design-button');

/** Opens a module page as a guest and waits until its form is loaded with the defaults. */
export const openModule = async (page, module) => {
  await continueAsGuest(page);
  await page.goto(module.path);
  await expect(designButton(page)).toBeEnabled();
  await expect(page.getByText('Loading Module...')).toHaveCount(0);
  // The defaults of some fields (plate thicknesses, a bolt type) are filled in a moment after the
  // form is shown; Design clicked before that is refused ("Please fill in ...") or reads "Select...".
  // In about 3 loads in 100 they are not filled at all (see README, "Known bugs"); a user reloads
  // the page, so the helper reloads once and records it.
  const emptyFields = async () => (await readDock(page)).filter((row) => row.label && (row.value === '' || /^Select/.test(row.value))).map((row) => row.label);
  for (let reloads = 0; ; reloads += 1) {
    try {
      await expect.poll(emptyFields, { message: 'dock fields still empty', timeout: 8_000 }).toEqual([]);
      break;
    } catch (error) {
      if (reloads === 3) throw error;
      test.info().annotations.push({ type: 'defaults missing after load', description: `${(await emptyFields()).join(', ')}: page reloaded` });
      await page.reload();
      await expect(designButton(page)).toBeEnabled();
    }
  }
  // The first Additional Inputs sync and the option lists settle after the form is shown.
  await page.watch.settled();
};

/** The rows of the input dock as [{label, value}] (text fields, dropdowns, bound buttons). */
export const readDock = (page) => page.getByTestId('input-dock').evaluate((dock) => {
  const isSelectInput = (el) => el.closest('[class*="react-select"], .ant-select');
  return [...dock.querySelectorAll('h4')].map((heading) => {
    const row = heading.parentElement;
    const control = [...row.children].find((child) => child !== heading);
    const field = control ? [...control.querySelectorAll('input')].find((el) => !isSelectInput(el)) : null;
    const value = field ? field.value : (control ? control.innerText.trim().replace(/\s+/g, ' ') : '');
    return { label: heading.textContent.trim(), value };
  });
});

const isDesignRequest = (request) => request.method() === 'POST' && /\/design\/$/.test(new URL(request.url()).pathname);

/**
 * Like clickDesign, for inputs that may be incomplete (a desktop example ships with empty loads):
 * returns { request } when the page sent the Design request, or { validation } with the message
 * when it refused to ("Please fill in the Shear Force(kN) field.").
 *
 * Now and then (about 2 in 100 loads) the click does nothing: no request and no message. A user
 * would click again, so the click is repeated once after 10 seconds, and the retry is recorded as
 * a test annotation (see README, "Known bugs").
 */
export const clickDesignOrValidation = async (page) => {
  const validation = page.getByText(/^Please fill in/).first();
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const requestPromise = page.waitForRequest(isDesignRequest, { timeout: 10_000 });
    const outcome = Promise.race([
      requestPromise.then(() => 'request'),
      validation.waitFor({ state: 'visible', timeout: 10_000 }).then(() => 'validation'),
    ]);
    requestPromise.catch(() => {});
    outcome.catch(() => {});
    await designButton(page).click();
    let result;
    try {
      result = await outcome;
    } catch {
      if (attempt === 2) throw new Error('Design was clicked twice and sent no request and showed no message');
      test.info().annotations.push({ type: 'design click did nothing', description: 'clicked again after 10s' });
      continue;
    }
    if (result === 'validation') return { validation: (await validation.innerText()).trim() };
    const request = await requestPromise;
    const response = await request.response();
    return { request: { url: new URL(request.url()).pathname, status: response.status(), body: sortKeys(request.postDataJSON()) } };
  }
  return undefined;
};

/**
 * Clicks Design and returns the request the page sent, with the status the server answered.
 * Design results cannot complete in the e2e stack (no Redis, so no Channels or Celery worker):
 * the POST is accepted with 202 and that is where the test stops. Always the last step on a page.
 */
export const clickDesign = async (page) => {
  const outcome = await clickDesignOrValidation(page);
  if (outcome.validation) throw new Error(`Design refused the inputs: ${outcome.validation}`);
  return outcome.request;
};

/** Deep copy with object keys sorted, so a request body compares and snapshots stably. */
export const sortKeys = (value) => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
  }
  return value;
};

/** File > <item>. */
export const chooseFileMenu = async (page, item) => {
  await page.getByText('File', { exact: true }).click();
  await page.getByText(new RegExp(`^${item}`)).first().click();
};

/** File > Download Osi, returns the downloaded file's path and text. */
export const downloadOsi = async (page) => {
  const downloadPromise = page.waitForEvent('download');
  await chooseFileMenu(page, 'Download Osi');
  const download = await downloadPromise;
  const filePath = await download.path();
  const fs = await import('node:fs');
  return { name: download.suggestedFilename(), path: filePath, text: fs.readFileSync(filePath, 'utf8'), download };
};

/** File > Load Input with the given .osi file; resolves once the app reports the file as loaded. */
export const loadOsi = async (page, filePath) => {
  const chooserPromise = page.waitForEvent('filechooser');
  await chooseFileMenu(page, 'Load Input');
  const chooser = await chooserPromise;
  const loaded = page.waitForResponse((response) => /\/open-osi|\/osi/i.test(response.url()) && response.request().method() === 'POST');
  await chooser.setFiles(filePath);
  const response = await loaded;
  await expect(page.getByText('Input loaded from OSI')).toBeVisible();
  await page.watch.settled();
  return response.status();
};

/**
 * Moves a dropdown of the input dock (a react-select row identified by its label) to another
 * option: the first one that differs from the current value and is not "Custom".
 * Returns { from, to }.
 */
export const changeDockSelect = async (page, labelPattern) => {
  const dock = page.getByTestId('input-dock');
  const row = dock.locator('h4').filter({ hasText: labelPattern }).first().locator('xpath=..');
  const control = row.locator('[class*="react-select__control"]').first();
  const from = (await control.innerText()).trim();
  await control.click();
  const options = page.getByRole('option');
  const refreshed = page.waitForResponse((response) => response.request().method() === 'POST' && /\/design-preferences\/sync\//.test(response.url()));
  await expect(options.first()).toBeVisible();
  const texts = (await options.allInnerTexts()).map((text) => text.trim());
  const to = texts.find((text) => text !== from && !/custom/i.test(text));
  if (!to) throw new Error(`no other option than "${from}" for ${labelPattern}`);
  await options.filter({ hasText: to }).first().click();
  await expect(control).toContainText(to);
  // The dock change makes the page ask the server to refresh the linked Additional Inputs
  // (debounced); wait for that answer, or the dialog opens before the rows are updated.
  await refreshed;
  await page.watch.settled();
  return { from, to };
};
