const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '256kb' }));

// CORS — additive, no dependency. No credentials/cookies, so reflecting the
// origin (or '*') is safe. Handles file:// (Origin: null) for local testing.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/', (req, res) => res.json({ status: 'ok' }));

// Milestone 1: automatic design save + resume
app.use('/api/saved-designs', require('./saved-designs'));

app.listen(PORT, '0.0.0.0', () => console.log('Running on port ' + PORT));
