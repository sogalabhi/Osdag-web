// The frontend's Vite config with two changes for the e2e stack: its own dependency cache
// (so it never touches the cache a developer's own `vite` uses) and no file watching.
import base from '../frontend/vite.config.js';

export default {
  ...base,
  cacheDir: process.env.E2E_VITE_CACHE_DIR,
  server: { ...base.server, watch: null },
};
