import { empty, plural, rows, section, topbar, view } from '../dom.ts';
import { app, entriesFor } from '../state.ts';
import { saved } from '../store.ts';

export function renderSaved(): void {
  const list = entriesFor(saved.list());
  app.backHash = '#/saved';
  view().innerHTML = `${topbar('Saved words', '', '#/')}<div class="wrap">${list.length
    ? section(plural(list.length, 'word')) + rows(list)
    : empty('No saved words yet', '<p>Open a word and tap the bookmark at the top to keep it here.</p><p><a href="#/">See all words</a></p>')}</div>`;
}
