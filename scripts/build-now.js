#!/usr/bin/env node
/**
 * Manual "Build now" CLI — flips an approved-but-idle idea (or all of them)
 * to high build priority so the build-monitor cron picks it on its next tick.
 *
 *   node scripts/build-now.js <ideaId>
 *   node scripts/build-now.js --all
 *
 * Calls the same `ideas:triggerBuild` / `ideas:triggerBuildAll` Convex mutations
 * that the dashboard's "Build now" button uses.
 *
 * NOTE: those mutations require auth in the UI. From the CLI we go through
 * the deploy key (which is admin-equivalent in Convex), so this works
 * non-interactively for ops use.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SECRETS_FILE = '/home/n8garvie/.openclaw/workspace/mission-control/config/secrets.json';
let SECRETS = {};
if (fs.existsSync(SECRETS_FILE)) {
  try { SECRETS = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf-8')); } catch (err) {
    console.error(`Failed to parse ${SECRETS_FILE}: ${err.message}`);
  }
}

const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY || SECRETS.convex?.deployKey;
if (!CONVEX_DEPLOY_KEY) {
  console.error('CONVEX_DEPLOY_KEY missing. Set the env var or populate config/secrets.json.');
  process.exit(1);
}

const DASHBOARD_DIR = path.join(__dirname, '..', 'dashboard');

function convexRun(handler, args) {
  const argStr = JSON.stringify(args).replace(/'/g, "'\\''");
  return execSync(
    `cd "${DASHBOARD_DIR}" && npx convex run ${handler} '${argStr}'`,
    { encoding: 'utf-8', env: { ...process.env, CONVEX_DEPLOY_KEY }, stdio: 'pipe' }
  );
}

function usage() {
  console.error('Usage:');
  console.error('  node scripts/build-now.js <ideaId>');
  console.error('  node scripts/build-now.js --all');
  process.exit(2);
}

async function main() {
  const arg = process.argv[2];
  if (!arg) usage();

  if (arg === '--all') {
    const out = convexRun('ideas:triggerBuildAll', {});
    let parsed; try { parsed = JSON.parse(out); } catch { parsed = out; }
    const queued = parsed?.queued ?? '?';
    const total = parsed?.totalApproved ?? '?';
    console.log(`Queued ${queued}/${total} approved ideas for immediate build.`);
    console.log('build-monitor cron picks them up within ~2 minutes.');
    return;
  }

  if (arg.startsWith('-')) usage();

  try {
    convexRun('ideas:triggerBuild', { ideaId: arg });
    console.log(`Idea ${arg} queued for immediate build (priority=high).`);
    console.log('build-monitor cron picks it up within ~2 minutes.');
  } catch (err) {
    console.error('triggerBuild failed:', err.message.substring(0, 300));
    process.exit(1);
  }
}

main();
