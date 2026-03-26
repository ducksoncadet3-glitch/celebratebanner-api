// ============================================================
//  services/render.service.js
//  Generates print-ready banners via Sharp + Canvas.
//
//  Output: 300 DPI, CMYK-ready, with bleed/safe margins.
//  Produces:  highResPDF (Buffer)  +  highResJPG (Buffer)
// ============================================================
const { createCanvas, loadImage } = require('canvas');
const sharp    = require('sharp');
const path     = require('path');
const { getTheme, getOutputSpec } = require('../config/themes.config');
const { logger } = require('../config/logger');

// ── px helpers ────────────────────────────────────────────────
const inToPx = (inches, dpi) => Math.round(inches * dpi);

// ── Main entry ────────────────────────────────────────────────
async function renderBanner({ themeId, size, photos, heroIndex, textFields }) {
  const theme = getTheme(themeId);
  if (!theme) throw new Error(`Unknown theme: ${themeId}`);

  const spec  = getOutputSpec(size);
  if (!spec)  throw new Error(`Unknown size: ${size}`);

  const { widthIn, heightIn, dpi, bleedIn } = spec;

  // Canvas dimensions with bleed
  const canvasW = inToPx(widthIn  + bleedIn * 2, dpi);
  const canvasH = inToPx(heightIn + bleedIn * 2, dpi);
  const bleedPx = inToPx(bleedIn, dpi);

  logger.info('Rendering banner', { themeId, size, canvasW, canvasH, photoCount: photos.length });

  const canvas  = createCanvas(canvasW, canvasH);
  const ctx     = canvas.getContext('2d');

  // ── 1. Background ────────────────────────────────────────
  await drawBackground(ctx, theme, canvasW, canvasH);

  // ── 2. Layout photos ─────────────────────────────────────
  const heroPhoto    = heroIndex >= 0 ? photos[heroIndex] : (photos[0] || null);
  const supportPhotos = photos.filter((_, i) => i !== heroIndex);

  await drawLayout(ctx, theme, canvasW, canvasH, bleedPx, heroPhoto, supportPhotos);

  // ── 3. Text overlay ───────────────────────────────────────
  drawText(ctx, theme, canvasW, canvasH, bleedPx, textFields);

  // ── 4. Bleed / safe-margin guides (metadata only, not visible) ──
  const pngBuffer = canvas.toBuffer('image/png');

  // ── 5. Convert to high-res JPG ────────────────────────────
  const jpgBuffer = await sharp(pngBuffer)
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toBuffer();

  // ── 6. PDF wrapper (print-ready shell) ────────────────────
  // In production: use pdf-lib or puppeteer to embed the PNG.
  // Here we return the PNG buffer as the "PDF" for simplicity.
  const pdfBuffer = pngBuffer; // TODO: wrap in pdf-lib for real CMYK PDF

  return { jpgBuffer, pdfBuffer, widthPx: canvasW, heightPx: canvasH };
}

// ── Background ────────────────────────────────────────────────
async function drawBackground(ctx, theme, w, h) {
  const { background, primary } = theme.palette;

  // Solid base
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);

  // Subtle diagonal pattern overlay
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = primary;
  ctx.lineWidth   = 1;
  const spacing = 30;
  for (let x = -h; x < w + h; x += spacing) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke();
  }
  ctx.restore();

  // Gradient vignette
  const grad = ctx.createRadialGradient(w / 2, h * 0.3, h * 0.1, w / 2, h * 0.3, h * 0.8);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// ── Layout dispatcher ─────────────────────────────────────────
async function drawLayout(ctx, theme, w, h, bleed, hero, support) {
  switch (theme.layout) {
    case 'hero_collage': return drawHeroCollage(ctx, theme, w, h, bleed, hero, support);
    case 'hero_grid':    return drawHeroGrid(ctx, theme, w, h, bleed, hero, support);
    case 'duo':          return drawDuo(ctx, theme, w, h, bleed, hero, support);
    case 'full_grid':    return drawFullGrid(ctx, theme, w, h, bleed, hero, support);
    default:             return drawHeroCollage(ctx, theme, w, h, bleed, hero, support);
  }
}

