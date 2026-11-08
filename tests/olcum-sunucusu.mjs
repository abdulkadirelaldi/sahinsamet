import { spawn } from 'node:child_process';
import { cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/**
 * ÖLÇÜM SUNUCUSU — Lighthouse ve Playwright bu dosyayı çalıştırır.
 *
 * NEDEN VAR (T-029b): `pnpm start` (`next start`) `output: 'standalone'` ile
 * KARARSIZ. Ölçüldü, tahmin edilmedi:
 *
 *   | Sunucu                          | Gerçek Lighthouse iş yükü        |
 *   | ------------------------------- | -------------------------------- |
 *   | `next start`                    | 4. koşuda CHROME_INTERSTITIAL_ERROR |
 *   | `node .next/standalone/server.js` | 2 tur × 5 koşu = 10/10 temiz    |
 *
 * Next zaten her derlemede uyarıyordu: "`next start` does not work with
 * `output: standalone`. Use `node .next/standalone/server.js` instead."
 * T-004'ten beri not düşülen bu uyarı, Frontend'in ölçüm turunu düşüren şeydi.
 *
 * DİKKAT — `next build` standalone dizinine `static/` ve `public/` KOPYALAMAZ.
 * Eksik olursa sunucu ayağa kalkar ama sayfa STİLSİZ açılır ve Lighthouse
 * anlamsız düşük skorlar üretir; hata da vermez. Kopyalama bu yüzden burada,
 * çağıranın hatırlamasına bırakılmadan yapılıyor.
 */

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STANDALONE = path.join(KOK, '.next', 'standalone');
const SUNUCU = path.join(STANDALONE, 'server.js');

if (!existsSync(SUNUCU)) {
  console.error(
    `Standalone çıktısı yok: ${SUNUCU}\n` +
      'Önce `pnpm build` çalıştırın (next.config.ts → output: "standalone").',
  );
  process.exit(1);
}

/** `next build` bunları taşımıyor; her başlatmada tazeleniyor (idempotent). */
cpSync(path.join(KOK, '.next', 'static'), path.join(STANDALONE, '.next', 'static'), {
  recursive: true,
});

const publicDizin = path.join(KOK, 'public');
if (existsSync(publicDizin)) {
  cpSync(publicDizin, path.join(STANDALONE, 'public'), { recursive: true });
}

/**
 * `HOSTNAME` BİLEREK AYARLANMIYOR — standalone varsayılanı (`0.0.0.0`) kullanılır.
 *
 * ÖLÇÜLDÜ: belirli bir geri döngü adresi verildiğinde Next, ara katmanın göreli
 * yönlendirmesini MUTLAK hâle getirip `http://localhost:PORT/...` yazıyor —
 * istek `127.0.0.1`'e gelmiş olsa bile. Tarayıcı o anda köken değiştiriyor,
 * oturum çerezi gönderilmiyor ve kullanıcı çıkış yapmış görünüyor.
 * `auth.spec.ts` ilk denemede tam bu yüzden düştü.
 *
 *   HOSTNAME=127.0.0.1 → Location: http://localhost:3100/giris?...  (MUTLAK — bozuk)
 *   HOSTNAME=localhost → Location: /giris?...  (göreli, ama yalnız ::1 dinler)
 *   HOSTNAME ayarsız   → Location: /giris?...  (göreli, hem 127.0.0.1 hem localhost)
 *
 * `localhost` da denendi ve yönlendirmeyi düzeltti, ancak yalnızca IPv6 geri
 * döngüsünü (`[::1]`) dinlediği için `127.0.0.1` üzerinden gelen istemciler
 * koptu — ve T-016'nın ölçerek doğruladığı `__Secure-` çerez davranışı
 * `127.0.0.1` kökenine bağlı. Varsayılanı bırakmak ikisini birden korur.
 *
 * Bedeli: sunucu tüm arayüzleri dinler. Kısa ömürlü bir ölçüm sunucusu için
 * kabul edilebilir; zaten Lighthouse yolu `pnpm start`'ı HOSTNAME vermeden
 * çalıştırdığı için bugüne kadar da böyleydi.
 */
const cocuk = spawn(process.execPath, [SUNUCU], {
  cwd: STANDALONE,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: process.env.PORT ?? '3100',
  },
});

// Sinyalleri ilet — LHCI ve Playwright sunucuyu SIGTERM ile kapatıyor.
for (const sinyal of ['SIGINT', 'SIGTERM']) {
  process.on(sinyal, () => cocuk.kill(sinyal));
}

cocuk.on('exit', (kod, sinyal) => {
  process.exit(sinyal ? 1 : (kod ?? 0));
});
