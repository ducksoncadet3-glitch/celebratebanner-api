const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/', (req, res) => res.json({ status: 'ok' }));
app.listen(PORT, '0.0.0.0', () => console.log('Running on port ' + PORT));
