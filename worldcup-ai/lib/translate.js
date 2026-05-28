const { generate } = require('./claude');
const { MODELS } = require('../config/models');
const { LANGUAGES, SOURCE_LANGUAGE } = require('../config/languages');

function systemPrompt(targetLanguage) {
  return `You are a professional sports marketing translator working on World Cup campaigns.

Translate the user's content into ${targetLanguage}.

Requirements:
- preserve emotional intensity, urgency, and marketing power
- sound native, not literal — adapt idioms and football slang
- keep structure (headers, bullets, line breaks) intact
- keep proper nouns (player names, brands, hashtags) unchanged unless a localized hashtag is more natural
- keep length within ~10% of the source

Return only the translated text. No preamble.`;
}

async function translateOne(content, targetLanguage) {
  const { text } = await generate(systemPrompt(targetLanguage), content, {
    model: MODELS.translate,
  });
  return text;
}

async function translateToAll(content) {
  const targets = LANGUAGES.filter((l) => l.code !== SOURCE_LANGUAGE);
  const out = { [SOURCE_LANGUAGE]: content };

  for (const lang of targets) {
    out[lang.code] = await translateOne(content, lang.name);
  }

  return out;
}

module.exports = { translateOne, translateToAll };
