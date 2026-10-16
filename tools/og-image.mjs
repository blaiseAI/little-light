// Draws the link preview card (WhatsApp, iMessage, Facebook, Slack...) from the landing art.
//   node tools/og-image.mjs   -> assets/og/share.jpg (1200 x 630; JPEG keeps it small enough for WhatsApp)
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './stories.mjs';

const data = (f, type) => `data:${type};base64,${readFileSync(join(ROOT, f)).toString('base64')}`;
const meadow = data('assets/landing/storybook-meadow.webp', 'image/webp');
const logo = data('assets/brand/web/logo-icon-256.webp', 'image/webp');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Lexend:wght@400;500&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #fffdf8; }
  .card { position: relative; width: 1200px; height: 630px; color: #2b2250; font-family: Lexend, sans-serif; }
  /* the meadow scaled to the card width, anchored at the bottom so Pip and the path stay in view */
  .art { position: absolute; inset: auto 0 0 0; width: 1200px; height: 686px; background: url(${meadow}) center bottom / cover; }
  .copy { position: absolute; left: 72px; top: 64px; width: 640px; display: grid; gap: 22px; }
  .brand { display: flex; align-items: center; gap: 16px; font: 700 46px/1 Fredoka, sans-serif; letter-spacing: -.02em; }
  .brand img { width: 76px; height: 76px; }
  h1 { margin: 0; font: 700 60px/1.06 Fredoka, sans-serif; letter-spacing: -.02em; text-wrap: balance; }
  p { margin: 0; font-size: 25px; color: #5d5680; }
  .copy > * { text-shadow: 0 0 14px #fffdf8, 0 0 28px #fffdf8; }   /* keeps the words clear of the hills */
  .url { position: absolute; left: 72px; bottom: 40px; padding: 10px 20px; border-radius: 999px; background: #fffdf8;
         border: 2px solid #2b2250; font: 600 22px Fredoka, sans-serif; box-shadow: 0 4px 0 #2b2250; }
</style></head><body><div class="card">
  <div class="art"></div>
  <div class="copy">
    <div class="brand"><img src="${logo}" alt="">little light</div>
    <h1>Five-minute Bible stories for kids 5–7</h1>
    <p>Hear the story · Learn a verse · Light a star</p>
  </div>
  <div class="url">littlelight.kids</div>
</div></body></html>`;

const out = join(ROOT, 'assets', 'og', 'share.jpg');
mkdirSync(join(ROOT, 'assets', 'og'), { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
await browser.close();
console.log(`assets/og/share.jpg  ${Math.round(statSync(out).size / 1024)} KB`);
