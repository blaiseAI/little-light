// Pages in a subfolder (play/) set window.LL_ROOT so audio paths resolve from the site root
const ROOT = window.LL_ROOT || '';

/* ---------- sound ----------
   Synthesised in code, the motion-studio way (score.mjs: pop, chime, thump, whoosh),
   but played live with Web Audio instead of rendered to a WAV. No files, nothing to license.
   Nothing plays until a child taps something; one toggle mutes everything and is remembered. */
const Sound = (() => {
  let ctx = null, master = null, on = true;
  try { on = localStorage.getItem('little-light-sound') !== 'off'; } catch {}
  function ensure() {
    if (!ctx) {
      // iOS mutes sound made in code (Web Audio) when the ring/silent switch is on, but not audio files,
      // so the narration played while the effects didn't. A "playback" session (iOS 17+) treats both alike.
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
      master = ctx.createGain(); master.gain.value = 0.9;   // phone speakers need it louder; the compressor keeps it clean
      master.connect(comp); comp.connect(ctx.destination);
      // Older iOS only starts a context that has played something inside a tap: play one silent sample.
      const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
    }
    // iOS can also leave the context "interrupted" after an audio file plays (the narration), not just "suspended"
    if (ctx.state !== 'running') ctx.resume();
    return ctx;
  }
  // Wake the audio on the first touch anywhere, so the very first effect isn't lost while it starts up
  document.addEventListener('pointerdown', () => { if (on) ensure(); }, { once: true, capture: true });
  // One voice: sine/triangle with an optional pitch glide and an octave partial, exponential decay.
  function tone({ f, f2 = f, type = 'sine', at = 0, dur = 0.3, gain = 0.15, attack = 0.006, harm = 0, pan = 0 }) {
    const t0 = ctx.currentTime + at, out = ctx.createGain(), pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    if (pn) { pn.pan.value = pan; out.connect(pn); pn.connect(master); } else out.connect(master);
    [[1, 1], [2, harm]].forEach(([mult, g]) => {
      if (!g) return;
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f * mult, t0);
      if (f2 !== f) o.frequency.exponentialRampToValueAtTime(f2 * mult, t0 + dur * 0.6);
      og.gain.value = g; o.connect(og); og.connect(out); o.start(t0); o.stop(t0 + dur + 0.05);
    });
  }
  // Soft filtered noise swell (the score's whoosh, quieter and darker).
  function whoosh(at = 0, dur = 0.32, gain = 0.07) {
    const t0 = ctx.currentTime + at, n = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    let seed = 7; for (let i = 0; i < n; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = (seed / 2147483648 - 1) * Math.sin(Math.PI * i / n); }
    const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; bp.type = 'bandpass'; bp.frequency.setValueAtTime(500, t0); bp.frequency.exponentialRampToValueAtTime(1800, t0 + dur); bp.Q.value = 0.8;
    g.gain.value = gain; src.connect(bp); bp.connect(g); g.connect(master); src.start(t0);
  }
  const N = { C5: 523.25, E5: 659.25, G5: 783.99, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98 };
  const S = {
    tap:    () => tone({ f: 520, f2: 860, dur: 0.09, gain: 0.11 }),                       // pop
    untap:  () => tone({ f: 760, f2: 440, dur: 0.09, gain: 0.09 }),                       // pop, falling
    right:  (n = 0) => {                                                                  // "Done" chime + a twinkle for the star
      tone({ f: N.E5, dur: 0.9, gain: 0.13, harm: 0.4, pan: -0.15 });
      tone({ f: N.B5, at: 0.07, dur: 1.0, gain: 0.1, harm: 0.4, pan: 0.15 });
      tone({ f: [N.C6, N.D6, N.E6, N.G6][n % 4] * 2, at: 0.22, dur: 0.35, gain: 0.035 });
    },
    retry:  () => { tone({ f: 392, dur: 0.28, gain: 0.09, type: 'triangle' }); tone({ f: 329.63, at: 0.15, dur: 0.4, gain: 0.08, type: 'triangle' }); },
    match:  () => tone({ f: N.G5, dur: 0.45, gain: 0.1, harm: 0.4 }),
    miss:   () => tone({ f: 200, f2: 150, dur: 0.16, gain: 0.12, type: 'triangle' }),
    bonk:   () => tone({ f: 110, f2: 70, dur: 0.25, gain: 0.22 }),                      // thump
    whoosh: () => whoosh(),
    page:   () => whoosh(0, 0.18, 0.05),
    done:   () => {                                                                       // end card: thump + C-E-G-C + sparkles
      tone({ f: 80, f2: 50, dur: 0.6, gain: 0.25 });
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone({ f, at: 0.05 + i * 0.1, dur: 1.4, gain: 0.11, harm: 0.4, pan: -0.3 + i * 0.2 }));
      let seed = 3; const r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
      for (let i = 0; i < 9; i++) tone({ f: [N.C6, N.E6, N.G6][i % 3] * (1 + Math.round(r())), at: 0.5 + i * 0.11 + r() * 0.05, dur: 0.3, gain: 0.03, pan: r() * 1.6 - 0.8 });
    },
  };
  function paint() {
    document.querySelectorAll('.mute').forEach((b) => {
      b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
      const st = b.querySelector('.row-state'); if (st) st.textContent = on ? 'On' : 'Off';
    });
  }
  return {
    play(name, ...args) { if (!on) return; try { if (ensure()) S[name](...args); } catch {} },
    isOn: () => on,
    toggle() { this.set(!on); if (on) this.play('tap'); },
    set(v) { on = !!v; try { localStorage.setItem('little-light-sound', on ? 'on' : 'off'); } catch {} paint(); },
    paint,
  };
})();
document.addEventListener('click', (e) => { if (e.target.closest('.mute')) Sound.toggle(); });
Sound.paint();

