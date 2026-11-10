// Search engine. Pure: no DOM, no fetch. Usable from the app, Node, or any
// other platform that wants to embed Garuda's dictionary lookup.

import {
  hasDevanagari, normalizeDevanagari, devanagariToRoman, romanKey, phoneticKey, phoneticDistance,
} from './indic.js';

/** How many weighted edits we forgive, by length of the query key. */
export function fuzzyThreshold(len) {
  if (len <= 2) return 0;
  if (len === 3) return 0.5; // a full edit on 3 letters turns "ram" into "cam" (क्षमा)
  if (len === 4) return 1;
  if (len <= 7) return 1.5;
  return 2;
}

const cleanLatin = (s) => s.normalize('NFC').toLowerCase().replace(/[\s'’.-]+/g, '');

/** Pre-compute every searchable form of every entry. */
export function buildIndex(entries) {
  return entries.map((entry) => {
    const keys = new Map(); // phonetic key -> a human-readable spelling that produced it
    const add = (key, label) => { if (key && !keys.has(key)) keys.set(key, label); };
    add(romanKey(devanagariToRoman(entry.headword)), entry.romanised[0] ?? entry.transliteration);
    add(romanKey(entry.transliteration), entry.transliteration);
    for (const r of entry.romanised) add(romanKey(r), r);

    const raw = new Set([cleanLatin(entry.transliteration), ...entry.romanised.map(cleanLatin)]);
    const meaningWords = new Set(
      entry.meanings.join(' ').toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 1),
    );
    return { entry, keys, raw, dev: normalizeDevanagari(entry.headword), meaningWords };
  });
}

/**
 * @returns {{
 *   query: string, key: string, script: 'devanagari'|'latin'|null,
 *   results: Array<{entry, score:number, kind:'exact'|'spelling'|'prefix'|'fuzzy', via:string}>,
 *   meaningResults: Array<{entry, score:number, kind:'meaning', via:string}>,
 *   suggestions: Array<{entry, score:number, kind:'suggestion', via:string}>
 * }}
 * Kinds, best first:
 *   exact    - the query is the headword, the IAST, or a listed romanised spelling
 *   spelling - not listed, but sounds the same (same phonetic key): "dharam", "shaanti", "शान्ति"
 *   prefix   - the user is still typing: "prak" -> प्रकाश
 *   fuzzy    - within a few weighted typos: "prakesh", "vishvash"
 */
export function search(index, query, { limit = 20 } = {}) {
  const q = (query ?? '').trim();
  const empty = { query: q, key: '', script: null, results: [], meaningResults: [], suggestions: [] };
  if (!q) return empty;

  const isDev = hasDevanagari(q);
  const key = phoneticKey(q);
  const qDev = isDev ? normalizeDevanagari(q) : '';
  const qRaw = isDev ? '' : cleanLatin(q);
  if (!key && !qDev) return { ...empty, script: isDev ? 'devanagari' : 'latin' };
  const threshold = fuzzyThreshold(key.length);

  const results = [];
  for (const item of index) {
    let best = null;
    const consider = (score, kind, via) => { if (!best || score < best.score) best = { entry: item.entry, score, kind, via }; };

    if (isDev) {
      if (item.dev === qDev) consider(0, 'exact', item.entry.headword);
      else if (qDev && item.dev.startsWith(qDev)) consider(0.3 + 0.01 * (item.dev.length - qDev.length), 'prefix', item.entry.headword);
    } else if (item.raw.has(qRaw)) {
      consider(0, 'exact', q);
    }

    if (key) {
      for (const [k, label] of item.keys) {
        if (k === key) { consider(0.1, 'spelling', label); continue; }
        // Prefix-as-you-type only for Latin: Devanagari prefixes are handled on the script itself
        if (!isDev && k.startsWith(key)) consider(0.3 + 0.02 * (k.length - key.length), 'prefix', label);
        if (threshold > 0) {
          const d = phoneticDistance(key, k, threshold);
          if (d <= threshold) consider(1 + d, 'fuzzy', label);
        }
      }
    }
    if (best) results.push(best);
  }

  // When something matched outright, only keep near-identical fuzzy hits, so that
  // "dukh" (दुःख) doesn't also list "sukh" (सुख).
  // When only fuzzy hits exist, keep those close to the best one ("gyanee" -> ज्ञान, not अग्नि).
  const bestScore = Math.min(...results.map((r) => r.score));
  const cutoff = bestScore < 1 ? 1.5 : bestScore + 0.5;
  const filtered = results.filter((r) => r.score <= cutoff)
    .sort((a, b) => a.score - b.score || a.entry.headword.localeCompare(b.entry.headword, 'hi'))
    .slice(0, limit);

  // Reverse lookup: English word -> Hindi headword ("peace" -> शांति)
  const meaningResults = [];
  if (!isDev && qRaw.length >= 3) {
    const shown = new Set(filtered.map((r) => r.entry.id));
    const word = q.toLowerCase().trim();
    for (const item of index) {
      if (shown.has(item.entry.id)) continue;
      if (item.meaningWords.has(word)) meaningResults.push({ entry: item.entry, score: 0, kind: 'meaning', via: word });
      else if ([...item.meaningWords].some((w) => w.startsWith(word))) meaningResults.push({ entry: item.entry, score: 0.5, kind: 'meaning', via: word });
    }
    meaningResults.sort((a, b) => a.score - b.score);
  }

  // Nothing at all: offer the closest few anyway ("did you mean").
  let suggestions = [];
  if (!filtered.length && !meaningResults.length && key.length >= 3) {
    suggestions = index
      .map((item) => {
        let best = { d: Infinity, via: '' };
        for (const [k, label] of item.keys) {
          const d = phoneticDistance(key, k);
          if (d < best.d) best = { d, via: label };
        }
        return { entry: item.entry, score: best.d, kind: 'suggestion', via: best.via };
      })
      // Only near misses that start with the same sound: a "did you mean" that's
      // obviously unrelated (bharat -> धर्म) makes the app look careless.
      .filter((s) => s.score <= threshold + 1 && phoneticKey(s.via)[0] === key[0])
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
  }

  return { query: q, key, script: isDev ? 'devanagari' : 'latin', results: filtered, meaningResults, suggestions };
}