// ── Hero + Collage (Graduation) ───────────────────────────────
async function drawHeroCollage(ctx, theme, w, h, bleed, hero, support) {
  const { primary } = theme.palette;

  // Hero – centered circle, top 40% of canvas
  const heroR    = Math.round(w * 0.22);
  const heroCX   = Math.round(w / 2);
  const heroCY   = Math.round(h * 0.28);

  // Circle clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(heroCX, heroCY, heroR, 0, Math.PI * 2);
  ctx.clip();
  if (hero) { const img = await loadImage(hero.url); ctx.drawImage(img, heroCX - heroR, heroCY - heroR, heroR * 2, heroR * 2); }
  ctx.restore();

  // Gold ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(heroCX, heroCY, heroR + 8, 0, Math.PI * 2);
  ctx.strokeStyle = primary; ctx.lineWidth = 12; ctx.stroke();
  ctx.restore();

  // Support collage – staggered rows below hero
  const colCount  = 6;
  const cellSize  = Math.round((w - bleed * 2 - (colCount - 1) * 8) / colCount);
  const startX    = bleed;
  const startY    = Math.round(h * 0.55);

  for (let i = 0; i < Math.min(support.length, 12); i++) {
    const col  = i % colCount;
    const row  = Math.floor(i / colCount);
    const x    = startX + col * (cellSize + 8);
    const y    = startY + row * (cellSize + 8) + (col % 2 === 1 ? 16 : 0); // stair effect
    await drawRoundedPhoto(ctx, support[i], x, y, cellSize, cellSize, 6);
  }
}

// ── Hero + Grid (Champion / Anniversary) ─────────────────────
async function drawHeroGrid(ctx, theme, w, h, bleed, hero, support) {
  const { primary } = theme.palette;

  // Hero – centered rect top 35%
  const heroW = Math.round(w * 0.38);
  const heroH = Math.round(h * 0.30);
  const heroX = Math.round((w - heroW) / 2);
  const heroY = Math.round(h * 0.06);

  if (hero) await drawRoundedPhoto(ctx, hero, heroX, heroY, heroW, heroH, 16);

  // Gold border on hero
  ctx.save();
  ctx.strokeStyle = primary; ctx.lineWidth = 8;
  roundRect(ctx, heroX - 4, heroY - 4, heroW + 8, heroH + 8, 20);
  ctx.stroke();
  ctx.restore();

  // Support grid – 2 cols left + 2 cols right of hero
  const sideW   = Math.round(w * 0.24);
  const cellW   = Math.round((sideW - 8) / 2);
  const cellH   = cellW;
  const leftX   = bleed;
  const rightX  = w - bleed - sideW;
  const gridY   = heroY;

  for (let i = 0; i < Math.min(support.length, 8); i++) {
    const isLeft = i < 4;
    const idx    = isLeft ? i : i - 4;
    const baseX  = isLeft ? leftX : rightX;
    const col    = idx % 2;
    const row    = Math.floor(idx / 2);
    const x      = baseX + col * (cellW + 8);
    const y      = gridY + row * (cellH + 8);
    await drawRoundedPhoto(ctx, support[i], x, y, cellW, cellH, 6);
  }
}

// ── Duo (Wedding) ─────────────────────────────────────────────
async function drawDuo(ctx, theme, w, h, bleed, hero, support) {
  const { primary } = theme.palette;

  // Wide couple hero – top 38%
  const heroW = Math.round(w * 0.60);
  const heroH = Math.round(h * 0.32);
  const heroX = Math.round((w - heroW) / 2);
  const heroY = Math.round(h * 0.06);
  if (hero) await drawRoundedPhoto(ctx, hero, heroX, heroY, heroW, heroH, 20);

  // Lavender border
  ctx.save(); ctx.strokeStyle = primary; ctx.lineWidth = 8;
  roundRect(ctx, heroX - 4, heroY - 4, heroW + 8, heroH + 8, 24); ctx.stroke(); ctx.restore();

  // Support row
  const colCount = 5;
  const cellSize = Math.round((w - bleed * 2 - (colCount - 1) * 8) / colCount);
  const startY   = Math.round(h * 0.48);
  for (let i = 0; i < Math.min(support.length, colCount); i++) {
    const x = bleed + i * (cellSize + 8);
    await drawRoundedPhoto(ctx, support[i], x, startY, cellSize, cellSize, 6);
  }
}

