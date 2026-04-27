# LLM Configuration

Mission Control is provider-agnostic. Every LLM call site (Scout idea
synthesis, agent spawns via OpenClaw, etc.) routes through
`scripts/lib/llm.js`, which dispatches by **role**, not by provider name.

## Roles

The dispatcher exposes three semantic roles. Pick the one whose latency /
cost / capability profile you want — never name a specific model in
application code.

| Role       | Use it for                                  | Default                      |
| ---------- | ------------------------------------------- | ---------------------------- |
| `fast`     | Latency-sensitive checks, classification    | `anthropic:claude-haiku-4-5` |
| `balanced` | Scout idea synthesis, normal agent thinking | `anthropic:claude-sonnet-4-6`|
| `deep`     | Forge architecture passes, integrator merge | `anthropic:claude-opus-4-7`  |

Override any role with an env var. Format: `provider:model-id`.

```bash
export LLM_FAST=openai:gpt-5-mini
export LLM_BALANCED=openai:gpt-5
export LLM_DEEP=anthropic:claude-opus-4-7
```

## Providers

| Provider     | Env var               | Notes                                                    |
| ------------ | --------------------- | -------------------------------------------------------- |
| `anthropic`  | `ANTHROPIC_API_KEY`   | Default. Falls back to OpenClaw profile for local dev.   |
| `openai`     | `OPENAI_API_KEY`      | Optional `OPENAI_BASE_URL` (Azure / proxy / local LLM).  |
| `google`     | `GOOGLE_API_KEY`      | Gemini family.                                           |
| `openrouter` | `OPENROUTER_API_KEY`  | Universal escape hatch — any model, one API.             |

Preflight (`scripts/preflight.js`) requires **at least one** provider key,
plus `CONVEX_DEPLOY_KEY`.

## Recipes

### Run entirely on OpenAI

```bash
export OPENAI_API_KEY=sk-...
export LLM_FAST=openai:gpt-5-mini
export LLM_BALANCED=openai:gpt-5
export LLM_DEEP=openai:gpt-5
```

### Run on Google Gemini

```bash
export GOOGLE_API_KEY=AIza...
export LLM_FAST=google:gemini-2.5-flash
export LLM_BALANCED=google:gemini-2.5-pro
export LLM_DEEP=google:gemini-2.5-pro
```

### Mixed providers via OpenRouter

```bash
export OPENROUTER_API_KEY=sk-or-...
export LLM_FAST=openrouter:google/gemini-flash-1.5
export LLM_BALANCED=openrouter:anthropic/claude-sonnet-4.6
export LLM_DEEP=openrouter:openai/gpt-5
```

### Local model via Ollama (OpenAI-compatible)

```bash
export OPENAI_API_KEY=ollama
export OPENAI_BASE_URL=http://localhost:11434/v1
export LLM_BALANCED=openai:llama3.1:70b
```

## Verifying

After changing provider env vars, run:

```bash
node scripts/test-llm-providers.js
```

It sends the same trivial prompt to every configured provider and asserts
the response shape (non-empty text, numeric token usage). Exits non-zero on
any provider failure so you can wire it into deploy preflight if you want.

## Adding a new provider

1. Drop a `scripts/lib/providers/<name>.js` exporting `complete({ model, system, messages, maxTokens, temperature })` that returns `{ text, usage: { inputTokens, outputTokens } }`.
2. Register it in `scripts/lib/llm.js` `PROVIDERS`.
3. Add a row to `SAMPLES` in `scripts/test-llm-providers.js` and an env-var case in `scripts/preflight.js`.