/* ---------- saved progress (optional) ---------- */
const store = {
  get() { try { return JSON.parse(localStorage.getItem('little-light') || '{}'); } catch { return {}; } },
  set(v) { try { localStorage.setItem('little-light', JSON.stringify(v)); } catch {} },
};
let state = Object.assign({ done: [], xp: 0, streak: 0, last: null }, store.get());
const $ = (s, r = document) => r.querySelector(s);
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STAR = '<path d="M16 3l4 8.5 9.3 1.2-6.8 6.4 1.8 9.2L16 23.7l-8.3 4.6 1.8-9.2-6.8-6.4 9.3-1.2z" stroke-width="2.5" stroke-linejoin="round"/>';

function renderStats() {
  document.querySelectorAll('.n-streak').forEach((el) => { el.textContent = state.streak; });
  document.querySelectorAll('.n-xp').forEach((el) => { el.textContent = state.xp; });
}

/* ---------- star dust backgrounds ---------- */
function dust(el, n, w, h) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = Math.random() < .15 ? 3 : 1.6;
    out += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r}" fill="${Math.random() < .2 ? '#ffc94a' : '#fff3d6'}" opacity="${(.3 + Math.random() * .6).toFixed(2)}" ${Math.random() < .3 ? 'class="twinkle"' : ''}/>`;
  }
  el.innerHTML = out;
}
dust($('#dust'), 90, 1200, 900); dust($('#dust2'), 60, 1200, 500);

/* ---------- the night sky: one constellation per week ---------- */
// Each week file (stories/week-*.js) pushes { id, title, stories } onto LL_WEEKS; stories play in order.
const WEEKS = window.LL_WEEKS || [];
const STORIES = WEEKS.flatMap((w, wi) => w.stories.map((s) => ({ ...s, week: wi })));
// Where each star sits in a week (x %, y px): seven stars, one per day of creation week
const SPOTS = [[50, 60], [78, 185], [30, 310], [70, 435], [26, 560], [64, 685], [40, 810]];
const viewBoxFor = (id) => id === 'pip' ? '0 0 240 230' : id.startsWith('p-') ? '0 0 100 100' : '0 0 64 64';

function renderSky() {
  const firstOpen = STORIES.findIndex((s) => !state.done.includes(s.id));
  let start = 0;
  $('#constellation').innerHTML = WEEKS.map((w, wi) => {
    const from = start; start += w.stories.length;
    const lit = w.stories.filter((s) => state.done.includes(s.id)).length;
    const head = `<div class="week-head"><h3>Week ${wi + 1}: ${esc(w.title)}</h3><p>${lit} of ${w.stories.length} stars lit</p></div>`;
    // A week the child hasn't reached yet stays small: a dim row of stars and a note
    if (firstOpen !== -1 && firstOpen < from) {
      return `<section class="week closed">${head}
        <div class="dim-stars" aria-hidden="true">${w.stories.map(() => '<svg viewBox="0 0 32 32"><use href="#i-star"/></svg>').join('')}</div>
        <p class="week-lock">Opens when Week ${wi} is finished</p></section>`;
    }
    const spots = SPOTS.slice(0, w.stories.length);
    const segs = spots.slice(1).map((p, k) => {
      const a = spots[k], on = state.done.includes(w.stories[k].id);
      return `<line x1="${a[0]}%" y1="${a[1]}" x2="${p[0]}%" y2="${p[1]}" stroke="${on ? '#ffc94a' : '#5d54a6'}" stroke-width="${on ? 4 : 3}" stroke-dasharray="${on ? '0' : '2 10'}" stroke-linecap="round"/>`;
    }).join('');
    const nodes = w.stories.map((s, k) => {
      const i = from + k, done = state.done.includes(s.id), current = i === firstOpen, locked = !done && !current;
      const icon = done ? 'n-check' : locked ? 'i-lock' : s.icon;
      return `<div class="star-node ${locked ? 'locked' : ''}" style="left:${spots[k][0]}%;top:${spots[k][1]}px">
        ${current ? '<span class="tag">Start here</span>' : ''}
        <button class="node ${done ? 'done' : locked ? 'locked' : 'current'}" data-i="${i}" ${locked ? 'aria-disabled="true"' : ''}
          aria-label="${esc(s.title)}${done ? ', star lit' : locked ? ', not lit yet' : ''}"><svg viewBox="${viewBoxFor(icon)}"><use href="#${icon}"/></svg></button>
        <span class="node-label">${esc(s.title)}</span></div>`;
    }).join('');
    return `<section class="week">${head}<div class="week-sky" style="height:${spots[spots.length - 1][1] + 100}px">
      <svg class="lines" aria-hidden="true">${segs}</svg>${nodes}</div></section>`;
  }).join('');
}
$('#constellation').addEventListener('click', (e) => {
  const b = e.target.closest('.node'); if (!b) return;
  if (b.classList.contains('locked')) { Sound.play('bonk'); b.animate([{ transform: 'rotate(-8deg)' }, { transform: 'rotate(8deg)' }, { transform: 'none' }], { duration: 260 }); return; }
  openLesson(+b.dataset.i);
});
$('#quick')?.addEventListener('click', () => {
  const i = STORIES.findIndex((s) => !state.done.includes(s.id));
  openLesson(i === -1 ? Math.floor(Math.random() * STORIES.length) : i);
});

