#!/usr/bin/env node
/**
 * LLM provider contract test.
 *
 * For every configured provider key in the env, sends the same minimal prompt
 * and asserts the response shape: non-empty text, numeric usage. Exits non-zero
 * if any configured provider fails so you can run this before switching the
 * `LLM_BALANCED` / `LLM_FAST` / `LLM_DEEP` env vars in production.
 *
 *   node scripts/test-llm-providers.js
 */

const llm = require('./lib/llm');

const SAMPLES = {
  anthropic:  { role: 'fast', target: 'anthropic:claude-haiku-4-5' },
  openai:     { role: 'fast', target: 'openai:gpt-5-mini' },
  google:     { role: 'fast', target: 'google:gemini-2.5-flash' },
  openrouter: { role: 'fast', target: 'openrouter:anthropic/claude-haiku-4.5' },
};

async function testProvider(name, target) {
  process.stdout.write(`  ${name} (${target})... `);
  // Stash and override the LLM_FAST env var so the dispatcher resolves to the target we want to test.
  const prev = process.env.LLM_FAST;
  process.env.LLM_FAST = target;
  try {
    const t0 = Date.now();
    const { text, usage } = await llm.complete({
      role: 'fast',
      messages: [{ role: 'user', content: 'Reply with just the word OK.' }],
      maxTokens: 10,
      temperature: 0,
    });
    const ms = Date.now() - t0;
    if (!text || typeof text !== 'string') throw new Error('empty text');
    if (typeof usage?.inputTokens !== 'number' || typeof usage?.outputTokens !== 'number') {
      throw new Error('usage missing token counts');
    }
    console.log(`ok (${ms}ms, ${usage.inputTokens}in/${usage.outputTokens}out, "${text.slice(0, 20)}")`);
    return true;
  } catch (err) {
    console.log(`FAIL: ${err.message}`);
    return false;
  } finally {
    if (prev === undefined) delete process.env.LLM_FAST;
    else process.env.LLM_FAST = prev;
  }
}

async function main() {
  const envKeys = {
    anthropic:  process.env.ANTHROPIC_API_KEY,
    openai:     process.env.OPENAI_API_KEY,
    google:     process.env.GOOGLE_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  };

  const configured = Object.entries(envKeys).filter(([, v]) => !!v).map(([k]) => k);
  if (configured.length === 0) {
    console.error('No LLM provider keys configured. Set at least one of ANTHROPIC_API_KEY / OPENAI_API_KEY / GOOGLE_API_KEY / OPENROUTER_API_KEY.');
    process.exit(1);
  }

  console.log(`Testing ${configured.length} configured provider(s):`);
  let failed = 0;
  for (const name of configured) {
    const ok = await testProvider(name, SAMPLES[name].target);
    if (!ok) failed++;
  }

  if (failed > 0) {
    console.error(`\n${failed} provider(s) failed`);
    process.exit(1);
  }
  console.log('\nAll configured providers ok');
}

main().catch((err) => {
  console.error('Test run crashed:', err.message);
  process.exit(1);
});
