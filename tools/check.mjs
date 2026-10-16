// Plays every story start to finish in Chrome and checks the game end to end:
// every story page and question plays, every clip it asks for loads, nothing falls back to the device voice,
// every star lights, and there are no page errors. Also checks every clip exists on disk.
//   node tools/check.mjs                                          the local files
//   node tools/check.mjs --url https://blaiseai.github.io/little-light/play/   the live site
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, loadWeeks, clipList } from './stories.mjs';

const missing = clipList(loadWeeks()).filter((c) => !existsSync(join(ROOT, 'audio', c.file)));
const browser = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  try { sessionStorage.setItem('little-light-session-heard', 'yes'); } catch {}   // skip the once-per-visit sound check
  window.LL_STAY = true;   // stay on the game page between stories instead of returning to the journey
  window.__srcs = []; window.__bad = []; window.__fallback = 0;
  // Narration reuses one player, so record every play() and every media error instead of each new Audio()
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { if (!this.src.startsWith('data:')) window.__srcs.push(this.src); return play.call(this); };
  addEventListener('error', (e) => { if (e.target instanceof HTMLMediaElement && !e.target.src.startsWith('data:')) window.__bad.push(e.target.src); }, true);
  const sp = speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak = (u) => { window.__fallback++; return sp(u); };
});
const urlArg = process.argv.indexOf('--url');
const target = urlArg > 0 ? process.argv[urlArg + 1] : pathToFileURL(join(ROOT, 'play', 'index.html')).href;
console.log('checking', target);
await page.goto(target);

const n = await page.evaluate(() => STORIES.length);
for (let si = 0; si < n; si++) {
  const title = await page.evaluate((i) => { openLesson(i); return L.story.title; }, si);
  while (await page.evaluate(() => L.phase === 'story')) { await page.click('#read'); await page.waitForTimeout(120); await page.click('#check'); }
  while (await page.evaluate(() => L && L.phase !== 'done')) {
    await page.waitForTimeout(420);                                   // let the question start reading itself
    const ex = await page.evaluate(() => L.current);
    if (ex.type === 'choose') { await page.click(`.choice[data-i="${ex.answer}"]`); await page.click('#check'); await page.click('#check'); }
    else if (ex.type === 'pairs') {
      for (let i = 0; i < ex.pairs.length; i++) { await page.click(`.pair[data-side="l"][data-i="${i}"]`); await page.click(`.pair[data-side="r"][data-i="${i}"]`); await page.waitForTimeout(80); }
      await page.waitForTimeout(800); await page.click('#check');
    } else {
      const tiles = await page.$$eval('#bank .tile', (t) => t.map((x) => x.textContent)); const used = new Set();
      for (const w of ex.words) { const i = tiles.findIndex((x, k) => x === w && !used.has(k)); used.add(i); await page.click(`#bank .tile[data-i="${i}"]`); }
      await page.click('#check'); await page.click('#check');
    }
  }
  await page.click('#check');                                          // "See my sky"
  process.stdout.write(`  ${si + 1}. ${title}\n`);
}
await page.waitForTimeout(1500);
const r = await page.evaluate(() => ({
  clipsPlayed: new Set(window.__srcs).size, failed: [...new Set(window.__bad)], fallbacks: window.__fallback,
  starsLit: state.done.length, stories: STORIES.length,
}));
await browser.close();

const ok = !missing.length && !r.failed.length && !r.fallbacks && r.starsLit === r.stories && !errors.length;
console.log(`\nclips on disk missing: ${missing.length ? missing.map((c) => c.file).join(', ') : 'none'}`);
console.log(`clips played: ${r.clipsPlayed}, failed to load: ${r.failed.length ? r.failed.join(', ') : 'none'}, device-voice fallbacks: ${r.fallbacks}`);
console.log(`stars lit: ${r.starsLit} of ${r.stories}, page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
console.log(ok ? 'CHECK PASSED' : 'CHECK FAILED');
process.exit(ok ? 0 : 1);
