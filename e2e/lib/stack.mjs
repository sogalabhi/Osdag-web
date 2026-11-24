// Starts and stops the isolated e2e stack: Django on its own port with a separate
// Postgres database, and Vite proxying to it. Nothing here touches the developer's
// own Redis (6379), Django (8000) or Vite (5173).
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {
  ARTIFACTS_DIR, E2E_DIR, FRONTEND_DIR, REPO_ROOT, RESERVED_PORTS, dbEnv, pythonArgv, settings,
} from './config.mjs';

const LOG_DIR = path.join(ARTIFACTS_DIR, 'logs');

const canListen = (port, host) => new Promise((resolve) => {
  const server = net.createServer();
  server.once('error', () => resolve(false));
  server.listen(port, host, () => server.close(() => resolve(true)));
});

export const portIsFree = async (port) => {
  for (const host of ['127.0.0.1', '0.0.0.0', '::']) {
    if (!(await canListen(port, host))) return false;
  }
  return true;
};

const assertPortsUsable = async () => {
  const { backendPort, frontendPort } = settings;
  if (backendPort === frontendPort) throw new Error('E2E_BACKEND_PORT and E2E_FRONTEND_PORT must differ.');
  for (const port of [backendPort, frontendPort]) {
    if (RESERVED_PORTS.includes(port)) {
      throw new Error(`Port ${port} belongs to a developer service (${RESERVED_PORTS.join(', ')}); pick another E2E_*_PORT.`);
    }
    if (!(await portIsFree(port))) {
      throw new Error(`Port ${port} is already in use; the e2e stack will not start on it. Set E2E_BACKEND_PORT / E2E_FRONTEND_PORT.`);
    }
  }
};

const backendEnv = () => ({
  ...process.env,
  DEBUG: 'True',
  ALLOWED_HOSTS: '*',
  CELERY_BROKER_URL: 'memory://',
  CELERY_RESULT_BACKEND: 'cache+memory://',
  // Nothing listens here: no Redis, so no Channels and no Celery worker. A Design request is
  // accepted (202) but never completes.
  REDIS_URL: 'redis://127.0.0.1:1',
  QT_QPA_PLATFORM: 'offscreen',
  // Guests share one address here and the sweep is fast; the default 120/minute would answer 429.
  THROTTLE_ANON_RATE: '100000/minute',
  THROTTLE_USER_RATE: '100000/minute',
  SECRET_KEY: 'x',
  DATABASE_NAME: settings.db.name,
  DATABASE_USER: settings.db.user,
  DATABASE_PASSWORD: settings.db.password,
  DATABASE_HOST: settings.db.host,
  DATABASE_PORT: String(settings.db.port),
});

const runPython = (args, { env = process.env, cwd = REPO_ROOT, label }) => {
  const [command, ...prefix] = pythonArgv();
  const result = spawnSync(command, [...prefix, ...args], { cwd, env, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status}):\n${result.stdout || ''}${result.stderr || ''}`);
  }
  return result.stdout.trim();
};

export const ensureDatabase = () => runPython([path.join(E2E_DIR, 'lib', 'db.py'), 'ensure'], {
  env: { ...process.env, ...dbEnv() }, label: 'creating the e2e database',
});

export const dropDatabase = () => runPython([path.join(E2E_DIR, 'lib', 'db.py'), 'drop'], {
  env: { ...process.env, ...dbEnv() }, label: 'dropping the e2e database',
});

export const migrateDatabase = () => runPython(['manage.py', 'migrate', '--noinput'], {
  env: backendEnv(), label: 'migrating the e2e database',
});

const waitForHttp = async (url, { timeoutMs, accept, child, name }) => {
  const deadline = Date.now() + timeoutMs;
  let last = '';
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`${name} exited early (code ${child.exitCode}); see ${LOG_DIR}`);
    try {
      const response = await fetch(url);
      if (accept(response.status)) return;
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${name} did not become ready at ${url} within ${timeoutMs / 1000}s (${last}); see ${LOG_DIR}`);
};

const startProcess = (name, command, args, options) => {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const log = fs.openSync(path.join(LOG_DIR, `${name}.log`), 'w');
  // Own process group so the whole tree (conda run -> python) can be stopped together.
  const child = spawn(command, args, { ...options, detached: true, stdio: ['ignore', log, log] });
  child.on('error', (error) => { throw new Error(`${name} could not start: ${error.message}`); });
  child.on('exit', (code, signal) => {
    if (!child.expectedExit) console.error(`e2e: ${name} stopped unexpectedly (${signal || `exit ${code}`}); see ${path.join(LOG_DIR, `${name}.log`)}`);
  });
  return child;
};

const stopProcess = (child) => new Promise((resolve) => {
  if (!child || child.exitCode !== null) return resolve();
  child.expectedExit = true;
  const timer = setTimeout(() => {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ }
  }, 8000);
  child.once('exit', () => { clearTimeout(timer); resolve(); });
  try { process.kill(-child.pid, 'SIGTERM'); } catch { resolve(); }
});

export const startStack = async () => {
  await assertPortsUsable();
  ensureDatabase();
  migrateDatabase();

  const { backendPort, frontendPort } = settings;
  const [python, ...prefix] = pythonArgv();
  const backend = startProcess('django', python,
    [...prefix, 'manage.py', 'runserver', `127.0.0.1:${backendPort}`, '--noreload'],
    { cwd: REPO_ROOT, env: backendEnv() });

  const viteBin = path.join(FRONTEND_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(viteBin)) {
    await stopProcess(backend);
    throw new Error(`${viteBin} not found: run "npm ci" in frontend/ first.`);
  }
  // --no-turbo-fast-api-calls: Node 26 can abort the dev server ("Lazy deopt after a fast API call")
  // while it sends a large module, which turns the rest of a run into connection errors.
  const frontend = startProcess('vite', process.execPath,
    ['--no-turbo-fast-api-calls', viteBin, '--config', path.join(E2E_DIR, 'vite.e2e.config.mjs'), '--port', String(frontendPort), '--strictPort', '--host', '127.0.0.1'],
    {
      cwd: FRONTEND_DIR,
      env: {
        ...process.env,
        VITE_BASE_URL: 'undefined',
        VITE_PROXY_BACKEND_URL: `http://127.0.0.1:${backendPort}`,
        E2E_VITE_CACHE_DIR: path.join(ARTIFACTS_DIR, 'vite-cache'),
      },
    });

  const stop = async () => { await Promise.all([stopProcess(backend), stopProcess(frontend)]); };
  try {
    // /api/health/ is 503 here (no Redis) but proves Django answers; any status below 500 or exactly 503 will do.
    await waitForHttp(`http://127.0.0.1:${backendPort}/api/health/`, {
      timeoutMs: 120000, accept: (status) => status === 200 || status === 503, child: backend, name: 'Django',
    });
    await waitForHttp(`http://127.0.0.1:${frontendPort}/`, {
      timeoutMs: 120000, accept: (status) => status === 200, child: frontend, name: 'Vite',
    });
  } catch (error) {
    await stop();
    throw error;
  }
  return { baseURL: `http://127.0.0.1:${frontendPort}`, stop };
};
