# Demo script (3–4 min, Loom)

Record on your phone (screen recording), or in Chrome DevTools with device mode set to iPhone 14. Open the **live link** — not localhost.

---

## Part 1 — Core features (0:00–1:35)

| Time | Do | Say |
|---|---|---|
| 0:00 | Home screen | "This is a dictionary app prototype for Garuda Prakashan — 60 entries, works offline, installable on a phone as a PWA." |
| 0:10 | Type `धर्म`, clear, type `dharma`, `dharm`, `dharam` | "Devanagari and three Roman spellings all open the same entry. `dharam` isn't even in the variant list — it matches because every spelling is reduced to a phonetic key before comparison." |
| 0:30 | Type `शान्ति` (half-nasal न्) | "The dataset spells it शांति with an anusvara. Generic string matching misses this. We normalise both sides before comparing — half-nasals, visarga, chandrabindu, ZWJ from phone keyboards, NFD from iOS copy-paste — all handled." |
| 0:45 | Type `jnaan`, then `gyan` | "ज्ञ is pronounced 'gy' in Hindi. IAST-style and spoken spellings both work because the phonetic key folds `jñ` → `gy`." |
| 1:00 | Type `prakesh` | "A typo. One line says it's not an exact match — we never silently return a different word. The user always knows what happened." |
| 1:10 | Type `peace` | "English reverse lookup — searches across all meanings." |
| 1:15 | Paste `Gyaan aur vidya sabse bada dhan hai` | "Sentence lookup. Every dictionary word lights up. This is strict by design — only exact or same-sound matches of 4+ letters count. `kal`, `mat`, `ham` don't get highlighted. A wrong highlight is worse than a missing one." |
| 1:25 | Open धर्म → tap pronunciation → bookmark → Share | "Detail screen: IAST, part of speech, meanings, example with the word in bold, all spellings. Share generates a 1080×1350 image card for WhatsApp — drawn on an HTML5 Canvas, no server needed." |

---

## Part 2 — Tech decisions and scale (1:35–2:45)

| Time | Do | Say |
|---|---|---|
| 1:35 | Show the terminal, run `npm test` | "18 automated tests on real Hindi edge cases — ZWJ, NFD, visarga, anusvara variants, typos, sentence lookup false-positive check. All pass. The search engine is a pure TypeScript module with no DOM dependency, so the same code runs in the browser, in Node for these tests, or in a Cloudflare Worker." |
| 1:50 | Show `src/lib/indic.ts` briefly | "The phonetic key function is about 40 lines. No NLP library, no ML model — just explicit folding rules that are fast, testable, and explainable. Each rule has a reason: `sh`/`ś`/`ṣ` collapse because users mix them freely; final schwa is dropped because Hindi drops it in speech." |
| 2:05 | Say this, no need to show code | "**Why this stack?** TypeScript + Vite, no UI framework. Strict types catch data-shape mistakes at build time. The whole app is about 15 KB gzipped — loads in under a second on a 3G connection. With a framework it would be 10× heavier for the same output." |
| 2:15 | Say this | "**At 60 entries**, search is a linear scan — 0.04 ms measured. That's fine. **At 50,000 entries** I'd precompute phonetic keys server-side, store them in a BK-tree or n-gram index for the fuzzy step, and expose a `/api/search?q=` endpoint. The pure search module already has no DOM coupling, so moving it to a Cloudflare Worker or a Lambda is a one-file change." |
| 2:30 | Say this | "**At millions of users** the data is fully static — `entries.json` is served from a CDN, the service worker caches it on first load, and every subsequent search is local with zero server round-trips. The only server cost is the initial CDN hit. Scaling is free until you add user accounts or analytics." |
| 2:40 | Say this | "**MCP integration** is the next obvious step — expose `/api/search` as an MCP tool so Claude or ChatGPT can call Garuda's definitions directly instead of hallucinating meanings. The search module is already structured as a pure function that takes a query and returns ranked results, so wrapping it is trivial." |

---

## Part 3 — Remaining features (2:45–3:15)

| Time | Do | Say |
|---|---|---|
| 2:45 | Show Word of the day, Practice tab | "Word of the day picks deterministically from the date — same word for every user, no server call. Practice uses saved words first." |
| 2:55 | Tap Aa button, then mic | "Bigger text is remembered on the device. Voice search uses the Web Speech API in hi-IN — returns Devanagari, goes through the same phonetic search." |
| 3:05 | Turn on airplane mode, reload, search `vruksh` | "Fully offline — service worker caches the app and data on first load. Network-first strategy so phones always get the latest version when online." |
| 3:12 | End | "The repo is public on GitHub with 30+ commits showing the build history, 18 tests, a data validator, and a CI pipeline that type-checks, tests, and deploys on every push." |
