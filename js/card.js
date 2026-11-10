// "Share as image": draws a 1080×1350 word card (Instagram/WhatsApp portrait size)
// on a canvas. For a publisher, every shared card is free, branded reach.

const GREEN = '#0e6b3f';
const INK = '#13201a';
const MUTED = '#5b6b62';
const TINT = '#eef6f1';
const DEVA = "'Kohinoor Devanagari', 'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', sans-serif";
const LATIN = "-apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function wrap(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** @returns {Promise<Blob>} PNG of the card */
export async function makeCard(entry, url = '') {
  const W = 1080, H = 1350, X = 96, MAX = W - X * 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  try { await document.fonts?.ready; } catch { /* ignore */ }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Brand: शब्दकोश with its shirorekha extended across the card
  ctx.fillStyle = GREEN;
  ctx.font = `600 44px ${DEVA}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('शब्दकोश', X, 150);
  const bw = ctx.measureText('शब्दकोश').width;
  ctx.fillRect(X + bw + 20, 116, W - X - (X + bw + 20), 4);
  ctx.beginPath(); ctx.arc(W - X, 118, 9, 0, Math.PI * 2); ctx.fill();

  // Headword (shrinks to fit long words)
  let size = 210;
  ctx.font = `600 ${size}px ${DEVA}`;
  while (ctx.measureText(entry.headword).width > MAX && size > 90) { size -= 10; ctx.font = `600 ${size}px ${DEVA}`; }
  ctx.fillStyle = INK;
  ctx.fillText(entry.headword, X - 6, 300 + size);
  let y = 300 + size + 80;

  ctx.font = `italic 46px ${LATIN}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(`${entry.transliteration}  ·  ${entry.pos}`, X, y);
  y += 90;

  // Meanings
  ctx.font = `500 52px ${LATIN}`;
  ctx.fillStyle = INK;
  entry.meanings.slice(0, 3).forEach((m, i) => {
    for (const [j, line] of wrap(ctx, m, MAX - 60).entries()) {
      if (j === 0) { ctx.fillStyle = GREEN; ctx.fillText(`${i + 1}`, X, y); ctx.fillStyle = INK; }
      ctx.fillText(line, X + 60, y);
      y += 66;
    }
    y += 8;
  });

  // Example in a tinted block with a green rule
  y += 30;
  ctx.font = `44px ${DEVA}`;
  const ex = wrap(ctx, entry.example, MAX - 70).slice(0, 3);
  const boxH = ex.length * 66 + 50;
  if (y + boxH < H - 170) {
    ctx.fillStyle = TINT; ctx.fillRect(X, y, MAX, boxH);
    ctx.fillStyle = GREEN; ctx.fillRect(X, y, 6, boxH);
    ctx.fillStyle = INK;
    ex.forEach((line, i) => ctx.fillText(line, X + 40, y + 70 + i * 66));
  }

  // Footer
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, H - 14, W, 14);
  ctx.font = `500 34px ${LATIN}`;
  ctx.fillStyle = INK;
  ctx.fillText('Garuda Prakashan', X, H - 80);
  if (url) {
    ctx.font = `30px ${LATIN}`;
    ctx.fillStyle = MUTED;
    const u = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    ctx.fillText(u, W - X - ctx.measureText(u).width, H - 80);
  }

  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}
