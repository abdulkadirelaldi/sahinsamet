/* SŞ Panel service worker — 2026-10-30. Bildirim + çevrimdışı ekranı.
   Panel sayfaları ÖNBELLEĞE ALINMAZ: kişisel finans ve sağlık verisi cihazda
   birikmesin. Önbellekteki TEK şey statik "Bağlantı yok" sayfası. Adı `/panel`
   ile başlamıyor: ara katman `/panel/*`ı oturuma bağlıyor (bildirim dosyasıyla
   aynı gerekçe). */
const ONBELLEK = 'sahinsamet-cevrimdisi-1';
const CEVRIMDISI = '/cevrimdisi.html';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(ONBELLEK)
      .then((c) => c.add(CEVRIMDISI))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((adlar) =>
        Promise.all(adlar.filter((a) => a !== ONBELLEK).map((a) => caches.delete(a))),
      )
      .then(() => self.clients.claim()),
  );
});

/* Yalnızca PANEL GEZİNMELERİ: ağ önce, ağ yoksa "Bağlantı yok". Geri kalan her
   istek (public site, API, RSC, statik dosya) hiç dokunulmadan tarayıcıya kalır. */
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  if (!new URL(event.request.url).pathname.startsWith('/panel')) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(CEVRIMDISI)));
});

/* Bildirim seçenekleri (2026-11-11, Android). SAF — `tests/unit/sw-bildirim.test.ts` okur.
   - `badge`: durum çubuğu rozeti TEK RENK; Android yalnızca saydamlığı çizer. Renkli ikon
     orada beyaz bir kare olurdu → saydam zemin üstüne beyaz "SŞ".
   - `tag`: aynı etiketli yeni bildirim eskisinin yerine geçer (çekmecede yığılmaz). Sunucu
     `etiket` gönderir; eski sunucudan gelen yükte yoksa adresten türetilir.
   - `renotify`: yerine geçen bildirim de titreşsin/ses çıkarsın — yoksa sessizce güncellenirdi.
   - `requireInteraction` verilmez (varsayılan): hatırlatma kendiliğinden kaybolabilsin. */
function bildirimSecenekleri(veri, simdi) {
  return {
    body: veri.govde,
    icon: '/icon.png',
    badge: '/bildirim-rozet.png',
    tag: veri.etiket || `sahinsamet:${veri.url}`,
    renotify: true,
    timestamp: simdi,
    vibrate: [120, 60, 120],
    lang: 'tr',
    data: { url: veri.url, tur: veri.tur },
  };
}

self.addEventListener('push', (event) => {
  let veri = { baslik: 'SŞ Panel', govde: '', url: '/panel' };
  try {
    veri = { ...veri, ...event.data.json() };
  } catch {
    /* boş ya da düz metin — varsayılanlar */
  }
  event.waitUntil(
    self.registration.showNotification(veri.baslik, bildirimSecenekleri(veri, Date.now())),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/panel', self.location.origin);
  // Yalnızca aynı köken — bildirim gövdesi başka siteye yönlendiremesin.
  if (url.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((pencereler) => {
      const acik = pencereler.find((p) => p.url.startsWith(self.location.origin));
      if (acik) return acik.focus().then(() => acik.navigate(url.href));
      return self.clients.openWindow(url.href);
    }),
  );
});
