// Little Light as an app: service worker, "Add to home screen", and saving every story for offline.
// Shared by the landing page and the game. Pages in play/ set window.LL_ROOT = '../'.
(() => {
  const ROOT = window.LL_ROOT || '';
  const STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const canWork = 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost');
  if (canWork) navigator.serviceWorker.register(ROOT + 'sw.js', { scope: ROOT || './' }).catch(() => {});

  const box = document.getElementById('light-app');
  if (!box) return;   // the game page has no My light panel; registration above is all it needs
  const $ = (id) => document.getElementById(id);
  box.hidden = false;

  // Install: Chrome/Edge/Android offer a prompt we can trigger; iPhone and iPad only have Share > Add to Home Screen
  let deferred = null;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; if (!STANDALONE) $('light-install').hidden = false; });
  $('light-install').addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt(); const choice = await deferred.userChoice.catch(() => null); deferred = null;
    $('light-install').hidden = true;
    if (choice && choice.outcome === 'accepted') $('light-app-note').textContent = 'Little Light is on your home screen.';
  });
  addEventListener('appinstalled', () => { $('light-install').hidden = true; $('light-app-note').textContent = 'Little Light is on your home screen.'; });
  if (STANDALONE) $('light-app-note').textContent = 'You’re using the Little Light app.';
  else if (IOS) $('light-ios').hidden = false;

  // Offline: save every recording the stories use (the pages and code are saved automatically on first visit)
  const button = $('light-offline'), status = $('light-offline-status');
  if (!canWork || !('caches' in window)) { button.hidden = true; return; }
  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');   // same as app.js
  function clips() {
    const set = new Set(['help/hello.mp3', 'help/verse-psalm-23-1.mp3']);
    for (const s of (window.LL_WEEKS || []).flatMap((w) => w.stories)) {
      s.pages.forEach((_, i) => set.add(`${s.id}-${i + 1}.mp3`));
      s.ex.forEach((ex, i) => {
        set.add(`q/${s.id}-${i + 1}.mp3`);
        const words = ex.type === 'choose' ? ex.options.map((o) => o[0]) : ex.type === 'pairs' ? ex.pairs.flat() : [...ex.words, ...ex.extra];
        words.forEach((w) => set.add(`w/${slug(w)}.mp3`));
      });
    }
    return [...set].map((f) => new URL(ROOT + 'audio/' + f, location.href).href);
  }
  const all = clips(), stories = (window.LL_WEEKS || []).reduce((n, w) => n + w.stories.length, 0);
  const done = () => { button.hidden = true; status.textContent = `All ${stories} stories are saved on this device, ready without internet.`; };
  caches.open('ll-media-v1').then(async (c) => { const have = (await c.keys()).map((r) => r.url); if (all.every((u) => have.includes(u))) done(); }).catch(() => {});
  button.addEventListener('click', async () => {
    button.disabled = true;
    const cache = await caches.open('ll-media-v1'), have = new Set((await cache.keys()).map((r) => r.url));
    const todo = all.filter((u) => !have.has(u)); let n = all.length - todo.length, failed = 0;
    const show = () => { status.textContent = `Saving stories for offline… ${Math.round((n / all.length) * 100)}%`; };
    show();
    const worker = async () => { while (todo.length) { const u = todo.shift(); try { const r = await fetch(u); if (r.ok) await cache.put(u, r); else failed++; } catch { failed++; } n++; show(); } };
    await Promise.all(Array.from({ length: 6 }, worker));
    button.disabled = false;
    if (failed) status.textContent = `Saved most stories. ${failed} recordings didn’t download; tap again on a better connection.`;
    else done();
  });
})();
