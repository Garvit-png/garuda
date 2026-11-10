import { buildIndex } from '../lib/search.ts';
import type { Entry, IndexItem } from '../lib/types.ts';
import { firstLetter, letterRank } from './alphabet.ts';

/** Everything the screens share: the data, and where Back on a word page goes. */
export const app = {
  entries: [] as Entry[],
  index: [] as IndexItem[],
  byId: new Map<number, Entry>(),
  sorted: [] as Entry[],   // वर्णमाला order
  backHash: '#/',
};

export function loadEntries(entries: Entry[]): void {
  app.entries = entries;
  app.index = buildIndex(entries);
  app.byId = new Map(entries.map((e) => [e.id, e]));
  // Sort by our own वर्णमाला order first, so it's the same on every phone
  // (browsers' Hindi collation differs), then by the browser within a letter.
  app.sorted = [...entries].sort((a, b) =>
    letterRank(firstLetter(a)) - letterRank(firstLetter(b)) || a.headword.localeCompare(b.headword, 'hi'));
}

/** Entries for a list of ids, skipping any that no longer exist. */
export const entriesFor = (ids: number[]): Entry[] =>
  ids.map((id) => app.byId.get(id)).filter((e): e is Entry => Boolean(e));
