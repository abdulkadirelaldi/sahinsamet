/**
 * Sitenin genel adresi — §12 (adres koda GÖMÜLMEZ).
 *
 * SEO çıktıları (sitemap, robots, RSS, OG) MUTLAK URL ister; göreli adres
 * kabul etmezler. Bu yüzden adres tek bir yerden, ortam değişkeninden okunur:
 * yerelde `http://localhost:3000`, üretimde gerçek alan adı.
 *
 * Bu modül SAFTIR (`next/*` içe aktarmaz) — kapı testinin saf tarafında kalır.
 */

const ENV_KEY = 'NEXT_PUBLIC_SITE_URL';

/**
 * Okunan ortam kaynağı. `NodeJS.ProcessEnv` yerine sade bir kayıt tipi:
 * testin tek anahtarlı bir nesne verebilmesi için (aksi hâlde her çağrı
 * `as NodeJS.ProcessEnv` cast'i gerektiriyordu).
 */
export type EnvSource = Record<string, string | undefined>;

/**
 * Sondaki `/` kırpılır.
 *
 * Aksi hâlde `${base}/blog` birleştirmesi `https://site.com//blog` üretir:
 * teknik olarak geçerli ama arama motoru için AYRI bir URL — yinelenen içerik
 * sinyali. Kaynak `.env`'de elle yazıldığı için sondaki eğik çizgi çok olası.
 */
function normalize(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

/**
 * Yapılandırılmış site adresi.
 *
 * DEĞER YOKSA FIRLATIR. Sessiz bir varsayılana (`http://localhost:3000`)
 * düşmek daha kötü: üretimde fark edilmez ve sitemap ile RSS tüm dünyaya
 * `localhost` adresleri yayınlar — arama motoru için sessiz ve pahalı bir hata.
 * Erken ve gürültülü başarısızlık tercih edildi.
 */
export function getSiteUrl(env: EnvSource = process.env): string {
  const raw = env[ENV_KEY];
  if (raw === undefined || raw.trim() === '') {
    throw new Error(
      `${ENV_KEY} tanımlı değil. Sitemap, robots.txt, RSS ve OG görseli mutlak ` +
        `adres gerektirir; .env dosyasına ekleyin (örn. https://sahinsamet.com).`,
    );
  }

  const normalized = normalize(raw);

  /**
   * Şema doğrulaması: `sahinsamet.com` gibi şemasız bir değer `new URL`
   * ile çözülemez ve `${base}/blog` birleştirmesi geçersiz bir bağlantı üretir.
   */
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${ENV_KEY} geçerli bir URL değil: "${raw}". Şema (https://) dahil olmalı.`);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`${ENV_KEY} yalnızca http/https olabilir: "${raw}".`);
  }

  return normalized;
}

/** Site adresine göre mutlak URL üretir. `path` `/` ile başlamalıdır. */
export function absoluteUrl(path: string, env: EnvSource = process.env): string {
  const base = getSiteUrl(env);
  return path === '/' ? `${base}/` : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
