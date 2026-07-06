// ============================================================
//  recovery-emails.js — Milestone 3: abandoned-cart recovery API
//  Mounted at /api/recovery-emails.
//    GET   /pending             abandoned designs eligible for a recovery email (+ recommended stage)
//    POST  /:id/mark-queued     queue a recovery email for a stage (does NOT send)
//    PATCH /:id/status          update the latest log entry for a stage
//
//  No emails are sent here. No photo binaries, no payment/card data exposed.
// ============================================================
const express = require('express');
const store   = require('./store');
const { isValidId, readDesign, writeDesign, listDesigns, recommendStage, isValidStage, isValidLogStatus } = store;

const router = express.Router();

// Curated, privacy-safe projection (never includes images/payment data).
function publicView(d, now) {
  return {
    id: d.id,
    email: d.email,
    marketingProduct: d.marketingProduct,
    theme: d.theme,
    status: d.status,
    abandonedAt: d.abandonedAt,
    lastActivityAt: d.lastActivityAt,
    recoveryStage: d.recoveryStage || null,
    recommendedStage: recommendStage(d, now),
    recoveryEmailLog: Array.isArray(d.recoveryEmailLog) ? d.recoveryEmailLog : [],
  };
}

// GET /api/recovery-emails/pending — abandoned designs with a stage currently due.
router.get('/pending', (req, res) => {
  const now = Date.now();
  const pending = listDesigns()
    .filter((d) => d.status === 'abandoned' && recommendStage(d, now))
    .map((d) => publicView(d, now));
  res.json({ count: pending.length, pending });
});

// POST /api/recovery-emails/:id/mark-queued — append a pending log entry for a stage.
router.post('/:id/mark-queued', (req, res) => {
  const { stage } = req.body || {};
  if (!isValidStage(stage)) return res.status(400).json({ error: 'invalid_stage' });
  const d = readDesign(req.params.id);
  if (!d) return res.status(404).json({ error: 'not_found' });
  if (d.status !== 'abandoned') return res.status(409).json({ error: 'not_abandoned' });
  if (!Array.isArray(d.recoveryEmailLog)) d.recoveryEmailLog = [];
  d.recoveryEmailLog.push({ stage, queuedAt: new Date().toISOString(), status: 'pending' });
  d.recoveryStage = stage;
  try { writeDesign(d); } catch (e) { return res.status(500).json({ error: 'write_failed' }); }
  res.status(201).json(publicView(d, Date.now()));
});

// PATCH /api/recovery-emails/:id/status — update the LATEST log entry for a stage.
router.patch('/:id/status', (req, res) => {
  const { stage, status, reason } = req.body || {};
  if (!isValidStage(stage)) return res.status(400).json({ error: 'invalid_stage' });
  if (!isValidLogStatus(status)) return res.status(400).json({ error: 'invalid_status' });
  const d = readDesign(req.params.id);
  if (!d) return res.status(404).json({ error: 'not_found' });
  const log = Array.isArray(d.recoveryEmailLog) ? d.recoveryEmailLog : [];
  let idx = -1;
  for (let i = log.length - 1; i >= 0; i--) { if (log[i] && log[i].stage === stage) { idx = i; break; } }
  if (idx === -1) return res.status(404).json({ error: 'no_log_entry' });
  log[idx].status = status;
  if (typeof reason === 'string') log[idx].reason = reason.slice(0, 300);
  d.recoveryEmailLog = log;
  try { writeDesign(d); } catch (e) { return res.status(500).json({ error: 'write_failed' }); }
  res.json(publicView(d, Date.now()));
});

module.exports = router;
