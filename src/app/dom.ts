import type { Entry } from '../lib/types.ts';
import { app } from './state.ts';

/** Typed getElementById that fails loudly if the HTML shell changes. */
export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing from index.html`);
  return el as T;
}

export const view = (): HTMLElement => $('view');

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: unknown): string => String(s).replace(/[&<>"']/g, (c) => ESC[c] ?? c);

export const svg = (paths: string, viewBox = '0 0 24 24'): string =>
  `<svg viewBox="${viewBox}" aria-hidden="true">${paths}</svg>`;

/** Garuda's wing (pankh), five strokes: the brand mark. */
export const WING_PATHS =
  '<path d="M4 30C14 18 30 8 60 4"/><path d="M10 30.5C22 24 38 16 58 11"/><path d="M16 31.2C28 27 42 22 55 18"/><path d="M22 32C33 30 44 27 52 25"/><path d="M4 30 22 32"/>';
export const wing = (cls = ''): string => `<svg class="${cls}" viewBox="0 0 64 36" aria-hidden="true">${WING_PATHS}</svg>`;

export const icon = {
  back: svg('<path d="m15 5-7 7 7 7"/>'),
  bookmark: svg('<path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4.2L5.5 20V5a1 1 0 0 1 1-1z"/>'),
  share: svg('<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M7 11H6a1.5 1.5 0 0 0-1.5 1.5v6.5A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-6.5A1.5 1.5 0 0 0 18 11h-1"/>'),
  speaker: svg('<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
};

export function toast(message: string): void {
  document.querySelector('.toast')?.remove();
  const t = Object.assign(document.createElement('div'), { className: 'toast', textContent: message });
  t.setAttribute('role', 'status');
  document.body.append(t);
  setTimeout(() => t.remove(), 1800);
}

const GENDER: Record<string, string> = { 'f.': 'feminine', 'm.': 'masculine' };
/** "noun (f.)" -> "noun, feminine" */
export function posText(pos: string): string {
  const m = pos.match(/^(\S+)\s*\((.+)\)$/);
  return m ? `${m[1]}, ${GENDER[m[2]] ?? m[2]}` : pos;
}

export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

export const row = (e: Entry): string => `<li><a class="row" href="#/word/${e.id}">
  <span class="row-top"><span class="hw" lang="hi">${esc(e.headword)}</span><span class="tr">${esc(e.romanised[0])}</span></span>
  <span class="gloss">${esc(e.meanings.join(', '))}</span></a></li>`;
export const rows = (list: Entry[]): string => `<ul class="rows">${list.map(row).join('')}</ul>`;

export const section = (title: string, right = ''): string =>
  `<div class="section"><h2>${title}</h2>${right}</div>`;

/** Top bar for the word, saved and practice screens. */
export const topbar = (title: string, actions = '', back = app.backHash): string => `<header class="topbar"><div class="inner">
  <a class="icon-btn" href="${esc(back)}" aria-label="Back">${icon.back}</a>
  <span class="title">${title}</span>
  <div class="actions">${actions || '<span class="icon-btn" aria-hidden="true"></span>'}</div></div></header>`;

export const empty = (title: string, body: string): string =>
  `<div class="empty" role="status"><p class="title">${title}</p>${body}</div>`;
