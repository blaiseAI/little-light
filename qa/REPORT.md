# Little Light QA report

Date: 2026-10-16. Source: `d01445c05ee246c27bd19fb6bb7792abe3a4c9d2` (main at branch creation). Branch: `qa/codex-2026-10-16`. Tested the repository build at `http://localhost:4183`, served by `tools/serve.mjs`; not the potentially different live deployment. App code was not changed.

## Fix status (after review, 2026-10-16)

Every finding was confirmed against the code and fixed on `main`. The regression tests no longer use `test.fail`, and the observational tests now assert the fixed behaviour. Full suite: 37 passed; `tools/check.mjs`: CHECK PASSED. Screenshots and JSON below are Codex's original evidence from before the fixes.

| ID | Fix |
| --- | --- |
| QA-01/02 | Unknown or locked story links go back to the journey (`location.replace`), which shows what is open and how to unlock the rest. |
| QA-06 | When all 21 are done, every "next story" link on the landing page points to the journey, and My light says "See all my stars". `story=next` on the game page also returns to the journey. |
| QA-03 | Question, answer, tile and card narration only plays with sound on. "Read to me" still works, because the child asks for it. |
| QA-04 | While the sound check is open, story keys are ignored; Escape there works like its ✕. |
| QA-05 | Escape does the same as the ✕ Journey button. |
| QA-07 | Sound check and install sheet make the page behind `inert`, wrap Tab/Shift+Tab inside, and return focus to whatever opened them. |
| QA-08 | After the service worker is ready, the landing page quietly saves the next story's recordings, so the first story reads aloud offline too. |
| QA-09 | Install ✕ is 44×44; Start over is 44 px high. |
| QA-10 | Quiz progress bar is named "Questions answered", with "n of m questions answered" as its value. Axe on the quiz reports no violations. |
| QA-11 | Build the verse is now made for nonreaders. Pip reads the whole verse in the instruction, and a Hear the verse button replays it. Long verses start with their opening words in place (`given` in the story files), so a child places at most 7 words. Each tap is checked at once: a right word fills the glowing slot, a wrong one wobbles back, and after two misses the right word glows and Pip says it. A finished verse is read back and never re-queued. 42 new Heart clips (`audio/v/`, updated `audio/q/`). |
| Double tap | A double tap on Next page/Back turns one page, not two. |

## Summary

The normal first-story journey works across the six requested emulations, and the existing smoke test completed all 21 stories: **CHECK PASSED**, 392 distinct clips played, no missing recordings, no media failures, no device-voice fallbacks, and no page errors. The three main journeys also passed in Playwright WebKit with the iOS 26 Safari user agent.

The five highest-priority problem groups are:

1. Invalid and locked deep links display an entirely blank game page (QA-01/02).
2. After all 21 stories, Continue my journey displays the same blank page (QA-06).
3. Sound off does not prevent answer narration (QA-03).
4. Enter in the sound check advances the underlying story; Escape can empty the game screen (QA-04/05).
5. Modal focus escapes into the page/browser instead of staying inside the dialog (QA-07).

Additional concerns: first-visit offline audio, small secondary controls, accessible naming, and long verse tasks for nonreaders. These are report-only findings; none was fixed.

### Coverage and device matrix

| Device | Engine and viewport | Result |
| --- | --- | --- |
| Desktop | Installed Chrome, 1280×860 | Main journeys plus state, offline, accessibility, install, edge and performance audit |
| iPhone 13 Safari 26 UA | Chromium emulation, 390×664; Version/26.0 Mobile/15E148 Safari/604.1 | 3 main journeys passed |
| iPhone Chrome | Chromium emulation, 390×664; CriOS user agent | 3 main journeys passed |
| Pixel 7 | Chromium device profile, 412×839 | 3 main journeys passed |
| iPad Mini | Chromium device profile, 768×1024 | 3 main journeys passed |
| Narrow phone | Chromium, 360×800, touch/mobile | 3 main journeys passed |
| Additional iPhone profile | Playwright WebKit 27.2 on Windows, Safari26 UA | 3 main journeys passed; not real iOS Safari |

Fresh, partially completed (3 stories), all-complete, resumed, sound-off, reduced-motion, offline and throwing-localStorage states were exercised. The six-device suite covers fresh entry, reader navigation/resume/rotation, journey locking/layout, verse demo and a complete first story. The advanced state matrix runs on desktop; it is not a full device×state Cartesian matrix.

## Findings

P1 = blocks a child or parent; P2 = confusing or broken in a particular case; P3 = polish/advisory. Paths below are relative to `qa/` (all images are in `qa/screenshots/`). Screenshots show UI state; JSON files and regression assertions provide evidence for audio, focus and network behavior that a still image cannot prove.

