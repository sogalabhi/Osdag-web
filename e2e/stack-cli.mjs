// Small CLI around the stack helpers:
//   node stack-cli.mjs serve      start the isolated stack and keep it up until Ctrl+C (then run
//                                 specs against it with E2E_BASE_URL=<printed url> npx playwright test)
//   node stack-cli.mjs create-db | migrate | drop-db
import { dropDatabase, ensureDatabase, migrateDatabase, startStack } from './lib/stack.mjs';

const actions = { 'drop-db': dropDatabase, 'create-db': ensureDatabase, migrate: migrateDatabase };
const name = process.argv[2];

if (name === 'serve') {
  try {
    const stack = await startStack();
    console.log(`e2e stack ready at ${stack.baseURL} (Ctrl+C to stop)`);
    const stop = async () => { await stack.stop(); process.exit(0); };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
    setInterval(() => {}, 1 << 30);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
} else if (actions[name]) {
  try {
    console.log(actions[name]());
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
} else {
  console.error(`usage: node stack-cli.mjs serve | ${Object.keys(actions).join(' | ')}`);
  process.exit(2);
}
