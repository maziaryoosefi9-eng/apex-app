// ApeX service worker: offline app shell. GitHub API calls are never intercepted.
const CACHE = 'apex-v1';   // هر وقت index.html رو عوض کردی، این عدد رو بالا ببر (v2, v3, ...)
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // api.github.com و ... دست نخورد

  // صفحه‌ها: اول شبکه، اگه نبود کش
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('./index.html', c)); return r; })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }
  // بقیه فایل‌ها: اول کش، بعد شبکه (و ذخیره)
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
      return r;
    }))
  );
});
