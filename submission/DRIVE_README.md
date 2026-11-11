# Garvit Gandhi — Dictionary App (Track 3)

I built a mobile-first, offline-capable Hindi–English dictionary PWA on 60 entries: the 10 provided plus 50 that I added and validated with an automated checker. Search works in Devanagari and Roman: `धर्म`, `dharma`, `dharm` and `dharam` all open the same entry — through a phonetic key, not just a variant list. Typos are tolerated (`prakesh` → प्रकाश), English meanings are searchable, and the app works fully offline.

**Extras beyond the brief:**
- **Sentence lookup** — paste any Hindi or Hinglish sentence and every dictionary word becomes a tappable link
- **Share as image** — one tap generates a 1080×1350 branded word card for WhatsApp/Instagram
- **Word of the day** — same word for everyone on that date, reason to open the app daily
- **Practice quiz** — 5 questions, saved words first
- **Voice search** — Web Speech API, Hindi, returns Devanagari
- **Bigger text toggle**, **dark mode**, **prev/next word**, **letter sidebar with scroll-spy**

**Design:** minimal — white page, one saffron-orange accent (`#E05A1E`), near-black ink. The accent appears only on the Garuda wing mark, links, and active states. No shadows, no colored blocks. Phone-first with a bottom tab bar; on a laptop it centers as a phone-width column.

---

**Live app:** https://garvit-png.github.io/garuda/
**GitHub (public):** https://github.com/Garvit-png/garuda
**Demo video:** _(Loom link — record and paste before submitting)_

---

## Files in this folder

| File | What it is |
|---|---|
| `README` (this file) | 5–10 line summary, links, file index |
| `AI_LOG.md` | Tools used, key prompts, what was rejected/corrected, how data and code were checked |
| `entries.json` | The 60-entry dataset in Garuda's exact schema |
| Demo video | Link above |

## Checklist before submitting

- [ ] Record the demo video (see `DEMO_SCRIPT.md` in the repo) and paste the Loom link above
- [ ] Confirm the GitHub repo is public: https://github.com/Garvit-png/garuda → Settings → Public
- [ ] Confirm the live site loads: https://garvit-png.github.io/garuda/
- [ ] Set this Drive folder sharing to **"Anyone with the link can view"**
- [ ] Do not change any files after the deadline (version history is visible to reviewers)
