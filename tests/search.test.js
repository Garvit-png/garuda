import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildIndex, search } from '../js/search.js';
import { normalizeDevanagari, devanagariToIAST, phoneticKey } from '../js/indic.js';

const entries = JSON.parse(readFileSync(new URL('../data/entries.json', import.meta.url), 'utf8'));
const index = buildIndex(entries);
const top = (q) => search(index, q).results[0]?.entry.headword;

test('brief example: धर्म, dharma, dharm all return the same entry', () => {
  for (const q of ['धर्म', 'dharma', 'dharm', 'Dharma', '  DHARM  ', 'dharam', 'dharmā']) {
    assert.equal(top(q), 'धर्म', q);
  }
});

test('every listed romanised spelling and the IAST find their own entry first', () => {
  for (const e of entries) {
    for (const q of [e.headword, e.transliteration, ...e.romanised]) {
      assert.equal(top(q), e.headword, `${q} -> expected ${e.headword}`);
    }
  }
});

test('spellings NOT in the romanised list still work (phonetic key)', () => {
  const cases = {
    shaantee: 'शांति', vrksha: 'वृक्ष', jnaan: 'ज्ञान', gyaana: 'ज्ञान', samskrit: 'संस्कृत',
    sanskritee: 'संस्कृति', vishvaas: 'विश्वास', swatantrataa: 'स्वतंत्रता', ahinsaa: 'अहिंसा',
    prakaasha: 'प्रकाश', mandeera: 'मंदिर', chandr: 'चंद्र', kshamaa: 'क्षमा', jeewan: 'जीवन',
    rashtr: 'राष्ट्र', sabda: 'शब्द', priTHvee: 'पृथ्वी', aatmaa: 'आत्मा', samaye: 'समय',
  };
  for (const [q, want] of Object.entries(cases)) assert.equal(top(q), want, q);
});

test('IAST with diacritics, with and without them', () => {
  assert.equal(top('śānti'), 'शांति');
  assert.equal(top('saṃskṛti'), 'संस्कृति');
  assert.equal(top('duḥkha'), 'दुःख');
  assert.equal(top('jñāna'), 'ज्ञान');
  assert.equal(top('candra'), 'चंद्र');
});

test('Devanagari spelling variants: half-nasal vs anusvara, visarga, chandrabindu, ZWJ', () => {
  assert.equal(top('शान्ति'), 'शांति');       // न् + त vs ं
  assert.equal(top('सुन्दर'), 'सुंदर');
  assert.equal(top('चन्द्र'), 'चंद्र');
  assert.equal(top('मन्दिर'), 'मंदिर');
  assert.equal(top('ग्रन्थ'), 'ग्रंथ');
  assert.equal(top('आनन्द'), 'आनंद');
  assert.equal(top('दुख'), 'दुःख');           // without visarga
  assert.equal(top('क्‍षमा'), 'क्षमा');    // ZWJ inserted by some keyboards
  assert.equal(top('शान्ति।'), 'शांति');      // trailing danda
});

test('NFC vs NFD input gives the same result', () => {
  assert.equal(top('शांति'.normalize('NFD')), 'शांति');
  assert.equal(top('śānti'.normalize('NFD')), 'शांति');
});

test('Devanagari prefix while typing', () => {
  const r = search(index, 'प्र').results.map((x) => x.entry.headword);
  assert.ok(r.includes('प्रकाश') && r.includes('प्रेम') && r.includes('प्राचीन'), r.join());
  assert.equal(top('शां'), 'शांति');
});

test('Roman prefix while typing', () => {
  assert.equal(top('prak'), 'प्रकाश');
  assert.equal(top('swat'), 'स्वतंत्रता');
});

test('typo tolerance', () => {
  const cases = {
    prakesh: 'प्रकाश', vishvash: 'विश्वास', shikhsa: 'शिक्षा', santhi: 'शांति', sanskirti: 'संस्कृति',
    parivra: 'परिवार', bhsha: 'भाषा', atihti: 'अतिथि', dhyna: 'ध्यान', swastiya: 'स्वास्थ्य',
  };
  for (const [q, want] of Object.entries(cases)) {
    const r = search(index, q).results;
    assert.equal(r[0]?.entry.headword, want, `${q} -> ${r.map((x) => x.entry.headword).join()}`);
  }
});

test('exact match suppresses unrelated fuzzy hits', () => {
  const r = search(index, 'dukh').results.map((x) => x.entry.headword);
  assert.deepEqual(r, ['दुःख']);
});

test('English reverse lookup', () => {
  assert.equal(search(index, 'peace').meaningResults[0].entry.headword, 'शांति');
  assert.equal(search(index, 'tree').meaningResults[0].entry.headword, 'वृक्ष');
});

test('no results: gibberish returns nothing; near-miss returns suggestions', () => {
  const g = search(index, 'qwxyzzk');
  assert.equal(g.results.length + g.meaningResults.length, 0);
  const n = search(index, 'xyz');
  assert.equal(n.results.length, 0);
  assert.equal(search(index, '').results.length, 0);
  assert.equal(search(index, '!!!').results.length, 0);
});

test('phonetic keys: same word, same key', () => {
  assert.equal(phoneticKey('धर्म'), phoneticKey('dharma'));
  assert.equal(phoneticKey('ज्ञान'), phoneticKey('gyan'));
  assert.equal(phoneticKey('संस्कृत'), phoneticKey('samskrit'));
  assert.equal(normalizeDevanagari('शान्ति'), normalizeDevanagari('शांति'));
});

test('Devanagari -> IAST matches the dataset transliteration for every entry', () => {
  for (const e of entries) assert.equal(devanagariToIAST(e.headword), e.transliteration.normalize('NFC'), e.headword);
});

test('regressions found while probing', () => {
  // "ram" used to fuzzy-match क्षमा via the variant "chhama" (key "cam")
  assert.equal(search(index, 'ram').results.length, 0);
  // "gyanee" should give ज्ञान only, not also अग्नि
  assert.deepEqual(search(index, 'gyanee').results.map((r) => r.entry.headword), ['ज्ञान']);
  // single letters act as a prefix browse, never as "did you mean"
  const v = search(index, 'v');
  assert.ok(v.results.length > 0 && v.suggestions.length === 0);
});

import { findWords } from '../js/search.js';
const found = (t) => findWords(index, t).filter((s) => s.entry).map((s) => s.entry.headword);

test('sentence lookup: finds dictionary words in Hindi and Hinglish text', () => {
  assert.deepEqual(found('shiksha har bachche ka adhikar hai'), ['शिक्षा']);
  assert.deepEqual(found('Gyaan aur vidya sabse bada dhan hai'), ['ज्ञान', 'विद्या']);
  assert.deepEqual(found('सत्य की हमेशा जीत होती है।'), ['सत्य']);
  assert.deepEqual(found('जल ही जीवन है'), ['जल', 'जीवन']);
  assert.deepEqual(found('Dharm, karma aur shanti.'), ['धर्म', 'कर्म', 'शांति']);
});

test('sentence lookup: no false highlights on common Hinglish words', () => {
  assert.deepEqual(found('kal mat jao, ham sab ghar par hain'), []);
});

test('sentence lookup keeps original text and spacing', () => {
  const t = 'Prem,  aur shanti।';
  assert.equal(findWords(index, t).map((s) => s.text).join(''), t);
});
