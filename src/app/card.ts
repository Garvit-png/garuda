// "Share as image": draws a 1080×1350 word card (Instagram/WhatsApp portrait size)
// on a canvas. For a publisher, every shared card is free, branded reach.
import type { Entry } from '../lib/types.ts';
import { posText } from './dom.ts';

const INK = '#1b1f3b';
const MUTED = '#5d6380';
const LINE = '#eceef4';
const BLUE = '#3346b0';
const GOLD = '#d08a1c';
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
  ctx.strokeStyle = GOLD;
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

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  drawWing(ctx, W - 600, 120, 9, 0.28, 4); // large faint wing behind the headword

  // Brand: wing + शब्दकोश in royal blue
  drawWing(ctx, X, 118, 1.6);
  ctx.fillStyle = BLUE;
  ctx.font = `800 56px ${SERIF_DEVA}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('शब्दकोश', X + 122, 170);

  // Headword (shrinks to fit long words)
  let size = 220;
  ctx.font = `800 ${size}px ${SERIF_DEVA}`;
  while (ctx.measureText(entry.headword).width > MAX && size > 90) { size -= 10; ctx.font = `800 ${size}px ${SERIF_DEVA}`; }
  ctx.fillStyle = INK;
  ctx.fillText(entry.headword, X - 6, 280 + size);
  let y = 280 + size + 90;

  ctx.font = `500 50px ${LATIN}`;
  ctx.fillStyle = BLUE;
  ctx.fillText(entry.romanised[0] ?? entry.transliteration, X, y);
  y += 62;
  ctx.font = `36px ${LATIN}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(`${posText(entry.pos)}  (${entry.transliteration})`, X, y);
  y += 120;

  // Meanings, numbered in gold
  for (const [i, m] of entry.meanings.slice(0, 3).entries()) {
    ctx.font = `500 52px ${LATIN}`;
    for (const [j, line] of wrap(ctx, m, MAX - 60).entries()) {
      if (j === 0) { ctx.fillStyle = GOLD; ctx.font = `700 52px ${LATIN}`; ctx.fillText(`${i + 1}.`, X, y); ctx.font = `500 52px ${LATIN}`; }
      ctx.fillStyle = INK;
      ctx.fillText(line, X + 60, y);
      y += 66;
    }
    y += 8;
  }

  // Example
  y += 30;
  ctx.font = `44px ${DEVA}`;
  const ex = wrap(ctx, entry.example, MAX - 70).slice(0, 3);
  if (y + ex.length * 66 + 50 < H - 170) {
    ctx.fillStyle = MUTED;
    ex.forEach((line, i) => ctx.fillText(line, X, y + 50 + i * 66));
  }

  // Footer
  ctx.fillStyle = GOLD;
  ctx.fillRect(X, H - 150, 120, 3);
  ctx.fillStyle = LINE;
  ctx.fillRect(X + 120, H - 149, MAX - 120, 1);
  ctx.font = `500 34px ${LATIN}`;
  ctx.fillStyle = INK;
  ctx.fillText('Garuda Prakashan', X, H - 80);
  if (url) {
    ctx.font = `30px ${LATIN}`;
    ctx.fillStyle = MUTED;
    const u = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    ctx.fillText(u, W - X - ctx.measureText(u).width, H - 80);
  }

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}
