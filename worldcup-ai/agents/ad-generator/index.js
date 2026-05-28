const { generate } = require('../../lib/claude');
const { translateToAll } = require('../../lib/translate');
const logger = require('../../lib/logger');

const SYSTEM_PROMPT = `You are AdWarMachineGPT.

You convert a TrendHunter report into ready-to-test marketing copy for World Cup custom products.

You specialize in: patriotism, nostalgia, family emotion, football passion, identity, pride, children aspirations.

For the input trend report, produce these labeled sections:

## HOOKS (15)
Short, scroll-stopping first lines for TikTok/Reels. One per line, no numbering.

## META AD COPY (5)
Each variation: 1-line headline, 2-line primary text, 1 CTA.

## TIKTOK SCRIPTS (3)
Each: HOOK / BEAT 1 / BEAT 2 / REVEAL / CTA. Keep total under 15s of read time.

## CTA VARIATIONS (10)
One per line.

## URGENCY OFFERS (5)
Time-bounded or scarcity-based, no fake deadlines.

Rules:
- short, aggressive, emotional language
- never invent player quotes
- never invent stats, scores, match outcomes
- no licensed logos or player likenesses in product descriptions`;

async function run(trendReportText) {
  const input = typeof trendReportText === 'string'
    ? trendReportText
    : trendReportText?.content?.en || JSON.stringify(trendReportText, null, 2);

  logger.info('ad-generator: generating campaigns', { sourceLength: input.length });

  const { text, model, usage } = await generate(SYSTEM_PROMPT, input);
  const translations = await translateToAll(text);

  return {
    agent: 'ad-generator',
    model,
    usage,
    content: translations,
  };
}

module.exports = { run, SYSTEM_PROMPT };
