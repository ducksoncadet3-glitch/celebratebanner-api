// ============================================================
//  store.js — shared file-based persistence + abandoned-cart helpers
//  One JSON file per saved design at data/saved-designs/<id>.json.
//  No DB, no photo binaries, no payment/card data.
// ============================================================
const fs   = require('fs');
const path = require('path');

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
function listDesigns() {
  let files = [];
  try { files = fs.readdirSync(DATA_DIR); } catch (e) { return []; }
  const out = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const d = readDesign(f.slice(0, -5));
    if (d) out.push(d);
  }
  return out;
}

// ── Email ────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function normalizeEmail(v) {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase();
  return EMAIL_RE.test(e) && e.length <= 254 ? e : null;
}

// ── Abandoned-cart / recovery (Milestone 3) ──────────────────
const ABANDON_AFTER_MS = 30 * 60 * 1000;                 // MVP: 30 minutes of inactivity
const RECOVERY_STAGES = ['1h', '24h', '72h'];
const STAGE_AFTER_MS = { '1h': 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000, '72h': 72 * 60 * 60 * 1000 };
const LOG_STATUSES = ['pending', 'sent', 'skipped'];
const isValidStage = (s) => RECOVERY_STAGES.includes(s);
const isValidLogStatus = (s) => LOG_STATUSES.includes(s);

// A design can be abandoned only if: status active, has email, consent true, not paid,
// and lastActivityAt older than the threshold.
function isAbandonable(d, now) {
  if (!d || d.status !== 'active') return false;
  if (!d.email || d.consentToEmail !== true) return false;
  const last = Date.parse(d.lastActivityAt || d.updatedAt || d.createdAt || '');
  if (!Number.isFinite(last)) return false;
  return (now - last) >= ABANDON_AFTER_MS;
}

// Recommended next recovery stage for an abandoned design (earliest stage that is DUE by
// abandonedAt and not already queued/sent), or null if none due / all handled. Sequential:
// a stage only becomes recommendable once earlier stages have been logged.
function recommendStage(d, now) {
  if (!d || d.status !== 'abandoned' || !d.abandonedAt) return null;
  const ab = Date.parse(d.abandonedAt);
  if (!Number.isFinite(ab)) return null;
  const log = Array.isArray(d.recoveryEmailLog) ? d.recoveryEmailLog : [];
  const handled = new Set(log.filter((e) => e && (e.status === 'pending' || e.status === 'sent')).map((e) => e.stage));
  for (const stage of RECOVERY_STAGES) {
    if (handled.has(stage)) continue;                    // already queued/sent
    if ((now - ab) >= STAGE_AFTER_MS[stage]) return stage; // earliest due, not-yet-handled
    return null;                                          // this stage not due yet → nothing earlier is either
  }
  return null;
}

// Clear abandoned/recovery state when a design goes back to active (reactivation).
function reactivate(d) {
  d.status = 'active';
  d.abandonedAt = null;
  d.recoveryStage = null;
}

module.exports = {
  DATA_DIR, isValidId, readDesign, writeDesign, listDesigns, normalizeEmail,
  ABANDON_AFTER_MS, RECOVERY_STAGES, STAGE_AFTER_MS, LOG_STATUSES,
  isValidStage, isValidLogStatus, isAbandonable, recommendStage, reactivate,
};
