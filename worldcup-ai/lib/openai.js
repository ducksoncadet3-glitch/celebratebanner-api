const OpenAI = require('openai');
const { MODELS } = require('../config/models');

let _client = null;
function client() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

async function generateImage(prompt, opts = {}) {
  const model = opts.model || MODELS.image;
  const size = opts.size || '1024x1024';

  const response = await client().images.generate({ model, prompt, size });
  return response.data[0];
}

module.exports = { generateImage };
