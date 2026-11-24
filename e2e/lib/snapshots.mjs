// JSON snapshots under e2e/snapshots/. A missing or different snapshot fails the test;
// nothing is created or rewritten unless E2E_UPDATE=1 (npm run e2e:update).
import { expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { E2E_DIR, SNAPSHOT_DIR } from './config.mjs';

export const updating = () => process.env.E2E_UPDATE === '1';

export const snapshotPath = (group, name) => path.join(SNAPSHOT_DIR, group, `${name}.json`);

/** Asserts `actual` equals the committed snapshot; writes it only when E2E_UPDATE=1. */
export const expectSnapshot = (group, name, actual) => {
  const file = snapshotPath(group, name);
  const text = `${JSON.stringify(actual, null, 2)}\n`;
  if (updating()) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) fs.writeFileSync(file, text);
    return;
  }
  const relative = path.relative(E2E_DIR, file);
  if (!fs.existsSync(file)) {
    throw new Error(`No snapshot at e2e/${relative}. Create it with "E2E_UPDATE=1 npm run e2e", then review and commit it.`);
  }
  expect(actual, `differs from e2e/${relative}; if the change is intended run "E2E_UPDATE=1 npm run e2e" and review the diff`).toEqual(JSON.parse(fs.readFileSync(file, 'utf8')));
};
