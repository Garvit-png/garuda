# Garuda Shabdkosh: dictionary app prototype

A Hindi–English dictionary for **Garuda Prakashan** (Track 3: Dictionary App), with 60 entries. You can type a word in Devanagari (`धर्म`) or however you'd spell it in Roman letters (`dharma`, `dharm`, `dharam`), and you land on the same entry. It also works offline and is installable on a phone.

**Live:** https://garvit-png.github.io/garuda/ · **Demo video:** _(Loom link)_

| Must-have | Status |
|---|---|
| Devanagari and romanised search return the same entry | ✅ `धर्म` / `dharma` / `dharm` / `dharam` / `dharmā` → धर्म |
| Entry detail screen with all fields | ✅ headword, IAST, part of speech, meanings, example (headword highlighted), all spellings |
| Works well on a phone | ✅ mobile-first, tested at 390px, 44px+ tap targets, keyboard closes on Enter |
| Clear no-results state | ✅ says so in one line, suggests close words only when they're genuinely close |
| **Bonus:** typo-tolerant | ✅ `prakesh` → प्रकाश, `vishvash` → विश्वास, `sanskirti` → संस्कृति |
| **Bonus:** works offline | ✅ service worker; verified by cutting the network in Chrome and reloading |
| **Bonus:** recent searches / bookmarks | ✅ recent and saved words on the home screen |
| ⭐ **Sentence lookup** | Paste any Hindi or Hinglish sentence (`Gyaan aur vidya sabse bada dhan hai`) and every dictionary word in it becomes tappable |
| ⭐ **Share as image** | One tap makes a 1080×1350 branded word card for WhatsApp or Instagram |
| Extra | English reverse lookup (`peace` → शांति), Hindi text-to-speech, A–Z letter index (वर्णमाला) |

**Design:** a white page with one green, and headwords in a Devanagari serif (Noto Serif Devanagari, cached for offline use). The rest uses the phone's own font. There are four screens: **Home** (recent words, then all words, with the letters अ आ उ… in a sidebar on the left that light up as you scroll past their words, a scroll-spy); **Results** (with a sentence mode and a clear no-results state); **Word** (big headword, the IAST in green with a speaker icon to hear it, part of speech, numbered meanings, the example with the headword in bold and other dictionary words linked, the spellings people type, and previous/next word); and **Saved** (the bookmark icon at the top shows how many words are saved). Phone details: a 17px search field (iOS doesn't zoom in), 44px+ tap targets, a sticky search bar, the keyboard's Search key opens the top result, scrolling hides the keyboard, safe-area insets, and dark mode. The service worker is network-first for the app's own files, so a phone always gets the latest version online, and the cache is used offline.

## How to run

No build step and no dependencies. You need any static file server, because the app `fetch`es its data and won't run from a `file://` path.

```bash
git clone https://github.com/Garvit-png/garuda && cd garuda
python3 -m http.server 8080        # or: npx serve .
# open http://localhost:8080
```

```bash
npm test           # 18 tests: search + sentence lookup built on real Hindi examples (Node 18+)
npm run validate   # checks all 60 entries for data errors (see "Checking the data")
```

To deploy, push to GitHub and enable Pages from the `main` branch root. All paths are relative, so the app works from any sub-path.

## How it works

```
data/entries.json   60 entries in the brief's exact schema (10 given + 50 added)
js/indic.js         Devanagari normalisation, Devanagari→Roman/IAST, phonetic key, weighted edit distance
js/search.js        index + ranked search (pure functions, no DOM: reusable anywhere)
js/app.js           UI, hash routing, bookmarks/recents, sentence view, offline status
js/card.js          share-as-image word card (canvas, 1080×1350)
sw.js               offline cache
scripts/validate-data.js   dataset checks
tests/search.test.js       search tests
```

### Most people will type in Roman, and the variant list isn't enough

