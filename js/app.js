import { buildIndex, search, findWords, isSentence } from './search.js';

const $ = (id) => document.getElementById(id);
const view = $('view');
const input = $('q');
const clearBtn = $('clear');
const cancelBtn = $('cancel');
const offlineNote = $('offline');
const titleEl = $('title');
const subtitleEl = $('subtitle');

let entries = [];
let index = [];
let byId = new Map();
let sorted = [];
let backTo = { hash: '#/', label: 'Search' };   // where a word page's Back goes

// ---------- device storage (optional: app works without it) ----------
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)) ?? []; } catch { return []; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* private mode */ } },
};
const RECENT = 'garuda.recent';
const SAVED = 'garuda.saved';
const pushRecent = (id) => store.set(RECENT, [id, ...store.get(RECENT).filter((x) => x !== id)].slice(0, 8));
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
  chev: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  starBig: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  search: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>',
  speak: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M7 11H6a1.5 1.5 0 0 0-1.5 1.5v6.5A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-6.5A1.5 1.5 0 0 0 18 11h-1"/></svg>',
};
const head = (text, count, action = '') => `<div class="section-head"><h2 class="heading">${text}${
  count ? `<span class="count">${count}</span>` : ''}</h2>${action}</div>`;
const GENDER = { 'f.': 'feminine', 'm.': 'masculine' };
const posParts = (pos) => {
  const m = pos.match(/^(\S+)\s*\((.+)\)$/);
  return m ? [m[1], GENDER[m[2]] ?? m[2]] : [pos];
};

function toast(msg) {
  document.querySelector('.toast')?.remove();
  const t = Object.assign(document.createElement('div'), { className: 'toast', role: 'status', textContent: msg });
  document.body.append(t);
  setTimeout(() => t.remove(), 1800);
}

const row = (e) => `<li><a class="row" href="#/word/${e.id}"><span class="row-main">
  <span class="row-top"><span class="hw" lang="hi">${esc(e.headword)}</span><span class="tr">${esc(e.transliteration)}</span></span>
  <span class="gloss">${esc(e.meanings.join(', '))}</span></span>${icon.chev}</a></li>`;
const rows = (list) => `<ul class="rows">${list.map(row).join('')}</ul>`;
const chips = (list) => `<ul class="chips">${list.map((e) =>
  `<li><a href="#/word/${e.id}" lang="hi">${esc(e.headword)}</a></li>`).join('')}</ul>`;

// ---------- chrome: which tab, which title ----------
const TITLES = {
  search: ['शब्दकोश', 'Hindi–English dictionary by Garuda Prakashan', 'hi'],
  browse: ['Browse', '', 'en'],
  saved: ['Saved', 'Words you starred, kept on this phone', 'en'],
};
function setTab(tab) {
  document.body.dataset.tab = tab;
  document.body.classList.toggle('reading', tab === 'word');
  for (const a of document.querySelectorAll('.tabs a')) {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  const t = TITLES[tab];
  if (t) {
    titleEl.textContent = t[0];
    titleEl.lang = t[2];
    subtitleEl.textContent = tab === 'browse' ? `All ${entries.length} words, in Hindi alphabetical order` : t[1];
  }
}

// Focus or a query folds the big title away and shows Cancel.
function setSearching() {
  const on = !!input.value || document.activeElement === input;
  document.body.classList.toggle('searching', on);
  cancelBtn.hidden = !on;
  clearBtn.hidden = !input.value;
}

// ---------- Search tab, empty: recent words + ways to search ----------
const WAYS = [
  ['धर्म', 'Hindi script'],
  ['dharm', 'Roman, any spelling'],
  ['peace', 'English meaning'],
  ['Gyaan aur vidya sabse bada dhan hai', 'A whole sentence'],
];
function renderHome() {
  const recent = store.get(RECENT).map((id) => byId.get(id)).filter(Boolean);
  view.innerHTML = `
    ${recent.length ? head('Recent', 0, '<button class="text-btn" id="clear-recent">Clear</button>') + chips(recent) : ''}
    ${head('Ways to search')}
    <ul class="ways">${WAYS.map(([q, what]) => `<li><button type="button" data-q="${esc(q)}">
      <span class="ex"${/[ऀ-ॿ]/.test(q) ? ' lang="hi"' : ''}>${esc(q)}</span><span class="what">${what}</span></button></li>`).join('')}</ul>
    ${head('Start browsing', 0, `<a class="text-btn" href="#/browse">All ${entries.length} words</a>`)}
    ${rows(sorted.slice(0, 5))}`;

  view.querySelector('.ways').addEventListener('click', (ev) => {
    const q = ev.target.closest('button')?.dataset.q;
    if (!q) return;
    input.value = q;
    input.dispatchEvent(new Event('input'));
  });
  $('clear-recent')?.addEventListener('click', () => { store.set(RECENT, []); renderHome(); });
}

// ---------- Browse tab: letter strip + every word ----------
function renderBrowse() {
  const groups = new Map();
  for (const e of sorted) {
    const letter = [...e.headword.normalize('NFC')][0];
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(e);
  }
  view.innerHTML = `
    <nav class="letters" aria-label="Jump to letter">${[...groups.keys()].map((l) =>
      `<button type="button" data-letter="${l}" lang="hi">${l}</button>`).join('')}</nav>
    ${[...groups].map(([l, list]) => `<h2 class="group-head" id="letter-${l}" lang="hi">${l}</h2>${rows(list)}`).join('')}`;

  const strip = view.querySelector('.letters');
  strip.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    for (const x of strip.children) x.removeAttribute('aria-current');
    b.setAttribute('aria-current', 'true');
    $(`letter-${b.dataset.letter}`)?.scrollIntoView({ behavior: 'smooth' });
  });
}

