// Little Light as an app: service worker, "Keep Little Light on your phone", and saving every story for offline.
// Shared by the landing page and the game. Pages in play/ set window.LL_ROOT = '../'.
//
// Installing differs by device:
//  - Android / desktop Chrome and Edge fire `beforeinstallprompt`; our Install button opens the browser's own prompt.
//  - iPhone and iPad have no prompt a site can trigger, so we show the steps. In iOS 26 Safari's default
//    Compact layout, Share sits behind the ••• button, then Add to Home Screen, with "Open as Web App" on.
(() => {
  const ROOT = window.LL_ROOT || '';
  const UA = navigator.userAgent;
  const STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const IOS = /iP(hone|ad|od)/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const IOS_OTHER_BROWSER = IOS && /CriOS|FxiOS|EdgiOS|GSA\//.test(UA);   // Chrome, Firefox, Edge, Google app on iPhone
  const ANDROID = /Android/.test(UA);
  const PHONE_OR_TABLET = IOS || ANDROID || (matchMedia('(pointer: coarse)').matches && innerWidth <= 1100);
  const canWork = 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost');
  if (canWork) navigator.serviceWorker.register(ROOT + 'sw.js', { scope: ROOT || './' }).catch(() => {});

  /* ---------- remembering what the family chose ---------- */
  const KEY = 'little-light-install';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...v })); } catch {} };
  const visits = (() => { const v = (read().visits || 0) + 1; write({ visits: v }); return v; })();
  let deferred = null, installed = STANDALONE || !!read().installed;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; paintPanel(); });
  addEventListener('appinstalled', () => { installed = true; write({ installed: true }); deferred = null; close(); paintPanel(); });

  // Offer it by ourselves only on phones and tablets, never when installed, and not again for 14 days after
  // "Not now" (never after two). The My light panel can always open it.
  const canOffer = () => !installed && (PHONE_OR_TABLET || !!deferred);
  const mayNag = () => { const s = read(); return canOffer() && PHONE_OR_TABLET && (s.dismissals || 0) < 2 && Date.now() - (s.dismissedAt || 0) > 14 * 864e5; };

  /* ---------- the sheet ---------- */
  const icon = {
    dots: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="7" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="8" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="16" cy="12" r="1.4" fill="currentColor"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9H6.5A1.5 1.5 0 0 0 5 10.5v9A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 17.5 9H16"/><path d="M12 14V3m-3.5 3.5L12 3l3.5 3.5"/></svg>',
    add: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
    toggle: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="6" width="21" height="12" rx="6" fill="#3bb3a6"/><circle cx="16.5" cy="12" r="4.4" fill="#fff"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 8v6m-3-3 3 3 3-3"/></svg>',
  };
  const step = (ic, html) => `<li><span class="ll-i">${icon[ic]}</span><span>${html}</span></li>`;
  function steps() {
    if (deferred) return '';   // the browser's own prompt does the rest
    if (IOS && !IOS_OTHER_BROWSER) return `<ol>${[
      step('dots', 'Tap the <b>•••</b> button at the bottom of Safari. If you can see the <b>Share</b> button already, tap that.'),
      step('share', 'Tap <b>Share</b>.'),
      step('add', 'Scroll down and tap <b>Add to Home Screen</b>.'),
      step('toggle', 'Keep <b>Open as Web App</b> switched on, then tap <b>Add</b>.'),
    ].join('')}</ol><p class="ll-note">Stars saved in Safari stay in Safari, so it’s best to add Little Light before your child starts.</p>`;
    if (IOS) return `<ol>${[
      step('share', 'Tap the <b>Share</b> button (top right or in the menu).'),
      step('add', 'Tap <b>Add to Home Screen</b>, then <b>Add</b>.'),
    ].join('')}</ol><p class="ll-note">Tip: in Safari it opens like an app, full screen.</p>`;
    return `<ol>${[
      step('menu', 'Open your browser’s menu <b>⋮</b>.'),
      step('add', 'Tap <b>Install app</b> or <b>Add to Home screen</b>.'),
    ].join('')}</ol>`;
  }
  let sheet = null;
  function open(source) {
    close();
    sheet = document.createElement('div');
    sheet.className = 'll-install'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'll-install-h');
    sheet.innerHTML = `<div class="ll-card" tabindex="-1">
      <button class="ll-x" aria-label="Close">${'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'}</button>
      <img class="ll-logo" src="${ROOT}assets/icons/icon-192.png" width="72" height="72" alt="">
      <h2 id="ll-install-h">Keep Little Light on your phone</h2>
      <p>Open it from your home screen like an app, full screen, and even without internet.</p>
      ${deferred ? `<button class="ll-go">${icon.phone}<span>Install Little Light</span></button>` : steps()}
      <button class="ll-later">Not now</button>
    </div>`;
    document.body.append(sheet);
    const later = () => { const s = read(); write({ dismissals: (s.dismissals || 0) + (source === 'auto' ? 1 : 0), dismissedAt: Date.now() }); close(); };
    sheet.querySelector('.ll-x').onclick = later; sheet.querySelector('.ll-later').onclick = later;
    sheet.addEventListener('click', (e) => { if (e.target === sheet) later(); });
    const go = sheet.querySelector('.ll-go');
    if (go) go.onclick = async () => { const d = deferred; if (!d) return; d.prompt(); const c = await d.userChoice.catch(() => null); deferred = null; if (c && c.outcome === 'accepted') { installed = true; write({ installed: true }); } close(); paintPanel(); };
    (go || sheet.querySelector('.ll-card')).focus();   // land on the card itself; screen readers read the heading
  }
  function close() { if (sheet) { sheet.remove(); sheet = null; } }
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet) close(); });

  const style = document.createElement('style');
  style.textContent = `
  .ll-install{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:calc(env(safe-area-inset-top,0px) + 16px) 16px calc(env(safe-area-inset-bottom,0px) + 16px);background:rgba(34,26,72,.45);overflow-y:auto;font-family:'Lexend','Segoe UI',sans-serif;color:#2b2250}
  .ll-card{position:relative;width:100%;max-width:420px;background:#fff;border:2px solid #ddd8e4;border-radius:28px;box-shadow:0 20px 70px rgba(43,34,80,.2);padding:28px 22px 18px;text-align:center;display:grid;gap:10px;justify-items:center}
  .ll-card h2{margin:4px 0 0;font:700 26px/1.15 'Fredoka','Trebuchet MS',sans-serif;text-wrap:balance}
  .ll-card>p{margin:0;font-size:15px;line-height:1.5;color:#5d5680}
  .ll-logo{width:72px;height:72px;border-radius:18px;box-shadow:0 3px 0 #ddd8e4}
  .ll-card ol{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:8px;width:100%;text-align:left;counter-reset:s}
  .ll-card li{display:flex;gap:12px;align-items:center;background:#fbf7ef;border-radius:16px;padding:10px 12px;font-size:15px;line-height:1.4;counter-increment:s}
  .ll-card li::before{content:counter(s);flex:none;width:24px;height:24px;border-radius:50%;background:#2b2250;color:#fff;font:600 13px/24px 'Fredoka',sans-serif;text-align:center}
  .ll-i{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#fff;border:1.5px solid #ddd8e4;color:#1a73e8}
  .ll-i svg{width:22px;height:22px}
  .ll-note{font-size:13px!important;color:#5d5680}
  .ll-go{display:inline-flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:52px;margin-top:6px;border:2px solid #2b2250;border-radius:999px;background:#ffc94a;color:#2b2250;box-shadow:0 4px 0 #2b2250;font:600 18px 'Fredoka',sans-serif;cursor:pointer}
  .ll-go svg{width:22px;height:22px}
  .ll-go:active{transform:translateY(4px);box-shadow:none}
  .ll-later{min-height:44px;background:none;border:0;color:#2b2250;text-decoration:underline;text-underline-offset:3px;font:inherit;font-size:15px;cursor:pointer}
  .ll-x{position:absolute;right:12px;top:12px;width:40px;height:40px;border-radius:50%;border:2px solid #ddd8e4;background:#fff;color:#2b2250;display:grid;place-items:center;cursor:pointer}
  .ll-x svg{width:16px;height:16px}
  .ll-install :focus-visible{outline:3px solid #2b2250;outline-offset:3px;border-radius:12px}
  .ll-card:focus{outline:none}
  `;
  document.head.append(style);

  // Shared with the game: the "You lit a star!" screen offers it at a happy moment
  window.LL_install = { canOffer, open: () => open('button') };

  /* ---------- offering it at a good moment (landing page) ---------- */
  if (document.getElementById('light-app')) {
    const offer = () => { if (mayNag() && !document.querySelector('dialog[open], .lesson.open')) open('auto'); };
    if (visits >= 2) setTimeout(offer, 4000);
    else { let tapped = false; addEventListener('pointerdown', () => { tapped = true; }, { once: true }); setTimeout(() => { if (tapped) offer(); }, 15000); }
  }

  /* ---------- My light panel (landing page) ---------- */
  const $ = (id) => document.getElementById(id);
  function paintPanel() {
    if (!$('light-app')) return;
    $('light-install').hidden = installed || !canOffer();
    $('light-app-note').textContent = installed ? 'You’re using the Little Light app.' : 'Open it like an app, even without internet.';
  }
  if (!$('light-app')) return;
  $('light-app').hidden = false; $('light-ios').hidden = true;   // the sheet carries the device's own steps now
  $('light-install').addEventListener('click', () => { $('light-collection')?.removeAttribute('open'); open('button'); });
  paintPanel();

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
