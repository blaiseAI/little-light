// Records narration in Kokoro "Heart" for every clip whose text is new or changed.
//   node tools/record.mjs            record what's missing or changed
//   node tools/record.mjs --dry      list what would be recorded
//   node tools/record.mjs --prune    also delete clips no story uses any more
// Needs: .venv with kokoro-onnx + soundfile (see README), the Kokoro model in ~/.cache/hyperframes/tts, and ffmpeg.
import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ROOT, loadWeeks, clipList } from './stories.mjs';

const AUDIO = join(ROOT, 'audio'), MANIFEST = join(AUDIO, 'manifest.json');
const VOICE = 'af_heart', SPEED = 0.88;
const hash = (c) => createHash('sha1').update(`${VOICE}|${SPEED}|${c.lead}|${c.text}`).digest('hex').slice(0, 12);

const clips = clipList(loadWeeks());
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const todo = [];
for (const c of clips) {
  const have = existsSync(join(AUDIO, c.file));
  if (have && !manifest[c.file]) manifest[c.file] = hash(c);   // adopt clips recorded before the manifest existed
  if (!have || manifest[c.file] !== hash(c)) todo.push(c);
}

const used = new Set(clips.map((c) => c.file));
const walk = (d) => readdirSync(d).flatMap((f) => statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]);
const stale = walk(AUDIO).map((f) => relative(AUDIO, f).replace(/\\/g, '/')).filter((f) => f.endsWith('.mp3') && !used.has(f));

console.log(`${clips.length} clips in the stories, ${todo.length} to record, ${stale.length} no longer used`);
if (process.argv.includes('--dry')) { todo.forEach((c) => console.log('  record', c.file, '|', c.text)); stale.forEach((f) => console.log('  unused', f)); process.exit(0); }

if (todo.length) {
  const py = join(ROOT, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  if (!existsSync(py)) { console.error('No .venv found. Create it first (see README: "Recording narration").'); process.exit(1); }
  const tmp = mkdtempSync(join(tmpdir(), 'll-rec-')), list = join(tmp, 'clips.json');
  writeFileSync(list, JSON.stringify(todo.map((c) => ({ ...c, out: join(AUDIO, c.file) }))));
  execFileSync(py, [join(ROOT, 'tools', 'record_batch.py'), list, VOICE, String(SPEED)], { stdio: 'inherit' });
  rmSync(tmp, { recursive: true, force: true });
  for (const c of todo) manifest[c.file] = hash(c);
}
if (process.argv.includes('--prune')) for (const f of stale) { unlinkSync(join(AUDIO, f)); delete manifest[f]; console.log('  removed', f); }
writeFileSync(MANIFEST, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 1) + '\n');
console.log('done');
