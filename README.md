# BannerCraft – Backend API

Custom Photo Banner Builder · Node.js · Express · Sharp · Stripe · Cloudinary

---

## Architecture

```
Client (React/Webflow)
        │
        ▼
  Express API (Node.js)
  ├── /api/themes       → list enabled themes & configs
  ├── /api/upload       → multer → Sharp compress → Cloudinary
  ├── /api/preview      → fast 72-DPI render → JPG response
  ├── /api/orders       → Stripe PaymentIntent → fulfill → email
  ├── /api/webhooks     → Stripe event handler
  └── /api/admin        → theme toggle, order management, stats
        │
        ▼
  Render Service (Sharp + Canvas)
  → 300 DPI · CMYK-ready · bleed/safe margins
  → PDF + JPG → Cloudinary → email download links
```

---

## Quick Start

```bash
cp .env.example .env
# Fill in Stripe, Cloudinary, SMTP values

npm install
npm run dev        # API on :3001
```

---

## API Reference

### Themes
```
GET /api/themes
→ { themes: [ { id, label, maxPhotos, textFields, palette, ... } ] }
```

### Upload
```
POST /api/upload/photos
Content-Type: multipart/form-data
Body: photos[] (files), themeId, sessionId
→ { photos: [ { publicId, url, width, height, dpiWarning } ] }
```

### Preview
```
POST /api/preview/generate
Body: { themeId, size, photos, heroIndex, textFields, sessionId }
→ image/jpeg  (72 DPI fast preview, cached 5 min)
```

### Checkout
```
POST /api/orders/checkout
Body: { themeId, size, deliveryType, photos, heroIndex, textFields, customerEmail, sessionId }
→ { orderId, clientSecret, amount, currency }
```

### Order Status
```
GET /api/orders/:id
→ { id, status, themeId, size, jpgUrl, pdfUrl, ... }
```

### Admin (requires X-Admin-Key header)
```
GET   /api/admin/themes          → all themes with config
PATCH /api/admin/themes/:id      → update any theme field
GET   /api/admin/orders?page=1   → paginated order list
GET   /api/admin/stats           → revenue, counts, by-theme
```

---

## Output Specs

| Size   | Pixels (with bleed) | DPI | Format         |
|--------|---------------------|-----|----------------|
| 24×36" | 7350 × 10950 px     | 300 | JPG + PDF      |
| 18×24" | 5550 × 7350 px      | 300 | JPG + PDF      |

Bleed: 0.125" per side · Safe zone: 0.25" from trim edge

---

## Theme Config (no-code toggle)

Admins can update any theme without a code deploy:

```bash
curl -X PATCH https://api.bannercraft.com/api/admin/themes/graduation \
  -H "X-Admin-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{ "enabled": false, "maxPhotos": 40 }'
```

---

## Production Checklist

- [ ] Replace in-memory `ORDERS` Map with PostgreSQL / DynamoDB
- [ ] Add JWT auth to admin routes
- [ ] Use SQS/Bull queue for render jobs (prevents timeout on large photo sets)
- [ ] Swap Canvas PDF output for `pdf-lib` (true CMYK PDF)
- [ ] Add CDN signed URLs for download links (expiry)
- [ ] Set up GA4 + Meta Pixel server-side events
- [ ] DMCA / ToS page linked from checkout

---

## Tech Stack

| Layer       | Technology                     |
|-------------|-------------------------------|
| API         | Node.js 20 · Express 4        |
| Image proc  | Sharp 0.33 · node-canvas 2.11 |
| Storage     | Cloudinary (or AWS S3)        |
| Payments    | Stripe (PaymentIntents API)   |
| Email       | SendGrid (Nodemailer SMTP)    |
| Queue       | Bull + Redis (optional)       |
| Logging     | Winston                       |
| Hosting     | Railway / Render / AWS ECS    |

---

## Contact

Duckson Cadet – ducksoncadet3@gmail.com · +1 772-834-9060
