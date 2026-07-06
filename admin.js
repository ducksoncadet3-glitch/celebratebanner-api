// ============================================================
//  admin.js — Milestone 4: read-only admin/reporting endpoints
//  Mounted at /api/admin. Protected by ADMIN_API_KEY (header: x-admin-api-key).
//
//  Privacy: never returns the images array, full text fields, photo binaries,
//  or payment/card data. Email is reduced to a hasEmail boolean.
// ============================================================
const express = require('express');
const crypto  = require('crypto');
const store   = require('./store');
const { listDesigns, recommendStage } = store;

const router = express.Router();

// ── Auth ─────────────────────────────────────────────────────
// No ADMIN_API_KEY configured → 503. Missing/wrong header → 401. Otherwise allow.
function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
router.use((req, res, next) => {
  const key = process.env.ADMIN_API_KEY;
  if (!key) return res.status(503).json({ error: 'Admin API not configured' });
  const provided = req.get('x-admin-api-key');
  if (!provided || !safeEqual(provided, key)) return res.status(401).json({ error: 'unauthorized' });
  next();
});

// ── Helpers ──────────────────────────────────────────────────
const imageCount = (d) => (Array.isArray(d.images) ? d.images.length : 0);

// Privacy-safe summary for the saved-designs list (no email/images/text).
function summarize(d) {
  return {
    id: d.id,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    lastActivityAt: d.lastActivityAt,
    currentStep: d.currentStep,
    marketingProduct: d.marketingProduct,
    theme: d.theme,
    designMode: d.designMode,
    selectedPackage: d.selectedPackage,
    selectedAddOns: Array.isArray(d.selectedAddOns) ? d.selectedAddOns : [],
    status: d.status,
    hasEmail: !!d.email,
    consentToEmail: d.consentToEmail === true,
    abandonedAt: d.abandonedAt || null,
    recoveryStage: d.recoveryStage || null,
    imageCount: imageCount(d),
  };
}

const clampInt = (v, def, min, max) => {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
};

// 1. GET /api/admin/saved-designs — paginated, filterable summary list.
router.get('/saved-designs', (req, res) => {
  const { status, marketingProduct, emailCaptured } = req.query;
  const limit = clampInt(req.query.limit, 50, 1, 500);
  const offset = clampInt(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);

  let rows = listDesigns();
  if (status) rows = rows.filter((d) => d.status === status);
  if (marketingProduct) rows = rows.filter((d) => d.marketingProduct === marketingProduct);
  if (emailCaptured === 'true') rows = rows.filter((d) => !!d.email);
  else if (emailCaptured === 'false') rows = rows.filter((d) => !d.email);

  rows.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  const total = rows.length;
  const items = rows.slice(offset, offset + limit).map(summarize);
  res.json({ total, limit, offset, count: items.length, items });
});

// 2. GET /api/admin/abandoned-carts — abandoned designs with recovery info.
router.get('/abandoned-carts', (req, res) => {
  const now = Date.now();
  const items = listDesigns()
    .filter((d) => d.status === 'abandoned')
    .sort((a, b) => String(b.abandonedAt || '').localeCompare(String(a.abandonedAt || '')))
    .map((d) => ({
      id: d.id,
      abandonedAt: d.abandonedAt || null,
      lastActivityAt: d.lastActivityAt,
      marketingProduct: d.marketingProduct,
      selectedPackage: d.selectedPackage,
      imageCount: imageCount(d),
      recoveryStage: d.recoveryStage || null,
      recommendedStage: recommendStage(d, now),
      recoveryEmailLog: Array.isArray(d.recoveryEmailLog) ? d.recoveryEmailLog : [],
      hasEmail: !!d.email,
      consentToEmail: d.consentToEmail === true,
    }));
  res.json({ count: items.length, items });
});

// 3. GET /api/admin/funnel — counts derived from saved-design fields.
router.get('/funnel', (req, res) => {
  const rows = listDesigns();
  const funnel = {
    designStarted: rows.length,
    productSelected: rows.filter((d) => !!d.marketingProduct).length,
    photosUploaded: rows.filter((d) => imageCount(d) > 0).length,
    proofGenerated: rows.filter((d) => Number(d.currentStep) >= 3).length,
    emailCaptured: rows.filter((d) => !!d.email).length,
    checkoutStarted: 0,
    paid: rows.filter((d) => d.status === 'paid').length,
    abandoned: rows.filter((d) => d.status === 'abandoned').length,
  };
  res.json({
    ...funnel,
    notes: {
      proofGenerated: 'Approximated by reaching the Preview step (currentStep >= 3); no explicit proof flag is stored yet.',
      checkoutStarted: 'Not tracked yet — checkout is a client-side redirect with no server event. Returns 0 until instrumented.',
      emailCaptured: 'Counts designs with a stored email (see also consentToEmail / emailCapturedAt).',
    },
  });
});

// 4. GET /api/admin/revenue — placeholder until Stripe/order integration exists.
router.get('/revenue', (req, res) => {
  res.json({
    totalRevenue: 0,
    orders: 0,
    averageOrderValue: 0,
    note: 'Revenue data requires Stripe/order integration.',
  });
});

// 5. GET /api/admin/health — quick counts (only reachable when configured + authed).
router.get('/health', (req, res) => {
  const rows = listDesigns();
  res.json({
    ok: true,
    savedDesignCount: rows.length,
    abandonedCount: rows.filter((d) => d.status === 'abandoned').length,
    adminConfigured: true,
  });
});

module.exports = router;
