import { buildIndex, search, findWords, isSentence } from './search.js';

const view = document.getElementById('view');
const input = document.getElementById('q');
const clearBtn = document.getElementById('clear');
const offlineNote = document.getElementById('offline');

let entries = [];
let index = [];
let byId = new Map();
let lastSearch = '';

// ---------- device storage (optional: app works without it) ----------
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)) ?? []; } catch { return []; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* private mode */ } },
};
const RECENT = 'garuda.recent';
const SAVED = 'garuda.saved';
const pushRecent = (id) => store.set(RECENT, [id, ...store.get(RECENT).filter((x) => x !== id)].slice(0, 5));
const isSaved = (id) => store.get(SAVED).includes(id);
const toggleSaved = (id) => {
  const saved = store.get(SAVED);
  const now = !saved.includes(id);
  store.set(SAVED, now ? [id, ...saved] : saved.filter((x) => x !== id));
  return now;
};

// ---------- helpers ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icon = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  speak: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M8 8l4-4 4 4"/><path d="M6 12v6.5A1.5 1.5 0 0 0 7.5 20h9a1.5 1.5 0 0 0 1.5-1.5V12"/></svg>',
};
const label = (hi, en) => `<p class="label"><span lang="hi">${hi}</span>${en}</p>`;

function toast(msg) {
  document.querySelector('.toast')?.remove();
  const t = Object.assign(document.createElement('div'), { className: 'toast', role: 'status', textContent: msg });
  document.body.append(t);
  setTimeout(() => t.remove(), 1800);
}

const row = (e) => `<li><a class="row" href="#/word/${e.id}">
  <span class="row-top"><span class="hw" lang="hi">${esc(e.headword)}</span><span class="tr">${esc(e.transliteration)}</span></span>
  <span class="gloss">${esc(e.meanings.join('; '))}</span></a></li>`;
const rows = (list) => `<ul class="rows">${list.map(row).join('')}</ul>`;

// ---------- home: recent, saved, then the whole dictionary by letter ----------
function renderHome() {
  const recent = store.get(RECENT).map((id) => byId.get(id)).filter(Boolean);
  const saved = store.get(SAVED).map((id) => byId.get(id)).filter(Boolean);
  const all = [...entries].sort((a, b) => a.headword.localeCompare(b.headword, 'hi'));
  const groups = new Map();
  for (const e of all) {
    const letter = [...e.headword.normalize('NFC')][0];
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(e);
  }
  view.innerHTML = `
    <p class="hint">Type in Hindi or English letters (<b lang="hi">धर्म</b>, <b>dharm</b>), an English word (<b>duty</b>), or paste a whole sentence.</p>
    ${recent.length ? label('हाल ही में', 'Recent') + rows(recent) : ''}
    ${saved.length ? label('सहेजे गए', 'Saved') + rows(saved) : ''}
    ${label('वर्णमाला', `All ${entries.length} words`)}
    <nav class="letters" aria-label="Jump to letter">${[...groups.keys()].map((l) =>
      `<button type="button" data-letter="${l}" lang="hi">${l}</button>`).join('')}</nav>
    ${[...groups].map(([l, list]) => `<h3 class="group-head" id="letter-${l}" lang="hi">${l}</h3>${rows(list)}`).join('')}`;

  view.querySelector('.letters').addEventListener('click', (ev) => {
    const l = ev.target.closest('button')?.dataset.letter;
    if (l) document.getElementById(`letter-${l}`)?.scrollIntoView({ behavior: 'smooth' });
  });
}

// ---------- sentence lookup: tap any known word in pasted text ----------
function renderSentence(text) {
  const parts = findWords(index, text);
  const known = [...new Map(parts.filter((p) => p.entry).map((p) => [p.entry.id, p.entry])).values()];
  if (!known.length) return false;
  view.innerHTML = `
    ${label('वाक्य', 'Your sentence')}
    <p class="sentence" lang="hi">${parts.map((p) => (p.entry ? `<a href="#/word/${p.entry.id}">${esc(p.text)}</a>` : esc(p.text))).join('')}</p>
    <p class="status">${known.length === 1 ? '1 word' : `${known.length} words`} from the dictionary. Tap to open.</p>
    ${rows(known)}`;
  return true;
}

function renderSearch(query) {
  const q = (query ?? '').trim();
  if (!q) return renderHome();
  if (isSentence(q) && renderSentence(q)) return;

  const res = search(index, q);
  const { results, meaningResults, suggestions } = res;
  const qs = esc(res.query);

  if (!results.length && !meaningResults.length) {
    view.innerHTML = `<div class="empty">
      <p>No results for “${qs}”.</p>
      <p class="sub">Check the spelling, or try the word in Hindi or English.</p>
      ${suggestions.length ? `<p class="sub inline-links">Did you mean ${suggestions.map((s) =>
        `<a href="#/word/${s.entry.id}"><span lang="hi">${esc(s.entry.headword)}</span> (${esc(s.entry.romanised[0])})</a>`).join(', ')}?</p>` : ''}
    </div>`;
    return;
  }

  let html = '';
  if (results.length) {
    if (results.every((r) => r.kind === 'fuzzy')) html += `<p class="status">No exact match. Showing the closest words to <b>${qs}</b>.</p>`;
    html += rows(results.map((r) => r.entry));
  }
  if (meaningResults.length) {
    html += label('अर्थ में', results.length ? 'Also in meanings' : `Hindi for “${qs}”`) + rows(meaningResults.map((r) => r.entry));
  }
  view.innerHTML = html;
}

