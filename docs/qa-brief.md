# Little Light: end-to-end and UX QA brief

You are QA for Little Light. **Find and report problems; do not fix app code.** A separate agent fixes
what you report. Be concrete: every finding needs steps, expected vs actual, device, and a screenshot.

## What Little Light is

Five-minute Bible stories and games for children aged **5 to 7** (made for Sabbath-keeping families).
Parents set it up; children tap through it, often before they can read well, so audio and big targets matter.

- **Landing page** `/`: hero, a weekly **journey** (3 weeks × 7 stories), "How it works", a playable
  **verse demo**, closing invitation, and a **My light** panel (stars, days, sound, install, offline).
- **Game** `/play/?story=<id>` or `/play/?story=next`: per story, a **sound check** (once per browser
  session), **story time** (5–6 narrated pages), then a **quiz** (pick the answer, match pairs, build
  the verse), then "You lit a star!". `/play/` on its own redirects to `/#stories`.
- Progress lives only in this browser's `localStorage` (`little-light`, `little-light-resume`,
  `little-light-sound`, `little-light-install`). There are no accounts.
- It is a **PWA**: installable, works offline after the first visit, with "Save all stories for offline".

Live site: https://littlelight.kids/ · Repo: this folder (`main` branch).

## Setup

```
git switch -c qa/codex-<date>          # work on a branch; never commit to main
npm install                            # Playwright (uses your installed Chrome)
npx playwright install webkit          # optional: closer to iPhone Safari than Chrome emulation
node tools/serve.mjs                   # http://localhost:4173/  (keep running; use a server, not file://)
node tools/check.mjs                   # existing smoke test: plays all 21 stories; must print CHECK PASSED
```

Put your tests in `tests/e2e/` (you may add `@playwright/test` as a devDependency) and your report in
`qa/`. Do not edit `index.html`, `play/`, `app.js`, `landing.js`, `pwa.js`, `sw.js`, `sound.js`,
`styles.css`, `landing.css`, `stories/` or `audio/`. Stage files by name; **never `git add -A`**
(other agents work in this folder).

## Test matrix

Devices (emulate at least): **iPhone 13 with an iOS 26 Safari user agent**
(`... Version/26.0 Mobile/15E148 Safari/604.1`), **iPhone with Chrome** (`CriOS`), **Pixel 7**,
**iPad Mini**, **desktop 1280×860**, and one **narrow 360 px** phone.

States: brand-new visitor · returning with some stories done · all 21 done · halfway through a story ·
sound off · `prefers-reduced-motion` · **offline after one online visit** · storage blocked
(private mode / `localStorage` throwing).

## Journeys to test (expected behaviour)

1. **First visit → first story.** "Light the first star" opens the first story; the sound check sits over
   page 1; "Yes, I can hear Pip" is disabled until "Play Pip's hello" is tapped; on iPhone a Silent Mode
   tip shows. "Continue without sound" turns sound off. ✕ returns to the journey.
2. **Story time.** Next page / Back / Skip the story; "Read to me" plays the page's narration and stops
   on page turn; page label "Story time · page n of m" is correct; last page says "Start the questions".
3. **Quiz.** Each question reads itself aloud (sound on); tapping answers, tiles and cards speaks them;
   wrong answers come back at the end; pairs auto-check; build-the-verse accepts only the right order.
4. **Finish.** "You lit a star!" shows stars and days; "Back to my journey" returns to `/#stories`, the
   star is lit and the next stop is "You are here"; on phones a "Keep Little Light on your phone" button shows.
5. **Leave halfway and resume.** ✕ Journey mid-story → that stop says "Halfway there" / "Keep going" →
   reopening lands on the same page or question with "Welcome back! We saved your place." and Start over.
   Finishing clears it; a place older than 7 days is ignored.
6. **Journey.** Week tabs; only reached stories open; upcoming stops explain how to unlock them; the
   trail line connects the stops at every width; a returning child's counts are right.
7. **My light.** Counts match progress; Sound on/off persists and is respected by the game; "Start my
   first story" / "Continue my journey" go to the next story.
8. **Verse demo.** Shuffled words (never already in order); slots fill; a wrong word wobbles and the
   answer is only named after a second miss; sounds play; on completion a "Light your first star" (or
   "Continue my journey") button appears; Start again reshuffles.
9. **Install.** On a phone, the install sheet offers itself on a return visit or 15 s after a tap;
   "Not now" waits 14 days and stops after two; iPhone Safari shows ••• → Share → Add to Home Screen →
   "Open as Web App"; Android shows an Install button (you can simulate `beforeinstallprompt`).
10. **Offline.** After one online visit: go offline, reload, open a story, read, quiz, finish. Then
    "Save all stories for offline" and repeat with a story never opened. Note anything that silently fails.
11. **Edge links.** `/play/?story=does-not-exist`, a locked story id, `/play/` with no query, repeated
    back/forward navigation, double-tapping buttons, rotating the phone mid-story.

## UX and accessibility review

- **For a 5–7-year-old:** can it be used without reading? Are targets at least 44 px? Is feedback
  immediate and kind? Anything confusing, scary, too long, or too hard (e.g. 10+ word verses)?
- **For a parent:** is it clear what this is, what to tap first, how progress is saved, how to install?
- **Accessibility:** keyboard-only path through a whole story; visible focus; dialogs trap and return
  focus; buttons have names; run axe (e.g. `@axe-core/playwright`) on landing, reader, quiz, sound check,
  install sheet; colour contrast; reduced motion honoured.
- **Layout:** no sideways scrolling, nothing covered or clipped at any width; iOS 26 notch and bottom
  toolbar (the lesson buttons must not sit under Safari's toolbar).
- **Performance:** first-load weight of `/` and `/play/`, and load time on throttled "Slow 4G".
- **Content:** typos; narration matches the words on screen (spot-check a few clips per week).

## Report: `qa/REPORT.md`

1. Summary: what you tested, on what, what passed, and the top 5 problems.
2. Findings table: **ID · Severity (P1 blocks a child or parent / P2 confusing or broken in one case /
   P3 polish) · Area · Device + state · Steps · Expected · Actual · Screenshot** (`qa/screenshots/<ID>.png`).
3. Test inventory: each test file, what it covers, pass/fail.
4. What you could not test (for example real iPhone audio and the silent switch, real install, real
   offline on a phone) and why.

Commit only `tests/`, `qa/` and any package changes, on your branch, and push the branch.
