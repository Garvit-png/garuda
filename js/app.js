import { buildIndex, search, findWords, isSentence } from './search.js';

// ---------- elements & state ----------
const $ = (id) => document.getElementById(id);
const view = $('view');
const input = $('q');
const clearBtn = $('clear');
const searchbar = $('searchbar');
const savedCount = $('saved-count');

let entries = [];
let index = [];
let byId = new Map();
let sorted = [];          // Hindi alphabetical order
let backHash = '#/';      // where Back on a word page goes
let cleanup = () => {};   // undo listeners added by the current screen

// ---------- saved + recent (on this device; the app works without storage) ----------
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)) ?? []; } catch { return []; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* private mode */ } },
};
const RECENT = 'garuda.recent';
const SAVED = 'garuda.saved';
const pushRecent = (id) => store.set(RECENT, [id, ...store.get(RECENT).filter((x) => x !== id)].slice(0, 10));
const isSaved = (id) => store.get(SAVED).includes(id);
const toggleSaved = (id) => {
  const list = store.get(SAVED);
  const now = !list.includes(id);
  store.set(SAVED, now ? [id, ...list] : list.filter((x) => x !== id));
  updateSavedCount();
  return now;
};
function updateSavedCount() {
  const n = store.get(SAVED).filter((id) => byId.has(id)).length;
  savedCount.hidden = !n;
  savedCount.textContent = n;
}

// ---------- small helpers ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true"${extra}>${d}</svg>`;
const icon = {
  back: svg('<path d="m15 5-7 7 7 7"/>'),
  mark: svg('<path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4.2L5.5 20V5a1 1 0 0 1 1-1z"/>'),
  share: svg('<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M7 11H6a1.5 1.5 0 0 0-1.5 1.5v6.5A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-6.5A1.5 1.5 0 0 0 18 11h-1"/>'),
  speaker: svg('<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
};
// Garuda's wing, drawn as five lines: the brand mark
const WING = '<path d="M4 30C14 18 30 8 60 4"/><path d="M10 30.5C22 24 38 16 58 11"/><path d="M16 31.2C28 27 42 22 55 18"/><path d="M22 32C33 30 44 27 52 25"/><path d="M4 30 22 32"/>';
const GENDER = { 'f.': 'feminine', 'm.': 'masculine' };
const posText = (pos) => {
  const m = pos.match(/^(\S+)\s*\((.+)\)$/);
  return m ? `${m[1]}, ${GENDER[m[2]] ?? m[2]}` : pos;
};
const firstLetter = (e) => [...e.headword.normalize('NFC')][0];
// The वर्णमाला in its traditional order. The sidebar always shows all of it, so the order is
// obvious; we also sort by it ourselves instead of trusting each browser's Hindi collation.
// Grouped the traditional way: vowels, then the consonants in their वर्ग (rows of five) and the rest.
const VARGAS = [
  ['स्वर', 'Vowels', 'अआइईउऊऋएऐओऔ'],
  ['व्यंजन', 'Consonants', 'कखगघङ'], [null, null, 'चछजझञ'], [null, null, 'टठडढण'], [null, null, 'तथदधन'],
  [null, null, 'पफबभम'], [null, null, 'यरलव'], [null, null, 'शषसह'],
];
const VARNAMALA = VARGAS.flatMap(([, , letters]) => [...letters]);
const letterRank = (l) => { const i = VARNAMALA.indexOf(l); return i === -1 ? 999 : i; };

function toast(msg) {
  document.querySelector('.toast')?.remove();
  const t = Object.assign(document.createElement('div'), { className: 'toast', role: 'status', textContent: msg });
  document.body.append(t);
  setTimeout(() => t.remove(), 1800);
}

const row = (e) => `<li><a class="row" href="#/word/${e.id}">
  <span class="row-top"><span class="hw" lang="hi">${esc(e.headword)}</span><span class="tr">${esc(e.romanised[0])}</span></span>
  <span class="gloss">${esc(e.meanings.join(', '))}</span></a></li>`;
const rows = (list) => `<ul class="rows">${list.map(row).join('')}</ul>`;
const section = (title, right = '') => `<div class="section"><h2>${title}</h2>${right}</div>`;

// ---------- आज का शब्द: one word a day, the same for everyone on that date ----------
function wordOfTheDay(date = new Date()) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
  // step through the list by a prime so neighbouring days don't give neighbouring words
  return sorted[(day * 37) % sorted.length];
}
function todayCard() {
  const e = wordOfTheDay();
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
  return `<a class="today" href="#/word/${e.id}">
    <svg class="wing-bg" viewBox="0 0 64 36" aria-hidden="true">${WING}</svg>
    <p class="kicker"><span lang="hi">आज का शब्द</span><span class="date">${date}</span></p>
    <span class="hw" lang="hi">${esc(e.headword)}</span>
    <p class="tr">${esc(e.romanised[0])}</p>
    <p class="mean">${esc(e.meanings.join(', '))}</p>
  </a>`;
}

