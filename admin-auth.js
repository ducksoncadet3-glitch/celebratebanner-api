// ============================================================
//  admin-auth.js — shared ADMIN_API_KEY guard (header: x-admin-api-key)
//    ADMIN_API_KEY not set        → 503 "Admin API not configured"
//    header missing / wrong       → 401 unauthorized
//    correct key                  → next()
//  Used by /api/admin (all routes) and the protected /api/orders routes.
// ============================================================
const crypto = require('crypto');

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function requireAdmin(req, res, next) {
  const key = process.env.ADMIN_API_KEY;
  if (!key) return res.status(503).json({ error: 'Admin API not configured' });
  const provided = req.get('x-admin-api-key');
  if (!provided || !safeEqual(provided, key)) return res.status(401).json({ error: 'unauthorized' });
  next();
}

module.exports = { requireAdmin, safeEqual };
