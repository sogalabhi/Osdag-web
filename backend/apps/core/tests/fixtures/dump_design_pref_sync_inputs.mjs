#!/usr/bin/env node
/**
 * Writes ./design_pref_sync_inputs.json: for every module config (Purlin excluded) the requests
 * the Additional Inputs dialog posts to POST /api/design-preferences/sync/: the module id
 * (`designType`, the desktop KEY_DISP_* name) and the dock inputs keyed by core key, built from
 * the config's `defaultInputs` through the frontend's own adapter (src/modules/shared/utils/
 * prefSyncKeys.js, cases in src/test/prefSyncCases.js). test_design_pref_sync_golden.py replays
 * them.
 *
 * Usage (needs frontend/node_modules; nothing in the repo is modified except the output):
 *     node backend/apps/core/tests/fixtures/dump_design_pref_sync_inputs.mjs
 * Re-run after a config's coreKeys, designType or defaultInputs change, then regenerate the goldens
 * (see test_design_pref_sync_golden.py).
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FE = join(resolve(HERE, '../../../../..'), 'frontend');
const MODS = join(FE, 'src/modules');

const CONFIG_FILES = {
  basePlateConfig: 'basePlate/configs/basePlateConfig.js',
  beamBeamEndPlateConfig: 'beamBeamEndPlate/configs/beamBeamEndPlateConfig.js',
  beamToColumnEndPlateConfig: 'beamToColumnEndPlate/configs/beamToColumnEndPlateConfig.js',
  bbCoverBolted: ['coverPlateBolted/configs/coverPlateBoltedConfig.js', 'coverPlateBoltedConfig'],
  bbCoverWelded: ['coverPlateWelded/configs/coverPlateWeldedConfig.js', 'coverPlateWeldedConfig'],
  ccCoverBolted: ['columnColumnCoverPlateBolted/configs/coverPlateBoltedConfig.js', 'coverPlateBoltedConfig'],
  ccCoverWelded: ['columnColumnCoverPlateWelded/configs/coverPlateWeldedConfig.js', 'coverPlateWeldedConfig'],
  columnColumnEndPlateConfig: 'columnColumnEndPlate/configs/columnColumnEndPlateConfig.js',
  axiallyLoadedColumnConfig: 'compressionMember/configs/axiallyLoadedColumnConfig.js',
  strutsBoltedConfig: 'compressionMember/configs/strutsBoltedConfig.js',
  strutsWeldedConfig: 'compressionMember/configs/strutsWeldedConfig.js',
  onCantileverConfig: 'flexuralMember/onCantilever/configs/onCantileverConfig.js',
  plateGirderConfig: 'flexuralMember/plateGirder/configs/plateGirderConfig.js',
  simplySupportedBeamConfig: 'flexuralMember/simplySupportedBeam/configs/simplySupportedBeamConfig.js',
  cleatAngleConfig: 'shearConnection/cleatAngle/configs/cleatAngleConfig.js',
  endPlateConfig: 'shearConnection/endPlate/configs/endPlateConfig.js',
  finPlateConfig: 'shearConnection/finPlate/configs/finPlateConfig.js',
  seatedAngleConfig: 'shearConnection/seatAngle/configs/seatedAngleConfig.js',
  buttJointBoltedConfig: 'SimpleConnection/ButtJointBolted/config/buttJointBoltedConfig.js',
  buttJointWeldedConfig: 'SimpleConnection/ButtJointWelded/config/buttJointWeldedConfig.js',
  lapJointBoltedConfig: 'SimpleConnection/LapJointBolted/config/lapJointBoltedConfig.js',
  lapJointWeldedConfig: 'SimpleConnection/LapJointWelded/config/lapJointWeldedConfig.js',
  boltedToEndConfig: 'TensionMembers/BoltedToEnd/configs/boltedToEndConfig.js',
  weldedToEndConfig: 'TensionMembers/WeldedToEnd/configs/weldedToEndConfig.js',
};

const tmp = mkdtempSync(join(tmpdir(), 'pref-sync-inputs-'));
try {
  const lines = Object.entries(CONFIG_FILES).map(([alias, spec]) => {
    const [file, exportName] = Array.isArray(spec) ? spec : [spec, alias];
    return `export { ${exportName}${exportName === alias ? '' : ` as ${alias}`} } from ${JSON.stringify(join(MODS, file))};`;
  });
  lines.push(`export { syncRequests } from ${JSON.stringify(join(FE, 'src/test/prefSyncCases.js'))};`);
  const entry = join(tmp, 'entry.js');
  writeFileSync(entry, lines.join('\n'));
  const { build } = await import(pathToFileURL(join(FE, 'node_modules/vite/dist/node/index.js')));
  await build({
    root: FE,
    logLevel: 'warn',
    configFile: false,
    build: { ssr: entry, outDir: join(tmp, 'out'), emptyOutDir: true, rollupOptions: { output: { entryFileNames: 'configs.mjs' } } },
  });
  const mod = await import(pathToFileURL(join(tmp, 'out/configs.mjs')));
  const out = {};
  for (const alias of Object.keys(CONFIG_FILES)) {
    const cfg = mod[alias];
    if (!cfg.coreKeys) throw new Error(`${alias} declares no coreKeys`);
    out[cfg.designType] = { config: alias, requests: JSON.parse(JSON.stringify(mod.syncRequests(cfg))) };
  }
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(join(HERE, 'design_pref_sync_inputs.json'), JSON.stringify(sorted, null, 2) + '\n');
  console.log(`wrote ${Object.keys(sorted).length} modules`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
