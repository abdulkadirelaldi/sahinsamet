try {
  process.loadEnvFile('.env');
} catch {
  // CI'da .env yok; adres ortamdan gelir.
}

/** Yanlışlıkla canlı veritabanında koşmasın: yalnızca bu makinedeki veritabanı kabul edilir. */
const adres = process.env.DATABASE_URL ?? '';
const makine = /@(localhost|127\.0\.0\.1)(:\d+)?\//;
if (!makine.test(adres)) {
  throw new Error('Entegrasyon testleri yalnızca localhost veritabanında çalışır.');
}
