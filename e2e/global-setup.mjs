import fs from 'node:fs';
import path from 'node:path';
import { ARTIFACTS_DIR } from './lib/config.mjs';
import { startStack } from './lib/stack.mjs';

export default async function globalSetup(config) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  if (process.env.E2E_BASE_URL) return undefined;

  const started = Date.now();
  const stack = await startStack();
  // Every project and worker reads the base URL from here (workers do not see globalSetup's env otherwise).
  process.env.E2E_BASE_URL = stack.baseURL;
  for (const project of config.projects) project.use.baseURL = stack.baseURL;
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'stack.json'), JSON.stringify({ baseURL: stack.baseURL, startedInMs: Date.now() - started }));
  console.log(`e2e stack ready at ${stack.baseURL} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  return stack.stop;
}
