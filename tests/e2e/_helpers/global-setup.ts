import process from 'node:process';

/**
 * E2E küresel kurulumu — veritabanı gerektiren senaryolar için.
 *
 * İKİ İŞ:
 *   1. Veritabanının ve seed verisinin hazır olup olmadığını ÖLÇER ve sonucu
 *      `E2E_DB_READY` ile alt süreçlere bildirir. Playwright işçi süreçlerini
 *      bu adımdan SONRA başlattığı için değişken onlara da geçer.
 *   2. Koşumun başlangıç anını damgalar; teardown yalnızca bu andan sonra
 *      oluşan denetim kayıtlarını siler — koşumdan önce var olan gerçek
 *      kayıtlara dokunulmaz.
 *
 * DB yoksa HATA VERMEZ. `smoke` ve `security-headers` paketleri veritabanısız
 * koşuyor ve CI'da `.env` bulunmuyor (§8.17); bu dosyanın orada patlaması tüm
 * E2E'yi düşürürdü. Bunun yerine DB gerektiren testler kendilerini atlar ve
 * atlama GÖRÜNÜR olur — sessizce yeşile dönmez.
 */
export default async function globalSetup(): Promise<void> {
  process.env.E2E_STARTED_AT = new Date().toISOString();

  if (!process.env.DATABASE_URL) {
    console.warn('[e2e] DATABASE_URL yok — veritabanı gerektiren senaryolar ATLANACAK.');
    return;
  }

  try {
    const { findAdminUser, resetAuthState } = await import('./db');

    await findAdminUser();
    // Temiz başlangıç: önceki koşumdan kalan kilit/deneme varsa silinir.
    await resetAuthState();

    process.env.E2E_DB_READY = '1';
    // `console.info` değil: ESLint yalnız `warn`/`error`'a izin veriyor ve bu
    // bir uyarı değil, durum bildirimi. Backend de aynı yolu seçmişti (T-012/K6).
    process.stdout.write('[e2e] veritabanı hazır — auth senaryoları koşacak.\n');
  } catch (error) {
    console.warn(
      '[e2e] veritabanı hazır değil, auth senaryoları ATLANACAK:',
      error instanceof Error ? error.message : error,
    );
  }
}
