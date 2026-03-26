// ============================================================
//  routes/orders.js
//  POST /api/orders/checkout  – create Stripe Payment Intent
//  POST /api/orders/fulfill   – called after payment success
//  GET  /api/orders/:id       – retrieve order + download links
// ============================================================
const express  = require('express');
const Stripe   = require('stripe');
const { v4: uuid } = require('uuid');
const { getTheme, getOutputSpec } = require('../config/themes.config');
const { renderBanner }   = require('../services/render.service');
const cloudinaryService  = require('../services/cloudinary.service');
const emailService       = require('../services/email.service');
const { logger }         = require('../config/logger');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// In-memory store (replace with DB in production)
const ORDERS = new Map();

// ── Pricing table ─────────────────────────────────────────────
const PRICES = {
  '24x36': { digital: 4900, print: 6700 }, // cents
  '18x24': { digital: 3900, print: 5700 },
};

// ── POST /api/orders/checkout ─────────────────────────────────
router.post('/checkout', async (req, res) => {
  try {
    const { themeId, size, deliveryType, sessionId, photos, heroIndex, textFields, customerEmail } = req.body;

    if (!getTheme(themeId)) return res.status(400).json({ error: 'Invalid theme.' });
    if (!getOutputSpec(size)) return res.status(400).json({ error: 'Invalid size.' });
    if (!['digital', 'print'].includes(deliveryType)) return res.status(400).json({ error: 'Invalid delivery type.' });
    if (!customerEmail) return res.status(400).json({ error: 'Customer email required.' });

    const amount  = PRICES[size][deliveryType];
    const orderId = uuid();

    // Save pending order
    ORDERS.set(orderId, {
      id: orderId, status: 'pending_payment',
      themeId, size, deliveryType, sessionId,
      photos, heroIndex, textFields, customerEmail,
      createdAt: new Date(),
    });

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: { orderId, themeId, size, deliveryType },
      receipt_email: customerEmail,
    });

    logger.info('Checkout created', { orderId, amount, themeId, size });

    res.json({
      orderId,
      clientSecret: paymentIntent.client_secret,
      amount,
      currency: 'usd',
    });

  } catch (err) {
    logger.error('Checkout error', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/orders/fulfill ──────────────────────────────────
// Called internally by webhook after payment confirmed
router.post('/fulfill', async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = ORDERS.get(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.status === 'complete') return res.json({ message: 'Already fulfilled.' });

    order.status = 'rendering';
    ORDERS.set(orderId, order);

    // ── Render banner ───────────────────────────────────────
    logger.info('Starting render', { orderId });
    const { jpgBuffer, pdfBuffer } = await renderBanner({
      themeId:    order.themeId,
      size:       order.size,
      photos:     order.photos,
      heroIndex:  order.heroIndex,
      textFields: order.textFields,
    });

    // ── Upload final files to Cloudinary ────────────────────
    const [jpgResult, pdfResult] = await Promise.all([
      cloudinaryService.uploadBuffer(jpgBuffer, {
        folder: `bannercraft/outputs/${orderId}`,
        public_id: `banner_hires`,
        resource_type: 'image',
        format: 'jpg',
      }),
      cloudinaryService.uploadBuffer(pdfBuffer, {
        folder: `bannercraft/outputs/${orderId}`,
        public_id: `banner_print`,
        resource_type: 'raw',
        format: 'pdf',
      }),
    ]);

    order.status      = 'complete';
    order.jpgUrl      = jpgResult.secure_url;
    order.pdfUrl      = pdfResult.secure_url;
    order.completedAt = new Date();
    ORDERS.set(orderId, order);

    // ── Send email ──────────────────────────────────────────
    await emailService.sendOrderComplete({
      to:       order.customerEmail,
      orderId,
      jpgUrl:   order.jpgUrl,
      pdfUrl:   order.pdfUrl,
      themeName: getTheme(order.themeId)?.label || order.themeId,
      size:     order.size,
    });

    logger.info('Order fulfilled', { orderId });
    res.json({ success: true, orderId, jpgUrl: order.jpgUrl, pdfUrl: order.pdfUrl });

  } catch (err) {
    logger.error('Fulfillment error', { orderId: req.body.orderId, message: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/orders/:id ───────────────────────────────────────
router.get('/:id', (req, res) => {
  const order = ORDERS.get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  // Never expose internal photo buffers to client
  const { photos: _p, ...safe } = order;
  res.json(safe);
});

module.exports = router;
module.exports.ORDERS = ORDERS; // shared with webhook handler
