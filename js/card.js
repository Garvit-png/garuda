// "Share as image": draws a 1080×1350 word card (Instagram/WhatsApp portrait size)
// on a canvas. For a publisher, every shared card is free, branded reach.

const INK = '#1d1d1f';
const MUTED = '#6e6e73';
const LINE = '#e8e8ea';
const SERIF_DEVA = "'Noto Serif Devanagari', 'Kohinoor Devanagari', serif";
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
  try {
    await Promise.all([document.fonts.load(`800 200px 'Noto Serif Devanagari'`, entry.headword),
      document.fonts.load(`800 60px 'Noto Serif Devanagari'`, 'शब्दकोश')]);
  } catch { /* fall back to system fonts */ }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Brand
  ctx.fillStyle = INK;
  ctx.font = `800 56px ${SERIF_DEVA}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('शब्दकोश', X, 170);

  // Headword (shrinks to fit long words)
  let size = 220;
  ctx.font = `800 ${size}px ${SERIF_DEVA}`;
  while (ctx.measureText(entry.headword).width > MAX && size > 90) { size -= 10; ctx.font = `800 ${size}px ${SERIF_DEVA}`; }
  ctx.fillText(entry.headword, X - 6, 280 + size);
  let y = 280 + size + 90;

  // Pronunciation and part of speech: plain grey text, no fills
  const parts = entry.pos.match(/^(\S+)\s*\((.+)\)$/);
  const pos = parts ? `${parts[1]}, ${{ 'f.': 'feminine', 'm.': 'masculine' }[parts[2]] ?? parts[2]}` : entry.pos;
  ctx.font = `48px ${LATIN}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(`/${entry.transliteration}/`, X, y);
  y += 64;
  ctx.font = `38px ${LATIN}`;
  ctx.fillText(pos, X, y);
  y += 120;

  // Meanings
  ctx.font = `500 52px ${LATIN}`;
  ctx.fillStyle = INK;
  entry.meanings.slice(0, 3).forEach((m, i) => {
    for (const [j, line] of wrap(ctx, m, MAX - 60).entries()) {
      if (j === 0) { ctx.font = `700 52px ${LATIN}`; ctx.fillText(`${i + 1}.`, X, y); ctx.font = `500 52px ${LATIN}`; }
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
    ctx.fillStyle = MUTED;
    ex.forEach((line, i) => ctx.fillText(line, X, y + 50 + i * 66));
  }

  // Footer

  ctx.fillStyle = LINE;
  ctx.fillRect(X, H - 150, MAX, 2);
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
