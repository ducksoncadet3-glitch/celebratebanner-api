# BannerCraft — Claude Code Project Guide

## Who I am
- **Founder & CEO:** Duckson Cadet
- **Email:** ducksoncadet3@gmail.com | info@celebratebanner.com
- **Phone:** +1 772-834-9060
- **Business:** CDN4 LLC (DBA CelebrateBanner / BannerCraft)
- **Address:** 211 Old Okeechobee Road, Bay 2 #1058, West Palm Beach, FL 33401

---

## What this project is
**BannerCraft** (celebratebanner.com) is a direct-to-consumer custom photo banner builder.

Users:
1. Pick a theme (Graduation or Champions)
2. Upload up to 50 photos, select 1 as hero
3. Customize text, palette, and size
4. Pay via Stripe → receive a 300 DPI CMYK print-ready PDF + JPG by email

Customers get either a **digital download** or a **professionally printed vinyl banner** shipped in 3–5 days via Printmoz (blind dropship partner).

---

## Architecture

```
celebratebanner.com        → Webflow (marketing site)
app.celebratebanner.com    → Vercel (React builder — this repo's frontend/)
api.celebratebanner.com    → Railway (Node.js backend — this repo's backend/)
admin.celebratebanner.com  → Vercel (admin panel)
```

### Frontend
- React 18 + Vite
- Single-page 5-step wizard: Theme → Upload → Design → Preview → Order
- Hosted on Vercel, auto-deploys from GitHub (ducksoncadet3-glitch)
- CSS Modules, Google Fonts (Playfair Display + DM Sans)

### Backend
- Node.js + Express on Railway
- Routes: /api/upload, /api/checkout, /api/webhook, /api/render, /api/admin
- Bull queue (Redis) for async render jobs
- Sharp image pipeline for final render

### Storage
- **Cloudinary** (cloud name: djqxuvkk0) — user photo uploads
- **AWS S3** — final rendered files (PDF + JPG)
- **CDN** — CloudFront for fast delivery

### Payments
- **Stripe Checkout** — handles all payments
- Webhook at /api/webhook triggers render on payment success

### Email
- **SendGrid** — order confirmation + download link emails

### Analytics
- GA4 + Meta Pixel (ViewContent, InitiateCheckout, Purchase events)

---

## Launch Themes

### A. Graduation
- Max photos: **50** (1 hero + auto collage/stair layout)
- Text fields: Name*, Class/Year*, School (optional)
- Default palette: Black & Gold (editable: Navy, Crimson, Green)
- Background: dark navy gradient

### B. Champions
- Max photos: **10** (1 hero + 9 supporting grid)
- Fixed headline: **"Champions"** (not editable)
- Text fields: Team Name*, Season/Year
- Palette: Sky blue / white / gold (fixed)
- Background: generic stadium + lights
- ⚠️ NO licensed logos, NO player likenesses

---

## Output Specs (non-negotiable)
- Sizes: **24×36 in** ($49) and **18×24 in** ($39)
- Resolution: **300 DPI**
- Color mode: **CMYK**
- Formats: **PDF** (print-ready + bleed) **+ JPG** (digital)
- Bleed: **0.125 in** on all sides
- Safe margin: **0.25 in** from trim edge

---

## Pricing
| Product | Price |
|---------|-------|
| Digital Download | $19 |
| Printed Banner (24×36) | $49 |
| Printed Banner (18×24) | $39 |

Print fulfillment: **Printmoz** (contact: Dom Smith, dom@printmoz.com)
- Blind dropship with CelebrateBanner return address
- Reseller certificate (DR-13) submitted for Florida

---

## Environment Variables Needed

### Backend (Railway)
```
PORT=4000
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://app.celebratebanner.com
CLOUDINARY_CLOUD_NAME=djqxuvkk0
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=bannercraft-renders
REDIS_URL=redis://...
SENDGRID_API_KEY=SG....
EMAIL_FROM=orders@celebratebanner.com
EMAIL_FROM_NAME=CelebrateBanner
ADMIN_SECRET=...
ANTHROPIC_API_KEY=...  ← named "CelebrateBanner" in Anthropic Console
ALLOWED_ORIGINS=https://app.celebratebanner.com,https://celebratebanner.com
```

### Frontend (Vercel)
```
VITE_API_URL=https://api.celebratebanner.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_GA4_MEASUREMENT_ID=G-...
VITE_META_PIXEL_ID=...
```

---

## GitHub
- Repo: **ducksoncadet3-glitch**
- Workflow: Edit files in GitHub web editor → Vercel auto-deploys
- Preferred deploy: Download complete file from Claude → GitHub web editor → Select All → Paste → Commit

---

## Current Status & Pending Items
- [ ] Printmoz reseller pricing confirmation pending (Dom Smith)
- [ ] Update pricing across all assets once Printmoz confirms
- [ ] Upload updated index.html to builder with America250 THEMES patch
- [ ] Fix live site footer (still shows Fort Pierce, © 2025 — should be West Palm Beach, © 2026)
- [ ] Deploy orderAgent.js after Printmoz partnership confirmed
- [ ] Add ANTHROPIC_API_KEY to Railway Variables

---

## Other Active Products (same platform)

### America250 (U.S. 250th Anniversary)
- Landing page: **america-250.celebratebanner.com**
- GitHub: ducksoncadet3-glitch/america-250
- Pitch deck, outreach emails, and partnership app to America250 Foundation in progress

### World Cup 2026
- Watch Party landing page + theme for the banner builder
- Tournament window: June 12 – July 19, 2026

### Haitian Flag Day (May 18, 2026)
- Bilingual French/Haitian Creole promotional banners
- Social media + print formats

---

## Key Rules for Claude Code
1. **Never change pricing** without Printmoz confirmation first
2. **Always deliver complete files** — no partial snippets. Duckson pastes full files into GitHub.
3. **No licensed logos or player likenesses** in any Champion theme assets
4. **CMYK + 300 DPI** is non-negotiable for all print outputs
5. **Test before committing** — run `npm run dev` and verify both frontend and backend start cleanly
6. **Stripe webhook** must use raw body — do not move the webhook route below `express.json()`
7. When adding new themes, always update `shared/themeConfig.json` first — it is the single source of truth

---

## Quick Start Commands
```bash
# Install everything
npm run install:all

# Start dev (frontend + backend together)
npm run dev

# Backend only
cd backend && npm run dev

# Frontend only
cd frontend && npm run dev

# Start render worker separately
cd backend && npm run worker
```

---

## Acceptance Criteria (go-live checklist)
- [ ] Upload + preview works per theme photo limits (preview ≤ 30s)
- [ ] Final render ≤ 60s at 300 DPI CMYK PDF + JPG
- [ ] Payment completes → order stored → email with download link sent
- [ ] Admin can toggle themes and change photo limits without code changes
- [ ] Staging demo every Friday → UAT pass = go-live