/* ---------- the lesson ---------- */
let L = null;
const lessonEl = $('#lesson'), stage = $('#stage'), foot = $('#foot'), checkBtn = $('#check');

function openLesson(i) {
  // The first time on this device, Pip checks the sound is audible before the story starts
  if (Sound.isOn() && !heardBefore()) { openHear(() => openLesson(i)); return; }
  const story = STORIES[i];
  L = { story, queue: story.ex.slice(), total: story.ex.length, answered: 0, phase: 'answer' };
  $('#trail').innerHTML = story.ex.map(() => `<svg viewBox="0 0 32 32" aria-hidden="true">${STAR}</svg>`).join('');
  $('#trail').setAttribute('aria-valuemax', story.ex.length);
  lessonEl.classList.add('open'); closePanel(); Sound.play('whoosh');
  if (story.pages) { L.phase = 'story'; L.page = 0; renderPage(); } else next();
}

/* ---------- story time ---------- */
const canSpeak = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
// Story pages are read by recorded narration (Kokoro "Heart", made offline, files in audio/).
// The device voice is only a fallback if a recording can't load.
// One reusable player, unlocked on the first touch: iOS only lets a page start audio on its own
// (the questions read themselves) with a player that has already played once inside a tap.
let narr = null, narrEl = null, narrToken = 0;
const SILENCE = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
function player() { if (!narrEl) { narrEl = new Audio(); narrEl.preload = 'auto'; } return narrEl; }
document.addEventListener('pointerdown', () => {
  const a = player(); if (a.src) return;
  a.src = SILENCE; const pr = a.play(); if (pr && pr.catch) pr.catch(() => {});
}, { once: true, capture: true });
function hush() {
  narrToken++;
  try { if (narr) { narr.pause(); narr = null; } } catch {}
  try { if (canSpeak) speechSynthesis.cancel(); } catch {}
}
// Quiz clips: q/<story>-<n> for questions, w/<slug> for answers, tiles and cards (recorded in Heart)
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sayClip = (id, text) => narrate(`${ROOT}audio/${id}.mp3`, text, null);
const sayWord = (t) => sayClip('w/' + slug(t), t);
function narrate(src, text, btn) {
  hush();
  const a = player(), me = ++narrToken; narr = a;
  const done = () => { if (btn) btn.setAttribute('aria-pressed', 'false'); };
  const fallback = () => { if (me !== narrToken) return; narr = null; if (canSpeak) speak(text, btn); else done(); };
  if (btn) btn.setAttribute('aria-pressed', 'true');
  a.onended = () => { if (me === narrToken) narr = null; done(); };
  a.onerror = fallback;
  a.src = src;
  const pr = a.play(); if (pr && pr.catch) pr.catch((e) => { if (e && e.name !== 'AbortError') fallback(); });
}
function speak(text, btn) {
  hush();
  try {
    const u = new SpeechSynthesisUtterance(text); u.rate = 0.9; u.pitch = 1.1; u.lang = 'en-US';
    u.onend = u.onerror = () => btn && btn.setAttribute('aria-pressed', 'false');
    btn && btn.setAttribute('aria-pressed', 'true');
    speechSynthesis.speak(u);
  } catch {}
}
function renderPage() {
  const pages = L.story.pages, pg = pages[L.page], last = L.page === pages.length - 1;
  const art = pg.art.map((id) => id === 'pip'
    ? '<svg viewBox="0 0 240 230" aria-hidden="true"><use href="#pip"/></svg>'
    : `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#${id}"/></svg>`).join('');
  lessonEl.classList.add('reading');
  $('#reading-label').textContent = `Story time · page ${L.page + 1} of ${pages.length}`;
  stage.innerHTML = `
    <h2 class="l-q reader-title" id="l-q">${esc(L.story.title)}</h2>
    <div class="story">
      <div class="story-art a${L.page % 4}">${art}</div>
      <p class="tell">${esc(pg.text)}</p>
      ${pg.quote ? `<blockquote class="niv">“${esc(pg.quote)}”<cite>${esc(pg.qref)} (NIV)</cite></blockquote>` : ''}
      <p class="ref">${esc(pg.ref)}</p>
      <button class="btn soft read" id="read" aria-pressed="false"><svg aria-hidden="true"><use href="#i-sound"/></svg>Read to me</button>
      <p class="read-hint">Tap Read to me to hear this page.</p>
      <div class="dots" aria-hidden="true">${pages.map((_, i) => `<i class="${i === L.page ? 'current' : i < L.page ? 'on' : ''}"></i>`).join('')}</div>
    </div>`;
  stage.parentElement.scrollTop = 0;
  const rb = $('#read');
  rb.addEventListener('click', () => {
    if (rb.getAttribute('aria-pressed') === 'true') { hush(); rb.setAttribute('aria-pressed', 'false'); return; }
    narrate(`${ROOT}audio/${L.story.id}-${L.page + 1}.mp3`, pg.text + (pg.quote ? ' ' + pg.quote : ''), rb);
  });
  setFoot(''); foot.classList.add('story');
  $('#skip').textContent = L.page ? 'Back' : 'Skip the story';
  checkBtn.textContent = last ? 'Start the questions' : 'Next page';
  checkBtn.disabled = false;
}
function closeLesson() { hush(); lessonEl.classList.remove('open', 'reading'); L = null; }
// The journey on the landing page is the map now: leaving a story (or finishing one) goes back there.
// On a page without a ROOT (tests, previews) it just closes in place.
const JOURNEY = ROOT && !window.LL_STAY ? `${ROOT}#stories` : null;   // LL_STAY: tools/check.mjs plays every story on one page
function backToJourney() { closeLesson(); if (JOURNEY) location.href = JOURNEY; }
$('#close').addEventListener('click', backToJourney);
document.addEventListener('keydown', (e) => {
  if (!L) return;
  if (e.key === 'Escape') closeLesson();
  if (e.key === 'Enter' && !checkBtn.disabled && !e.target.closest('.choice, .tile, .pair')) { e.preventDefault(); checkBtn.click(); }
  if (L && L.phase === 'story' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) (e.key === 'ArrowRight' ? checkBtn : $('#skip')).click();
  if (L && L.phase === 'answer' && L.current?.type === 'choose' && /^[1-3]$/.test(e.key)) stage.querySelectorAll('.choice')[+e.key - 1]?.click();
});
$('#skip').addEventListener('click', () => {
  if (L && L.phase === 'story') { hush(); Sound.play('page'); if (L.page) { L.page--; renderPage(); } else next(); return; }
  if (L && L.phase === 'answer') { Sound.play('whoosh'); L.queue.push(L.current); next(); } });