// ---------- Saved tab ----------
function renderSaved() {
  const saved = store.get(SAVED).map((id) => byId.get(id)).filter(Boolean);
  view.innerHTML = saved.length
    ? head('Starred words', saved.length) + rows(saved)
    : `<div class="empty">${icon.starBig}<p class="big">No saved words yet</p>
       <p class="sub">Tap the star on any word to keep it here.</p><p class="sub"><a href="#/browse">Browse all words</a></p></div>`;
}

// ---------- search results ----------
function renderSentence(text) {
  const parts = findWords(index, text);
  const known = [...new Map(parts.filter((p) => p.entry).map((p) => [p.entry.id, p.entry])).values()];
  if (!known.length) return false;
  view.innerHTML = `
    ${head('In your sentence', known.length)}
    <p class="sentence" lang="hi">${parts.map((p) => (p.entry ? `<a href="#/word/${p.entry.id}">${esc(p.text)}</a>` : esc(p.text))).join('')}</p>
    <p class="status">Tap a highlighted word, or pick one below.</p>
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
    view.innerHTML = `<div class="empty">${icon.search}
      <p class="big">No results for “${qs}”</p>
      <p class="sub">Check the spelling, or try the word in Hindi or English.</p>
      ${suggestions.length ? `<p class="sub">Did you mean ${suggestions.map((s) =>
        `<a href="#/word/${s.entry.id}"><span lang="hi">${esc(s.entry.headword)}</span> (${esc(s.entry.romanised[0])})</a>`).join(', ')}?</p>` : ''}
      <p class="sub"><a href="#/browse">Browse all words</a></p>
    </div>`;
    return;
  }

  let html = '';
  if (results.length) {
    const fuzzy = results.every((r) => r.kind === 'fuzzy');
    html += head(fuzzy ? `Closest to “${qs}”` : 'Words', results.length);
    if (fuzzy) html += '<p class="status">No exact match. These sound similar.</p>';
    html += rows(results.map((r) => r.entry));
  }
  if (meaningResults.length) {
    html += head(results.length ? 'In meanings' : `Hindi for “${qs}”`, meaningResults.length) + rows(meaningResults.map((r) => r.entry));
  }
  view.innerHTML = html;
}

// ---------- word page ----------
function exampleHtml(e) {
  // the headword in bold; any other dictionary word in the sentence is a link
  return findWords(index, e.example).map((p) => {
    if (p.entry?.id === e.id || p.text === e.headword) return `<b>${esc(p.text)}</b>`;
    if (p.entry) return `<a href="#/word/${p.entry.id}">${esc(p.text)}</a>`;
    return esc(p.text);
  }).join('');
}

function renderEntry(id) {
  const e = byId.get(id);
  if (!e) {
    view.innerHTML = `<div class="empty"><p class="big">This word isn't in the dictionary</p><p class="sub"><a href="#/">Back to search</a></p></div>`;
    return;
  }
  pushRecent(id);
  document.title = `${e.headword}, शब्दकोश`;
  const saved = isSaved(id);
  const canSpeak = 'speechSynthesis' in window;
  const i = sorted.indexOf(e);
  const nearby = sorted.slice(Math.max(0, i - 2), i + 3).filter((x) => x !== e).slice(0, 4);
  view.innerHTML = `
    <nav class="nav">
      <a class="back" href="${esc(backTo.hash)}">${icon.back}${backTo.label}</a>
      <div class="nav-actions">
        <button id="save" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved' : 'Save word'}">${icon.star}</button>
        <button id="share" aria-label="Share as image">${icon.share}</button>
      </div>
    </nav>
    <article class="entry">
      <div class="word-band">
        <h1 lang="hi">${esc(e.headword)}</h1>
        <button class="say" id="speak" ${canSpeak ? 'aria-label="Listen"' : 'disabled'}>/${esc(e.transliteration)}/ ${canSpeak ? icon.speak : ''}</button>
        <div><span class="pos">${posParts(e.pos).map((p) => `<span>${esc(p)}</span>`).join('')}</span></div>
      </div>

      ${head('Meanings', e.meanings.length)}
      <ol class="senses">${e.meanings.map((m) => `<li>${esc(m)}</li>`).join('')}</ol>

      ${head('Example')}
      <p class="example" lang="hi">${exampleHtml(e)}</p>

      <div class="cols">
        <div>${head('Spellings', e.romanised.length)}<ul>${e.romanised.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>
        <div>${head('Nearby')}<ul class="linked">${nearby.map((n) =>
          `<li><a href="#/word/${n.id}" lang="hi">${esc(n.headword)}</a></li>`).join('')}</ul></div>
      </div>
    </article>`;

  $('save').onclick = (ev) => {
    const now = toggleSaved(id);
    ev.currentTarget.setAttribute('aria-pressed', now);
    ev.currentTarget.setAttribute('aria-label', now ? 'Remove from saved' : 'Save word');
    toast(now ? 'Saved' : 'Removed from saved');
  };
  if (canSpeak) $('speak').addEventListener('click', () => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(e.headword);
    u.lang = 'hi-IN';
    const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('hi'));
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  });
  $('share').onclick = () => shareWord(e);
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

