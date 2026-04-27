/**
 * OpenRouter is provider-agnostic by design — every model lives behind
 * a uniform OpenAI-compatible chat/completions endpoint. Use this provider
 * to escape-hatch onto Mistral, Llama, DeepSeek, local Ollama proxies, etc.
 *
 *   LLM_BALANCED=openrouter:anthropic/claude-sonnet-4.6
 *   LLM_FAST=openrouter:google/gemini-flash-1.5
 *
 * The `model` part is the OpenRouter model slug, including the `vendor/` prefix.
 */
async function complete({ model, system, messages, maxTokens, temperature }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const finalMessages = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://mission-control.local',
      'X-Title': process.env.OPENROUTER_APP_TITLE || 'Mission Control',
    },
    body: JSON.stringify({
      model,
      messages: finalMessages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errText.substring(0, 300)}`);
  }

  const result = await response.json();
  const text = (result.choices?.[0]?.message?.content ?? '').trim();

  return {
    text,
    usage: {
      inputTokens:  result.usage?.prompt_tokens ?? 0,
      outputTokens: result.usage?.completion_tokens ?? 0,
    },
    raw: result,
  };
}

module.exports = { complete };
