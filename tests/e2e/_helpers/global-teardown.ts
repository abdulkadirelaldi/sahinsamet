import process from 'node:process';

/**
 * E2E küresel temizliği — TEST İZOLASYONU (T-018b / ENGEL-2).
 *
 * NEDEN OTOMATİK OLMAK ZORUNDA: 2FA'yı açık bırakan bir koşum, secret'ı
 * yalnızca testlerde bulunan bir hesap yaratır. Site sahibi kendi şifresiyle
 * giriş yapar, sistem doğrulama kodu ister ve o kodu üretebilecek bir cihaz
 * YOKTUR — yani kullanıcı kendi panelinden kilitlenir. Frontend bunu T-018b'de
 * elle temizlemek zorunda kaldı; bir kez unutulması yeterdi.
 *
 * Temizlik testler BAŞARISIZ OLSA DA koşar: `globalTeardown` Playwright
 * tarafından her koşum sonunda çağrılır. Kırmızı bir paket, bozuk bir
 * veritabanı bırakmamalı.
 */
export default async function globalTeardown(): Promise<void> {
  if (!process.env.E2E_DB_READY) {
    return;
  }

  // Veritabanı bağlantısı `db-task.ts` alt sürecine ait ve her çağrıda
  // kendisi kapatıyor — burada kapatılacak bir bağlantı yok.
  const { resetAuthState, e2eKalintisi } = await import('./db');

  try {
    const startedAt = process.env.E2E_STARTED_AT;
    await resetAuthState(startedAt ? new Date(startedAt) : undefined);

    /*
     * Testler kendi izlerini `afterAll` içinde siliyor. Burada SİLME yok,
     * yalnızca İDDİA var: "kalıntı yok" ayrı bir sorgudan ölçülüyor (T-107b —
     * silinen sayısı hem her şey temizken hem yanlış önek ararken 0 çıkar).
     */
    const kalinti = await e2eKalintisi();

    process.stdout.write(
      `[e2e] KALAN test izi: ${kalinti.toplam} ` +
        `(denetim ${kalinti.denetim}, kişisel ${kalinti.kisisel}).\n`,
    );

    /*
     * Kalıntı varsa SESSİZ GEÇİLMEZ. Bir sonraki koşum onu seed verisi sanır
     * (ADR-030: seed bir ölçüm sözleşmesidir) ve Lighthouse ya da liste
     * sayıları sessizce kayar. Fırlatmak koşumu kırmızıya çevirir — doğru
     * davranış: temizliği kaçıran paket bulunup düzeltilsin.
     */
    if (kalinti.toplam > 0) {
      throw new Error(
        `E2E test izi KALDI (${kalinti.toplam} satır). Bir paket kendi ` +
          '`afterAll` temizliğini kaçırmış olabilir.',
      );
    }
  } catch (error) {
    // Sessizce geçilmez: bozuk kalan durum bir sonraki koşumu yanıltır ve
    // en kötü hâlde site sahibini kendi panelinden kilitler.
    console.error(
      '[e2e] TEMİZLİK BAŞARISIZ — 2FA açık kalmış olabilir:',
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
}
