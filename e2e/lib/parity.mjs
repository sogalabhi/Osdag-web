// Reads frontend/src/test/__snapshots__/payloadParity.test.js.snap (what each module's
// buildSubmissionParams sends for its default inputs, with short sample option lists) so the
// browser's real Design request can be compared against it by key.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { FRONTEND_DIR } from './config.mjs';

const SNAP = path.join(FRONTEND_DIR, 'src', 'test', '__snapshots__', 'payloadParity.test.js.snap');

let cache;
const entries = () => {
  if (cache) return cache;
  const exportsObject = {};
  vm.runInNewContext(fs.readFileSync(SNAP, 'utf8'), { exports: exportsObject });
  cache = Object.entries(exportsObject).map(([name, text]) => ({
    name: name.replace(/^payload parity: buildSubmissionParams on the default inputs > /, '').replace(/ 1$/, ''),
    payload: vm.runInNewContext(`(${text})`),
  }));
  return cache;
};

/** The "all"-selection entries (every list on "All") of one module, by the module id in `Module`. */
export const parityEntriesFor = (moduleId) => entries().filter((entry) => entry.payload.Module === moduleId && / > all/.test(` > ${entry.name}`));

/**
 * Compares a browser request body with one parity entry. `missing` lists the keys of the entry the
 * body does not carry or carries with the wrong shape (a list where the entry has a scalar and
 * the reverse): those fail the test. `valueDiffs` lists keys whose value differs. They are only
 * reported, because the unit snapshot is built from test fixtures (filled-in sections and
 * thicknesses, seed Additional Inputs) and not from what a real page loads.
 * Keys only the body has (the saved Additional Inputs) are allowed.
 */
export const differences = (body, expected) => {
  const missing = [];
  const valueDiffs = [];
  for (const [key, value] of Object.entries(expected)) {
    if (!(key in body)) { missing.push(`${key}: missing from the request`); continue; }
    const actual = body[key];
    if (Array.isArray(value) !== Array.isArray(actual)) {
      missing.push(`${key}: expected ${Array.isArray(value) ? 'a list' : 'a scalar'}, sent ${JSON.stringify(actual)}`);
    } else if (Array.isArray(value)) {
      if (!value.every((item) => actual.includes(item))) valueDiffs.push(`${key}: ${JSON.stringify(value)} not all in the sent list`);
    } else if (JSON.stringify(actual) !== JSON.stringify(value)) {
      valueDiffs.push(`${key}: unit snapshot ${JSON.stringify(value)}, browser sent ${JSON.stringify(actual)}`);
    }
  }
  return { missing, valueDiffs };
};
