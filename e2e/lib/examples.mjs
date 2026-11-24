// The desktop's design example .osi files (osdag_core/data/ResourceFiles/design_example) and the web module each belongs to.
import fs from 'node:fs';
import path from 'node:path';
import { EXAMPLES_DIR } from './config.mjs';
import { MODULES } from './modules.mjs';

// The desktop module names the web reads under another id (backend/apps/core/utils/osi_files.py DESKTOP_MODULE_NAMES).
export const DESKTOP_NAMES = { 'End Plate Connection': 'Header Plate Connection' };

export const readExamples = () => fs.readdirSync(EXAMPLES_DIR)
  .filter((name) => name.endsWith('.osi'))
  .sort()
  .map((name) => {
    const file = path.join(EXAMPLES_DIR, name);
    const desktopModule = fs.readFileSync(file, 'utf8').match(/^Module:\s*(.+?)\s*$/m)?.[1];
    const id = DESKTOP_NAMES[desktopModule] || desktopModule;
    return { name, file, desktopModule, module: MODULES.find((module) => module.id === id) || null };
  });

/** One example per web module (the first by file name), or every example with E2E_ALL_EXAMPLES=1. */
export const selectedExamples = () => {
  const withModule = readExamples().filter((example) => example.module);
  if (process.env.E2E_ALL_EXAMPLES === '1') return withModule;
  const seen = new Set();
  return withModule.filter((example) => (seen.has(example.module.id) ? false : seen.add(example.module.id)));
};
