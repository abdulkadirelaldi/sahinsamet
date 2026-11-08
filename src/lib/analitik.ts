/**
 * Ziyaretçi analitiği — Umami (kendi sunucunda, çerezsiz). İSTEĞE BAĞLI.
 *
 * NEDEN UMAMI: çerez kullanmıyor (KVKK/GDPR çerez onayı gerektirmiyor), kişisel
 * veri tutmuyor, Coolify'a tek tıkla kuruluyor ve üçüncü taraf bir şirkete
 * ziyaretçi verisi gitmiyor.
 *
 * NEDEN `NEXT_PUBLIC_` DEĞİL: değerler ÇALIŞMA ANINDA okunuyor (layout ve
 * middleware sunucuda). Pakete gömülselerdi analitik adresi değişince imaj
 * yeniden derlenmek zorunda kalırdı (NEXT_PUBLIC_SITE_URL'deki dersin aynısı).
 *
 * İKİ DEĞER BİRLİKTE ve adres HTTPS olmalı; aksi hâlde `null` — sayfaya betik
 * eklenmez, CSP genişlemez. Geçersiz bir adres CSP'ye kontrolsüz köken
 * sokmasın diye URL burada ayrıştırılıyor, metin olarak taşınmıyor.
 */
export type AnalitikAyari = {
  /** Betiğin tam adresi: `<köken>/script.js`. */
  betik: string;
  /** Umami'deki site kimliği (UUID). */
  siteId: string;
  /** CSP `connect-src`e eklenecek köken (yalnızca şema + ana makine + port). */
  koken: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function analitikAyari(
  env: Record<string, string | undefined> = process.env,
): AnalitikAyari | null {
  const ham = env.UMAMI_URL?.trim();
  const siteId = env.UMAMI_SITE_ID?.trim();
  if (!ham || !siteId || !UUID.test(siteId)) return null;

  let adres: URL;
  try {
    adres = new URL(ham);
  } catch {
    return null;
  }
  if (adres.protocol !== 'https:') return null;

  return { betik: `${adres.origin}/script.js`, siteId, koken: adres.origin };
}
