// Little Light service worker: plays offline, stays fresh online. No version bumps needed on deploy.
//  - Pages, code and story files: network first (up to 3 s), the saved copy when offline or slow.
//  - Recordings and fonts: the saved copy first, refreshed quietly in the background.
//  - iPhone Safari asks for audio in byte ranges; saved audio is answered with proper 206 slices.
const SHELL = 'll-shell-v2', MEDIA = 'll-media-v1';
const CORE = [
  './', 'index.html', 'landing.css', 'landing.js', 'sound.js', 'pwa.js', 'manifest.webmanifest',
  'stories/week-1.js', 'stories/week-2.js', 'stories/week-3.js',
  'play/', 'play/index.html', 'styles.css', 'app.js',
  'assets/landing/storybook-meadow.webp', 'assets/landing/journey-guide.webp',
  'assets/brand/web/logo-icon-96.webp', 'assets/brand/web/logo-icon-96.png', 'assets/brand/web/logo-icon-256.webp',
  'assets/icons/icon-192.png', 'assets/icons/apple-touch-icon.png', 'assets/icons/favicon.svg', 'assets/icons/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ll-') && k !== SHELL && k !== MEDIA).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const within = (ms, promise) => Promise.race([promise, new Promise((_, no) => setTimeout(() => no(new Error('slow')), ms))]);

async function networkFirst(req) {
  const cache = await caches.open(SHELL);
  const network = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; });
  try { return await within(3000, network); }
  catch {
    const saved = await cache.match(req, { ignoreSearch: true });
    if (saved) return saved;
    return network;   // nothing saved: wait for the network after all (or fail as the browser would)
  }
}

async function savedFirst(req) {
  const cache = await caches.open(MEDIA);
  const saved = await cache.match(req);
  const fresh = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => saved);
  return saved || fresh;
}

async function audio(req) {
  const cache = await caches.open(MEDIA), url = req.url.split('#')[0];
  let res = await cache.match(url);
  if (!res) {
    try { res = await fetch(url); if (res.ok) await cache.put(url, res.clone()); }
    catch { return new Response('', { status: 504 }); }
  } else {
    fetch(url).then((r) => { if (r.ok) cache.put(url, r); }).catch(() => {});   // re-recorded clips arrive next time
  }
  const range = req.headers.get('range');
  if (!range || !res.ok) return res;
  const body = await res.arrayBuffer(), size = body.byteLength, m = /bytes=(\d*)-(\d*)/.exec(range);
  let start = 0, end = size - 1;
  if (m && m[1]) { start = +m[1]; if (m[2]) end = Math.min(+m[2], size - 1); }
  else if (m && m[2]) { start = Math.max(0, size - +m[2]); }
  return new Response(body.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg', 'Accept-Ranges': 'bytes',
    'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) } });
}

self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (!url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
    e.respondWith(url.pathname.includes('/audio/') ? audio(req) : networkFirst(req));
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(savedFirst(req));
  }
});
