import { statfs } from 'node:fs/promises';
import process from 'node:process';

import { expect, test } from '@playwright/test';

/**
 * API uçlarının SÖZLEŞME testleri — T-016b'nin kapattığı kapsam boşluğu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BU DOSYA VAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * T-016b rota envanterini kapı kapsamıyla karşılaştırdı.
 * `/api/v1/health` — `security-headers.spec.ts` bu uca istek atıyor ama
 * YALNIZCA BAŞLIKLARA bakıyor. İzleme (`.github/workflows/izleme.yml`) bu
 * ucun gövdesine bakıyor; gövdeyi hiçbir kapı doğrulamıyorsa "servis ayakta"
 * sinyali doğrulanmamış demektir. Bu dosya durum kodunu ve zarfı doğruluyor.
 */

/**
 * Ucun sözleşmesi ORTAMA BAĞLI: disk %5'in altına inerse 503 döner ve bu
 * DOĞRU davranıştır (`route.ts` → `DISK_CRITICAL_FREE_RATIO`). Bu yüzden
 * beklenti sabit yazılmıyor, ÖNCE ölçülüyor — T-029e'de WebGL kontrolünün
 * koşucunun çizim gücüne göre iddia seçmesiyle aynı disiplin. Sabit 200
 * yazsaydık, diski dolu bir makinede kapı KODDA HİÇBİR ŞEY BOZULMADAN
 * kırmızıya döner ve "haksız düşen kapı" güvenilirliği aşındırırdı.
 *
 * Ölçüm testin kendi süreçinden yapılabiliyor çünkü ölçüm sunucusu AYNI
 * makinede koşuyor (`playwright.config.ts` → `webServer`). Sunucu bir gün
 * uzak bir makineye taşınırsa bu varsayım bozulur ve bu blok gözden
 * geçirilmelidir.
 */
const DISK_KRITIK_ORAN = 0.05;

async function bostaDiskOrani(): Promise<number | null> {
  try {
    const s = await statfs(process.cwd());
    const toplam = Number(s.blocks) * Number(s.bsize);
    const bos = Number(s.bavail) * Number(s.bsize);

    return Number.isFinite(toplam) && toplam > 0 ? bos / toplam : null;
  } catch {
    return null;
  }
}

test.describe('§13.6 · /api/v1/health — izlemenin baktığı sözleşme', () => {
  /**
   * CI'da beklenen dal SAĞLIKLI daldır: `ci.yml` Postgres servis container'ını,
   * `prisma migrate deploy`i ve seed'i koşturuyor, koşucu diski de boş. DB
   * düşerse test kırmızı olur ve bu DOĞRU sonuçtur — ucun tek işi bunu
   * bildirmek.
   */
  test('§7.2 zarfı: sağlıklıyken 200/db:up, diski kritikken 503', async ({ request }) => {
    const oran = await bostaDiskOrani();
    const diskKritik = oran !== null && oran < DISK_KRITIK_ORAN;

    const yanit = await request.get('/api/v1/health');
    const govde = await yanit.json();

    if (diskKritik) {
      /*
       * ARIZA DALI — bu dalın da bir sözleşmesi var ve bugüne kadar hiçbir
       * kapı onu ölçmemişti: izleme 503 gördüğünde gövdenin §7.2 hata zarfı
       * olmasına ve ayrıntı sızdırmamasına güveniyor.
       */
      // Ölçülen dal koşum çıktısına yazılır: "yeşil" gördüğünde hangi dalın
      // sınandığını bilmeyen okuyucu, sağlıklı dalın ölçüldüğünü sanır.
      console.warn(
        `disk boş oranı %${(oran * 100).toFixed(1)} < %${DISK_KRITIK_ORAN * 100} — ` +
          'ARIZA dalı ölçülüyor, sağlıklı dal bu koşumda ÖLÇÜLMEDİ.',
      );

      expect(yanit.status()).toBe(503);
      expect(govde.ok).toBe(false);
      expect(govde.error?.code).toBe('INTERNAL_ERROR');
      expect(govde.data).toBeUndefined();

      return;
    }

    expect(yanit.status(), 'disk yeterli ve DB ayaktayken sağlık ucu 200 dönmeli').toBe(200);

    expect(govde.ok).toBe(true);
    expect(govde.data).toBeDefined();
    expect(govde.error).toBeUndefined();

    // §13.6'nın bildirdiği dört alan. İzleme bunlara bakacak; biri sessizce
    // kaybolursa uyarı kuralları da sessizce anlamsızlaşır.
    expect(govde.data.db).toBe('up');
    expect(typeof govde.data.uptime).toBe('number');
    expect(govde.data.uptime).toBeGreaterThanOrEqual(0);
    expect(['ok', 'low', 'unknown']).toContain(govde.data.disk);
    expect(Number.isNaN(Date.parse(govde.data.timestamp)), 'timestamp ISO 8601 değil').toBe(false);
  });

  /**
   * §8.20 — sağlık ucu bir arıza anında ALTYAPI AYRINTISI sızdırmamalı.
   *
   * Bu kontrol sağlıklı yanıtta da anlamlı: gövdeye bir gün "debug" alanı
   * eklenirse (bağlantı dizesi, host adı, sürüm) burada yakalanır. Uç zaten
   * kimliksiz ve herkese açık — §13.7 gereği öyle olmak zorunda.
   */
  test('gövde altyapı ayrıntısı taşımıyor (§8.20)', async ({ request }) => {
    const metin = await (await request.get('/api/v1/health')).text();

    const sizinti: Array<{ etiket: string; desen: RegExp }> = [
      { etiket: 'bağlantı dizesi', desen: /postgres(ql)?:\/\//i },
      { etiket: 'yığın izi', desen: /\bat\s+\w+\s+\(/ },
      { etiket: 'dosya yolu', desen: /\/(?:home|Users|var|app)\/[\w./-]+/ },
      { etiket: 'ortam değişkeni adı', desen: /DATABASE_URL|AUTH_SECRET|TOTP_ENCRYPTION_KEY/ },
    ];

    const bulunan = sizinti.filter((s) => s.desen.test(metin)).map((s) => s.etiket);

    expect(bulunan, `sağlık gövdesinde: ${bulunan.join(', ')}`).toEqual([]);
  });
});
