import type { Entry } from '../lib/types.ts';

/** The वर्णमाला grouped the traditional way: vowels, then consonants by वर्ग, then the rest. */
export interface Varga { label: string | null; english: string | null; letters: string[] }

export const VARGAS: Varga[] = [
  { label: 'स्वर', english: 'Vowels', letters: [...'अआइईउऊऋएऐओऔ'] },
  { label: 'व्यंजन', english: 'Consonants', letters: [...'कखगघङ'] },
  { label: null, english: null, letters: [...'चछजझञ'] },
  { label: null, english: null, letters: [...'टठडढण'] },
  { label: null, english: null, letters: [...'तथदधन'] },
  { label: null, english: null, letters: [...'पफबभम'] },
  { label: null, english: null, letters: [...'यरलव'] },
  { label: null, english: null, letters: [...'शषसह'] },
];

export const VARNAMALA: string[] = VARGAS.flatMap((v) => v.letters);

export const letterRank = (letter: string): number => {
  const i = VARNAMALA.indexOf(letter);
  return i === -1 ? 999 : i;
};

/** First akshara letter of the headword (क्ष -> क, ज्ञ -> ज, श्र -> श). */
export const firstLetter = (e: Entry): string => [...e.headword.normalize('NFC')][0] ?? '';
