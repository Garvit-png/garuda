import { buildIndex, search } from './search.js';

const view = document.getElementById('view');
const input = document.getElementById('q');
const clearBtn = document.getElementById('clear');
const netStatus = document.getElementById('net-status');

let entries = [];
let index = [];
let byId = new Map();

// ---------- storage (per-device; never required for the app to work) ----------
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
  store.set(SAVED, saved.includes(id) ? saved.filter((x) => x !== id) : [id, ...saved]);
  return !saved.includes(id);
};

// ---------- helpers ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const gloss = (e) => e.meanings.join('; ');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const icons = {
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>',
  speak: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
};

function toast(msg) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast'; t.role = 'status'; t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 1800);
}

function card(entry, why = '') {
  return `<li><a class="card" href="#/word/${entry.id}">
    <span class="hw" lang="hi">${esc(entry.headword)}</span>
    <span class="pos">${esc(entry.pos)}</span>
    <span class="tr">${esc(entry.transliteration)}</span>
    <span class="gloss">${esc(gloss(entry))}</span>
    ${why ? `<span class="why">${why}</span>` : ''}
  </a></li>`;
}

function whyLabel(r, query) {
  if (r.kind === 'spelling') return `Same sound as “${esc(r.via)}”`;
  if (r.kind === 'fuzzy') return `Close to “${esc(r.via)}”: did you mean this?`;
  if (r.kind === 'meaning') return `English meaning matches “${esc(query)}”`;
  return '';
}

// Word of the day: same word for everyone on a given date, changes daily.
function wordOfTheDay() {
  const d = new Date();
  const n = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate();
  return entries[n % entries.length];
}

// ---------- views ----------
function renderHome() {
  const recent = store.get(RECENT).map((id) => byId.get(id)).filter(Boolean);
  const saved = store.get(SAVED).map((id) => byId.get(id)).filter(Boolean);
  const w = wordOfTheDay();
  view.innerHTML = `
    <a class="wotd" href="#/word/${w.id}">
      <span class="label">Word of the day</span>
      <span class="hw" lang="hi">${esc(w.headword)}</span>
      <span class="tr">${esc(w.transliteration)}</span> · ${esc(gloss(w))}
    </a>
    ${recent.length ? `<h2>Recently viewed</h2><ul class="chips">${recent.map((e) =>
      `<li><a class="chip" href="#/word/${e.id}"><span lang="hi">${esc(e.headword)}</span>${esc(e.romanised[0])}</a></li>`).join('')}</ul>` : ''}
    ${saved.length ? `<h2>Saved words</h2><ul class="list">${saved.map((e) => card(e)).join('')}</ul>` : ''}
    <p class="tips">Type the way you normally would: <code>shanti</code>, <code>shaanti</code>, <code>शांति</code> or <code>शान्ति</code> all find the same word. You can also search the English meaning, like <code>peace</code>.</p>
    <p><a class="btn" href="#/all">Browse all ${entries.length} words</a></p>`;
}

function renderAll() {
  const sorted = [...entries].sort((a, b) => a.headword.localeCompare(b.headword, 'hi'));
  view.innerHTML = `
    <a class="back" href="#/">← Home</a>
    <h2>All ${entries.length} words</h2>
    <ul class="az">${sorted.map((e) =>
      `<li><a href="#/word/${e.id}"><span lang="hi">${esc(e.headword)}</span><small>${esc(e.meanings[0])}</small></a></li>`).join('')}</ul>`;
}

function renderSearch(query) {
  const res = search(index, query);
  if (!res.query) return renderHome();
  const { results, meaningResults, suggestions } = res;
  const q = esc(res.query);

  if (!results.length && !meaningResults.length) {
    view.innerHTML = `
      <div class="empty">
        <div class="big" aria-hidden="true">?</div>
        <h3>No word found for “${q}”</h3>
        <p>We have ${entries.length} words so far, and this isn't one of them yet.</p>
      </div>
      ${suggestions.length ? `<h2>Closest words we have</h2><ul class="list">${suggestions.map((s) => card(s.entry, `Sounds a little like “${esc(s.via)}”`)).join('')}</ul>` : ''}
      <h2>Try</h2>
      <ul class="tips" style="margin-top:0">
        <li>A simpler spelling: <code>shanti</code> instead of <code>shaantee</code></li>
        <li>Devanagari, if you have a Hindi keyboard: <code>शांति</code></li>
        <li>The English meaning: <code>peace</code></li>
      </ul>
      <p style="text-align:center"><a class="btn" href="#/all">Browse all words</a></p>`;
    return;
  }

  const onlyFuzzy = results.length && results.every((r) => r.kind === 'fuzzy');
  let html = '';
  if (results.length) {
    html += onlyFuzzy
      ? `<p class="meta">No exact match for <b>“${q}”</b>. Closest spellings:</p>`
      : `<p class="meta">${plural(results.length, 'result')} for <b>“${q}”</b></p>`;
    html += `<ul class="list">${results.map((r) => card(r.entry, whyLabel(r, res.query))).join('')}</ul>`;
  }
  if (meaningResults.length) {
    html += `<h2>${results.length ? 'Also in English meanings' : `English “${q}” in Hindi`}</h2>
      <ul class="list">${meaningResults.map((r) => card(r.entry)).join('')}</ul>`;
  }
  view.innerHTML = html;
}