// ---------- Home: recent words, then every word with a letter sidebar ----------
function renderHome() {
  const recent = store.get(RECENT).map((id) => byId.get(id)).filter(Boolean);
  const groups = new Map();
  for (const e of sorted) {
    const l = firstLetter(e);
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l).push(e);
  }

  view.innerHTML = `<div class="wrap">
    ${todayCard()}
    <a class="practice-link" href="#/practice"><span><strong>Practice</strong> 5 quick questions</span>${svg('<path d="m9 5 7 7-7 7"/>')}</a>
    ${recent.length ? section('Recent', '<button class="link-btn" id="clear-recent">Clear</button>') + `<ul class="chips">${
      recent.map((e) => `<li><a href="#/word/${e.id}" lang="hi">${esc(e.headword)}</a></li>`).join('')}</ul>` : ''}
    ${section('All words', `<span class="meta">${entries.length}</span>`)}
    <div class="browse">
      <nav class="letters" aria-label="Jump to a letter">${VARGAS.map(([hi, en, letters], i) =>
        (hi ? `${i ? '<hr>' : ''}<span class="lt-label" lang="hi" title="${en}">${hi}</span>` : '<i class="gap" aria-hidden="true"></i>')
        + [...letters].map((l) => (groups.has(l)
          ? `<button type="button" data-l="${l}" lang="hi" aria-label="Words starting with ${l}">${l}</button>`
          : `<button type="button" lang="hi" disabled aria-label="No words starting with ${l} yet">${l}</button>`)).join('')).join('')}</nav>
      <div class="words">${[...groups].map(([l, list]) =>
        `<h3 class="group" id="l-${l}" data-l="${l}" lang="hi"><span>${l}</span><small>${list.length}</small></h3>${rows(list)}`).join('')}</div>
    </div>
    <p class="foot">A Garuda Prakashan dictionary. Works offline.</p>
  </div>`;

  $('clear-recent')?.addEventListener('click', () => { store.set(RECENT, []); renderHome(); });

  // Scroll-spy: the letter whose words are on screen lights up in the sidebar.
  const side = view.querySelector('.letters');
  const heads = [...view.querySelectorAll('.group')];
  let current = null;
  let pinned = null;   // a tapped letter stays lit until the user scrolls by hand
  const light = (l) => {
    if (l === current) return;
    current = l;
    for (const b of side.children) {
      if (b.dataset.l !== l) { b.removeAttribute('aria-current'); continue; }
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
    let cur = heads[0];
    for (const h of heads) { if (h.getBoundingClientRect().top <= line) cur = h; else break; }
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = heads.at(-1);
    light(cur.dataset.l);
  };
  let raf = 0;
  const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(spy); };
  const unpin = () => { pinned = null; };
  side.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    pinned = b.dataset.l;
    light(pinned);
    $(`l-${pinned}`).scrollIntoView({ behavior: 'smooth' });
  });
  for (const t of ['touchmove', 'wheel']) side.addEventListener(t, (ev) => ev.stopPropagation(), { passive: true });
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('touchmove', unpin, { passive: true });
  addEventListener('wheel', unpin, { passive: true });
  cleanup = () => {
    removeEventListener('scroll', onScroll);
    removeEventListener('touchmove', unpin);
    removeEventListener('wheel', unpin);
  };
  spy();
}

