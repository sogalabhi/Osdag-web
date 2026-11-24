// Settings of the e2e stack, all overridable from the environment (see README.md).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const E2E_DIR = path.resolve(here, '..');
export const REPO_ROOT = path.resolve(E2E_DIR, '..');
export const FRONTEND_DIR = path.join(REPO_ROOT, 'frontend');
export const ARTIFACTS_DIR = path.join(E2E_DIR, 'artifacts');
export const SNAPSHOT_DIR = path.join(E2E_DIR, 'snapshots');
export const EXAMPLES_DIR = path.join(REPO_ROOT, 'osdag_core', 'data', 'ResourceFiles', 'design_example');

// Ports the developer's own services use; the e2e stack must never take them.
export const RESERVED_PORTS = [8000, 5173, 6379, 5432, 5470];

export const settings = {
  backendPort: Number(process.env.E2E_BACKEND_PORT || 8030),
  frontendPort: Number(process.env.E2E_FRONTEND_PORT || 5230),
  condaEnv: process.env.E2E_CONDA_ENV || 'osdag-web',
  // Full command used to run the backend's Python; replaces `conda run -n <env> python`.
  pythonCommand: process.env.E2E_PYTHON || '',
  db: {
    host: process.env.E2E_DB_HOST || 'localhost',
    port: process.env.E2E_DB_PORT || '5470',
    user: process.env.E2E_DB_USER || 'osdagdeveloper',
    password: process.env.E2E_DB_PASSWORD || 'password',
    name: process.env.E2E_DB_NAME || 'osdag_e2e',
  },
};

export const pythonArgv = () => {
  if (settings.pythonCommand) return settings.pythonCommand.split(/\s+/).filter(Boolean);
  return ['conda', 'run', '-n', settings.condaEnv, '--no-capture-output', 'python'];
};

export const dbEnv = () => ({
  E2E_DB_HOST: settings.db.host,
  E2E_DB_PORT: String(settings.db.port),
  E2E_DB_USER: settings.db.user,
  E2E_DB_PASSWORD: settings.db.password,
  E2E_DB_NAME: settings.db.name,
});
