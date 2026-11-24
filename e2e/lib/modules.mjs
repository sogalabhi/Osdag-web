// The module list the sweep runs over, read from frontend/src/modules/registry.js.
// The file is parsed as text (it cannot be imported by Node: it uses extensionless imports),
// and `registry parity` in specs/home.spec.mjs checks the result against the live registry
// in the browser, so a registry change this parser misses fails loudly.
import fs from 'node:fs';
import path from 'node:path';
import { FRONTEND_DIR } from './config.mjs';

const read = (relative) => fs.readFileSync(path.join(FRONTEND_DIR, 'src', relative), 'utf8');

const coreKeyValues = () => Object.fromEntries(
  [...read('constants/generated/coreKeys.js').matchAll(/export const (\w+) = "([^"]*)";/g)].map((m) => [m[1], m[2]]),
);

export const loadModules = () => {
  const keys = coreKeyValues();
  const registry = read('modules/registry.js');
  const entries = [...registry.matchAll(/\n  \{\n    id: (\w+),\n((?:    .*\n)*?)  \},/g)];
  return entries
    .map(([, idName, body]) => ({
      id: keys[idName],
      idName,
      path: body.match(/path: "([^"]+)"/)?.[1],
      apiSlug: body.match(/apiSlug: "([^"]+)"/)?.[1],
      hidden: /\n    hidden: true,/.test(`\n${body}`),
    }))
    // Hidden modules have no route (Purlin is under development and cannot be opened).
    .filter((module) => !module.hidden)
    .map(({ hidden: _hidden, ...module }) => module);
};

export const MODULES = loadModules();

// A readable, filesystem-safe name per module.
export const slugOf = (module) => module.path.replace(/^\/design\//, '').replace(/[^A-Za-z0-9]+/g, '-');

/** E2E_MODULES="fin_plate,tension" keeps the modules whose path contains one of the words. */
export const selectedModules = () => {
  const filter = (process.env.E2E_MODULES || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!filter.length) return MODULES;
  return MODULES.filter((module) => filter.some((word) => module.path.includes(word) || module.id === word));
};
