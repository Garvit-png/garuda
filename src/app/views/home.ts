import type { Entry } from '../../lib/types.ts';
import { VARGAS, firstLetter } from '../alphabet.ts';
import { $, esc, plural, rows, section, view, wing } from '../dom.ts';
import { app, entriesFor } from '../state.ts';
import { recent } from '../store.ts';

/** आज का शब्द: one word a day, the same for everyone on that date. */
export function wordOfTheDay(date = new Date()): Entry {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
  // step through the list by a prime so neighbouring days don't give neighbouring words
  return app.sorted[(day * 37) % app.sorted.length];
}

function todayCard(): string {
  const e = wordOfTheDay();
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
  return `<a class="today" href="#/word/${e.id}">
    ${wing('wing-bg')}
    <p class="kicker"><span lang="hi">आज का शब्द</span><span class="date">${date}</span></p>
    <span class="hw" lang="hi">${esc(e.headword)}</span>
    <p class="tr">${esc(e.romanised[0])}</p>
    <p class="mean">${esc(e.meanings.join(', '))}</p>
  </a>`;
}

function sidebar(groups: Map<string, Entry[]>): string {
  return `<nav class="letters" aria-label="Jump to a letter">${VARGAS.map((v, i) =>
    (v.label
      ? `${i ? '<hr>' : ''}<span class="lt-label" lang="hi" title="${v.english}">${v.label}</span>`
      : '<i class="gap" aria-hidden="true"></i>')
    + v.letters.map((l) => (groups.has(l)
      ? `<button type="button" data-l="${l}" lang="hi" aria-label="Words starting with ${l}">${l}</button>`
      : `<button type="button" lang="hi" disabled aria-label="No words starting with ${l} yet">${l}</button>`)).join('')).join('')}</nav>`;
}

/**
 * Each letter is its own <section>: the heading is sticky *inside* its section,
 * so when the next letter arrives it pushes the old heading away instead of
 * stacking on top of it (that stacking was what looked broken at the end of the list).
 */
function letterSections(groups: Map<string, Entry[]>): string {
  return [...groups].map(([l, list]) => `<section class="letter" id="l-${l}" data-l="${l}" aria-label="${l}">
    <h3 class="group"><span class="gl" lang="hi">${l}</span><small>${plural(list.length, 'word')}</small></h3>
    ${rows(list)}
  </section>`).join('');
}

export function renderHome(): () => void {
  const recentWords = entriesFor(recent.list());
  const groups = new Map<string, Entry[]>();
  for (const e of app.sorted) {
    const l = firstLetter(e);
    groups.set(l, [...(groups.get(l) ?? []), e]);
  }

  view().innerHTML = `<div class="wrap">
    ${todayCard()}
    ${recentWords.length ? section('Recent', '<button class="link-btn" id="clear-recent">Clear</button>')
      + `<ul class="chips">${recentWords.map((e) => `<li><a href="#/word/${e.id}" lang="hi">${esc(e.headword)}</a></li>`).join('')}</ul>` : ''}
    ${section('All words', `<span class="meta">${app.entries.length}</span>`)}
    <div class="browse">${sidebar(groups)}<div class="words">${letterSections(groups)}</div></div>
    <p class="foot">A Garuda Prakashan dictionary. Works offline.</p>
  </div>`;

  document.getElementById('clear-recent')?.addEventListener('click', () => { recent.clear(); renderHome(); });
  return scrollSpy();
}

/** The letter whose words are on screen lights up in the sidebar; tapping a letter jumps to it. */
function scrollSpy(): () => void {
  const side = view().querySelector<HTMLElement>('.letters');
  const sections = [...view().querySelectorAll<HTMLElement>('.letter')];
  if (!side || !sections.length) return () => {};
  const searchbar = $('searchbar');
  let current: string | null = null;
  let pinned: string | null = null; // a tapped letter stays lit until the user scrolls by hand

  const light = (letter: string) => {
    if (letter === current) return;
    current = letter;
    for (const b of side.querySelectorAll<HTMLButtonElement>('button[data-l]')) {
      if (b.dataset.l !== letter) { b.removeAttribute('aria-current'); continue; }
      b.setAttribute('aria-current', 'true');
      // keep the lit letter in the middle of the sidebar, so it's always visible
      const br = b.getBoundingClientRect();
      const sr = side.getBoundingClientRect();
      side.scrollTo({ top: side.scrollTop + (br.top + br.height / 2) - (sr.top + sr.height / 2), behavior: 'smooth' });
    }
  };
  const spy = () => {
    if (pinned) return light(pinned);
    const line = searchbar.getBoundingClientRect().bottom + 30;
    let cur = sections[0];
    for (const s of sections) { if (s.getBoundingClientRect().top <= line) cur = s; else break; }
    light(cur.dataset.l ?? '');
  };

  let raf = 0;
  const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(spy); };
  const unpin = () => { pinned = null; };
  side.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest<HTMLButtonElement>('button[data-l]');
    if (!b?.dataset.l) return;
    pinned = b.dataset.l;
    light(pinned);
    document.getElementById(`l-${pinned}`)?.scrollIntoView({ behavior: 'smooth' });
  });
  // scrolling the sidebar itself isn't a hand-scroll of the list
  for (const type of ['touchmove', 'wheel'] as const) side.addEventListener(type, (ev) => ev.stopPropagation(), { passive: true });
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('touchmove', unpin, { passive: true });
  addEventListener('wheel', unpin, { passive: true });
  spy();
  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('scroll', onScroll);
    removeEventListener('touchmove', unpin);
    removeEventListener('wheel', unpin);
  };
}
