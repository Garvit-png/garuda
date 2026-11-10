import type { Entry } from '../../lib/types.ts';
import { $, esc, topbar, view } from '../dom.ts';
import { app, entriesFor } from '../state.ts';
import { saved } from '../store.ts';

const ROUNDS = 5;

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Practice: see a Hindi word, pick its meaning from four. Saved words come first. */
export function renderPractice(): void {
  const savedWords = entriesFor(saved.list());
  const pool = [...shuffle(savedWords), ...shuffle(app.entries.filter((e) => !savedWords.includes(e)))];
  const questions = pool.slice(0, ROUNDS);
  let n = 0;
  let score = 0;

  const finish = () => {
    const message = score === ROUNDS ? 'All correct. Well done!' : score >= 3 ? 'Good going. Try another round.' : 'Keep practising, it gets easier.';
    view().innerHTML = `${topbar('Practice', '', '#/')}<div class="wrap score">
      <p class="big">${score} / ${ROUNDS}</p><p>${message}</p>
      <div class="actions"><button class="btn" id="again">Play again</button><a class="btn ghost" href="#/">Home</a></div></div>`;
    $('again').addEventListener('click', renderPractice);
  };

  const ask = (e: Entry) => {
    const wrong = shuffle(app.entries.filter((x) => x !== e && x.meanings[0] !== e.meanings[0])).slice(0, 3);
    const options = shuffle([e, ...wrong]);
    view().innerHTML = `${topbar('Practice', '', '#/')}<div class="wrap quiz">
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${ROUNDS}" aria-valuenow="${n}" aria-label="Question ${n + 1} of ${ROUNDS}">
        ${Array.from({ length: ROUNDS }, (_, i) => `<i class="${i < n ? 'done' : ''}"></i>`).join('')}</div>
      <p class="ask">What does this word mean?</p>
      <p class="q" lang="hi">${esc(e.headword)}</p>
      <p class="q-tr">${esc(e.romanised[0])}</p>
      <ul class="options">${options.map((o) => `<li><button data-id="${o.id}">${esc(o.meanings[0])}</button></li>`).join('')}</ul>
      <div class="after" id="after" aria-live="polite"></div></div>`;

    view().querySelector('.options')?.addEventListener('click', (ev) => {
      const b = (ev.target as Element).closest<HTMLButtonElement>('button');
      if (!b || b.disabled) return;
      const ok = Number(b.dataset.id) === e.id;
      if (ok) score++;
      for (const x of view().querySelectorAll<HTMLButtonElement>('.options button')) {
        x.disabled = true;
        if (Number(x.dataset.id) === e.id) x.classList.add('right');
      }
      if (!ok) b.classList.add('wrong');
      $('after').innerHTML = `<p>${ok ? 'Correct!' : `It means “${esc(e.meanings.join(', '))}”.`} <a href="#/word/${e.id}">See word</a></p>
        <button class="btn" id="next">${n === ROUNDS - 1 ? 'See score' : 'Next'}</button>`;
      const nextBtn = $('next');
      nextBtn.addEventListener('click', () => { n++; show(); });
      nextBtn.focus();
    });
  };

  const show = () => (n === ROUNDS ? finish() : ask(questions[n]));
  show();
}
