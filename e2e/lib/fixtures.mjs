// The `test` the specs use: every page it hands out records page errors, console errors, failed
// requests and /api answers of 4xx or 5xx, and on failure the record and a screenshot are written
// to e2e/artifacts/. Page errors and /api failures fail the test on their own (`expectClean`).
import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ARTIFACTS_DIR } from './config.mjs';

const safeName = (text) => text.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120);

class Watch {
  constructor(page, origin) {
    this.origin = origin;
    this.pageErrors = [];
    this.consoleErrors = [];
    this.apiFailures = [];
    this.requestFailures = [];
    this.log = [];
    this.inflight = new Set();
    this.lastActivity = Date.now();
    const touch = () => { this.lastActivity = Date.now(); };
    page.on('request', (request) => { if (new URL(request.url()).origin === origin && !/\/ws\//.test(request.url())) { this.inflight.add(request); touch(); } });
    page.on('requestfinished', (request) => { this.inflight.delete(request); touch(); });
    page.on('requestfailed', (request) => { this.inflight.delete(request); touch(); });
    page.on('pageerror', (error) => {
      this.pageErrors.push(error.message);
      this.log.push(`[pageerror] ${error.stack || error.message}`);
    });
    page.on('console', (message) => {
      const { url } = message.location();
      const sameOrigin = !url || url.startsWith(origin);
      if (message.type() === 'error') {
        this.log.push(`[console.error${sameOrigin ? '' : ' external'}] ${message.text()}`);
        if (sameOrigin && !/\/ws\/|WebSocket/.test(`${message.text()} ${url}`)) this.consoleErrors.push(message.text());
      }
    });
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (url.origin !== origin || response.status() < 400) return;
      const line = `${response.status()} ${response.request().method()} ${url.pathname}`;
      this.log.push(`[http] ${line}`);
      if (url.pathname.startsWith('/api/')) this.apiFailures.push(line);
      else if (/^\/(src|node_modules|@fs|@id)\//.test(url.pathname)) this.requestFailures.push(line);
    });
    page.on('requestfailed', (request) => {
      const url = new URL(request.url());
      if (url.origin !== origin) return; // fonts and Google sign-in assets need the internet; not under test
      if (/\/ws\//.test(url.pathname)) return;
      const line = `${request.method()} ${url.pathname} ${request.failure()?.errorText}`;
      this.log.push(`[requestfailed] ${line}`);
      if (/^\/(src|node_modules|@fs|@id)\//.test(url.pathname)) this.requestFailures.push(line);
    });
  }

  /**
   * Resolves once no request to the app has been in flight for `quietMs`. (page.waitForLoadState
   * ('networkidle') returns at once when the page already reached that state once, so it cannot
   * be used to wait for requests a later click starts.) Module and source files (Vite) are ignored
   * after the first load; only /api calls count.
   */
  async settled(quietMs = 600, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    const pending = () => [...this.inflight].filter((request) => new URL(request.url()).pathname.startsWith('/api/'));
    for (;;) {
      if (pending().length === 0 && Date.now() - this.lastActivity >= quietMs) return;
      if (Date.now() > deadline) throw new Error(`requests still in flight after ${timeoutMs}ms: ${pending().map((r) => r.url()).join(', ')}`);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /** Everything the sweep treats as a bug on its own. */
  get problems() {
    return {
      pageErrors: this.pageErrors,
      apiFailures: this.apiFailures,
      failedModuleRequests: this.requestFailures,
    };
  }
}

export const test = base.extend({
  baseURL: async ({}, use) => {
    await use(process.env.E2E_BASE_URL);
  },

  // A function that opens a fresh guest-ready page (own context, so nothing is shared) with a Watch.
  newPage: async ({ browser, baseURL }, use, testInfo) => {
    const opened = [];
    const origin = new URL(baseURL).origin;
    const open = async () => {
      const context = await browser.newContext({ baseURL, viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
      const page = await context.newPage();
      const watch = new Watch(page, origin);
      page.watch = watch;
      opened.push({ context, page, watch });
      return page;
    };
    await use(open);

    const failed = testInfo.status !== testInfo.expectedStatus;
    for (const [index, { context, page, watch }] of opened.entries()) {
      if (failed) {
        const dir = path.join(ARTIFACTS_DIR, 'failures', safeName(testInfo.titlePath.join('__')));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `page${index}-console.log`), watch.log.join('\n'));
        await page.screenshot({ path: path.join(dir, `page${index}.png`), fullPage: false }).catch(() => {});
        await testInfo.attach(`page${index}-console`, { body: watch.log.join('\n') || '(empty)', contentType: 'text/plain' });
      }
      await context.close();
    }
  },
});

/** Fails when the page threw, an /api call answered 4xx/5xx, or an app module failed to load. */
export const expectClean = (page) => {
  expect.soft(page.watch.pageErrors, 'page errors').toEqual([]);
  expect.soft(page.watch.apiFailures, 'failed /api calls').toEqual([]);
  expect.soft(page.watch.requestFailures, 'failed module requests').toEqual([]);
};

export { expect };
