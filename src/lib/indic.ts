// Indic text utilities. Pure functions, no DOM: runs in the browser and in Node.
//
// The core idea: every spelling of a word (Devanagari headword, IAST, any
// romanised variant, whatever the user types) is reduced to a loose
// "phonetic key". Two spellings that a Hindi reader would pronounce the same
// should end up with the same (or a very close) key.

const HALANT = '्';
const ANUSVARA = 'ं';
const CHANDRABINDU = 'ँ';
const VISARGA = 'ः';
const NUKTA = '़';
const ZW = /[‌‍]/g; // ZWNJ / ZWJ, which some keyboards insert

type Table = Record<string, string>;
type ArticulationClass = 'v' | 'p' | 'r' | 'd' | 'l' | '';

const VOWELS: Table = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ii', 'उ': 'u', 'ऊ': 'uu', 'ऋ': 'ri', 'ॠ': 'rii',
  'ऌ': 'li', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऍ': 'e', 'ऑ': 'o',
};
const MATRAS: Table = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ii', 'ु': 'u', 'ू': 'uu', 'ृ': 'ri', 'ॄ': 'rii',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॅ': 'e', 'ॉ': 'o',
};
// [loose roman, IAST, articulation class used for anusvara -> nasal in IAST]
const CONS: Record<string, [string, string, ArticulationClass]> = {
  'क': ['k', 'k', 'v'], 'ख': ['kh', 'kh', 'v'], 'ग': ['g', 'g', 'v'], 'घ': ['gh', 'gh', 'v'], 'ङ': ['n', 'ṅ', 'v'],
  'च': ['ch', 'c', 'p'], 'छ': ['chh', 'ch', 'p'], 'ज': ['j', 'j', 'p'], 'झ': ['jh', 'jh', 'p'], 'ञ': ['n', 'ñ', 'p'],
  'ट': ['t', 'ṭ', 'r'], 'ठ': ['th', 'ṭh', 'r'], 'ड': ['d', 'ḍ', 'r'], 'ढ': ['dh', 'ḍh', 'r'], 'ण': ['n', 'ṇ', 'r'],
  'त': ['t', 't', 'd'], 'थ': ['th', 'th', 'd'], 'द': ['d', 'd', 'd'], 'ध': ['dh', 'dh', 'd'], 'न': ['n', 'n', 'd'],
  'प': ['p', 'p', 'l'], 'फ': ['ph', 'ph', 'l'], 'ब': ['b', 'b', 'l'], 'भ': ['bh', 'bh', 'l'], 'म': ['m', 'm', 'l'],
  'य': ['y', 'y', ''], 'र': ['r', 'r', ''], 'ल': ['l', 'l', ''], 'ळ': ['l', 'ḷ', ''], 'व': ['v', 'v', ''],
  'श': ['sh', 'ś', ''], 'ष': ['sh', 'ṣ', ''], 'स': ['s', 's', ''], 'ह': ['h', 'h', ''],
};
// Consonant + nukta (Urdu/Persian sounds). NFD splits क़ into क + ़.
const NUKTA_ROMAN: Table = { 'ज': 'z', 'फ': 'f', 'ड': 'r', 'ढ': 'rh', 'क': 'q', 'ख': 'kh', 'ग': 'g' };
const CLASS_NASAL: Table = { v: 'ṅ', p: 'ñ', r: 'ṇ', d: 'n', l: 'm' };
const IAST_VOWELS: Table = {
  'अ': 'a', 'आ': 'ā', 'इ': 'i', 'ई': 'ī', 'उ': 'u', 'ऊ': 'ū', 'ऋ': 'ṛ', 'ॠ': 'ṝ', 'ऌ': 'ḷ',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
};
const IAST_MATRAS: Table = {
  'ा': 'ā', 'ि': 'i', 'ी': 'ī', 'ु': 'u', 'ू': 'ū', 'ृ': 'ṛ', 'ॄ': 'ṝ', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
};

export const hasDevanagari = (s: string): boolean => /[ऀ-ॿ]/.test(s);

/**
 * Canonical Devanagari for string comparison. Folds spellings that Hindi
 * readers treat as the same word:
 *   शान्ति -> शांति (half nasal before a consonant -> anusvara)
 *   माँ -> मां (chandrabindu -> anusvara)
 *   दुःख -> दुख (visarga dropped), ज़ -> ज (nukta dropped), ZWJ/ZWNJ removed
 */