// ---------- Practice: 5 questions, pick the meaning ----------
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function renderPractice() {
  const ROUNDS = 5;
  // saved words first (if you have enough), topped up with others
  const savedList = store.get(SAVED).map((id) => byId.get(id)).filter(Boolean);
  const pool = shuffle(savedList).concat(shuffle(entries.filter((e) => !savedList.includes(e))));
  const questions = pool.slice(0, ROUNDS);
  let n = 0;
  let score = 0;

  const show = () => {
    if (n === ROUNDS) {
      view.innerHTML = `${topbar('Practice', '', '#/')}<div class="wrap score">
        <p class="big">${score} / ${ROUNDS}</p>
        <p>${score === ROUNDS ? 'All correct. Well done!' : score >= 3 ? 'Good going. Try another round.' : 'Keep practising, it gets easier.'}</p>
        <div class="actions"><button class="btn" id="again">Play again</button><a class="btn ghost" href="#/">Home</a></div></div>`;
      $('again').onclick = renderPractice;
      return;
    }
    const e = questions[n];
    const wrongs = shuffle(entries.filter((x) => x !== e && x.meanings[0] !== e.meanings[0])).slice(0, 3);
    const options = shuffle([e, ...wrongs]);
    view.innerHTML = `${topbar('Practice', '', '#/')}<div class="wrap quiz">
      <div class="progress" aria-label="Question ${n + 1} of ${ROUNDS}">${Array.from({ length: ROUNDS }, (_, i) => `<i class="${i < n ? 'done' : ''}"></i>`).join('')}</div>
      <p class="ask">What does this word mean?</p>
      <p class="q" lang="hi">${esc(e.headword)}</p>
      <p class="q-tr">${esc(e.romanised[0])}</p>
      <ul class="options">${options.map((o) => `<li><button data-id="${o.id}">${esc(o.meanings[0])}</button></li>`).join('')}</ul>
      <div class="after" id="after" aria-live="polite"></div></div>`;
    view.querySelector('.options').addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b || b.disabled) return;
      const ok = Number(b.dataset.id) === e.id;
      if (ok) score++;
      for (const x of view.querySelectorAll('.options button')) {
        x.disabled = true;
        if (Number(x.dataset.id) === e.id) x.classList.add('right');
      }
      if (!ok) b.classList.add('wrong');
      $('after').innerHTML = `<p>${ok ? 'Correct!' : `It means “${esc(e.meanings.join(', '))}”.`} <a href="#/word/${e.id}" style="text-decoration:underline">See word</a></p>
        <button class="btn" id="next">${n === ROUNDS - 1 ? 'See score' : 'Next'}</button>`;
      $('next').onclick = () => { n++; show(); };
      $('next').focus();
    });
  };
  show();
}

// ---------- Results ----------
function renderSentence(text) {
  const parts = findWords(index, text);
  const known = [...new Map(parts.filter((p) => p.entry).map((p) => [p.entry.id, p.entry])).values()];
  if (!known.length) return false;
  view.innerHTML = `<div class="wrap">
    ${section('Words from your sentence', `<span class="meta">${known.length}</span>`)}
    <p class="sentence" lang="hi">${parts.map((p) => (p.entry ? `<a href="#/word/${p.entry.id}">${esc(p.text)}</a>` : esc(p.text))).join('')}</p>
    ${section('Open a word')}${rows(known)}</div>`;
  return true;
}

function renderResults(query) {
  const q = query.trim();
  if (isSentence(q) && renderSentence(q)) return;
  const res = search(index, q);
  const { results, meaningResults, suggestions } = res;
  const qs = esc(res.query);

  if (!results.length && !meaningResults.length) {
    view.innerHTML = `<div class="wrap"><div class="empty" role="status">
      <p class="title">No results for “${qs}”</p>
      <p>Check the spelling, or search in Hindi or English.</p>
      ${suggestions.length ? `<p>Did you mean ${suggestions.map((s) =>
        `<a href="#/word/${s.entry.id}" lang="hi">${esc(s.entry.headword)}</a> (${esc(s.entry.romanised[0])})`).join(', ')}?</p>` : ''}
      <div class="try"><a href="#/q/dharm">dharm</a><a href="#/q/${encodeURIComponent('शांति')}" lang="hi">शांति</a><a href="#/q/peace">peace</a></div>
    </div></div>`;
    return;
  }

  let html = '';
  if (results.length) {
    const fuzzy = results.every((r) => r.kind === 'fuzzy');
    html += fuzzy
      ? `<p class="note">No exact match for <b>${qs}</b>. Closest words:</p>`
      : section(results.length === 1 ? '1 word' : `${results.length} words`);
    html += rows(results.map((r) => r.entry));
  }
  if (meaningResults.length) {
    html += section(results.length ? 'Also in meanings' : `Hindi words for “${qs}”`) + rows(meaningResults.map((r) => r.entry));
  }
  view.innerHTML = `<div class="wrap">${html}</div>`;
}

