// "Share as image": draws a 1080×1350 word card (Instagram/WhatsApp portrait size)
// on a canvas. For a publisher, every shared card is free, branded reach.
import type { Entry } from '../lib/types.ts';
import { posText } from './dom.ts';

const INK = '#1c1410';
const MUTED = '#7a6a5e';
const LINE = '#ede6da';
const SAFFRON = '#c8622b';
const HEADER_BG = '#1c1410';
const SERIF_DEVA = "'Noto Serif Devanagari', 'Kohinoor Devanagari', serif";
const DEVA = "'Kohinoor Devanagari', 'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', sans-serif";
const LATIN = "-apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// Garuda wing brand mark (same five strokes as the app, viewBox 64×36)
const WING = 'M4 30C14 18 30 8 60 4M10 30.5C22 24 38 16 58 11M16 31.2C28 27 42 22 55 18M22 32C33 30 44 27 52 25M4 30 22 32';

function drawWing(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, alpha = 1, px = 3): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = SAFFRON;
  ctx.lineWidth = px / scale;
  ctx.lineCap = 'round';
  ctx.stroke(new Path2D(WING));
  ctx.restore();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function makeCard(entry: Entry, url = ''): Promise<Blob> {
  const W = 1080, H = 1350, X = 96, MAX = W - X * 2;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  try {
    await Promise.all([
      document.fonts.load(`800 200px 'Noto Serif Devanagari'`, entry.headword),
      document.fonts.load(`800 60px 'Noto Serif Devanagari'`, 'शब्दकोश'),
    ]);
  } catch { /* fall back to system fonts */ }

  ctx.fillStyle = '#fdf8f1';
  ctx.fillRect(0, 0, W, H);

  // Dark header band
  ctx.fillStyle = HEADER_BG;
  ctx.fillRect(0, 0, W, 420);

  drawWing(ctx, W - 600, 80, 9, 0.18, 5); // large faint wing in header

  // Brand: wing + शब्दकोश
  drawWing(ctx, X, 100, 1.8);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 56px ${SERIF_DEVA}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('शब्दकोश', X + 136, 158);
  ctx.font = `400 28px ${LATIN}`;
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('GARUDA PRAKASHAN', X + 136, 190);

  // Headword (shrinks to fit long words)
  let size = 210;
  ctx.font = `800 ${size}px ${SERIF_DEVA}`;
  while (ctx.measureText(entry.headword).width > MAX && size > 90) { size -= 10; ctx.font = `800 ${size}px ${SERIF_DEVA}`; }
  ctx.fillStyle = '#ffffff';
  ctx.fillText(entry.headword, X, 240 + size);
  let y = 240 + size + 88;

  ctx.font = `500 48px ${LATIN}`;
  ctx.fillStyle = SAFFRON;
  ctx.fillText(entry.romanised[0] ?? entry.transliteration, X, y);
  y += 58;
  ctx.font = `32px ${LATIN}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(`${posText(entry.pos)}  ·  ${entry.transliteration}`, X, y);
  y += 110;

  // Meanings, numbered in saffron
  for (const [i, m] of entry.meanings.slice(0, 3).entries()) {
    ctx.font = `500 50px ${LATIN}`;
    for (const [j, line] of wrap(ctx, m, MAX - 60).entries()) {
      if (j === 0) { ctx.fillStyle = SAFFRON; ctx.font = `700 50px ${LATIN}`; ctx.fillText(`${i + 1}.`, X, y); ctx.font = `500 50px ${LATIN}`; }
      ctx.fillStyle = INK;
      ctx.fillText(line, X + 58, y);
      y += 64;
    }
    y += 8;
  }

  // Example
  y += 24;
  ctx.font = `42px ${DEVA}`;
  const ex = wrap(ctx, entry.example, MAX - 60).slice(0, 3);
  if (y + ex.length * 62 + 40 < H - 160) {
    // Saffron left bar
    ctx.fillStyle = SAFFRON;
    ctx.fillRect(X, y + 10, 4, ex.length * 62 - 8);
    ctx.fillStyle = MUTED;
    ex.forEach((line, i) => ctx.fillText(line, X + 24, y + 46 + i * 62));
  }

  // Footer
  ctx.fillStyle = SAFFRON;
  ctx.fillRect(X, H - 148, 110, 3);
  ctx.fillStyle = LINE;
  ctx.fillRect(X + 110, H - 147, MAX - 110, 1);
  ctx.font = `500 32px ${LATIN}`;
  ctx.fillStyle = INK;
  ctx.fillText('Garuda Prakashan', X, H - 78);
  if (url) {
    ctx.font = `28px ${LATIN}`;
    ctx.fillStyle = MUTED;
    const u = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    ctx.fillText(u, W - X - ctx.measureText(u).width, H - 78);
  }

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}
