# AI log: Garuda Prakashan, Track 3 (Dictionary App)

> **Garvit: read this before submitting.** Claude drafted this log from our actual session. Everything under "What was rejected or corrected" really happened and can be traced in the commit history. Fill in the two ✍️ items, and edit anything you'd describe differently.

## Tools used

| Tool | Used for |
|---|---|
| **Claude Code** (Claude Opus 5.5, terminal agent) | Planning the approach, writing all the code (search engine, UI, service worker, validator, tests), drafting the 50 new dictionary entries, the README and this log |
| **Headless Google Chrome** (driven by Claude Code) | Screenshots at phone width (390px), and an offline test over the Chrome DevTools Protocol |
| **Node.js test runner** | 15 automated search tests, plus the data validator |
| ✍️ *Add anything you used yourself, e.g. a Hindi dictionary site to cross-check meanings* | |

## Key prompts

1. Pasted the full assignment overview, then: *"YEH TASK HAI MERA yeh poora krna hai, do it"* ("this is my task, I need to finish all of it").
2. Picked the **Dictionary App** track when Claude asked which track(s) to do.
3. Pasted the Track 3 brief (requirements, starter data and deliverables) when Claude pointed out that the brief itself was missing from the first paste.
4. After seeing the first version: *"ux vgera sb sahi kro, bahot AI lg raha hai, fix it, ekdm minimal bnao, professional bhi lge, easy to use, thoda phone optimise"* ("fix the UX, it looks too AI-made; make it really minimal, professional, easy to use, and optimise it a bit for phones"). This led to rows 10–12 below.

Claude Code then worked in small steps and committed after each one. The commit messages record what changed and why. *(Claude Code sessions can be exported with `/export` if you want to attach the full transcript.)*

## What was rejected or corrected, and why

| # | What the AI produced | Problem | What we did |
|---|---|---|---|
| 1 | Fuzzy-match threshold allowed 1 edit on 3-letter queries | Probing with real queries showed **`ram` matched क्षमा** (through the variant "chhama"). A wrong answer is worse than no answer. | Cut the threshold to half an edit for 3 letters and added a regression test |
| 2 | Showed all fuzzy hits | **`gyanee` returned ज्ञान *and* अग्नि**, which is noise | Kept only hits close to the best score |
| 3 | 1–2 letter queries such as `v` or `sh` showed "Did you mean…" | Confusing while the user is still typing | Short queries now act as a prefix browse; suggestions only appear from 3 letters |
| 4 | Generated romanised spellings included **`wed`, `dukhh`, `granthh`, `agani`, `dhian`, `mandeer`, `widya`, `utsaw`, `arath`, `rsi`, `guroo`** | Nobody types these. Some are English words (`wed`) or invented. Implausible variants count as wrong spellings. | Removed all 11 by hand. The phonetic search still finds those inputs anyway. |
| 5 | The README claimed the app was "~25 KB" | A guess, not a measurement | Measured it: 57 KB raw, 18 KB gzipped. Also measured search speed (0.04 ms) instead of writing "under 1 ms". |
| 6 | The first phone screenshot showed content cut off on the right | Looked like a CSS overflow bug | **Did not "fix" the CSS blindly.** Measured that headless Chrome enforces a 500px minimum window, re-rendered in 390px iframes, and confirmed the layout was fine. |
| 7 | The four detail-screen buttons wrapped 3+1 on a phone | Looked broken | Changed to a 4-column grid |
| 8 | The clear (×) button showed on an empty search box | CSS `display: grid` overrode the `hidden` attribute | Added `.clear[hidden] { display: none }` |
| 9 | `npm test` script pointed at a folder | Node 25 won't take a directory there | Changed it to a glob |
| 10 | First UI: gradient "word of the day" card, pill chips, uppercase labels, shadows, a red "why it matched" note on every result | **My feedback: it looked too AI-generated, and I wanted it minimal, professional, easy to use and better on a phone** | Redesigned: system fonts, plain lists with dividers, one accent colour, icon buttons. Home is now just Recent, Saved and All words. One status line replaces the per-result notes. Phone fixes: Enter opens the top result, scrolling hides the keyboard, 44px targets. |
| 11 | "Did you mean" for `bharat` offered धर्म, भाषा, पर्वत | Unrelated suggestions make the app look careless | Suggestions must now be within 1 extra edit and start with the same sound |
| 12 | The service worker serves files cache-first | After the redesign, phones would have kept showing the old cached UI | Bumped the cache version so the new design reaches installed users |

## How facts, sources and code were checked

**Dictionary data (the 50 new entries):**
- **Automatic check (`npm run validate`):** IAST is recomputed from the Devanagari by our own transliterator and must match exactly. That transliterator reproduces all 10 entries Garuda provided, including `शांति` → `śānti` with the anusvara written as `n`. The validator also checks that every romanised spelling sounds close to the headword, is unique across entries and finds its own entry when searched, and that every example sentence contains its headword.
- **Validator mutation-tested:** we injected 6 kinds of error into a copy of the data (wrong IAST, a spelling borrowed from another word, an example without the headword, a duplicate spelling, a trailing space, a wrong part-of-speech format). It caught all 6.
- **Manual review:** grammatical gender in Hindi (e.g. आत्मा, अग्नि and मृत्यु are feminine in Hindi even though they are not in Sanskrit), and that each example sentence is natural, simple Hindi. Words were kept to common, unambiguous tatsama vocabulary to reduce the risk of wrong meanings.
- ✍️ **Your spot-check:** pick 10–15 entries and confirm the meanings against a standard dictionary (e.g. McGregor's *Oxford Hindi–English Dictionary* or shabdkosh.com). Note any changes here: *"Checked N entries against ___; changed ___."*

**Code:**
- 15 automated tests built on real examples: the brief's धर्म/dharma/dharm case, every listed spelling of all 60 entries, spellings not in the list, IAST with diacritics, half-nasal/visarga/ZWJ/NFD variants, typos, English reverse lookup and no-results.
- Probed the search with ambiguous queries (`sa`, `kal`, `ram`, `bharat`, `krishna`…) and read the ranked output. Fixes 1–3 above came from this, not from the tests.
- UI checked with real screenshots at 390px. **Offline mode verified**: loaded the app, cut the network in Chrome, reloaded, and searched `vruksh` → वृक्ष still worked.