// ---------- Word ----------
function exampleHtml(e) {
  return findWords(index, e.example).map((p) => {
    if (p.entry?.id === e.id || p.text === e.headword) return `<b>${esc(p.text)}</b>`;
    if (p.entry) return `<a href="#/word/${p.entry.id}">${esc(p.text)}</a>`;
    return esc(p.text);
  }).join('');
}

function speak(text, btn) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'hi-IN';
  u.rate = 0.85;
  const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('hi'));
  if (voice) u.voice = voice;
  btn.classList.add('speaking');
  u.onend = u.onerror = () => btn.classList.remove('speaking');
  speechSynthesis.speak(u);
}

function renderWord(id) {
  const e = byId.get(id);
  if (!e) {
    view.innerHTML = `${topbar('')}<div class="wrap"><div class="empty"><p class="title">This word isn't in the dictionary</p><p><a href="#/">Go to all words</a></p></div></div>`;
    return;
  }
  pushRecent(id);
  document.title = `${e.headword}, शब्दकोश`;
  const saved = isSaved(id);
  const i = sorted.indexOf(e);
  const prev = sorted[i - 1];
  const next = sorted[i + 1];
  const canSpeak = 'speechSynthesis' in window;

  view.innerHTML = `
    ${topbar('', `<button class="icon-btn" id="save" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved' : 'Save word'}">${icon.mark}</button>
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

  if (canSpeak) $('say').onclick = (ev) => speak(e.headword, ev.currentTarget);
  $('save').onclick = (ev) => {
    const now = toggleSaved(id);
    ev.currentTarget.setAttribute('aria-pressed', now);
    ev.currentTarget.setAttribute('aria-label', now ? 'Remove from saved' : 'Save word');
    toast(now ? 'Saved' : 'Removed from saved');
  };
  $('share').onclick = () => shareWord(e);
}

const topbar = (title, actions = '', back = backHash) => `<div class="topbar"><div class="inner">
  <a class="icon-btn" href="${esc(back)}" aria-label="Back">${icon.back}</a>
  <span class="title">${title}</span>
  <div class="actions">${actions || '<span class="icon-btn"></span>'}</div></div></div>`;

// ---------- Saved ----------
function renderSaved() {
  const list = store.get(SAVED).map((id) => byId.get(id)).filter(Boolean);
  backHash = '#/saved';
  view.innerHTML = `${topbar('Saved words', '', '#/')}<div class="wrap">${list.length
    ? section(list.length === 1 ? '1 word' : `${list.length} words`) + rows(list)
    : `<div class="empty"><p class="title">No saved words yet</p>
       <p>Open a word and tap the bookmark at the top to keep it here.</p><p><a href="#/">See all words</a></p></div>`}</div>`;
}

