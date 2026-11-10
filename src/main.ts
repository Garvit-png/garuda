// शब्दकोश: app shell and router.
// Routes: #/  ·  #/q/<query>  ·  #/word/<id>  ·  #/practice  ·  #/saved
import './styles.css';
import { isSentence } from './lib/search.ts';
import type { Entry } from './lib/types.ts';
import { $, empty, toast, view } from './app/dom.ts';
import { app, loadEntries } from './app/state.ts';
import { largeText, saved } from './app/store.ts';
import { Recognition, listen } from './app/voice.ts';
import { renderHome } from './app/views/home.ts';
import { renderPractice } from './app/views/practice.ts';
import { renderResults } from './app/views/results.ts';
import { renderSaved } from './app/views/saved.ts';
import { renderWord } from './app/views/word.ts';

const input = $<HTMLInputElement>('q');
const clearBtn = $('clear');
const micBtn = $('mic');
const searchbar = $('searchbar');
const savedCount = $('saved-count');
const sizeBtn = $('size');

let cleanup: () => void = () => {};

function updateSavedCount(): void {
  const n = saved.list().filter((id) => app.byId.has(id)).length;
  savedCount.hidden = !n;
  savedCount.textContent = String(n);
}

function route(): void {
  cleanup();
  cleanup = () => {};
  let hash = location.hash.slice(1) || '/';
  try { hash = decodeURIComponent(hash); } catch { /* malformed escape: use as-is */ }
  const [, kind = '', ...rest] = hash.split('/');
  const arg = rest.join('/');
  document.title = 'शब्दकोश, Garuda Prakashan';

  const isPage = kind === 'word' || kind === 'saved' || kind === 'practice';
  document.body.classList.toggle('page', isPage);
  const tab = kind === 'practice' || kind === 'saved' ? kind : kind === 'word' ? null : 'home';
  for (const a of document.querySelectorAll<HTMLAnchorElement>('.tabbar a')) {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }

  if (kind === 'word') renderWord(Number(arg));
  else if (kind === 'saved') renderSaved();
  else if (kind === 'practice') renderPractice();
  else {
    const q = kind === 'q' ? arg : '';
    if (input.value !== q) input.value = q;
    app.backHash = location.hash || '#/';
    if (q.trim()) renderResults(q); else cleanup = renderHome();
  }
  clearBtn.hidden = !input.value;
  micBtn.hidden = !Recognition || Boolean(input.value);
  window.scrollTo(0, 0);
}

// ---------- search box ----------
input.addEventListener('input', () => {
  const v = input.value;
  history.replaceState(null, '', v.trim() ? `#/q/${encodeURIComponent(v)}` : '#/'); // one history entry, not one per key
  route();
  input.focus();
});
$('search-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  input.blur();
  if (isSentence(input.value)) return;
  const first = view().querySelector<HTMLAnchorElement>('.row');
  if (first && input.value.trim()) location.hash = first.getAttribute('href') ?? '#/';
});
clearBtn.addEventListener('pointerdown', (ev) => ev.preventDefault()); // keep the keyboard open
clearBtn.addEventListener('click', () => {
  input.value = '';
  history.replaceState(null, '', '#/');
  route();
  input.focus();
});
micBtn.addEventListener('click', () => listen(micBtn, input, (text) => {
  input.value = text;
  input.dispatchEvent(new Event('input'));
}));
// scrolling hides the phone keyboard so it doesn't cover the list
view().addEventListener('touchstart', () => { if (document.activeElement === input) input.blur(); }, { passive: true });
addEventListener('scroll', () => searchbar.classList.toggle('stuck', scrollY > 60), { passive: true });
addEventListener('hashchange', route);

// ---------- bigger text ----------
function setLarge(on: boolean): void {
  document.body.classList.toggle('large', on);
  sizeBtn.setAttribute('aria-pressed', String(on));
  sizeBtn.setAttribute('aria-label', on ? 'Normal text size' : 'Bigger text');
}
setLarge(largeText.get());
sizeBtn.addEventListener('click', () => {
  const on = !document.body.classList.contains('large');
  setLarge(on);
  largeText.set(on);
  toast(on ? 'Bigger text on' : 'Normal text size');
});

// ---------- offline ----------
const updateNet = () => { $('offline').hidden = navigator.onLine; };
addEventListener('online', updateNet);
addEventListener('offline', updateNet);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is a bonus */ });
}

// ---------- start ----------
async function boot(): Promise<void> {
  try {
    const res = await fetch('data/entries.json');
    if (!res.ok) throw new Error(String(res.status));
    loadEntries((await res.json()) as Entry[]);
  } catch {
    view().innerHTML = `<div class="wrap">${empty('Couldn’t load the dictionary', '<p>Check your connection and reload.</p>')}</div>`;
    return;
  }
  saved.onChange(updateSavedCount);
  updateSavedCount();
  updateNet();
  route();
}
void boot();
