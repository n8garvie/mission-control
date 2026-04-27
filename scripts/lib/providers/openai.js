async function complete({ model, system, messages, maxTokens, temperature }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const apiBase = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  const finalMessages = system
    ? [{ role: 'system', content: system }, ...messages]
    : messages;

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
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
    throw new Error(`OpenAI ${response.status}: ${errText.substring(0, 300)}`);
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
