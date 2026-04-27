#!/usr/bin/env node
/**
 * Mission Control preflight — validates that required configuration is present
 * before any heartbeat / build / scout script runs.
 *
 * Required:
 *   CONVEX_DEPLOY_KEY  (or config/secrets.json -> convex.deployKey)
 *
 * Provider-aware (at least one must be set unless --skip-llm is passed):
 *   ANTHROPIC_API_KEY | OPENAI_API_KEY | GOOGLE_API_KEY | OPENROUTER_API_KEY
 *
 * Optional (warn only if missing):
 *   GITHUB_TOKEN, VERCEL_TOKEN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 *
 * Usage: node scripts/preflight.js [--skip-llm] [--quiet]
 * Exit codes: 0 = all good, 1 = required missing, 2 = optional missing (with --strict).
 */

const fs = require('fs');

const args = new Set(process.argv.slice(2));
const SKIP_LLM = args.has('--skip-llm');
const QUIET = args.has('--quiet');
const STRICT = args.has('--strict');

const SECRETS_FILE = '/home/n8garvie/.openclaw/workspace/mission-control/config/secrets.json';
let SECRETS = {};
if (fs.existsSync(SECRETS_FILE)) {
  try { SECRETS = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf-8')); } catch (err) {
    console.error(`[preflight] WARN: failed to parse ${SECRETS_FILE}: ${err.message}`);
  }
}

function log(msg) { if (!QUIET) console.log(`[preflight] ${msg}`); }
function err(msg) { console.error(`[preflight] ERROR: ${msg}`); }
function warn(msg) { if (!QUIET) console.warn(`[preflight] WARN:  ${msg}`); }

let hardFails = 0;
let softFails = 0;

const convexKey = process.env.CONVEX_DEPLOY_KEY || SECRETS.convex?.deployKey;
if (!convexKey) {
  err('CONVEX_DEPLOY_KEY is required (env var or config/secrets.json -> convex.deployKey)');
  hardFails++;
} else {
  log('CONVEX_DEPLOY_KEY: ok');
}

if (!SKIP_LLM) {
  const providers = [
    ['ANTHROPIC_API_KEY',  process.env.ANTHROPIC_API_KEY],
    ['OPENAI_API_KEY',     process.env.OPENAI_API_KEY],
    ['GOOGLE_API_KEY',     process.env.GOOGLE_API_KEY],
    ['OPENROUTER_API_KEY', process.env.OPENROUTER_API_KEY],
  ];
  const present = providers.filter(([, v]) => !!v).map(([k]) => k);
  if (present.length === 0) {
    err('At least one LLM provider key is required (ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, OPENROUTER_API_KEY).');
    err('See LLM_CONFIG.md for details.');
    hardFails++;
  } else {
    log(`LLM providers configured: ${present.join(', ')}`);
  }
}

const optional = [
  ['GITHUB_TOKEN',        process.env.GITHUB_TOKEN || SECRETS.github?.token],
  ['VERCEL_TOKEN',        process.env.VERCEL_TOKEN || SECRETS.vercel?.token],
  ['TELEGRAM_BOT_TOKEN',  process.env.TELEGRAM_BOT_TOKEN || SECRETS.telegram?.botToken],
  ['TELEGRAM_CHAT_ID',    process.env.TELEGRAM_CHAT_ID || SECRETS.telegram?.chatId],
];
for (const [name, value] of optional) {
  if (!value) {
    warn(`${name} not set (optional, related features will no-op)`);
    softFails++;
  } else {
    log(`${name}: ok`);
  }
}

if (hardFails > 0) process.exit(1);
if (STRICT && softFails > 0) process.exit(2);
log('preflight ok');
process.exit(0);
