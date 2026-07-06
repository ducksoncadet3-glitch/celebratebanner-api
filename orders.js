// ============================================================
//  orders.js — Milestone 5: order lifecycle foundation
//  Mounted at /api/orders. File-based, NO Stripe / print-provider integration.
//  (Replaces the earlier dead Stripe stub.)
//    POST  /                 create an order (default status checkout_started)   [OPEN — checkout]
//    GET   /:id              fetch an order (privacy-safe)                        [OPEN — order page]
//    PATCH /:id/status       transition status (validated) + append history      [ADMIN — x-admin-api-key]
//    GET   /                 list orders (reduced, paginated, filterable)         [ADMIN — x-admin-api-key]
//
//  Privacy: NEVER stores or returns card numbers or payment-method details —
//  only whitelisted order fields are persisted.
// ============================================================
const express = require('express');
const crypto  = require('crypto');
const store   = require('./store');
const { requireAdmin } = require('./admin-auth');
const {
  isValidId, readOrder, writeOrder, listOrders, readDesign, normalizeEmail,
  isValidOrderStatus, canTransition, markDesignPaid,
} = store;

const router = express.Router();

const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };
const clampInt = (v, def, min, max) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def; };

// Full order view for POST/GET:id — no card/payment-method fields are ever stored, so nothing to strip.
const orderView = (o) => o;
// Reduced list projection — hides full customer email (bulk exposure) behind hasEmail.
function orderListItem(o) {
  return {
    id: o.id,
    savedDesignId: o.savedDesignId || null,
    marketingProduct: o.marketingProduct || null,
    selectedPackage: o.selectedPackage || null,
    amount: o.amount, currency: o.currency,
    status: o.status,
    hasEmail: !!o.customerEmail,
    createdAt: o.createdAt, updatedAt: o.updatedAt,
  };
}

// POST /api/orders — create
router.post('/', (req, res) => {
  const b = req.body || {};

  // Validate savedDesignId when provided: must be a valid id AND an existing design.
  let savedDesignId = null;
  if (b.savedDesignId != null && b.savedDesignId !== '') {
    if (!isValidId(b.savedDesignId) || !readDesign(b.savedDesignId)) {
      return res.status(400).json({ error: 'invalid_saved_design' });
    }
    savedDesignId = b.savedDesignId;
  }

  const status = isValidOrderStatus(b.status) ? b.status : 'checkout_started';
  const now = new Date().toISOString();
  const notes = b.notes != null ? String(b.notes).slice(0, 500) : null;
  const order = {
    id: crypto.randomUUID(),
    savedDesignId,
    customerEmail: normalizeEmail(b.customerEmail),          // valid+normalized or null
    marketingProduct: b.marketingProduct ? String(b.marketingProduct).slice(0, 120) : null,
    selectedPackage: b.selectedPackage ? String(b.selectedPackage).slice(0, 120) : null,
    selectedAddOns: Array.isArray(b.selectedAddOns) ? b.selectedAddOns.slice(0, 20).map((x) => String(x).slice(0, 60)) : [],
    amount: num(b.amount),
    currency: (b.currency ? String(b.currency) : 'usd').toLowerCase().slice(0, 8),
    status,
    statusHistory: [{ status, updatedAt: now, changedBy: 'system', notes }],
    createdAt: now, updatedAt: now,
    notes,
  };
  // NOTE: any card / paymentMethod / token fields in the body are intentionally ignored.

  if (status === 'paid' && savedDesignId) markDesignPaid(savedDesignId);
  try { writeOrder(order); } catch (e) { return res.status(500).json({ error: 'write_failed' }); }
  res.status(201).json(orderView(order));
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const o = readOrder(req.params.id);
  if (!o) return res.status(404).json({ error: 'not_found' });
  res.json(orderView(o));
});

// PATCH /api/orders/:id/status — validated transition + history entry (ADMIN-ONLY)
router.patch('/:id/status', requireAdmin, (req, res) => {
  const { status, notes } = req.body || {};
  let { changedBy } = req.body || {};
  if (!isValidOrderStatus(status)) return res.status(400).json({ error: 'invalid_status' });
  if (changedBy !== 'admin' && changedBy !== 'system') changedBy = 'system';
  const o = readOrder(req.params.id);
  if (!o) return res.status(404).json({ error: 'not_found' });
  if (!canTransition(o.status, status)) {
    return res.status(409).json({ error: 'invalid_transition', from: o.status, to: status });
  }
  const now = new Date().toISOString();
  o.statusHistory.push({ status, updatedAt: now, changedBy, notes: notes != null ? String(notes).slice(0, 500) : null });
  o.status = status;
  o.updatedAt = now;
  if (status === 'paid' && o.savedDesignId) markDesignPaid(o.savedDesignId);
  try { writeOrder(o); } catch (e) { return res.status(500).json({ error: 'write_failed' }); }
  res.json(orderView(o));
});

// GET /api/orders — list (reduced, paginated, filterable) (ADMIN-ONLY)
router.get('/', requireAdmin, (req, res) => {
  const { status, savedDesignId } = req.query;
  const limit = clampInt(req.query.limit, 50, 1, 500);
  const offset = clampInt(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);
  let rows = listOrders();
  if (status) rows = rows.filter((o) => o.status === status);
  if (savedDesignId) rows = rows.filter((o) => o.savedDesignId === savedDesignId);
  rows.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const total = rows.length;
  const items = rows.slice(offset, offset + limit).map(orderListItem);
  res.json({ total, limit, offset, count: items.length, items });
});

module.exports = router;
