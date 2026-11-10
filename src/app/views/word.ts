import { findWords } from '../../lib/search.ts';
import type { Entry } from '../../lib/types.ts';
import { $, empty, esc, icon, posText, section, toast, topbar, view } from '../dom.ts';
import { shareWord } from '../share.ts';
import { app } from '../state.ts';
import { recent, saved } from '../store.ts';

/** The example with the headword in bold and any other dictionary word linked. */
function exampleHtml(e: Entry): string {
  return findWords(app.index, e.example).map((p) => {
    if (p.entry?.id === e.id || p.text === e.headword) return `<b>${esc(p.text)}</b>`;
    if (p.entry) return `<a href="#/word/${p.entry.id}">${esc(p.text)}</a>`;
    return esc(p.text);
  }).join('');
}

function speak(text: string, button: HTMLElement): void {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'hi-IN';
  u.rate = 0.85;
  const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('hi'));
  if (voice) u.voice = voice;
  button.classList.add('speaking');
  u.onend = u.onerror = () => button.classList.remove('speaking');
  speechSynthesis.speak(u);
}

export function renderWord(id: number): void {
  const e = app.byId.get(id);
  if (!e) {
    view().innerHTML = `${topbar('')}<div class="wrap">${empty('This word isn’t in the dictionary', '<p><a href="#/">Go to all words</a></p>')}</div>`;
    return;
  }
  recent.push(id);
  document.title = `${e.headword}, शब्दकोश`;
  const isSaved = saved.has(id);
  const i = app.sorted.indexOf(e);
  const prev = app.sorted[i - 1];
  const next = app.sorted[i + 1];
  const canSpeak = 'speechSynthesis' in window;

  view().innerHTML = `
    ${topbar('', `<button class="icon-btn" id="save" aria-pressed="${isSaved}" aria-label="${isSaved ? 'Remove from saved' : 'Save word'}">${icon.bookmark}</button>
      <button class="icon-btn" id="share" aria-label="Share">${icon.share}</button>`)}
    <article class="wrap word">
      <h1 lang="hi">${esc(e.headword)}</h1>
      ${canSpeak
        ? `<button class="say" id="say" aria-label="Hear it said">${esc(e.romanised[0])} ${icon.speaker}</button>`
        : `<p class="say">${esc(e.romanised[0])}</p>`}
      <p class="pos">${esc(posText(e.pos))} <span class="iast">(IAST: ${esc(e.transliteration)})</span></p>

      ${section('Meaning')}
      <ol class="senses">${e.meanings.map((m) => `<li>${esc(m)}</li>`).join('')}</ol>

      ${section('Example sentence')}
      <p class="example" lang="hi">${exampleHtml(e)}</p>

      ${section('Other spellings')}
      <ul class="spellings">${e.romanised.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>

      <nav class="pager" aria-label="Neighbouring words">
        ${prev ? `<a class="prev" href="#/word/${prev.id}"><small>Previous</small><span lang="hi">${esc(prev.headword)}</span></a>` : '<span></span>'}
        ${next ? `<a class="next" href="#/word/${next.id}"><small>Next</small><span lang="hi">${esc(next.headword)}</span></a>` : ''}
      </nav>
    </article>`;

  if (canSpeak) $('say').addEventListener('click', (ev) => speak(e.headword, ev.currentTarget as HTMLElement));
  $('save').addEventListener('click', (ev) => {
    const button = ev.currentTarget as HTMLElement;
    const now = saved.toggle(id);
    button.setAttribute('aria-pressed', String(now));
    button.setAttribute('aria-label', now ? 'Remove from saved' : 'Save word');
    toast(now ? 'Saved' : 'Removed from saved');
  });
  $('share').addEventListener('click', () => { void shareWord(e); });
}
