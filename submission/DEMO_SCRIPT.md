# Demo script (2–3 min, Loom)

Record on your phone (screen recording), or in Chrome DevTools with device mode set to iPhone 12/14. Open the **live link**, not localhost.

| Time | Do | Say |
|---|---|---|
| 0:00 | Home screen: point at the wing mark and आज का शब्द | "This is a dictionary app prototype for Garuda. The mark is a line-drawn Garuda wing, and every day the home screen shows a new word. Most people type Hindi words in Roman letters, so search works in both scripts." |
| 0:15 | Type `धर्म`, then clear and type `dharma`, then `dharm`, then `dharam` | "Devanagari and three Roman spellings all land on the same entry. `dharam` isn't in the variant list. It matches because every spelling is reduced to a phonetic key." |
| 0:40 | Type `शान्ति` (with the half न्) | "The data spells it शांति with an anusvara, and many people type the half-n. Generic string matching misses this, and we handle it." |
| 0:55 | Type `jnaan`, then `gyan` | "ज्ञ is said 'gy' in Hindi, so both IAST-style and spoken spellings work." |
| 1:05 | Type `prakesh` | "A typo. It shows the closest word, with one line saying it's not an exact match." |
| 1:15 | Type `peace` | "You can also search English meanings." |
| 1:20 | Paste `Gyaan aur vidya sabse bada dhan hai` | "Paste any Hinglish or Hindi sentence and the words the dictionary knows light up. This is the core of a browser extension or e-book lookup, and it's careful: everyday words like 'kal' or 'mat' don't get highlighted by mistake." |
| 1:25 | Type `bharat` | "A clear no-results state: one line, and a suggestion only when it's genuinely close." |
| 1:35 | Open धर्म, tap /dharma/ 🔊 to hear it, tap the bookmark, then **Share** to show the image card, and tap **Next** at the bottom | "The detail screen shows every field: IAST, part of speech, meanings, an example with the word in bold, and all spellings." |
| 1:55 | Tap Back, clear the search, show Recent, scroll the word list (the letter on the left lights up), tap a letter, then open the **Saved** tab | "Recent and saved words stay on the phone, and the full list is grouped by letter like a printed dictionary." |
| 2:00 | Tap the **Practice** tab and answer two questions; tap **Aa**; tap the mic and say “shanti” | "There's a quick practice mode, a bigger-text button for easier reading, and voice search in Hindi." |
| 2:10 | Turn on airplane mode, reload, search `vruksh` | "It works fully offline, because the whole dictionary is cached." |
| 2:20 | Show the terminal running `npm test` and `npm run validate` (optional) | "18 tests with real Hindi edge cases, and a validator that recomputes the IAST from the Devanagari to catch AI mistakes in the data." |
| 2:35 | End | "Next steps: an API and AI-assistant integration, and a browser extension for looking up any word on a page." |