function setProgress() {
  [...$('#trail').children].forEach((s, i) => s.classList.toggle('lit', i < L.answered));
  $('#trail').setAttribute('aria-valuenow', L.answered);
}
function setFoot(mode, h = '', p = '') {
  foot.className = 'l-foot' + (mode ? ' ' + mode : '');
  $('#msg-h').textContent = h; $('#msg-p').textContent = p;
  checkBtn.className = 'btn' + (mode === 'right' ? ' teal' : '');
}

const KIND = { choose: ['i-eye', 'Pick the answer'], build: ['i-scroll', 'New verse'], pairs: ['i-link', 'Match them up'] };
function next() {
  setProgress();
  if (!L.queue.length) return finish();
  L.current = L.queue.shift(); L.phase = 'answer'; lessonEl.classList.remove('reading');
  setFoot(''); checkBtn.textContent = 'Check'; checkBtn.disabled = true; $('#skip').textContent = 'Skip for now';
  const ex = L.current, [kicon, klabel] = KIND[ex.type];
  let html = `<div class="l-head"><span class="l-kind"><svg><use href="#${kicon}"/></svg>${klabel}</span><button class="qplay" id="qplay" aria-label="Hear the question"><svg aria-hidden="true"><use href="#i-sound"/></svg></button></div><h2 class="l-q" id="l-q">${esc(ex.q)}</h2>`;
  if (ex.say) html += `<div class="speaker"><svg viewBox="0 0 240 230"><use href="#pip"/></svg><div class="bubble">${esc(ex.say)}</div></div>`;
  if (ex.type === 'choose') html += renderChoose(ex);
  if (ex.type === 'build') html += `<p style="color:var(--ink-soft);margin:-16px 0 20px">${esc(ex.ref)}</p><div class="lines"><div class="answer-line" id="line"></div></div><div class="bank" id="bank"></div>`;
  if (ex.type === 'pairs') html += renderPairs(ex);
  stage.innerHTML = html;
  stage.parentElement.scrollTop = 0;
  if (ex.type === 'build') wireBuild(ex); else if (ex.type === 'pairs') wirePairs(ex); else wireChoose(ex);
  const qid = `q/${L.story.id}-${L.story.ex.indexOf(ex) + 1}`, qtext = ex.type === 'build' ? 'Build the verse. Tap the words in the right order.' : ex.q + (ex.say ? ' ' + ex.say : '');
  $('#qplay').addEventListener('click', () => sayClip(qid, qtext));
  hush();
  if (Sound.isOn()) setTimeout(() => { if (L && L.current === ex && L.phase === 'answer') sayClip(qid, qtext); }, 350);
}

