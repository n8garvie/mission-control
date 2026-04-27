const fs = require('fs');

function getApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;

  // Convenience fallback for local dev: read from OpenClaw gateway profile.
  const authFile = '/home/n8garvie/.openclaw/agents/main/agent/auth-profiles.json';
  try {
    if (fs.existsSync(authFile)) {
      const auth = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
      const key = auth?.profiles?.['anthropic:default']?.key;
      if (key) return key;
    }
  } catch (err) {
    // ignore — caller will surface a clear error
  }
  return null;
}

async function complete({ model, system, messages, maxTokens, temperature }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set (or unreadable from OpenClaw profile)');
  }

  const body = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages,
  };
  if (system) body.system = system;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic ${response.status}: ${errText.substring(0, 300)}`);
  }

  const result = await response.json();
  const text = (result.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  return {
    text,
    usage: {
      inputTokens:  result.usage?.input_tokens ?? 0,
      outputTokens: result.usage?.output_tokens ?? 0,
    },
    raw: result,
  };
}

module.exports = { complete };