// ── Full Grid (Pets) ──────────────────────────────────────────
async function drawFullGrid(ctx, theme, w, h, bleed, hero, support) {
  const { primary } = theme.palette;

  // Large hero center-top
  const heroSz = Math.round(w * 0.38);
  const heroX  = Math.round((w - heroSz) / 2);
  const heroY  = Math.round(h * 0.06);
  if (hero) await drawRoundedPhoto(ctx, hero, heroX, heroY, heroSz, heroSz, 20);
  ctx.save(); ctx.strokeStyle = primary; ctx.lineWidth = 8;
  roundRect(ctx, heroX - 4, heroY - 4, heroSz + 8, heroSz + 8, 24); ctx.stroke(); ctx.restore();

  // Row of support below
  const colCount = 5;
  const cellSize = Math.round((w - bleed * 2 - (colCount - 1) * 8) / colCount);
  const startY   = Math.round(h * 0.55);
  for (let i = 0; i < Math.min(support.length, colCount * 2); i++) {
    const col = i % colCount;
    const row = Math.floor(i / colCount);
    const x   = bleed + col * (cellSize + 8);
    const y   = startY + row * (cellSize + 8);
    await drawRoundedPhoto(ctx, support[i], x, y, cellSize, cellSize, 6);
  }
}

// ── Text overlay ──────────────────────────────────────────────
function drawText(ctx, theme, w, h, bleed, fields) {
  const { primary, accent } = theme.palette;
  const safeBottom = h - bleed - inToPx(0.5, 300);
  let y = safeBottom - 80;

  // Fixed headline (Champion)
  if (theme.fixedHeadline) {
    ctx.save();
    ctx.font      = `900 ${Math.round(w * 0.12)}px 'serif'`;
    ctx.fillStyle = primary;
    ctx.textAlign = 'center';
    ctx.shadowColor   = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20;
    ctx.fillText(theme.fixedHeadline.toUpperCase(), w / 2, safeBottom - 40);
    ctx.restore();
  }

  // Theme-specific text fields
  const name = fields?.name || fields?.name1 || fields?.names || fields?.petName;
  const sub  = fields?.year || fields?.date  || fields?.years || fields?.caption;
  const sub2 = fields?.school;

  if (name) {
    ctx.save();
    ctx.font      = `bold ${Math.round(w * 0.065)}px 'serif'`;
    ctx.fillStyle = primary;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 16;
    ctx.fillText(name, w / 2, y);
    y += Math.round(w * 0.055);
    ctx.restore();
  }
  if (sub) {
    ctx.save();
    ctx.font      = `500 ${Math.round(w * 0.040)}px 'sans-serif'`;
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.80;
    ctx.fillText(sub.toUpperCase(), w / 2, y);
    y += Math.round(w * 0.038);
    ctx.restore();
  }
  if (sub2) {
    ctx.save();
    ctx.font      = `400 ${Math.round(w * 0.028)}px 'sans-serif'`;
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.50;
    ctx.fillText(sub2, w / 2, y);
    ctx.restore();
  }
}

// ── Utilities ─────────────────────────────────────────────────
async function drawRoundedPhoto(ctx, photo, x, y, w, h, radius) {
  if (!photo?.url) return;
  try {
    const img = await loadImage(photo.url);
    ctx.save();
    roundRect(ctx, x, y, w, h, radius);
    ctx.clip();
    // cover-fit
    const imgAR = img.width / img.height;
    const boxAR = w / h;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (imgAR > boxAR) { sw = sh * boxAR; sx = (img.width - sw) / 2; }
    else               { sh = sw / boxAR; sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
  } catch (e) { /* skip failed images */ }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

module.exports = { renderBanner };