function renderChoose(ex) {
  const pics = ex.options.some((o) => o[1]);
  return `<div class="choices" role="radiogroup">${ex.options.map((o, i) =>
    `<button class="choice ${pics ? '' : 'text-only'}" role="radio" aria-checked="false" data-i="${i}">
      ${o[1] ? `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#${o[1]}"/></svg>` : '<span class="dot"></span>'}
      <span>${esc(o[0])}</span></button>`).join('')}</div>`;
}
function wireChoose(ex) {
  stage.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => {
    if (L.phase !== 'answer') return;
    stage.querySelectorAll('.choice').forEach((c) => { c.classList.remove('sel'); c.setAttribute('aria-checked', 'false'); });
    b.classList.add('sel'); b.setAttribute('aria-checked', 'true'); Sound.play('tap');
    L.pick = +b.dataset.i; checkBtn.disabled = false; sayWord(ex.options[L.pick][0]);
  }));
  L.check = () => ({ ok: L.pick === ex.answer, right: ex.options[ex.answer][0] });
}
function wireBuild(ex) {
  const bank = $('#bank'), line = $('#line');
  bank.innerHTML = shuffle([...ex.words, ...ex.extra]).map((w, i) => `<button class="tile" data-i="${i}">${esc(w)}</button>`).join('');
  L.built = [];
  const sync = () => { L.built = [...line.children].map((c) => c.textContent); checkBtn.disabled = L.built.length === 0; };
  bank.addEventListener('click', (e) => {
    const t = e.target.closest('.tile'); if (!t || t.classList.contains('ghost') || L.phase !== 'answer') return;
    t.classList.add('ghost'); t.disabled = true;
    const placed = document.createElement('button');
    placed.className = 'tile pop'; placed.textContent = t.textContent; placed.dataset.i = t.dataset.i;
    line.appendChild(placed); sync(); Sound.play('tap'); sayWord(placed.textContent);
  });
  line.addEventListener('click', (e) => {
    const t = e.target.closest('.tile'); if (!t || L.phase !== 'answer') return;
    const src = bank.querySelector(`[data-i="${t.dataset.i}"]`); src.classList.remove('ghost'); src.disabled = false;
    t.remove(); sync(); Sound.play('untap');
  });
  L.check = () => ({ ok: L.built.join(' ') === ex.words.join(' '), right: ex.words.join(' ') });
}
function renderPairs(ex) {
  const left = shuffle(ex.pairs.map((p, i) => [p[0], i])), right = shuffle(ex.pairs.map((p, i) => [p[1], i]));
  const col = (arr, side) => `<div class="col">${arr.map(([t, i]) => `<button class="pair" data-side="${side}" data-i="${i}">${esc(t)}</button>`).join('')}</div>`;
  return `<div class="pairs">${col(left, 'l')}${col(right, 'r')}</div>`;
}
function wirePairs(ex) {
  let pick = null, matched = 0;
  stage.querySelectorAll('.pair').forEach((b) => b.addEventListener('click', () => {
    if (b.classList.contains('gone') || L.phase !== 'answer') return;
    sayWord(b.textContent);
    if (!pick || pick.dataset.side === b.dataset.side) { if (pick) pick.classList.remove('sel'); pick = b; b.classList.add('sel'); Sound.play('tap'); return; }
    const a = pick; pick = null; a.classList.remove('sel');
    if (a.dataset.i === b.dataset.i) {
      [a, b].forEach((x) => { x.classList.add('ok'); setTimeout(() => { x.classList.remove('ok'); x.classList.add('gone'); x.disabled = true; }, 450); });
      if (matched + 1 < ex.pairs.length) Sound.play('match');
      if (++matched === ex.pairs.length) { checkBtn.disabled = false; setTimeout(() => checkBtn.click(), 550); }
    } else {
      Sound.play('miss');
      [a, b].forEach((x) => { x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 450); });
    }
  }));
  L.check = () => ({ ok: true, right: '' });
}

