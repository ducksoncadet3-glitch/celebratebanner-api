const trendHunter = require('../agents/trend-hunter');
const adGenerator = require('../agents/ad-generator');
const videoFactory = require('../agents/video-factory');
const { writeMultilingualOutput } = require('./multilingual-posts');
const queue = require('../lib/queue');
const logger = require('../lib/logger');

const DEFAULT_SIGNAL = `Sample input (replace with real trend signal feed):
- Brazil dramatic late winner against Argentina; #Brasil trending on TikTok
- Viral kid in a Senegal jersey scoring a goal in his living room (Reels)
- Mexico fans organizing watch parties across the US Southwest
- Haitian diaspora calling for Haiti-themed wall banners`;

async function runOnce(options = {}) {
  const signal = options.signal || DEFAULT_SIGNAL;
  const runId = `run-${Date.now()}`;
  logger.info('content-loop: start', { runId });

  const trend = await trendHunter.run(signal);
  writeMultilingualOutput('trend-hunter', trend.content, runId);
  const trendQueueItem = queue.enqueue({
    type: 'trend-report',
    runId,
    agent: trend.agent,
    model: trend.model,
    content: trend.content,
  });
  logger.info('trend-hunter: queued', { id: trendQueueItem.id });

  const ads = await adGenerator.run(trend);
  writeMultilingualOutput('ad-generator', ads.content, runId);
  const adQueueItem = queue.enqueue({
    type: 'ad-campaign',
    runId,
    parentId: trendQueueItem.id,
    agent: ads.agent,
    model: ads.model,
    content: ads.content,
  });
  logger.info('ad-generator: queued', { id: adQueueItem.id });

  const videos = await videoFactory.run(ads);
  writeMultilingualOutput('video-factory', videos.content, runId);
  const videoQueueItem = queue.enqueue({
    type: 'video-spec',
    runId,
    parentId: adQueueItem.id,
    agent: videos.agent,
    model: videos.model,
    content: videos.content,
  });
  logger.info('video-factory: queued', { id: videoQueueItem.id });

  logger.info('content-loop: done', { runId });

  return {
    runId,
    items: [trendQueueItem.id, adQueueItem.id, videoQueueItem.id],
  };
}

module.exports = { runOnce };
