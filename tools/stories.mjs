// Shared by the tools: loads the week files and lists every narration clip the game can ask for.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

export function loadWeeks() {
  const window = { LL_WEEKS: [] };
  const files = readdirSync(join(ROOT, 'stories')).filter((f) => /^week-\d+\.js$/.test(f)).sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)));
  for (const f of files) new Function('window', 'LL_WEEKS', readFileSync(join(ROOT, 'stories', f), 'utf8'))(window, window.LL_WEEKS);
  return window.LL_WEEKS;
}

// Must match slug() in app.js
export const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// "Genesis 1:1" -> "Genesis 1, verse 1", the way a person would say it
const spokenRef = (r) => r.replace(/(\d+):(\d+)/, '$1, verse $2');
// A full stop helps the voice finish single words naturally
const word = (t) => (/[.!?]$/.test(t) ? t : t + '.');
const plain = (t) => t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

export const verseSay = (ex) => ex.words.join(' ') + '.';
export const buildSay = (ex) => `Build the verse from ${spokenRef(ex.ref)}. Listen: ${verseSay(ex)} Now tap the words in order.${ex.given ? ' The first words are there for you.' : ''}`;

// Every clip: { file (relative to audio/), text (what Heart says), lead (ms of air before speech) }
export function clipList(weeks) {
  const clips = new Map();
  const add = (file, text, lead) => { if (!clips.has(file)) clips.set(file, { file, text: plain(text), lead }); };
  // The sound check ("Can you hear me?"); must match the text in app.js
  add('help/hello.mp3', "Hello! I'm Pip. If you can hear me, tap yes!", 120);
  // The landing page verse demo reads the finished verse (single words reuse the w/ clips)
  add('help/verse-psalm-23-1.mp3', 'The Lord is my shepherd.', 120);
  for (const s of weeks.flatMap((w) => w.stories)) {
    s.pages.forEach((p, i) => add(`${s.id}-${i + 1}.mp3`, p.text + (p.quote ? ' ' + p.quote : ''), 250));
    s.ex.forEach((ex, i) => {
      // Build the verse: Pip reads the whole verse first, so a child who can't read yet knows what to make.
      // Must match buildSay() in app.js. v/ is the verse on its own (Hear the verse, and when it's finished).
      add(`q/${s.id}-${i + 1}.mp3`, ex.type === 'build' ? buildSay(ex) : ex.q + (ex.say ? ' ' + ex.say : ''), 120);
      if (ex.type === 'build') add(`v/${s.id}-${i + 1}.mp3`, verseSay(ex), 120);
      const words = ex.type === 'choose' ? ex.options.map((o) => o[0]) : ex.type === 'pairs' ? ex.pairs.flat() : [...ex.words, ...ex.extra];
      for (const t of words) add(`w/${slug(t)}.mp3`, word(t), 120);
    });
  }
  return [...clips.values()];
}
