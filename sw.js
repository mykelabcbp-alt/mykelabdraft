/* ==========================================================================
   CSC2026 — Service Worker
   --------------------------------------------------------------------------
   Strategi sengaja dipilih:

   - App shell (HTML/CSS/JS/ikon)  -> stale-while-revalidate.
     Buka serta-merta daripada cache, kemas kini di latar belakang.
     Inilah yang menghilangkan masa muat semula pada lawatan berulang.

   - Panggilan API Apps Script     -> TIDAK PERNAH dicache.
     Data pendaftaran mesti sentiasa segar. Menyajikan pendaftaran lapuk
     daripada cache akan menyebabkan atlet melihat maklumat salah, dan
     menyimpan permintaan POST di latar belakang boleh menghasilkan
     pendaftaran berganda. Kita tidak melakukan kedua-duanya.

   - Fon & pustaka CDN             -> cache-first (jarang berubah).
   ========================================================================== */

var VERSION = 'csc2026-v3.2.0';
var SHELL_CACHE = VERSION + '-shell';
var CDN_CACHE = VERSION + '-cdn';

var SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './vendor/tailwind.css',
  './vendor/lucide-subset.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
  './assets/favicon.ico',
  './assets/favicon-16.png',
  './assets/favicon-32.png',
  './admin/',
  './admin/index.html',
  './juri/',
  './juri/index.html'
];

var CDN_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      // addAll gagal sepenuhnya jika satu fail gagal — tambah satu demi satu.
      return Promise.all(SHELL_ASSETS.map(function (url) {
        return cache.add(url).catch(function () { /* pilihan */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k.indexOf(VERSION) !== 0) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/**
 * Keputusan cache menggunakan SENARAI PUTIH, bukan senarai hitam.
 *
 * Versi awal menyenaraihitamkan hos Apps Script dan menganggap segala yang
 * lain selamat untuk dicache. Itu rapuh: sebaik sahaja API berada pada asal
 * yang sama (proksi, domain tersuai, ujian setempat), respons pendaftaran
 * MULA dicache — atlet yang sudah mendaftar akan melihat balasan lama
 * "belum berdaftar". Ia diuji dan disahkan berlaku.
 *
 * Peraturan sekarang: hanya aset statik yang dicache. Apa-apa yang
 * mempunyai rentetan pertanyaan, atau apa-apa yang bukan sambungan fail
 * statik yang dikenali, sentiasa pergi ke rangkaian.
 */
var STATIC_EXT = ['.html', '.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico', '.woff2'];

function isCacheableStatic(url, req) {
  if (url.search) return false;                 // ?action=… tidak pernah dicache
  if (req.mode === 'navigate') return true;     // navigasi halaman
  var p = url.pathname.toLowerCase();
  if (p.endsWith('/')) return true;             // index direktori
  for (var i = 0; i < STATIC_EXT.length; i++) {
    if (p.endsWith(STATIC_EXT[i])) return true;
  }
  return false;
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Hanya GET. POST pendaftaran mesti sentiasa terus ke rangkaian.
  if (req.method !== 'GET') return;

  // CDN fon: cache-first (jarang berubah).
  if (CDN_HOSTS.indexOf(url.hostname) !== -1) {
    event.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CDN_CACHE).then(function (c) { c.put(req, copy); }).catch(function () { });
          return res;
        });
      }).catch(function () { return fetch(req); })
    );
    return;
  }

  // Asal lain (imej Drive, API Apps Script): jangan sentuh langsung.
  if (url.origin !== self.location.origin) return;

  // Asal sendiri tetapi bukan aset statik (cth. /api?action=…): jangan cache.
  if (!isCacheableStatic(url, req)) return;

  // Aset statik: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then(function (hit) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(SHELL_CACHE).then(function (c) { c.put(req, copy); }).catch(function () { });
        }
        return res;
      }).catch(function () {
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Luar talian' });
      });
      return hit || network;
    })
  );
});

/* Membenarkan halaman mencetuskan pengemaskinian serta-merta. */
self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
