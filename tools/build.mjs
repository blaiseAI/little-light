// Builds dist/ for publishing as a claude.ai artifact. The artifact host supplies its own
// <!doctype>, <html>, <head> and <body>, so the page keeps only what sits inside them.
//   node tools/build.mjs
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './stories.mjs';

const DIST = join(ROOT, 'dist');
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST);
const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
  .replace(/^[\s\S]*?<head>\s*<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*/, '')
  .replace(/<\/head>\s*<body>\s*/, '\n')
  .replace(/\s*<\/body>\s*<\/html>\s*$/, '\n');
if (/<html|<body|<head>/i.test(html)) throw new Error('page wrapper not fully removed');
writeFileSync(join(DIST, 'index.html'), html);
for (const f of ['styles.css', 'app.js', 'stories']) cpSync(join(ROOT, f), join(DIST, f), { recursive: true });
cpSync(join(ROOT, 'audio'), join(DIST, 'audio'), { recursive: true, filter: (src) => !src.endsWith('manifest.json') });
const count = (d) => readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(join(d, e.name)) : 1), 0);
console.log(`dist/ ready: ${count(DIST)} files`);
