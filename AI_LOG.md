# AI Log — Garuda Shabdkosh, Track 3

**How I used AI:** As a fast executor for well-defined problems. I specified the architecture, data model, search algorithm design, and quality bar upfront — then used Claude to implement, verify, and iterate. Every meaningful decision in this log was mine. AI wrote the code; I decided what the code had to do and whether it was correct.

---

## Tools

| Tool | Role |
|---|---|
| **Claude Code** (Claude Opus, terminal agent) | Implementation — search engine, UI, service worker, validator, tests, 50 new entries |
| **Kiro IDE** (Claude, conversational) | UI redesign iterations in Session 2 |
| **Node.js built-in test runner** | 18 automated tests, run directly on `.ts` files — no compile step |
| **Headless Chrome (CDP)** | Screenshot verification at 390px, offline mode test |

---

## Session 1 — Architecture and build

### My decisions before writing any code

Before starting I specified the core architecture explicitly:

- **Pure search module** (`src/lib/`) with no DOM dependency — same code runs in the browser, in Node for tests, and in a future Cloudflare Worker. This forced a clean separation and made the 18 tests trivial to write.
- **Phonetic key, not a variant list** — the brief's starter data has a few spellings per word, but users will type spellings that aren't listed. I designed the folding rules (schwa deletion, long-vowel collapse, `sh`/`ṣ`/`ś` merge, `jñ`→`gy`, anusvara normalisation) before asking Claude to implement them. Each rule has a linguistic reason.
- **Weighted edit distance, not standard Levenshtein** — vowel swaps, vowel insertion/deletion, and `h` insertion/deletion cost 0.5 because these are normal romanisation confusions, not real typos. Standard distance would over-penalise them.
- **Threshold by query length** — I decided the thresholds (0 for 1–2 letters, 0.5 for 3, 1 for 4, 1.5 for 5–7) by thinking about which confusions are acceptable at each length, not by tuning. `ram` matching क्षमा is not acceptable; `prakesh` matching प्रकाश is.
- **TypeScript + Vite, no UI framework** — strict types catch data-shape mistakes at compile time. No framework keeps the bundle at ~15 KB gzipped, which matters for a slow phone on a 3G connection.
- **Data validator before writing entries** — I wrote `scripts/validate-data.ts` first, mutation-tested it (injected 6 error types, verified it caught all 6), then used it as a gate on the 50 AI-generated entries.

### Where I overrode AI output

| # | What AI produced | Why I rejected it | What I specified instead |
|---|---|---|---|
| 1 | Fuzzy threshold: 1 edit allowed on 3-letter queries | `ram` matched क्षमा through variant "chhama" → phonetic key "cam". Silent wrong answer. | Threshold 0.5 for 3-letter queries. Added a regression test to lock this. |
| 2 | All fuzzy hits shown | `gyanee` returned both ज्ञान and अग्नि — noise that makes the app look broken | Only keep hits within 0.5 of the best score |
| 3 | "Did you mean" on 1–2 letter queries | Confusing while still typing | Short queries are prefix browse only; suggestions from 3 letters minimum |
| 4 | AI-generated romanised spellings included `wed`, `dukhh`, `granthh`, `agani`, `dhian`, `mandeer`, `widya`, `utsaw`, `arath`, `rsi`, `guroo` | Nobody types these. Some are English words. Wrong spellings count against the submission. | Removed all 11 by hand. The phonetic key finds those inputs anyway — the variant list is for exact-match ranking, not search coverage. |
| 5 | README stated app was "~25 KB" | A guess. I never accept unverified numbers. | Measured: 57 KB raw, 18 KB gzipped. Measured search speed: 0.04 ms. Both go in the README as facts. |
| 6 | CSS overflow "bug" on a screenshot | Before touching any CSS I measured: headless Chrome enforces a 500px minimum viewport. Layout was correct at 390px in an iframe. | Did not change anything. The screenshot was the wrong tool, not the code. |
| 7 | `npm test` script pointed at a directory | Node's test runner doesn't accept a directory path | Changed to a glob: `tests/*.test.ts` |
| 8 | Sentence lookup used normal search (prefix + fuzzy included) | `kal` → कला, `mat` → माता — false highlights on everyday Hinglish words | Specified: only exact or same-sound matches of 4+ letters count. Tested against ~90 Hinglish words, zero false positives. |
| 9 | Stacked sticky letter headings at the end of the word list | Each heading used `position: sticky` inside a shared container — they all stacked when the container ended | Specified: wrap each letter group in its own `<section>` so each heading is contained and gets pushed off by the next section |
| 10 | Letter sidebar sorted by browser's Hindi collation | Looks random; different browsers give different orders | Specified: implement `letterRank()` against an explicit `VARNAMALA` array in traditional order. Sort entries by that rank first, then browser collation within a letter. |

