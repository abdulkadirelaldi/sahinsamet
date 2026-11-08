import { register } from 'node:module';

/**
 * `node --import ./scripts/yedek-register.mjs scripts/<betik>.ts` ile yüklenir.
 *
 * ⚠️ ÇÖZÜMLEYİCİ MANTIĞI BURADA KOPYALANMADI — `prisma/seed-resolver.mjs`
 * KAYIT EDİLİYOR. O dosya tam bu iki işi yapıyor: `@/` takma adını `src/`e
 * bağlamak ve uzantısız göreli içe aktarmayı dosyaya çözmek.
 *
 * Depoda o mantığın İKİ kopyası var (`prisma/seed-resolver.mjs` ve
 * `tests/e2e/_helpers/db-resolver.mjs`) ve ikincisi, birincisi "yalnızca seed
 * için" diye işaretli olduğu için yazılmış. ÜÇÜNCÜ bir kopya yazmak, T-101'den
 * beri kapatmaya çalıştığım çiftlenme sınıfının yeni bir örneği olurdu —
 * `tests/unit/saf-yardimci-tek-tanim.test.ts` tam bunu ölçüyor.
 *
 * Bu yüzden kopya yok, kayıt var. Bağımlılığın bedeli: `prisma/seed-resolver.mjs`
 * başlığı artık "yalnızca seed" demiyor — bayat bir işaret ve düzeltmesi
 * Backend'in (tek satır).
 */
register('../prisma/seed-resolver.mjs', import.meta.url);