| ID | Severity | Area | Device + state | Steps | Expected | Actual | Screenshot |
| --- | --- | --- | --- | --- | --- | --- | --- |
| QA-01 | P2 | Invalid deep link | Desktop Chrome, fresh | Open `/play/?story=does-not-exist`. | Friendly error or return to journey with a usable next action. | Visible body is empty. The query is removed, and the hidden legacy sky is scrolled into view without being made visible. | [QA-01](screenshots/QA-01.png) |
| QA-02 | P2 | Locked deep link | Desktop Chrome, no completed stories | Open `/play/?story=noah`. | Explain the lock and offer the first story/journey. | Entire game page is blank; no unlock explanation or recovery button. | [QA-02](screenshots/QA-02.png) |
| QA-03 | P2 | Sound preference | Desktop Chrome, sound off | Continue without sound, skip the story, tap an answer. | No automatic or answer-tap narration while sound is off. | Tapping a choice calls the audio player's `play()` on an answer MP3. `sayWord`/`narrate` bypass the preference; automated evidence in `muted-audio.json`. | [QA-03](screenshots/QA-03.png) |
| QA-04 | P2 | Keyboard sound check | Desktop Chrome, fresh sound dialog | Focus Play Pip's hello; press Enter once. | Play the hello and keep the waiting story on page 1. | Global Enter handler advances the hidden reader to page 2 and prevents the focused button's normal activation; Yes stays disabled. | [QA-04](screenshots/QA-04.png) |
| QA-05 | P2 | Escape recovery | Desktop Chrome, active reader | Dismiss sound check; press Escape. | Return to the journey, matching the visible Journey button. | Lesson closes but location stays `/play/`; all visible content disappears. | [QA-05](screenshots/QA-05.png) |
| QA-06 | P1 | All-complete primary action | Desktop Chrome, all 21 IDs in saved done array | Open My light → Continue my journey (hero CTA has the same next route). | Celebrate completion or offer a replay. | `story=next` resolves to -1 and opens nothing. The primary continuation action becomes a blank page. Individual completed stories can still be reopened from the journey. | [QA-06](screenshots/QA-06.png) |
| QA-07 | P2 | Modal keyboard focus | Desktop Chrome, sound/install dialog open | Tab through the dialog controls; continue Tab after the last control. | Focus wraps inside the modal; dismissal restores the invoking control. | Focus leaves the modal (recorded active element is body); the underlying page is not inert. Install dismissal removes the focused subtree without restoring its invoker. See `audit-data.json`. | [QA-07](screenshots/QA-07.png), [sound](screenshots/focus-sound.png) |
| QA-08 | P2 | First-visit offline promise | Desktop Chrome, fresh context after one online landing visit and service-worker activation | Go offline; reload; open first story; request its first narration. | Offline promise accurately describes what is available, with a visible fallback/download instruction. | Story shell works, but the never-played MP3 returns HTTP 504. No download/status warning is shown in the reader; code may fall back to device speech, whose offline availability varies. Save all stories successfully fixes recording availability. | [QA-08](screenshots/QA-08.png) |
| QA-09 | P3 | Touch targets | iPhone-sized 390×844, install/resume states | Open install sheet; reopen a halfway story. | Every interactive target meets brief's 44×44 minimum. | Install close is 40×40; Start over is only 36 px high. Main story/answer controls sampled meet 44 px. | [QA-09](screenshots/QA-09.png), [resume](screenshots/QA-09-resume.png) |
| QA-10 | P2 | Accessible progress | Desktop Chrome, quiz | Skip reader; inspect quiz with axe/accessibility tree. | Progressbar has an accessible name describing question/story progress. | `#trail` has no name; axe reports serious `aria-progressbar-name`. Landing also has `label-content-name-mismatch` warnings; those need manual voice-control review before treating all of them as defects. | [QA-10](screenshots/QA-10.png) |
| QA-11 | P3 | Verse task complexity (design concern) | 390×844, creation build task; content review across all weeks | Reach Build the verse in the first story. | A nonreader can understand the target and make gradual progress with support. | First task has a 10-word target plus distractors and checks the whole sequence. Other targets include Zacchaeus (12 words) and Moses (10). This is a usability risk, not a proven child-test failure. Consider progressive slots or an explicit full-verse listening cue. | [QA-11](screenshots/QA-11.png) |

## What passed and caveats

- Sound-check overlay, disabled Yes before a pointer click on hello, iPhone Silent Mode tip, mute persistence, reader Next/Back, page labels, last-page transition, resume on the same reader page, and stale resume expiry (>7 days).
- Choice/pairs/build completion, wrong answers appended to the queue, automatic pair check, saved completion, resume clearing, and next lit/current journey stop. The existing all-21 smoke test supplies broad story/exercise/audio coverage.
- Week locking and explanation, six connecting trail segments (12 SVG paths), no document horizontal overflow in the six sampled layouts. Rotating the reader to 844×390 keeps Next in the viewport. Full-page screenshots allow further visual review.
- Verse demo starts shuffled, first miss withholds the answer, second miss names it, completion reveals CTA, reset clears it. Reset checks the new unsolved state; it need not produce a different permutation from the previous shuffle.
- Partial/all-complete collection counts match seeded data. Blocked localStorage leaves the site usable and My light explains that progress could not be read. Reduced-motion enables the static landing mode.
- Install auto-offer after a tap + 15 seconds, return offer, 14-day cooldown, and suppression after the second automatic dismissal. Safari instructions contain the four requested steps. Mocked Android beforeinstallprompt calls prompt and accepts the result.
- Offline shell reload and first story opening; successful save-all; never-opened Joseph story/audio accessible offline; full first-story completion offline after save-all.
- Reader narration is paused on page turn. Double-clicking Next advances two pages (observed behavior; consider a short guard for young children). Back/forward returns to the journey rather than preserving the game URL, because the story query is removed; saved-page continuation still works when reopened.
- `/play/` without a query redirects for a non-automation browser. The app deliberately skips this redirect when `navigator.webdriver` is true, so that test overrides the flag; testing the default automation behavior would give a false finding.
- Keyboard Space activation completes all first-story exercises using focused controls. This is **not** certification of an uninterrupted Tab/Enter-only journey: the sound modal Enter bug and focus escapes prevent that claim.
- Axe scanned landing, reader, quiz, sound check and install. No contrast violation was reported in these scans; that does not prove contrast on every illustration/state. The sound scan inherited a resumed quiz, so its progressbar warning comes from that underlying quiz. Visible focus was present on the hello control; full focus-order/restoration coverage remains limited.

