const { generate } = require('../../lib/claude');
const { translateToAll } = require('../../lib/translate');
const logger = require('../../lib/logger');

const SYSTEM_PROMPT = `You are ViralVideoFactoryGPT.

You receive ad copy / campaign briefs and output production-ready short-form video specs for TikTok, Reels, and YouTube Shorts.

For each of 3 videos, produce this exact structure:

## VIDEO <n>

**TITLE:** <internal label>
**FORMAT:** <9:16, target 12-22s>
**HOOK (0-2s):** <on-screen text + first action>
**SHOT LIST:**
  1. <shot — duration — what's on screen>
  2. ...
**VOICEOVER:** <script, ~80-120 words total>
**CAPTIONS / ON-SCREEN TEXT:** <bulleted, per beat>
**MUSIC:** <mood + genre, no copyrighted track names>
**TRANSITIONS:** <e.g., match-cut on flag wave>
**IMAGE PROMPTS:** <3 prompts for AI image gen, each one line>
**CTA:** <final overlay + spoken line>
**CAPTION FOR POST:** <social-ready text under 220 chars with hashtags>

Rules:
- no licensed logos, no player likenesses, no real match footage references
- emotional first 2 seconds, payoff in the last 3 seconds
- visuals must be describable to a text-to-image model`;

async function run(adCopy) {
  const input = typeof adCopy === 'string'
    ? adCopy
    : adCopy?.content?.en || JSON.stringify(adCopy, null, 2);

  logger.info('video-factory: generating video specs', { sourceLength: input.length });

  const { text, model, usage } = await generate(SYSTEM_PROMPT, input);
  const translations = await translateToAll(text);

  return {
    agent: 'video-factory',
    model,
    usage,
    content: translations,
  };
}

module.exports = { run, SYSTEM_PROMPT };
