require('dotenv').config();

const express = require('express');
const queue = require('./lib/queue');
const { runOnce } = require('./workflows/content-loop');
const logger = require('./lib/logger');

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = Number(process.env.WCAI_PORT || 3100);

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'worldcup-ai', queue: queue.stats() });
});

app.get('/queue/:state', (req, res) => {
  const { state } = req.params;
  if (!queue.STATES.includes(state)) {
    return res.status(400).json({ error: `unknown state: ${state}` });
  }
  res.json(queue.list(state));
});

app.get('/queue/item/:id', (req, res) => {
  for (const state of queue.STATES) {
    const item = queue.get(req.params.id, state);
    if (item) return res.json(item);
  }
  res.status(404).json({ error: 'not found' });
});

app.post('/queue/:id/approve', (req, res) => {
  try {
    const reviewer = req.body?.reviewer || 'http';
    res.json(queue.approve(req.params.id, reviewer));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/queue/:id/reject', (req, res) => {
  try {
    const reviewer = req.body?.reviewer || 'http';
    const reason = req.body?.reason || '';
    res.json(queue.reject(req.params.id, reviewer, reason));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/run', async (req, res) => {
  try {
    const result = await runOnce({ signal: req.body?.signal });
    res.json(result);
  } catch (err) {
    logger.error('http: /run failed', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => logger.info(`worldcup-ai HTTP listening on :${PORT}`));
}

module.exports = app;