### Performance

Cold Chrome contexts, HTTP cache disabled and service workers blocked to prevent warmed shell measurements; 150 ms latency, 1.6 Mbps down/0.75 Mbps up (explicit Slow-4G approximation), no CPU throttling. Local server is uncompressed. Measured navigation plus Resource Timing transfers were approximately **523 KiB landing** and **158 KiB game**, with load events approximately **3.3 s** and **2.2 s**, respectively. Exact latest values are in `performance.json`. These are initial page assets only: they exclude subsequent narration and service-worker background precaching. They are not Lighthouse scores or live-host timing claims.

### Content

Read two opening-page samples per week and enumerated every build task's word count (`content-samples.json`). No obvious spelling error in those six samples. Moses begins with Pharaoh's order about babies being thrown into the river; historically relevant, but worth caregiver review for sensitive children. This is an editorial recommendation, not a factual defect. The audio smoke verifies clip existence/loading, **not** that spoken words match the script.

## Test inventory and reproduction

From the repository root:

```powershell
npm install
node tools/serve.mjs 4183
# In another terminal:
node tools/check.mjs --url http://localhost:4183/play/?story=next
npx playwright test -c tests/e2e/playwright.config.mjs
npx playwright install webkit
npx playwright test -c tests/e2e/webkit.config.mjs
node tests/e2e/capture.mjs
```

| File | Coverage | Result |
| --- | --- | --- |
| `tests/e2e/journeys.spec.mjs` | 3 primary journeys × 6 devices | 18 passed; additional 3 WebKit passes |
| `tests/e2e/audit.spec.mjs` | axe/targets/focus, saved states, offline, cold performance | 4 evidence-collection tests passed; collected findings are not accessibility passes |
| `tests/e2e/edge-cases.spec.mjs` | install mocks/timing, links/history, muted narration, keyboard defects, wrong answer and double tap | 5 observational tests passed, including successful reproduction of bugs |
| `tests/e2e/additional.spec.mjs` | keyboard Space exercise completion, full offline completion, content inventory | 2 passed |
| `tests/e2e/regressions.spec.mjs` | Intended behavior for QA-01–07 | 7 known expected failures via `test.fail`; remove annotations after fixes. A newly passing regression makes the runner fail, prompting review. |
| `tests/e2e/helpers.mjs` | Shared story solver and setup | Used by journey/additional tests |
| `tests/e2e/capture.mjs` | Supplemental phone screenshots, evidence aliases | Completed; QA-11 uses app preview state to reach build without replaying exercises |
| `tests/e2e/playwright.config.mjs`, `webkit.config.mjs` | Six-device and supplemental WebKit configuration | Executed |
| Existing `tools/check.mjs` (unchanged) | All 21 stories, media and completion | CHECK PASSED |

Final Chrome suite: 29 ordinary passes + 7 reproduced expected failures, no unexpected failures. `results.json` and `webkit-results.json` retain machine-readable outcomes. Known-failure fixtures deliberately assert intended behavior rather than blessing the bugs. Observational tests separately record the actual broken behavior.

## Not verified / physical-device follow-up

- No physical iPhone/Android was available. Real iOS26 bottom toolbar, notch/safe areas, Silent Mode, speaker volume, audio unlocking and OS speech fallback need device testing. Chromium user-agent emulation is not Safari; Windows WebKit is only an additional engine check.
- No real home-screen installation, standalone launch, Safari-to-installed-app storage transfer, OS cache eviction, or airplane-mode device test. Android install was mocked.
- No audible transcription/listening check of the requested few clips per week. Recorded assets loaded successfully, but pronunciation, omissions and exact spoken wording remain unverified.
- No child/parent usability session, screen-reader session or complete manual contrast audit. Verse difficulty and frightening-content notes are design-review concerns.
- Question-position resume, full retry-to-finish after a wrong answer, every wrong verse permutation, all21 completion in offline mode, and every device×state combination were not exhaustively covered. Browser-history testing covered one back/forward cycle, not prolonged navigation stress.
- One cold sample per route is directional performance evidence only. Repeat on real mobile hardware and the deployed host before setting a performance budget.