const PRAISE = ['You shine!', 'Wonderful!', 'Yes, that\'s it!', 'Bright work!', 'Hooray!'];
checkBtn.addEventListener('click', () => {
  if (!L) return;
  if (L.phase === 'done') { if (JOURNEY) { backToJourney(); return; } closeLesson(); renderSky(); $('#sky').scrollIntoView(); return; }
  if (L.phase === 'feedback') { next(); return; }
  if (L.phase === 'story') { hush(); Sound.play('page'); if (L.page < L.story.pages.length - 1) { L.page++; renderPage(); } else next(); return; }
  hush();
  const r = L.check();
  L.phase = 'feedback';
  stage.querySelectorAll('button').forEach((b) => b.disabled = true);
  if (r.ok) { Sound.play('right', L.answered); L.answered++; setProgress(); setFoot('right', PRAISE[Math.floor(Math.random() * PRAISE.length)], ''); }
  else { Sound.play('retry'); L.queue.push(L.current); setFoot('retry', 'Almost! We\'ll try this one again.', 'The answer is: ' + r.right); }
  checkBtn.textContent = 'Continue'; checkBtn.disabled = false; checkBtn.focus();
});

function finish() {
  L.phase = 'done';
  const s = L.story, gained = s.ex.length;
  if (!state.done.includes(s.id)) state.done.push(s.id);
  state.xp += gained;
  const today = new Date().toDateString();
  if (state.last !== today) {
    const y = new Date(Date.now() - 864e5).toDateString();
    state.streak = state.last === y ? state.streak + 1 : 1; state.last = today;
  }
  store.set(state); renderStats();
  stage.innerHTML = `<div class="done-screen">
    <svg class="big-star" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="31" fill="#fff1c7" class="glow"/><g class="bob"><use href="#star5" fill="#ffc94a" stroke="#2b2250"/></g></svg>
    <h2>You lit a star!</h2>
    <p class="verse">"${esc(s.verse)}"<small>${esc(s.ref)}</small></p>
    <div class="chips">
      <span style="background:var(--gold-wash)"><svg><use href="#i-star"/></svg>+${gained} stars</span>
      <span style="background:var(--coral-wash)"><svg><use href="#i-sun"/></svg>${state.streak} ${state.streak === 1 ? 'day' : 'days'} shining</span>
    </div></div>`;
  setFoot('done'); checkBtn.textContent = JOURNEY ? 'Back to my journey' : 'See my sky'; checkBtn.disabled = false; checkBtn.className = 'btn gold';
  confetti(); Sound.play('done');
}

/* ---------- falling stars ---------- */
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = $('#confetti'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  c.hidden = false;   // only on screen while it animates: Safari 26 tints its bars from fixed layers
  const colors = ['#ffc94a', '#ff7a45', '#3bb3a6', '#b9a6ff', '#ffb3c7', '#8fd3ff'];
  const star = (r) => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * .45 : r; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); };
  const bits = Array.from({ length: 110 }, () => ({ x: innerWidth / 2, y: innerHeight * .4, vx: (Math.random() - .5) * 15, vy: -Math.random() * 15 - 4,
    a: Math.random() * 6, va: (Math.random() - .5) * .25, r: 6 + Math.random() * 8, c: colors[Math.floor(Math.random() * colors.length)] }));
  let t = 0;
  (function frame() {
    x.clearRect(0, 0, c.width, c.height);
    for (const b of bits) {
      b.vy += .42; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.a += b.va;
      x.save(); x.translate(b.x, b.y); x.rotate(b.a); star(b.r); x.fillStyle = b.c; x.fill(); x.lineWidth = 2; x.strokeStyle = '#2b2250'; x.stroke(); x.restore();
    }
    if (++t < 170) requestAnimationFrame(frame); else { x.clearRect(0, 0, c.width, c.height); c.hidden = true; }
  })();
}

/* ---------- phone menu: the "My light" panel under the bar ---------- */
const panel = $('#panel'), meBtn = $('#me');
function closePanel() { panel.hidden = true; meBtn.setAttribute('aria-expanded', 'false'); }
meBtn.addEventListener('click', () => {
  const open = panel.hidden; panel.hidden = !open; meBtn.setAttribute('aria-expanded', String(open)); Sound.play('tap');
});
document.addEventListener('click', (e) => { if (!panel.hidden && !e.target.closest('.top')) closePanel(); });
$('#panel-help').addEventListener('click', () => { closePanel(); openHear(null); });

/* ---------- sound check ----------
   A page can't see the silent switch or the volume, so the first time on a device Pip asks. */
