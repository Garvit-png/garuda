# Demo script (2–3 min, Loom)

Record on your phone (screen recording), or in Chrome DevTools with device mode set to iPhone 12/14. Open the **live link**, not localhost.

| Time | Do | Say |
|---|---|---|
| 0:00 | Home screen | "This is a dictionary app prototype for Garuda. Most people type Hindi words in Roman letters, so search works in both scripts." |
| 0:15 | Type `धर्म`, then clear and type `dharma`, then `dharm`, then `dharam` | "Devanagari and three Roman spellings all land on the same entry. `dharam` isn't in the variant list. It matches because every spelling is reduced to a phonetic key." |
| 0:40 | Type `शान्ति` (with the half न्) | "The data spells it शांति with an anusvara, and many people type the half-n. Generic string matching misses this, and we handle it." |
| 0:55 | Type `jnaan`, then `gyan` | "ज्ञ is said 'gy' in Hindi, so both IAST-style and spoken spellings work." |
| 1:05 | Type `prakesh` | "A typo. It shows the closest match and says why: 'Close to prakash'." |
| 1:15 | Type `peace` | "You can also search English meanings." |
| 1:25 | Type `bharat` | "A clear no-results state: one line, and a suggestion only when it's genuinely close." |
| 1:35 | Open धर्म, tap the star (save) and the speaker (listen) | "The detail screen shows every field: IAST, part of speech, meanings, an example with the word in bold, and all spellings." |
| 1:55 | Tap Back, clear the search, and show Recent and Saved on home | "Recent and saved words are kept on the device. Below them is the full word list." |
| 2:05 | Turn on airplane mode, reload, search `vruksh` | "It works fully offline, because the whole dictionary is cached." |
| 2:20 | Show the terminal running `npm test` and `npm run validate` (optional) | "15 search tests with real Hindi edge cases, and a validator that recomputes the IAST from the Devanagari to catch AI mistakes in the data." |
| 2:35 | End | "Next steps: an API and AI-assistant integration, and a browser extension for looking up any word on a page." |