// ---------- routing: #/  #/q/<query>  #/browse  #/saved  #/word/<id> ----------
function route() {
  let hash = location.hash.slice(1) || '/';
  try { hash = decodeURIComponent(hash); } catch { /* malformed escape: use as-is */ }
  const [, kind, ...rest] = hash.split('/');
  const arg = rest.join('/');
  document.title = 'शब्दकोश, Garuda Prakashan';

  if (kind === 'word') {
    setTab('word');
    renderEntry(Number(arg));
  } else {
    const tab = kind === 'browse' || kind === 'saved' ? kind : 'search';
    const q = kind === 'q' ? arg : '';
    if (input.value !== q) input.value = q;
    setTab(tab);
    backTo = { hash: location.hash || '#/', label: { search: q ? 'Results' : 'Search', browse: 'Browse', saved: 'Saved' }[tab] };
    if (tab === 'browse') renderBrowse();
    else if (tab === 'saved') renderSaved();
    else renderSearch(q);
  }
  setSearching();
  window.scrollTo(0, 0);
}

input.addEventListener('focus', setSearching);
input.addEventListener('blur', () => setTimeout(setSearching, 0));
input.addEventListener('input', () => {
  const v = input.value;
  // typing from Browse or Saved switches to Search; replaceState avoids one history entry per keystroke
  const hash = v.trim() ? `#/q/${encodeURIComponent(v)}` : '#/';
  history.replaceState(null, '', hash);
  setTab('search');
  backTo = { hash, label: v.trim() ? 'Results' : 'Search' };
  setSearching();
  renderSearch(v);
  window.scrollTo(0, 0);
});

// Enter / "Search" on the phone keyboard opens the top result (single words only).
$('search-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  input.blur();
  if (isSentence(input.value)) return;
  const first = view.querySelector('.row');
  if (first && input.value.trim()) location.hash = first.getAttribute('href');
});

// keep focus on the input while tapping Cancel / Clear, so the layout doesn't jump mid-tap
for (const b of [cancelBtn, clearBtn]) b.addEventListener('pointerdown', (ev) => ev.preventDefault());
clearBtn.addEventListener('click', () => {
  input.value = '';
  history.replaceState(null, '', '#/');
  route();
  input.focus();
});
cancelBtn.addEventListener('click', () => {
  input.value = '';
  input.blur();
  history.replaceState(null, '', '#/');
  route();
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
    view.innerHTML = `<div class="empty"><p class="big">Couldn't load the dictionary</p><p class="sub">Check your connection and reload.</p></div>`;
    return;
  }
  index = buildIndex(entries);
  byId = new Map(entries.map((e) => [e.id, e]));
  sorted = [...entries].sort((a, b) => a.headword.localeCompare(b.headword, 'hi'));
  route();
  updateNet();
}
boot();
