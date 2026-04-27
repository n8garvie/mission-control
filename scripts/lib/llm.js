/**
 * Provider-agnostic LLM dispatcher for Mission Control.
 *
 * Call sites use semantic roles ("fast" | "balanced" | "deep") and never name
 * a specific provider or model. The role -> provider:model map is set via env
 * vars so switching providers is one config change, no code edits.
 *
 *   const llm = require('./lib/llm');
 *   const { text, usage } = await llm.complete({
 *     role: 'balanced',
 *     system: '…',
 *     messages: [{ role: 'user', content: '…' }],
 *     maxTokens: 2000,
 *   });
 *
 * See LLM_CONFIG.md for the env var contract.
 */

const PROVIDERS = {
  anthropic:  require('./providers/anthropic'),
  openai:     require('./providers/openai'),
  google:     require('./providers/google'),
  openrouter: require('./providers/openrouter'),
};

const DEFAULT_ROLES = {
  fast:     'anthropic:claude-haiku-4-5',
  balanced: 'anthropic:claude-sonnet-4-6',
  deep:     'anthropic:claude-opus-4-7',
};

function resolveRole(role) {
  const envKey = {
    fast:     'LLM_FAST',
    balanced: 'LLM_BALANCED',
    deep:     'LLM_DEEP',
  }[role];
  if (!envKey) throw new Error(`Unknown LLM role: ${role}`);
  return process.env[envKey] || DEFAULT_ROLES[role];
}

function parseTarget(target) {
  const idx = target.indexOf(':');
  if (idx === -1) {
    throw new Error(`Bad LLM target "${target}" — expected "provider:model"`);
  }
  return { provider: target.slice(0, idx), model: target.slice(idx + 1) };
}

async function complete({ role = 'balanced', system, messages, maxTokens = 2000, temperature = 0.7 }) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('llm.complete: messages array required');
  }
  const target = resolveRole(role);
  const { provider, model } = parseTarget(target);
  const impl = PROVIDERS[provider];
  if (!impl) {
    const available = Object.keys(PROVIDERS).join(', ');
    throw new Error(`Unknown provider "${provider}" (available: ${available})`);
  }
  return impl.complete({ model, system, messages, maxTokens, temperature });
}

module.exports = { complete, resolveRole, parseTarget, DEFAULT_ROLES };