// ---------- entry ----------
function renderEntry(id) {
  const e = byId.get(id);
  if (!e) {
    view.innerHTML = `<div class="empty"><p>This word isn't in the dictionary.</p><p class="sub inline-links"><a href="#/">Back to search</a></p></div>`;
    return;
  }
  pushRecent(id);
  document.title = `${e.headword} · शब्दकोश`;
  const example = esc(e.example).replace(esc(e.headword), `<b>${esc(e.headword)}</b>`);
  const saved = isSaved(id);
  view.innerHTML = `
    <a class="back" href="${lastSearch ? `#/q/${encodeURIComponent(lastSearch)}` : '#/'}">${icon.back}Back</a>
    <article class="entry">
      <div class="entry-top">
        <h1 lang="hi">${esc(e.headword)}</h1>
        <p class="tr">${esc(e.transliteration)} · <i>${esc(e.pos)}</i></p>
        <div class="tools">
          ${'speechSynthesis' in window ? `<button class="icon-btn" id="speak">${icon.speak}Listen</button>` : ''}
          <button class="icon-btn" id="save" aria-pressed="${saved}">${icon.star}<span>${saved ? 'Saved' : 'Save'}</span></button>
          <button class="icon-btn" id="share">${icon.share}Share</button>
        </div>
      </div>
      ${label('अर्थ', 'Meaning')}
      <ol class="senses">${e.meanings.map((m) => `<li>${esc(m)}</li>`).join('')}</ol>
      ${label('उदाहरण', 'Example')}
      <p class="ex" lang="hi">${example}</p>
      ${label('वर्तनी', 'Also written as')}
      <p class="alt">${e.romanised.map(esc).join(', ')}</p>
    </article>`;

  document.getElementById('save').onclick = (ev) => {
    const now = toggleSaved(id);
    ev.currentTarget.setAttribute('aria-pressed', now);
    ev.currentTarget.querySelector('span').textContent = now ? 'Saved' : 'Save';
    toast(now ? 'Saved on this phone' : 'Removed');
  };
  document.getElementById('speak')?.addEventListener('click', () => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(e.headword);
    u.lang = 'hi-IN';
    const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('hi'));
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  });
  document.getElementById('share').onclick = () => shareWord(e);
}

// Share as an image card (WhatsApp / Instagram ready), falling back to a link.
async function shareWord(e) {
  const url = location.href;
  const text = `${e.headword} (${e.transliteration}): ${e.meanings.join('; ')}`;
  try {
    const { makeCard } = await import('./card.js');
    const blob = await makeCard(e, location.origin + location.pathname);
    const file = new File([blob], `${e.romanised[0]}-shabdkosh.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: e.headword, text: `${text}\n${url}` });
      return;
    }
    if (navigator.share) { await navigator.share({ title: e.headword, text, url }); return; }
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: file.name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Word card downloaded');
  } catch (err) {
    if (err?.name !== 'AbortError') {
      try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('Link copied'); } catch { toast('Could not share'); }
    }
  }
}

// ---------- routing: #/  ·  #/q/<query>  ·  #/word/<id> ----------
function route() {
  let hash = location.hash.slice(1) || '/';
  try { hash = decodeURIComponent(hash); } catch { /* malformed escape: use as-is */ }
  const [, kind, ...rest] = hash.split('/');
  const arg = rest.join('/');
  document.title = 'शब्दकोश · Garuda Prakashan';

  if (kind === 'word') {
    renderEntry(Number(arg));
  } else if (kind === 'q') {
    lastSearch = arg;
    if (input.value !== arg) input.value = arg;
    renderSearch(arg);
  } else {
    lastSearch = '';
    input.value = '';
    renderHome();
  }
  clearBtn.hidden = !input.value;
  window.scrollTo(0, 0);
}

input.addEventListener('input', () => {
  const v = input.value;
  clearBtn.hidden = !v;
  lastSearch = v.trim();
  // replaceState: typing shouldn't add one history entry per keystroke
  history.replaceState(null, '', v.trim() ? `#/q/${encodeURIComponent(v)}` : '#/');
  renderSearch(v);
  window.scrollTo(0, 0);
});

// Enter / "Search" on the phone keyboard opens the top result (single words only).
document.getElementById('search-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  input.blur();
  if (isSentence(input.value)) return;
  const first = view.querySelector('.row');
  if (first && input.value.trim()) location.hash = first.getAttribute('href');
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  history.replaceState(null, '', '#/');
  route();
  input.focus();
});

// Scrolling the results hides the phone keyboard so the list isn't covered.
view.addEventListener('touchstart', () => { if (document.activeElement === input) input.blur(); }, { passive: true });

window.addEventListener('hashchange', route);

// ---------- offline ----------
const updateNet = () => { offlineNote.hidden = navigator.onLine; };
window.addEventListener('online', updateNet);
window.addEventListener('offline', updateNet);
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ---------- boot ----------
async function boot() {
  try {
    const res = await fetch('data/entries.json');
    if (!res.ok) throw new Error(res.status);
    entries = await res.json();
  } catch {
    view.innerHTML = `<div class="empty"><p>Couldn't load the dictionary.</p><p class="sub">Check your connection and reload.</p></div>`;
    return;
  }
  index = buildIndex(entries);
  byId = new Map(entries.map((e) => [e.id, e]));
  route();
  updateNet();
}
boot();