The dataset already lists a few spellings for each word, but users will type spellings that aren't on the list. Matching only against the list would fail on `shaantee`, `jnaan`, `vrksha` or `swatantrataa`. So every spelling of a word is reduced to a **phonetic key**:

1. **The Devanagari headword itself** is transliterated by our own code (`धर्म` → `dharma`), so every word has a key even if its variant list is empty. That's also how Devanagari queries get matched.
2. **Folding rules**, applied the same way to the query and to every stored spelling:

| Rule | Why | Example |
|---|---|---|
| `sh`, `ś`, `ṣ` → `s` | People mix these freely | `siksha` = `shiksha` = `śikṣā` |
| long vowels: `aa`/`ā` → `a`, `ee`/`ī` → `i`, `oo` → `u` | Vowel length is often not typed | `shaanti` = `shanti` |
| final schwa dropped | Hindi drops the final inherent *a* | `dharma` = `dharm`, `samaya` = `samay` = `samai` |
| `m` before a consonant → `n` | Anusvara is spelled both ways | `samskriti` = `sanskriti`, `ahimsa` = `ahinsa` |
| `w` → `v`, `ph` → `f`, `z` → `j`, `x` → `ks` | Common interchangeable spellings | `vishwas` = `vishvas` |
| `ch`/`chh`/IAST `c` → one sound | IAST `c` is "ch" | `candra` = `chandra` |
| `jñ` / `jn` → `gy` | ज्ञ is said "gy" in Hindi | `jñāna` = `jnana` = `gyan` |
| doubled letters collapsed | Gemination is often not typed | `dukkha` = `dukha`, `shradha` = `shraddha` |

3. **Weighted typo tolerance** (Damerau–Levenshtein). Mistakes that are normal when romanising Hindi cost half an edit: swapping one vowel for another (`vruksh`/`vriksh`), dropping a vowel (`dharam`/`dharm`), or adding or dropping an `h` (`pusthak`/`pustak`). How many edits we forgive depends on query length: none for 1–2 letters, half for 3, one for 4, and 1.5 for 5–7. This stops `ram` matching क्षमा through "chhama".

4. **Ranking:** exact spelling → same sound → prefix (while typing) → fuzzy. When there's an exact hit, weaker fuzzy hits are hidden, so `dukh` doesn't also show `sukh`. If every hit is only a close spelling, a single line says so ("No exact match. Showing the closest words to prakesh"), so the user is never silently given a different word.

### Devanagari edge cases we handle

Generic code tends to get these wrong:

- **Half-nasal vs anusvara:** `शान्ति` = `शांति`, `सुन्दर` = `सुंदर`, `चन्द्र` = `चंद्र`
- **Visarga:** `दुख` finds `दुःख`
- **Chandrabindu vs anusvara**, and **nukta** (`ज़` = `ज`)
- **ZWJ/ZWNJ** inserted invisibly by some phone keyboards (`क्‍षमा`)
- **Unicode NFC vs NFD**, for both Devanagari and IAST diacritics
- **Prefix search on Devanagari while typing:** `प्र` → प्रकाश, प्रेम, प्राचीन
- **Trailing danda or punctuation** pasted in with the word (`शांति।`)

All of these are covered in `tests/search.test.js`.

### Checking the data

The brief says wrong meanings or spellings count against us, and AI wrote the first draft of the 50 new entries. `npm run validate` checks every entry:

- **IAST is recomputed from the Devanagari** by our own transliterator and must match exactly. This catches `sikṣā` vs `śikṣā` and missing macrons. The transliterator itself is checked against the 10 entries Garuda provided.
- Every romanised spelling must sound close to the headword, must be unique across entries, and searching for it must return its own entry.
- The example sentence must contain the headword and be a complete Devanagari sentence.
- Schema and part of speech match the starter-data style.

The validator was **mutation-tested**: I injected 6 kinds of error into a copy of the data, and it caught all 6. Meanings, genders and example sentences were also reviewed by hand (see `AI_LOG.md`).

## The extras: why these two