const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (IS_IOS) document.documentElement.classList.add('is-ios');
const hearEl = $('#hear');
let hearThen = null;
function heardBefore() { try { return sessionStorage.getItem('little-light-session-heard') === 'yes'; } catch { return true; } }
function openHear(then) {
  hearThen = then; hearEl.classList.remove('listening'); hearEl.hidden = false;
  $('#hear-yes').disabled = true; $('#hear-hint').textContent = 'Turn your volume up, then tap play.'; $('#hear-play').focus();
}
function closeHear(heard) {
  hush(); hearEl.hidden = true;
  if (heard) { try { sessionStorage.setItem('little-light-session-heard', 'yes'); } catch {} }
  const go = hearThen; hearThen = null; if (go) go();
}
$('#hear-play').addEventListener('click', (e) => {
  if (!Sound.isOn()) Sound.set(true);
  hearEl.classList.add('listening');
  Sound.play('right');
  setTimeout(() => narrate(`${ROOT}audio/help/hello.mp3`, "Hello! I'm Pip. If you can hear me, tap yes!", e.currentTarget), 650);
  // "Yes" only makes sense once something has played
  $('#hear-yes').disabled = false;
  $('#hear-hint').textContent = 'Did you hear Pip? If not, turn the volume up and tap play again.';
});
$('#hear-yes').addEventListener('click', () => closeHear(true));
// Closing the check cancels the story; the child can open it again from the sky
$('#hear-close').addEventListener('click', () => { hush(); hearEl.hidden = true; hearThen = null; });
$('#hear-skip').addEventListener('click', () => { Sound.set(false); closeHear(true); });

/* ---------- Safari 26 floats its toolbar over the bottom of the page ----------
   safe-area-inset-bottom only covers the home bar, so lift the lesson buttons above the toolbar too. */
const UA = navigator.userAgent;
const SAFARI_VERSION = IS_IOS && !/CriOS|FxiOS|EdgiOS|GSA\//.test(UA) ? +(UA.match(/Version\/(\d+)/) || [])[1] || 0 : 0;
const STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if (SAFARI_VERSION >= 26 && !STANDALONE) document.documentElement.style.setProperty('--toolbar', '40px');
function measureViewport() {
  const vv = window.visualViewport;
  const covered = vv ? Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) : 0;
  document.documentElement.style.setProperty('--obscured', covered + 'px');
  if (!$('#debug').hidden) showDebug();
}
if (window.visualViewport) { visualViewport.addEventListener('resize', measureViewport); visualViewport.addEventListener('scroll', measureViewport); }
addEventListener('resize', measureViewport);

// Open the site with #debug to see what this device reports (for fixing layout on real phones)
function showDebug() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe); const cs = getComputedStyle(probe);
  const vv = window.visualViewport || {}, root = getComputedStyle(document.documentElement);
  $('#debug').textContent = [
    'Little Light debug', UA, '',
    `iOS: ${IS_IOS}  Safari: ${SAFARI_VERSION || 'no'}  standalone: ${!!STANDALONE}`,
    `inner: ${innerWidth} x ${innerHeight}   screen: ${screen.width} x ${screen.height}`,
    `visualViewport: ${Math.round(vv.width)} x ${Math.round(vv.height)}  offsetTop ${Math.round(vv.offsetTop)}`,
    `safe-area  top ${cs.paddingTop}  bottom ${cs.paddingBottom}  left ${cs.paddingLeft}  right ${cs.paddingRight}`,
    `--obscured ${root.getPropertyValue('--obscured') || '0'}   --toolbar ${root.getPropertyValue('--toolbar') || '0'}`,
    `audioSession: ${navigator.audioSession ? navigator.audioSession.type : 'not supported'}   sound: ${Sound.isOn() ? 'on' : 'off'}`,
  ].join('\n');
  probe.remove();
}
function syncDebug() { $('#debug').hidden = location.hash !== '#debug'; if (!$('#debug').hidden) showDebug(); }
addEventListener('hashchange', syncDebug); addEventListener('scroll', () => { if (!$('#debug').hidden) showDebug(); }, { passive: true });
measureViewport(); syncDebug();

renderStats(); renderSky();
(() => { const d = new Date(), day = d.getDay(), h = d.getHours();
  if ((day === 5 && h >= 18) || (day === 6 && h < 19)) $('#sabbath').classList.add('show'); })();
// Preview hooks: #play=<n> opens a story, &step=<k> jumps ahead, &done=1 shows the finish screen
const m = location.hash.match(/play=(\d)(?:&step=(\d))?(&done=1)?/);
if (m) { openLesson(+m[1]); if (m[3]) { L.queue = []; L.answered = L.total; next(); } else if (m[2]) { L.queue = L.story.ex.slice(+m[2]); next(); } }

// Opened from the landing page ("Read this story"): play/?story=<id>. Only a story the child has reached opens.
(() => {
  const wanted = new URLSearchParams(location.search).get('story'); 
  // /play/ on its own (no story asked for) has nothing to show: the map lives on the landing page.
  // Tests and previews (automation, #play= hooks) still get the page.
  if (!wanted) { if (JOURNEY && !navigator.webdriver && !/play=/.test(location.hash)) location.replace(JOURNEY); return; }
  history.replaceState(null, '', location.pathname + location.hash);
  const firstOpen = STORIES.findIndex((s) => !state.done.includes(s.id));
  // "next" = the start buttons on the landing page: open the child's next story straight away
  const i = wanted === 'next' ? firstOpen : STORIES.findIndex((s) => s.id === wanted);
  if (i >= 0 && (i === firstOpen || state.done.includes(STORIES[i].id))) openLesson(i);
  else $('#sky').scrollIntoView();
})();

