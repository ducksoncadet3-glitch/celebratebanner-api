require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'CelebrateBanner API', ts: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.get('/api/themes', (req, res) => {
  res.json({
    themes: [
      { id: 'graduation',  name: 'Graduation',    maxPhotos: 50 },
      { id: 'champion',    name: 'Team Champion',  maxPhotos: 10 },
      { id: 'wedding',     name: 'Wedding',        maxPhotos: 30 },
      { id: 'anniversary', name: 'Anniversary',    maxPhotos: 25 },
      { id: 'pets',        name: 'Pets',           maxPhotos: 20 }
    ]
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CelebrateBanner API running on port ${PORT}`);
});