export function normalizeDevanagari(s: string): string {
  return s
    .normalize('NFD')
    .replace(ZW, '')
    .replace(new RegExp(NUKTA, 'g'), '')
    .replace(new RegExp(CHANDRABINDU, 'g'), ANUSVARA)
    .replace(new RegExp(VISARGA, 'g'), '')
    .replace(/[ङञणनम]्(?=[क-ह])/g, ANUSVARA)
    .replace(/[\s।॥.,!?'"-]+/g, '')
    .normalize('NFC');
}

/** Devanagari -> loose ASCII romanisation (inherent vowel kept), e.g. धर्म -> dharma. */
export function devanagariToRoman(input: string): string {
  const chars = [...input.normalize('NFD').replace(ZW, '')];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const cons = CONS[c];
    if (cons) {
      let base = cons[0];
      let j = i + 1;
      if (chars[j] === NUKTA) { base = NUKTA_ROMAN[c] ?? base; j++; }
      // ज्ञ is pronounced "gy" in Hindi (ज्ञान = gyan)
      if (c === 'ज' && chars[j] === HALANT && chars[j + 1] === 'ञ') { base = 'gy'; j += 2; }
      const next = chars[j];
      if (next === HALANT) { out += base; i = j; }
      else if (next !== undefined && MATRAS[next] !== undefined) { out += base + MATRAS[next]; i = j; }
      else { out += base + 'a'; i = j - 1; }
    } else if (VOWELS[c]) out += VOWELS[c];
    else if (c === ANUSVARA) out += 'n';
    else if (c === CHANDRABINDU || c === VISARGA || c === NUKTA) { /* nasalisation / visarga: not typed by users */ }
    else if (c >= '०' && c <= '९') out += String(c.charCodeAt(0) - 0x0966);
    else if (/[a-zA-Z0-9]/.test(c)) out += c.toLowerCase();
    // anything else (danda, punctuation, stray matras) is dropped
  }
  return out;
}

/** Devanagari -> IAST (Sanskrit-style, final inherent "a" kept). Used to validate the dataset. */
export function devanagariToIAST(input: string): string {
  const chars = [...input.normalize('NFD').replace(ZW, '')];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const cons = CONS[c];
    if (cons) {
      const base = cons[1];
      const next = chars[i + 1];
      if (next === HALANT) { out += base; i++; }
      else if (next !== undefined && IAST_MATRAS[next] !== undefined) { out += base + IAST_MATRAS[next]; i++; }
      else out += base + 'a';
    } else if (IAST_VOWELS[c]) out += IAST_VOWELS[c];
    else if (c === ANUSVARA) {
      // Before a stop, anusvara is read as the nasal of that stop's class (शांति -> śānti);
      // before sibilants, semivowels or at word end it stays ṃ (संस्कृत -> saṃskṛta).
      const cls = CONS[chars[i + 1] ?? '']?.[2];
      out += cls ? CLASS_NASAL[cls] : 'ṃ';
    } else if (c === CHANDRABINDU) out += 'm̐';
    else if (c === VISARGA) out += 'ḥ';
  }
  return out.normalize('NFC');
}

/**
 * Any Latin-script spelling (IAST, "shanti", "SHAANTI", "śānti") -> phonetic key.
 * Rules are applied identically to the query and to every stored spelling,
 * so they only need to be consistent, not linguistically perfect.
 */
export function romanKey(input: string): string {
  let s = input.normalize('NFC').toLowerCase();
  // IAST letters whose diacritic carries meaning
  s = s.replace(/[śṣ]/g, 'sh').replace(/ṝ|ṛ/g, 'ri').replace(/ḷ/g, 'l')
    .replace(/[ṃṁ]/g, 'm').replace(/ḥ/g, '').replace(/[ñṅṇ]/g, 'n');
  // remaining diacritics (ā ī ū ṭ ḍ ...) just drop to the base letter
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  s = s
    .replace(/jn/g, 'gy')            // jñāna / jnana -> gyana
    .replace(/chh/g, 'c').replace(/ch/g, 'c') // c = the "ch" sound (IAST c too)
    .replace(/sh/g, 's')             // ś / ṣ / sh / s: users mix them freely (siksha, santi)
    .replace(/x/g, 'ks')
    .replace(/w/g, 'v')              // vishwas / vishvas
    .replace(/ph/g, 'f')
    .replace(/z/g, 'j')
    .replace(/q/g, 'k')
    .replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/ou/g, 'au')
    .replace(/m(?=[^aeioum])/g, 'n') // anusvara: samskriti / sanskriti, ahimsa / ahinsa
    .replace(/(.)\1+/g, '$1');       // aa -> a, dd -> d, ii -> i (length/gemination)
  // Schwa deletion: Hindi drops the final inherent vowel (dharma ~ dharm, samaya ~ samay)
  if (s.length > 3 && /[^aeiou]a$/.test(s)) s = s.slice(0, -1);
  s = s.replace(/ay$/, 'ai');        // samay ~ samai
  return s;
}

/** Key for any input, whatever the script. */
export function phoneticKey(input: string): string {
  return romanKey(hasDevanagari(input) ? devanagariToRoman(input) : input);
}

const isVowel = (ch: string): boolean => 'aeiou'.includes(ch);

/**
 * Weighted Damerau-Levenshtein (optimal string alignment) distance between keys.
 * Cheaper edits for confusions that are normal when romanising Hindi:
 *   vowel <-> vowel substitution  0.5   (vruksh / vriksh, sunder / sundar)
 *   inserting/dropping a vowel    0.5   (dharam / dharm, kirpa / kripa)
 *   inserting/dropping "h"        0.5   (pusthak / pustak, aspiration)
 * Everything else costs 1.
 */
export function phoneticDistance(a: string, b: string, max = Infinity): number {
  const n = a.length, m = b.length;
  if (Math.abs(n - m) * 0.5 > max) return Infinity;
  const indel = (ch: string) => (isVowel(ch) || ch === 'h' ? 0.5 : 1);
  const sub = (x: string, y: string) => (x === y ? 0 : isVowel(x) && isVowel(y) ? 0.5 : 1);
  let prev2: number[] | null = null;
  let prev: number[] = new Array(m + 1);
  prev[0] = 0;
  for (let j = 1; j <= m; j++) prev[j] = prev[j - 1] + indel(b[j - 1]);
  for (let i = 1; i <= n; i++) {
    const cur: number[] = new Array(m + 1);
    cur[0] = prev[0] + indel(a[i - 1]);
    let rowMin = cur[0];
    for (let j = 1; j <= m; j++) {
      let v = Math.min(
        prev[j] + indel(a[i - 1]),
        cur[j - 1] + indel(b[j - 1]),
        prev[j - 1] + sub(a[i - 1], b[j - 1]),
      );
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return Infinity;
    prev2 = prev;
    prev = cur;
  }
  return prev[m];
}
