// ============================================================
//  BannerCraft – Express Server
//  Stack: Node.js · Express · Sharp/Canvas · Stripe · Cloudinary
// ============================================================
require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const { logger } = require('./config/logger');

const uploadRoutes   = require('./routes/upload');
const previewRoutes  = require('./routes/preview');
const orderRoutes    = require('./routes/orders');
const webhookRoutes  = require('./routes/webhooks');
const adminRoutes    = require('./routes/admin');
const themeRoutes    = require('./routes/themes');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Stripe webhooks need raw body – mount BEFORE express.json()
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ──────────────────────────────────────────
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const uploadLimiter = rateLimit({ windowMs: 60 * 1000, max: 30,
  message: { error: 'Too many uploads. Please wait a minute.' } });

app.use('/api/', globalLimiter);
app.use('/api/upload', uploadLimiter);

// ── Routes ─────────────────────────────────────────────────
app.use('/api/themes',   themeRoutes);
app.use('/api/upload',   uploadRoutes);
app.use('/api/preview',  previewRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/admin',    adminRoutes);

// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Global error handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => logger.info(`BannerCraft API running on port ${PORT}`));
module.exports = app;
