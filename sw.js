/* ── co-cal Service Worker ── */
const CACHE = 'co-cal-v1';
const SHELL = [
  '/co-cal/',
  '/co-cal/index.html',
  '/co-cal/manifest.json',
  '/co-cal/icon-192.png',
  '/co-cal/icon-512.png',
  '/co-cal/apple-touch-icon.png',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-storage.js',
];

/* 설치: 앱 쉘 캐시 */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

/* 활성화: 구버전 캐시 삭제 */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Fetch: Firebase 실시간 요청은 그대로 통과, 나머지는 캐시 우선 */
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Firebase Realtime DB / Storage / Auth → 항상 네트워크
  if (url.includes('firebasedatabase.app') ||
      url.includes('firebasestorage.googleapis.com') ||
      url.includes('googleapis.com/identitytoolkit')) {
    return;
  }

  // Google Fonts → 네트워크 우선, 실패 시 캐시
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 앱 쉘 → 캐시 우선, 없으면 네트워크
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/co-cal/index.html'));
    })
  );
});
