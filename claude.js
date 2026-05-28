const MODELS = {
  agent: process.env.WCAI_AGENT_MODEL || 'claude-sonnet-4-6',
  translate: process.env.WCAI_TRANSLATE_MODEL || 'claude-sonnet-4-6',
  orchestrator: process.env.WCAI_ORCHESTRATOR_MODEL || 'claude-opus-4-7',
  image: process.env.WCAI_IMAGE_MODEL || 'gpt-image-1',
};

const LIMITS = {
  maxTokens: Number(process.env.WCAI_MAX_TOKENS || 4000),
};

module.exports = { MODELS, LIMITS };
