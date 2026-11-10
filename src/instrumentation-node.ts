import { guvenliHata } from './lib/security/guvenli-log';
import { nabizVur } from './lib/zamanlayici-nabiz';
import { bildirimTuru } from './server/services/bildirim';
import { netVarlikKaydet } from './server/services/cuzdan-rapor';
import { hataKaydet } from './server/services/hata-kaydi';
import { takvimHatirlatmaTuru } from './server/services/takvim-bildirim';
import { gunlukTemizlik } from './server/services/temizlik';

/**
 * Zamanlayıcılar (bildirim, net varlık) — YALNIZCA Node çalışma zamanı (`instrumentation.ts`
 * bu dosyayı `NEXT_RUNTIME === 'nodejs'` dalında içe aktarır; Edge paketine
 * `web-push` ve Node modülleri girmez). Testte ve geliştirmede kurulmaz.
 */
if (process.env.NODE_ENV === 'production') {
  // Yalnızca konsola yazılan hata panelde görünmüyordu: Ayarlar → Hatalar'a da düşer.
  const hataYaz = (ad: string) => (error: unknown) => {
    guvenliHata(`[${ad}] tur başarısız:`, error instanceof Error ? error.message : error);
    void hataKaydet({
      kaynak: 'sunucu',
      ad: `zamanlayici:${ad}`,
      mesaj: error instanceof Error ? error.message : String(error),
    }).catch(() => undefined);
  };

  // Bildirim: anahtar yoksa kurulmaz.
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    const tur = () =>
      bildirimTuru()
        .then(() => nabizVur())
        .catch(hataYaz('bildirim'));
    setInterval(tur, 5 * 60_000).unref();
    setTimeout(tur, 30_000).unref();

    // Takvim hatırlatmaları: dakikada bir, dakikanın 2. saniyesine hizalı — seçilen saatten en çok
    // birkaç saniye sonra gelir. Yalnızca takvimi okur; ağır tur 5 dakikada kalır. Önceki tur
    // bitmeden yenisi başlamaz (yavaş push sağlayıcısı turları üst üste bindirmesin).
    let takvimSuruyor = false;
    const takvimTur = () => {
      if (takvimSuruyor) return;
      takvimSuruyor = true;
      void takvimHatirlatmaTuru()
        .catch(hataYaz('takvim'))
        .finally(() => {
          takvimSuruyor = false;
        });
    };
    setTimeout(
      () => {
        takvimTur();
        setInterval(takvimTur, 60_000).unref();
      },
      60_000 - (Date.now() % 60_000) + 2_000,
    ).unref();
  }

  // Net varlık: saatte bir bugünün satırını günceller; gün sonu değeri kalır.
  const netTur = () => netVarlikKaydet().catch(hataYaz('net-varlik'));
  setInterval(netTur, 60 * 60_000).unref();
  setTimeout(netTur, 60_000).unref();

  const temizlikTuru = () => gunlukTemizlik().catch(hataYaz('temizlik'));
  setInterval(temizlikTuru, 24 * 60 * 60_000).unref();
  setTimeout(temizlikTuru, 5 * 60_000).unref();
}
