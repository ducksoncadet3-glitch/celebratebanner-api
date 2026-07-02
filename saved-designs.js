// ============================================================
//  saved-designs.js  — Milestone 1: Automatic Design Save + Resume
//  File-based JSON persistence (no DB yet). One file per design at
//  data/saved-designs/<id>.json.
//
//  Endpoints (mounted at /api/saved-designs):
//    POST   /                    create a new saved design
//    GET    /:id                 fetch a saved design
//    PATCH  /:id                 update fields (+ updatedAt/lastActivityAt)
//    POST   /:id/heartbeat       bump lastActivityAt only
//
//  Privacy: stores ONLY photo metadata (id/name/width/height/size/type).
//  No photo binaries, no payment/card data, no login.
// ============================================================
const express = require('express');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const DATA_DIR = path.join(__dirname, 'data', 'saved-designs');
fs.mkdirSync(DATA_DIR, { recursive: true });

// Only accept ids we generate (uuid v4) — blocks path traversal.
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id) => typeof id === 'string' && ID_RE.test(id);
const idPath = (id) => path.join(DATA_DIR, id + '.json');

function readDesign(id) {
  if (!isValidId(id)) return null;
  try { return JSON.parse(fs.readFileSync(idPath(id), 'utf8')); }
  catch (e) { return null; }
}
function writeDesign(d) {
  fs.writeFileSync(idPath(d.id), JSON.stringify(d, null, 2));
}

const STATUSES = ['active', 'abandoned', 'paid'];
const STR_FIELDS = ['marketingProduct', 'theme', 'designMode', 'heroImageId', 'selectedPackage'];

function sanitizeImages(arr) {
  if (!Array.isArray(arr)) return undefined;
  return arr.slice(0, 200).map((im) => ({
    id: String(im && im.id || '').slice(0, 64),
    name: String(im && im.name || '').slice(0, 200),
    width: Number(im && im.width) || null,
    height: Number(im && im.height) || null,
    size: Number(im && im.size) || null,
    type: String(im && im.type || '').slice(0, 40),
  }));
}

// Apply only whitelisted fields from a request body onto a design record.
function applyFields(target, body) {
  body = body || {};
  if ('currentStep' in body) { const n = Number(body.currentStep); if (Number.isFinite(n)) target.currentStep = n; }
  for (const k of STR_FIELDS) {
    if (k in body) target[k] = (body[k] == null) ? null : String(body[k]).slice(0, 120);
  }
  if ('textFields' in body && body.textFields && typeof body.textFields === 'object') {
    const t = {};
    for (const kk of Object.keys(body.textFields).slice(0, 20)) {
      t[kk] = String(body.textFields[kk] == null ? '' : body.textFields[kk]).slice(0, 200);
    }
    target.textFields = t;
  }
  if ('selectedAddOns' in body && Array.isArray(body.selectedAddOns)) {
    target.selectedAddOns = body.selectedAddOns.slice(0, 20).map((x) => String(x).slice(0, 60));
  }
  if ('images' in body) { const s = sanitizeImages(body.images); if (s) target.images = s; }
  if ('status' in body && STATUSES.includes(body.status)) target.status = body.status;
}

const router = express.Router();

// POST /api/saved-designs — create
router.post('/', (req, res) => {
  const now = new Date().toISOString();
  const d = {
    id: crypto.randomUUID(),
    createdAt: now, updatedAt: now, lastActivityAt: now,
    currentStep: 0, marketingProduct: null, theme: null, designMode: 'smart',
    heroImageId: null, textFields: {}, selectedPackage: null, selectedAddOns: [],
    images: [], status: 'active',
  };
  applyFields(d, req.body);
  try { writeDesign(d); } catch (e) { return res.status(500).json({ error: 'write_failed' }); }
  res.status(201).json(d);
});

// GET /api/saved-designs/:id
router.get('/:id', (req, res) => {
  const d = readDesign(req.params.id);
  if (!d) return res.status(404).json({ error: 'not_found' });
  res.json(d);
});

// PATCH /api/saved-designs/:id — update fields
router.patch('/:id', (req, res) => {
  const d = readDesign(req.params.id);
  if (!d) return res.status(404).json({ error: 'not_found' });
  applyFields(d, req.body);
  const now = new Date().toISOString();
  d.updatedAt = now; d.lastActivityAt = now;
  try { writeDesign(d); } catch (e) { return res.status(500).json({ error: 'write_failed' }); }
  res.json(d);
});

// POST /api/saved-designs/:id/heartbeat — bump activity only
router.post('/:id/heartbeat', (req, res) => {
  const d = readDesign(req.params.id);
  if (!d) return res.status(404).json({ error: 'not_found' });
  d.lastActivityAt = new Date().toISOString();
  try { writeDesign(d); } catch (e) { return res.status(500).json({ error: 'write_failed' }); }
  res.json({ id: d.id, lastActivityAt: d.lastActivityAt, status: d.status });
});

module.exports = router;
