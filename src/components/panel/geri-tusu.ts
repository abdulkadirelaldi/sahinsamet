'use client';

import { useEffect, useRef } from 'react';

/** Geçmiş kaydını panelin alt sayfalarına ait diye işaretler (yalnızca hata ayıklarken okunur). */
export const GERI_ISARETI = '__sayfaAcik';

/**
 * ANDROID GERİ HAREKETİ (2026-11-11). Alt sayfa / pencere açıkken Android'in geri jesti (ya da
 * geri tuşu) sayfayı KAPATSIN, panelden önceki ekrana gitmesin.
 *
 * NASIL: açılınca adresi DEĞİŞTİRMEDEN bir geçmiş kaydı eklenir (`pushState(…, '')` — adres
 * verilmediği için Next yönlendiricisi gezinme sanmaz; kendi iç durumunu bu kayda kopyalar).
 * Geri jesti o kaydı söker → `popstate` → `kapat()`. Arayüzden kapatılınca (X, perde, Esc,
 * kaydet) eklenen kayıt `history.back()` ile geri alınır: geçmiş birikmez, sonraki geri jesti
 * gerçekten önceki ekrana gider.
 *
 * İNCELİKLER:
 * - Ekleme bir sonraki göreve ertelenir: React'in geliştirme modundaki çift efekt çağrısı
 *   (StrictMode) bir ekle-geri al-ekle zinciri kurup sayfayı anında kapatırdı.
 * - Sayfanın içindeki bir BAĞLANTIYA dokunulduysa geri alınmaz: `history.back()` ile Next'in
 *   yeni adresi yazması yarışır, kullanıcı yeni sayfadan geri atılabilirdi. Bu yüzden
 *   sayfalardaki bağlantılar `replace` ile gider ve eklenen kaydın YERİNE yazılır.
 * - Kapanırken adres değiştiyse (programla gezinme) de geri alınmaz — aynı yarış.
 * - Sunucu eylemi / `router.refresh()` geçmiş kaydının durumunu yeniden yazar; bu yüzden kayıt
 *   `history.state` işaretiyle değil, bu kancanın kendi bayrağıyla izlenir.
 * - Bu kaydın söküldüğü `popstate` Next'e İLETİLMEZ (adres aynıysa): Next her `popstate`te bir
 *   "geri yükle" gezinmesi başlatır ve bu, bekleyen `router.refresh()`i İPTAL EDER — takvimde
 *   kaydedilen etkinlik pencere kapanınca görünmüyordu (e2e yakaladı). Adres aynı, Next'in
 *   gösterdiği ağaç zaten doğru; yutmak güvenli. Aynı hedefteki dinleyiciler KAYIT SIRASIYLA
 *   çalışır (Chrome'da `window` için yakalama da öne geçmiyor — ölçüldü); bu yüzden dinleyici
 *   modül yüklenirken, Next'in hidrasyon sonrası kurduğu dinleyiciden ÖNCE kurulur ve
 *   `stopImmediatePropagation` onu durdurur.
 */

/** Açık sayfanın eklediği kayıt: geri gelince kapatılır. Aynı anda tek sayfa. */
let acikKayit: { adres: string; kapat: () => void } | null = null;
/** Kancanın kendi `history.back()`i: gelecek `popstate` yalnızca yutulur. */
let kendiGerimiz: { adres: string; sure: number } | null = null;

function popstateGeldi(e: PopStateEvent): void {
  if (kendiGerimiz) {
    const { adres, sure } = kendiGerimiz;
    kendiGerimiz = null;
    window.clearTimeout(sure);
    if (window.location.href === adres) e.stopImmediatePropagation();
    return;
  }
  if (acikKayit) {
    const kayit = acikKayit;
    acikKayit = null;
    if (window.location.href === kayit.adres) e.stopImmediatePropagation();
    kayit.kapat();
  }
}

if (typeof window !== 'undefined') window.addEventListener('popstate', popstateGeldi);

export function useGeriTusuylaKapat(acik: boolean, kapat: () => void): void {
  const kapatRef = useRef(kapat);
  useEffect(() => {
    kapatRef.current = kapat;
  });

  useEffect(() => {
    if (!acik) return;
    let baglanti = false;
    let kayit: { adres: string; kapat: () => void } | null = null;

    const zamanlayici = window.setTimeout(() => {
      kayit = { adres: window.location.href, kapat: () => kapatRef.current() };
      window.history.pushState({ [GERI_ISARETI]: true }, '');
      acikKayit = kayit;
    }, 0);

    const tikla = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest('a[href]')) baglanti = true;
    };
    document.addEventListener('click', tikla, true);

    return () => {
      window.clearTimeout(zamanlayici);
      document.removeEventListener('click', tikla, true);
      // Kayıt hâlâ bizimse (geri hareketiyle sökülmediyse) arayüzden kapandı.
      if (!kayit || acikKayit !== kayit) return;
      acikKayit = null;
      if (baglanti || window.location.href !== kayit.adres) return;
      // Olay hiç gelmezse (sayfa kapanıyor) sonraki gerçek geri hareketini yutmasın.
      const sure = window.setTimeout(() => {
        kendiGerimiz = null;
      }, 1000);
      kendiGerimiz = { adres: kayit.adres, sure };
      window.history.back();
    };
  }, [acik]);
}