/* ---------- home motion: event driven, with a static readable fallback ---------- */
(() => {
  const root = document.documentElement, art = $('.hero-art');
  if (!art) return;   // the game page has no hero; the landing page carries the scene
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = $('#motion-toggle');
  let paused = false, queued = 0, visible = true;
  try { paused = localStorage.getItem('little-light-motion') === 'off'; } catch {}
  const active = () => !paused && !preference.matches;
  // Reuse the lesson drawing verbatim, exposing just its articulated parts in the hero.
  const pip = $('.hero-pip');
  pip.replaceChildren(...[...$('#pip').children].map(n => n.cloneNode(true)));
  const body = pip.firstElementChild;
  [...body.children].slice(0, 2).forEach(n => n.classList.add('pip-leg'));
  const lantern = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  lantern.classList.add('pip-lantern');
  [...body.children].slice(-4).forEach(n => lantern.append(n));
  body.append(lantern);
  const glow = pip.querySelector('circle[cx="187"]');
  glow.setAttribute('stroke', 'none');
  lantern.append(glow);
  const eyes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  eyes.classList.add('pip-eyes');
  pip.querySelectorAll('ellipse[cy="102"], circle[cy="98"][r="3"]').forEach(n => eyes.append(n));
  pip.append(eyes);
  const blend = (a, b, t) => `rgb(${a.map((c,i) => Math.round(c + (b[i]-c)*t)).join(',')})`;
  function paint() {
    queued = 0;
    if (document.hidden || !visible) return;
    const rect = art.getBoundingClientRect();
    // Uses the illustration itself, so phones do not finish the sunset before Pip appears.
    const start = Math.max(0, rect.top + scrollY - innerHeight * .5);
    const progress = active() ? Math.max(0, Math.min(1, (scrollY - start) / Math.max(1, rect.height * .9))) : .85;
    art.style.setProperty('--nightfall', progress.toFixed(3));
    $('.scene-sky', art).setAttribute('fill', blend([255,225,211], [50,42,107], progress));
  }
  function schedule() { if (!queued && visible && !document.hidden) queued = requestAnimationFrame(paint); }
  const entrances = new Set();
  function sync() {
    root.classList.toggle('motion-off', !active());
    toggle.textContent = active() ? 'Pause motion' : 'Enable motion';
    toggle.setAttribute('aria-pressed', String(!active()));
    toggle.disabled = preference.matches;
    if (preference.matches) toggle.textContent = 'Reduced motion is on';
    if (!active()) { entrances.forEach(a => a.finish()); entrances.clear(); }
    schedule();
  }
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    paused = !paused;
    try { localStorage.setItem('little-light-motion', paused ? 'off' : 'on'); } catch {}
    sync();
  });
  preference.addEventListener('change', sync);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  function sleep() {
    const asleep = document.hidden || $('#lesson').classList.contains('open') || !$('#hear').hidden;
    root.classList.toggle('motion-sleep', asleep);
    entrances.forEach(a => asleep ? a.pause() : a.play());
    if (!asleep) schedule();
  }
  document.addEventListener('visibilitychange', sleep);
  new MutationObserver(sleep).observe($('#lesson'), { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(sleep).observe($('#hear'), { attributes: true, attributeFilter: ['hidden'] });
  if ('IntersectionObserver' in window) {
    const seen = new WeakSet();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      const el = entry.target;
      el.classList.toggle('motion-outside', !entry.isIntersecting);
      if (el === art) { visible = entry.isIntersecting; if (visible) schedule(); }
      if (!entry.isIntersecting || seen.has(el)) return;
      seen.add(el);
      if (el === art && active()) el.classList.add('motion-ready');
      // Draw each path once, leaving every story control available throughout.
      const target = el.matches('.week-sky') ? el.querySelector('.lines') : el.matches('.panel') ? el.querySelector('svg') : null;
      if (target && active()) {
        const frames = el.matches('.week-sky') ? [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }] : [{ opacity: .55 }, { opacity: 1 }];
        const a = target.animate(frames, { duration: el.matches('.week-sky') ? 1800 : 600, easing: 'cubic-bezier(.16,1,.3,1)' });
        entrances.add(a); a.onfinish = () => entrances.delete(a);
      }
    }), { threshold: .08 });
    [art, $('.sky'), ...document.querySelectorAll('.panel'), $('footer')].forEach(el => observer.observe(el));
    const observePaths = () => document.querySelectorAll('.week-sky').forEach(el => observer.observe(el));
    observePaths();
    new MutationObserver(observePaths).observe($('#constellation'), { childList: true });
  }
  sync(); sleep();
})();
