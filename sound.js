// Shared by the landing page and the game: sound effects synthesised in code (motion-studio recipes)
// and the On/Off setting (localStorage little-light-sound). Load before landing.js / app.js.
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