function renderEntry(id) {
  const e = byId.get(id);
  if (!e) {
    view.innerHTML = `<div class="empty"><div class="big">?</div><h3>That word isn't here</h3>
      <p>The link may be old.</p><p><a class="btn" href="#/">Go to search</a></p></div>`;
    return;
  }
  pushRecent(id);
  document.title = `${e.headword} (${e.transliteration}) · Garuda Shabdkosh`;
  const example = esc(e.example).replace(esc(e.headword), `<mark>${esc(e.headword)}</mark>`);
  const canSpeak = 'speechSynthesis' in window;
  const saved = isSaved(id);
  view.innerHTML = `
    <a class="back" href="${lastSearch ? `#/q/${encodeURIComponent(lastSearch)}` : '#/'}" id="back">← ${lastSearch ? `Results for “${esc(lastSearch)}”` : 'Home'}</a>
    <article>
      <header class="entry-head">
        <h1 class="hw" lang="hi">${esc(e.headword)}</h1>
        <p class="tr" lang="sa-Latn">${esc(e.transliteration)}</p>
        <span class="pill">${esc(e.pos)}</span>
        <div class="actions">
          <button class="btn" id="save" aria-pressed="${saved}">${icons.star}<span>${saved ? 'Saved' : 'Save'}</span></button>
          ${canSpeak ? `<button class="btn" id="speak">${icons.speak}Listen</button>` : ''}
          <button class="btn" id="copy">${icons.copy}Copy</button>
          <button class="btn" id="share">${icons.share}Share</button>
        </div>
      </header>
      <section class="section"><h2>Meanings</h2>
        <ol class="meanings">${e.meanings.map((m) => `<li>${esc(m)}</li>`).join('')}</ol></section>
      <section class="section"><h2>Example</h2>
        <blockquote class="example" lang="hi">${example}</blockquote></section>
      <section class="section"><h2>Also spelled</h2>
        <ul class="chips">${e.romanised.map((r) => `<li class="chip">${esc(r)}</li>`).join('')}</ul></section>
    </article>`;

  document.getElementById('save').onclick = (ev) => {
    const now = toggleSaved(id);
    ev.currentTarget.setAttribute('aria-pressed', now);
    ev.currentTarget.querySelector('span').textContent = now ? 'Saved' : 'Save';
    toast(now ? 'Saved to this device' : 'Removed from saved');
  };
  document.getElementById('speak')?.addEventListener('click', () => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(e.headword);
    u.lang = 'hi-IN';
    const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('hi'));
    if (voice) u.voice = voice;
    else toast('No Hindi voice on this device; using default');
    speechSynthesis.speak(u);
  });
  const text = `${e.headword} (${e.transliteration}), ${e.pos}: ${gloss(e)}\n${e.example}`;
  document.getElementById('copy').onclick = async () => {
    try { await navigator.clipboard.writeText(text); toast('Copied'); } catch { toast('Copy not allowed here'); }
  };
  document.getElementById('share').onclick = async () => {
    const url = location.href;
    if (navigator.share) { try { await navigator.share({ title: e.headword, text, url }); } catch { /* cancelled */ } }
    else { try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch { toast(url); } }
  };
}

// ---------- routing ----------
// #/            home
// #/q/<query>   search results (shareable, survives reload and Back)
// #/word/<id>   entry detail
// #/all         browse
let lastSearch = '';

function route() {
  let hash = location.hash.slice(1) || '/';
  try { hash = decodeURIComponent(hash); } catch { /* malformed %-escape: use as-is */ }
  document.title = 'Garuda Shabdkosh';
  const [, kind, ...rest] = hash.split('/');
  const arg = rest.join('/');
  if (kind === 'word') {
    renderEntry(Number(arg));
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
    return;
  }
  if (kind === 'q') {
    lastSearch = arg;
    if (input.value !== arg) input.value = arg;
    renderSearch(arg);
  } else if (kind === 'all') {
    renderAll();
  } else {
    lastSearch = '';
    input.value = '';
    renderHome();
  }
  clearBtn.hidden = !input.value;
}

input.addEventListener('input', () => {
  const v = input.value;
  clearBtn.hidden = !v;
  lastSearch = v.trim();
  // replaceState: typing shouldn't create one history entry per keystroke
  history.replaceState(null, '', v.trim() ? `#/q/${encodeURIComponent(v)}` : '#/');
  renderSearch(v);
});

document.getElementById('search-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const first = view.querySelector('.card');
  if (first) { history.replaceState(null, '', `#/q/${encodeURIComponent(input.value)}`); location.hash = first.getAttribute('href'); }
  input.blur(); // close the phone keyboard
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  history.replaceState(null, '', '#/');
  route();
  input.focus();
});

window.addEventListener('hashchange', route);

// ---------- offline ----------
function updateNet() {
  const off = !navigator.onLine;
  netStatus.classList.toggle('off', off);
  netStatus.textContent = off ? 'Offline: search still works' : (navigator.serviceWorker?.controller ? 'Available offline' : '');
}
window.addEventListener('online', updateNet);
window.addEventListener('offline', updateNet);
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(updateNet).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', updateNet);
}

// ---------- boot ----------
async function boot() {
  try {
    const res = await fetch('data/entries.json');
    if (!res.ok) throw new Error(res.status);
    entries = await res.json();
  } catch {
    view.innerHTML = `<div class="empty"><div class="big">!</div><h3>Couldn't load the dictionary</h3>
      <p>Check your connection and reload. If you opened the file directly, run a local server (see README).</p></div>`;
    return;
  }
  index = buildIndex(entries);
  byId = new Map(entries.map((e) => [e.id, e]));
  document.getElementById('count').textContent = entries.length;
  route();
  updateNet();
}
boot();
