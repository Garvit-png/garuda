# Garuda Shabdkosh — Dictionary App (Track 3)

A Hindi–English dictionary PWA for Garuda Prakashan with 60 entries. You can type a word in Devanagari (`धर्म`) or any Roman spelling (`dharma`, `dharm`, `dharam`, `dharmā`) and reach the same entry. Works offline. Installable on a phone.

**Live:** https://garuda-delta-six.vercel.app/ · **Demo video:** _(Loom link)_

**GitHub:** https://github.com/Garvit-png/garuda · **Google Drive:** https://drive.google.com/drive/folders/1nJgejRjyA7voUPk52PNIT87Tx4wVwWxM?usp=sharing

## Features

| Feature | Status |
|---|---|
| Devanagari and Roman search return the same entry | ✅ `धर्म` / `dharma` / `dharm` / `dharam` / `dharmā` → धर्म |
| Entry detail: headword, IAST, POS, meanings, example, spellings | ✅ |
| Mobile-first, 44px+ tap targets, keyboard closes on Enter | ✅ |
| Clear no-results state, close-word suggestions only when genuinely close | ✅ |
| Typo tolerance | ✅ `prakesh` → प्रकाश, `vishvash` → विश्वास |
| Offline (service worker, network-first) | ✅ |
| Recent searches + saved/bookmarked words | ✅ |
| **Sentence lookup** | ✅ Paste any Hindi/Hinglish sentence — every dictionary word becomes tappable |
| **Share as image** | ✅ 1080×1350 branded word card for WhatsApp/Instagram |
| **Word of the day** | ✅ Same word for everyone on that date |
| **Practice quiz** | ✅ 5 questions, saved words first, shows right answer |
| **Voice search** | ✅ Web Speech API, hi-IN, Devanagari output |
| **Bigger text toggle** | ✅ Remembered on device |
| English reverse lookup | ✅ `peace` → शांति |
| Hindi text-to-speech | ✅ |
| Letter sidebar with scroll-spy | ✅ Full वर्णमाला in traditional order |
| Previous / next word navigation | ✅ |

## How to run

Requires **Node ≥ 23.6**.

```bash
git clone https://github.com/Garvit-png/garuda && cd garuda
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # serve the built app (service worker + offline on)
```

```bash
npm test           # 18 tests: search + sentence lookup on real Hindi examples
npm run validate   # checks all 60 entries for data integrity
npm run check      # typecheck + test + validate together
```

**Deploy:** every push to `main` runs `.github/workflows/deploy.yml` — type-checks, tests, validates, builds, and publishes `dist/` to GitHub Pages.

## How it works

```
public/data/entries.json      60 entries (10 provided + 50 added and validated)
src/lib/types.ts              Entry, IndexItem, SearchResult types
src/lib/indic.ts              Devanagari normalisation, transliteration, phonetic key, weighted edit distance
src/lib/search.ts             Index builder, ranked search, sentence lookup (pure — no DOM)
src/main.ts                   App shell: router, search box, offline status, bigger text
src/app/views/home.ts         Home: Word of the day, वर्णमाला sidebar + scroll-spy
src/app/views/results.ts      Search results + sentence lookup view
src/app/views/word.ts         Word detail page
src/app/views/practice.ts     Practice quiz
src/app/views/saved.ts        Saved words
src/app/card.ts               Share-as-image word card (canvas, 1080×1350)
src/app/voice.ts              Voice search (Web Speech API, hi-IN)
src/app/store.ts              Recent / saved / text size (localStorage)
src/styles.css                All styles — minimal, one accent color
public/sw.js                  Offline cache; vite.config.ts fills in the file list at build time
scripts/validate-data.ts      Dataset integrity checks
tests/search.test.ts          18 automated tests
```

### Search: how the same entry is found from many spellings

Every spelling is reduced to a **phonetic key**:

1. The Devanagari headword is transliterated by our own code (`धर्म` → `dharma`)
2. Folding rules applied equally to query and stored spellings: `sh`/`ś`/`ṣ` → `s`, long vowels collapsed, final schwa dropped, `m`→`n` before consonants, `w`→`v`, `jñ`/`jn`→`gy`, doubled letters collapsed
3. **Weighted Damerau–Levenshtein** for typos: vowel swaps, vowel insertion/deletion and `h` insertion/deletion cost 0.5. Threshold by query length: 0 for 1–2 letters, 0.5 for 3, 1 for 4, 1.5 for 5–7
4. **Ranking:** exact → same sound → prefix → fuzzy. Exact hit suppresses unrelated fuzzy hits

### Design

Minimal: white background, one accent color (`#E05A1E`, saffron-orange), near-black ink. The accent appears only on the Garuda wing mark, links, active states, and roman transliterations. Type size and hairlines create hierarchy — no shadows, no colored blocks. Phone-first with a bottom tab bar (Dictionary · Practice · Saved); on a laptop it shows as a centered phone-width column.

## Trade-offs

- **TypeScript + Vite, no UI framework.** Strict types catch mistakes in data shape and DOM code at build time. The whole app is ~15 KB gzipped — loads instantly on a slow phone.
- **Hand-written phonetic rules, no library or ML.** Every rule is explainable and tested. Tuned to Hindi spelling habits; regional habits would need extending.
- **Linear scan over 60 entries.** Takes ~0.04 ms. At 50,000 entries I'd precompute keys server-side and use a BK-tree.
- **Web PWA, not native.** One URL for Android, iOS and desktop. Trade-off: no system-wide look-up integration.
- **localStorage bookmarks.** No accounts, no privacy questions, but no cross-device sync.

## What I'd build next

1. **A lookup API and MCP tool** so AI assistants (Claude, ChatGPT) can cite Garuda's definitions
2. **Browser extension** — select any Hindi word on any page and get the definition in a popup
3. **Search analytics** on zero-result queries so editors know what words to add
4. **Editorial workflow** — contributor form + reviewer queue (the validator already runs in CI)
5. **Richer entries** — etymology, synonyms, related words, recorded pronunciations
6. **Android TWA** to publish to the Play Store with the same code

## AI use

Built with Claude Code (Kiro IDE). See [`AI_LOG.md`](AI_LOG.md) for tools, prompts, what was rejected or corrected, and how data and code were checked.