// Share an image card of the word (WhatsApp / Instagram size), or fall back to a link.
async function shareWord(e) {
  const url = location.href;
  const text = `${e.headword} (${e.transliteration}): ${e.meanings.join('; ')}`;
  try {
    const { makeCard } = await import('./card.js');
    const blob = await makeCard(e, location.origin + location.pathname);
    const file = new File([blob], `${e.romanised[0]}-shabdkosh.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: e.headword, text: `${text}\n${url}` }); return; }
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

// ---------- routing: #/   #/q/<query>   #/word/<id>   #/saved ----------
function route() {
  cleanup();
  cleanup = () => {};
  let hash = location.hash.slice(1) || '/';
  try { hash = decodeURIComponent(hash); } catch { /* use as-is */ }
  const [, kind, ...rest] = hash.split('/');
  const arg = rest.join('/');
  document.title = 'शब्दकोश, Garuda Prakashan';
  const isPage = kind === 'word' || kind === 'saved' || kind === 'practice';
  document.body.classList.toggle('page', isPage);

  if (kind === 'word') renderWord(Number(arg));
  else if (kind === 'saved') renderSaved();
  else if (kind === 'practice') renderPractice();
  else {
    const q = kind === 'q' ? arg : '';
    if (input.value !== q) input.value = q;
    backHash = location.hash || '#/';
    if (q.trim()) renderResults(q); else renderHome();
  }
  clearBtn.hidden = !input.value;
  micBtn.hidden = !Recognition || !!input.value;
  window.scrollTo(0, 0);
}

// typing: replace the history entry instead of adding one per key
input.addEventListener('input', () => {
  const v = input.value;
  history.replaceState(null, '', v.trim() ? `#/q/${encodeURIComponent(v)}` : '#/');
  route();
  input.focus();
});
// keyboard "Search" opens the top result
$('search-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  input.blur();
  if (isSentence(input.value)) return;
  const first = view.querySelector('.row');
  if (first && input.value.trim()) location.hash = first.getAttribute('href');
});
clearBtn.addEventListener('pointerdown', (ev) => ev.preventDefault());
clearBtn.addEventListener('click', () => {
  input.value = '';
  history.replaceState(null, '', '#/');
  route();
  input.focus();
});
// scrolling hides the phone keyboard so it doesn't cover the list
view.addEventListener('touchstart', () => { if (document.activeElement === input) input.blur(); }, { passive: true });
// hairline under the search bar once content scrolls beneath it
addEventListener('scroll', () => searchbar.classList.toggle('stuck', scrollY > 60), { passive: true });
addEventListener('hashchange', route);

// ---------- voice search (Chrome on Android, Safari) ----------
const micBtn = $('mic');
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Recognition) {
  micBtn.addEventListener('click', () => {
    const rec = new Recognition();
    rec.lang = 'hi-IN';               // understands Hindi; returns Devanagari, which search handles
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    micBtn.classList.add('listening');
    input.placeholder = 'Listening… say a word';
    const done = () => { micBtn.classList.remove('listening'); input.placeholder = 'Search: धर्म, dharm or peace'; };
    rec.onresult = (ev) => {
      input.value = ev.results[0][0].transcript.trim();
      input.dispatchEvent(new Event('input'));
    };
    rec.onerror = (ev) => { if (ev.error === 'not-allowed') toast('Allow the microphone to search by voice'); };
    rec.onend = done;
    try { rec.start(); } catch { done(); }
  });
}

// ---------- bigger text (remembered on this device) ----------
const sizeBtn = $('size');
const setLarge = (on) => {
  document.body.classList.toggle('large', on);
  sizeBtn.setAttribute('aria-pressed', on);
  sizeBtn.setAttribute('aria-label', on ? 'Normal text size' : 'Bigger text');
};
setLarge(store.get('garuda.large') === true);
sizeBtn.addEventListener('click', () => {
  const on = !document.body.classList.contains('large');
  setLarge(on);
  store.set('garuda.large', on);
  toast(on ? 'Bigger text on' : 'Normal text size');
});

// ---------- offline ----------
const updateNet = () => { $('offline').hidden = navigator.onLine; };
addEventListener('online', updateNet);
addEventListener('offline', updateNet);
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

// ---------- start ----------
(async function boot() {
  try {
    const res = await fetch('data/entries.json');
    if (!res.ok) throw new Error(res.status);
    entries = await res.json();
  } catch {
    view.innerHTML = `<div class="wrap"><div class="empty"><p class="title">Couldn't load the dictionary</p><p>Check your connection and reload.</p></div></div>`;
    return;
  }
  index = buildIndex(entries);
  byId = new Map(entries.map((e) => [e.id, e]));
  sorted = [...entries].sort((a, b) =>
    (letterRank(firstLetter(a)) - letterRank(firstLetter(b))) || a.headword.localeCompare(b.headword, 'hi'));
  updateSavedCount();
  updateNet();
  route();
})();
