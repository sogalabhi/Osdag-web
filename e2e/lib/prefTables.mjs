// The core's design preference tables (frontend/src/constants/generated/designPrefTables.js, plain data).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FRONTEND_DIR } from './config.mjs';

const { DESIGN_PREF_TABLES } = await import(pathToFileURL(path.join(FRONTEND_DIR, 'src', 'constants', 'generated', 'designPrefTables.js')).href);

/** The keys the dock Material is copied to in Additional Inputs, for a module id (empty when none). */
export const dockMaterialTargets = (moduleId) => {
  const copies = DESIGN_PREF_TABLES[moduleId]?.dockCopies || {};
  return Object.entries(copies).filter(([driver]) => driver === 'Material' || driver.endsWith('.Material')).flatMap(([, targets]) => targets);
};
