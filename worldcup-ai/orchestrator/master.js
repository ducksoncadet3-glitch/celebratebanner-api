require('dotenv').config();

const cron = require('node-cron');
const { runOnce } = require('../workflows/content-loop');
const logger = require('../lib/logger');

const SCHEDULE = process.env.WCAI_SCHEDULE || '0 * * * *';
const RUN_ON_BOOT = process.env.WCAI_RUN_ON_BOOT !== 'false';
const ENABLED = process.env.WCAI_SCHEDULE_ENABLED !== 'false';

async function safeRun() {
  try {
    const result = await runOnce();
    logger.info('orchestrator: run complete', result);
  } catch (err) {
    logger.error('orchestrator: run failed', { message: err.message, stack: err.stack });
  }
}

async function main() {
  logger.info('orchestrator: boot', { schedule: SCHEDULE, scheduleEnabled: ENABLED });

  if (ENABLED) {
    cron.schedule(SCHEDULE, safeRun);
    logger.info('orchestrator: cron scheduled');
  } else {
    logger.warn('orchestrator: cron disabled by WCAI_SCHEDULE_ENABLED=false');
  }

  if (RUN_ON_BOOT) {
    await safeRun();
  }
}

if (require.main === module) {
  main();
}

module.exports = { safeRun, main };