**Sentence lookup.** Real users meet Hindi words inside sentences: a WhatsApp forward, a news article, a book. Paste the sentence and every word the dictionary knows is underlined; tap one to open it. `findWords()` in `js/search.js` is the whole feature as one pure function, so the same code can power a browser extension, an e-book reader, or an AI tool. Matching is deliberately strict, because a wrong highlight is worse than a missing one: only exact spellings count, or same-sound matches of 4+ letters. Hinglish `kal` (tomorrow) does not light up कला, and `mat` (don't) does not light up माता. I tested this against about 90 everyday Hinglish words, and only real dictionary words matched. Known limitation: `kala` is a listed spelling of कला (art) but often means काला (black). That will resolve itself once काला is in the dictionary and results can be ranked by context.

**Share as image.** Garuda is a publisher, and a word card shared on WhatsApp or Instagram is free, branded reach. Most dictionary apps only share a link. The card is drawn on a canvas in the app's own style and shared through the phone's share sheet. Where image sharing isn't supported, it falls back to sharing the link or downloading the image.

## Trade-offs

- **Vanilla JS, no framework, no build.** The whole app is about 57 KB (18 KB gzipped), so it loads instantly on a slow phone and is trivial to cache offline. That's fine for 3 views. With 2 more weeks and more screens I'd move to a small framework.
- **Hand-written phonetic rules instead of a library or ML model.** Every rule can be explained and tested, and the code has no dependencies. The cost is that the rules are tuned to Hindi spelling habits and will need extending for regional habits (Tamil `th` for त, Bengali `o` for अ).
- **A linear scan over all entries.** A search over 60 entries takes about 0.04 ms (measured). At 50,000 entries I'd precompute keys server-side and use a BK-tree or n-gram index for the fuzzy step.
- **Web PWA instead of a native app.** One URL works on Android, iOS and desktop, installs to the home screen, and works offline, with no app-store review. The trade-off is no system-wide "look up" integration.
- **Bookmarks are stored on the device (localStorage).** That means no accounts and no privacy questions, but they don't sync across devices.
- **Text-to-speech uses the phone's own Hindi voice.** It's free and works offline on most Android phones, but quality varies. Recorded audio would be better.

## Integrating into other apps, AI tools and platforms

The brief stresses that the dictionary should plug into other apps and platforms. Three ways it can already do that:
- **Static JSON API:** `GET /data/entries.json` returns the whole dataset in Garuda's schema.
- **Deep links:** `/#/q/dharm` (search) and `/#/word/11` (entry). WhatsApp, a chatbot, or an e-book reader can link straight to a word.
- **Embeddable engine:** `js/search.js` and `js/indic.js` are pure ES modules with no DOM. The same code runs in the browser, in Node (the tests do this), in a Cloudflare Worker, or behind an AI tool call.

## What I'd build with 2 more weeks

1. **A lookup API and an MCP tool**, so assistants like Claude or ChatGPT can cite Garuda's definitions instead of guessing. Also a public `/api/search?q=` endpoint.
2. **A browser extension and an e-book integration:** select any Hindi or Hinglish word on a page and get Garuda's definition in a popup. This is the most direct "integrate into online platforms" win.
3. **Search analytics on failed queries.** Log zero-result searches (anonymously) so editors can see which words to add next and which spellings people actually type.
4. **An editorial workflow:** a contributor form, a reviewer queue, and the validator running in CI on every change.
5. **Richer entries:** etymology (Sanskrit root), synonyms, related words (धर्म → धार्मिक), and recorded pronunciations.
6. **An on-screen Devanagari keyboard** for users who don't have a Hindi keyboard, plus Hinglish sentence search.
7. **Packaging and polish:** an Android TWA so it can go on the Play Store with the same code, PNG icons, and an accessibility audit with a screen reader.

## AI use

Built with Claude Code. See [`AI_LOG.md`](AI_LOG.md) for the tools used, the prompts, what was rejected or corrected, and how the data and code were checked. The commit history shows how the app was built up step by step.
