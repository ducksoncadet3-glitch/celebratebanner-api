const Anthropic = require('@anthropic-ai/sdk');
const { MODELS, LIMITS } = require('../config/models');

let _client = null;
function client() {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

async function generate(system, prompt, opts = {}) {
  const model = opts.model || MODELS.agent;
  const maxTokens = opts.maxTokens || LIMITS.maxTokens;

  const response = await client().messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return { text, model, usage: response.usage };
}

module.exports = { generate };
