/** One dictionary entry, exactly the brief's schema. */
export interface Entry {
  id: number;
  headword: string;        // Devanagari
  transliteration: string; // IAST
  romanised: string[];     // common Roman spellings
  pos: string;             // e.g. "noun (f.)"
  meanings: string[];
  example: string;         // Hindi sentence using the headword
}

/** Pre-computed searchable forms of one entry. */
export interface IndexItem {
  entry: Entry;
  keys: Map<string, string>; // phonetic key -> a human-readable spelling that produced it
  raw: Set<string>;          // IAST + romanised, lowercased, no spaces
  dev: string;               // normalised Devanagari headword
  meaningWords: Set<string>; // English words in the meanings
}

export type MatchKind = 'exact' | 'spelling' | 'prefix' | 'fuzzy';

export interface Match<K extends string = MatchKind> {
  entry: Entry;
  score: number;
  kind: K;
  via: string;
}

export interface SearchResult {
  query: string;
  key: string;
  script: 'devanagari' | 'latin' | null;
  results: Match[];
  meaningResults: Match<'meaning'>[];
  suggestions: Match<'suggestion'>[];
}

export interface WordPart {
  text: string;
  entry: Entry | null;
  sep: boolean;
}
