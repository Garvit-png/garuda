// Checks data/entries.json for the mistakes AI-generated entries typically contain.
// Run: npm run validate   (exits 1 on any error)
import { readFileSync } from 'node:fs';
import { devanagariToIAST, normalizeDevanagari, phoneticKey, romanKey, phoneticDistance } from '../js/indic.js';
import { buildIndex, search } from '../js/search.js';

const entries = JSON.parse(readFileSync(new URL('../data/entries.json', import.meta.url), 'utf8'));
const errors = [];
const warnings = [];
const err = (e, msg) => errors.push(`#${e.id} ${e.headword}: ${msg}`);
const warn = (e, msg) => warnings.push(`#${e.id} ${e.headword}: ${msg}`);

const POS = /^(noun \((m|f)\.\)|adjective|verb|adverb|pronoun|indeclinable)$/;
const FIELDS = ['id', 'headword', 'transliteration', 'romanised', 'pos', 'meanings', 'example'];

if (entries.length < 50) errors.push(`only ${entries.length} entries; brief requires at least 50`);

const seenIds = new Set();
const seenHeadwords = new Map();
const spellingOwner = new Map();
const index = buildIndex(entries);

for (const e of entries) {
  // 1. Schema
  for (const f of FIELDS) if (!(f in e)) err(e, `missing field "${f}"`);
  const extra = Object.keys(e).filter((k) => !FIELDS.includes(k));
  if (extra.length) err(e, `unexpected fields ${extra.join(', ')}`);
  if (seenIds.has(e.id)) err(e, 'duplicate id');
  seenIds.add(e.id);
  if (!POS.test(e.pos)) err(e, `pos "${e.pos}" not in the starter-data style`);
  if (!Array.isArray(e.meanings) || !e.meanings.length) err(e, 'no meanings');
  if (!Array.isArray(e.romanised) || e.romanised.length < 2) warn(e, 'fewer than 2 romanised spellings');

  // 2. Headword is clean Devanagari (catches Latin letters, stray spaces, ZWJ)
  if (!/^[ऀ-ॿ]+$/.test(e.headword)) err(e, 'headword contains non-Devanagari characters');
  if (e.headword !== e.headword.normalize('NFC')) err(e, 'headword is not NFC-normalised');
  const norm = normalizeDevanagari(e.headword);
  if (seenHeadwords.has(norm)) err(e, `same word as #${seenHeadwords.get(norm)}`);
  seenHeadwords.set(norm, e.id);

  // 3. IAST must be exactly what the Devanagari spells (catches śikṣā/sikṣā, ā/a slips)
  const expected = devanagariToIAST(e.headword);
  if (expected !== e.transliteration.normalize('NFC')) err(e, `IAST "${e.transliteration}" but headword spells "${expected}"`);

  // 4. Romanised spellings: plain lowercase ASCII, sound like the headword, unique across entries
  const headKey = phoneticKey(e.headword);
  for (const r of e.romanised) {
    if (!/^[a-z]+$/.test(r)) err(e, `romanised "${r}" should be lowercase a-z`);
    const d = phoneticDistance(romanKey(r), headKey);
    if (d > 2) err(e, `romanised "${r}" is far from the headword's sound (${headKey}, distance ${d})`);
    else if (d > 1) warn(e, `romanised "${r}" is a loose spelling (distance ${d}); intentional?`);
    if (spellingOwner.has(r) && spellingOwner.get(r) !== e.id) err(e, `romanised "${r}" also used by #${spellingOwner.get(r)}`);
    spellingOwner.set(r, e.id);
    const top = search(index, r).results[0]?.entry.id;
    if (top !== e.id) err(e, `searching "${r}" returns #${top}, not this entry`);
  }
  if (new Set(e.romanised).size !== e.romanised.length) err(e, 'duplicate romanised spellings');

  // 5. Example sentence uses the headword and is a full Hindi sentence
  if (!normalizeDevanagari(e.example).includes(norm)) err(e, 'example sentence does not contain the headword');
  if (!/[।?!]$/.test(e.example)) err(e, 'example should end with । ? or !');
  if (/[a-zA-Z]/.test(e.example)) err(e, 'example contains Latin letters');
}

const ids = entries.map((e) => e.id);
if (ids.some((id, i) => id !== i + 1)) warnings.push('ids are not sequential 1..n');

for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(`\n${entries.length} entries, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
