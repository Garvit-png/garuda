import { findWords, isSentence, search } from '../../lib/search.ts';
import type { Entry } from '../../lib/types.ts';
import { empty, esc, plural, rows, section, view } from '../dom.ts';
import { app } from '../state.ts';

/** Paste a sentence: every dictionary word in it becomes a link. */
function renderSentence(text: string): boolean {
  const parts = findWords(app.index, text);
  const known = [...new Map(parts.flatMap((p) => (p.entry ? [[p.entry.id, p.entry] as const] : []))).values()];
  if (!known.length) return false;
  view().innerHTML = `<div class="wrap">
    ${section('Words from your sentence', `<span class="meta">${known.length}</span>`)}
    <p class="sentence" lang="hi">${parts.map((p) => (p.entry ? `<a href="#/word/${p.entry.id}">${esc(p.text)}</a>` : esc(p.text))).join('')}</p>
    ${section('Open a word')}${rows(known)}</div>`;
  return true;
}

export function renderResults(query: string): void {
  const q = query.trim();
  if (isSentence(q) && renderSentence(q)) return;
  const { results, meaningResults, suggestions, query: shown } = search(app.index, q);
  const qs = esc(shown);

  if (!results.length && !meaningResults.length) {
    const didYouMean = suggestions.length
      ? `<p>Did you mean ${suggestions.map((s) =>
        `<a href="#/word/${s.entry.id}" lang="hi">${esc(s.entry.headword)}</a> (${esc(s.entry.romanised[0])})`).join(', ')}?</p>`
      : '';
    view().innerHTML = `<div class="wrap">${empty(`No results for “${qs}”`, `
      <p>Check the spelling, or search in Hindi or English.</p>${didYouMean}
      <div class="try"><a href="#/q/dharm">dharm</a><a href="#/q/${encodeURIComponent('शांति')}" lang="hi">शांति</a><a href="#/q/peace">peace</a></div>`)}</div>`;
    return;
  }

  const list = (xs: { entry: Entry }[]) => rows(xs.map((x) => x.entry));
  let html = '';
  if (results.length) {
    html += results.every((r) => r.kind === 'fuzzy')
      ? `<p class="note">No exact match for <b>${qs}</b>. Closest words:</p>`
      : section(plural(results.length, 'word'));
    html += list(results);
  }
  if (meaningResults.length) {
    html += section(results.length ? 'Also in meanings' : `Hindi words for “${qs}”`) + list(meaningResults);
  }
  view().innerHTML = `<div class="wrap">${html}</div>`;
}
