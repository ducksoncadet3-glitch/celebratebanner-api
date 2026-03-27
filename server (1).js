require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['https://celebratebanner.com', 'https://app.celebratebanner.com'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString(), service: 'CelebrateBanner API' });
});

// Themes endpoint
app.get('/api/themes', (req, res) => {
  res.json({
    themes: [
      { id: 'graduation', name: 'Graduation', maxPhotos: 50, colors: ['#0A1628', '#C9A84C'] },
      { id: 'champion',   name: 'Team Champion', maxPhotos: 10, colors: ['#0A1E3D', '#4A9ECC'] },
      { id: 'wedding',    name: 'Wedding', maxPhotos: 30, colors: ['#2D1B4E', '#E8C4D8'] },
      { id: 'anniversary',name: 'Anniversary', maxPhotos: 25, colors: ['#3D0A0A', '#C9A84C'] },
      { id: 'pets',       name: 'Pets', maxPhotos: 20, colors: ['#0A2818', '#8BC34A'] }
    ]
  });
});

// Orders endpoint
app.post('/api/orders', async (req, res) => {
  try {
    const { email, theme, size, delivery, paymentMethodId } = req.body;
    if (!email || !theme || !size) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const prices = { '24x36': { digital: 4900, print: 6700 }, '18x24': { digital: 3900, print: 5700 } };
    const amount = prices[size]?.[delivery] || 4900;
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { email, theme, size, delivery }
    });
    res.json({ success: true, orderId: paymentIntent.id, amount });
  } catch (err) {
    console.error('Order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`CelebrateBanner API running on port ${PORT}`);
});