### How the data was checked

- `npm run validate` recomputes IAST from Devanagari using our own transliterator and diffs against the stored value. Catches every wrong macron, wrong nasal, missing diacritic.
- Every romanised spelling must find its own entry first when searched.
- Every example sentence must contain the headword.
- Validator was mutation-tested: 6 error types injected, all 6 caught.
- Grammatical gender reviewed by hand — आत्मा, अग्नि, मृत्यु are feminine in Hindi (not Sanskrit). AI got some of these wrong; I corrected them.

---

## Session 2 — UI redesign

### My approach

I treat UI iteration the same way I treat algorithm iteration: start with a clear constraint, evaluate against it, and reject anything that violates it. The constraint I set at the start of this session:

> **One accent color. White everywhere. No decorative elements. Type size and weight create all hierarchy.**

AI's first attempt violated all four constraints (dark header, two accent colors, shadows, watermarks). I rejected the whole design and re-stated the constraints more precisely. The second attempt was correct.

### Specific technical decisions I made and directed AI to implement

**Masthead + searchbar as one sticky unit**
Two separate `position: sticky` elements create a gap when the outer one scrolls away. I specified: merge both into one `<header>` with a single `position: sticky; top: 0`. AI implemented it.

**`--bar-h: calc(112px + env(safe-area-inset-top))`**
The sticky offset for the letter sidebar and group headings must account for the iPhone notch. A hardcoded `112px` breaks on iPhone 14 Pro. I spotted this and specified the `env()` calc.

**Scroll-spy detection line**
After the structural change, the scroll-spy was reading `#searchbar.getBoundingClientRect().bottom` — but `#searchbar` is now inside `.masthead`, so its bottom was being read relative to the wrong element. I identified the root cause and directed the fix: read `.masthead` bottom edge instead.

**Dark mode: `html:not(.dark)` bug**
AI used `@media (prefers-color-scheme: dark) { html:not(.dark) { ... } }`. Once the `.dark` class is set by the inline script, that selector never matches — so a dark→light OS switch at runtime breaks. I specified: use `@media (prefers-color-scheme: dark) { :root { ... } }` and let the `.dark` class block override via source order.

**Pager grid divider on retina**
`background: var(--line)` + `gap: 1px` on a CSS grid produces a hairline that disappears on retina at some zoom levels. I specified: use `border-right: 1px solid var(--line)` on the left cell — a real border, not a background gap.

| # | What AI produced | Problem I identified | Fix I specified |
|---|---|---|---|
| 11 | "Living Manuscript" design — dark header, parchment, two colors, shadows | Too heavy, violates the one-color constraint | Scrapped. Rebuilt as single-accent white. |
| 12 | Masthead and searchbar as separate sticky elements | Gap between them when scrolling | Merged into one sticky `<header>` |
| 13 | `top: calc(var(--bar-h) + 16px)` on sticky elements | 16px gap between searchbar and sticky letter heading | Removed extra offset |
| 14 | `--bar-h: 112px` hardcoded | Breaks on notched iPhones (safe-area ignored) | `calc(112px + env(safe-area-inset-top))` |
| 15 | Scroll-spy read `#searchbar` bottom | Wrong element after structural change | Read `.masthead` bottom edge |
| 16 | `html:not(.dark)` in media query | Dark class set → query never fires on light switch | `@media { :root { ... } }` |
| 17 | Pager gap via `background` trick | Disappears/doubles on retina | Real `border-right` on left cell |
| 18 | `.group` sticky heading didn't cover full width | Words scrolled behind the heading | Negative margin + horizontal padding to bleed edge-to-edge |

---

## What this log is meant to show

AI wrote the code. I specified what the code had to do, verified that it did it correctly, identified every failure mode, and directed every fix. The commit history shows this — no large undirected AI dumps, just small focused changes with reasons. The 18 tests exist because I decided they were the right quality gate, not because AI suggested them. The phonetic folding rules exist because I designed them linguistically, not because AI generated them.
