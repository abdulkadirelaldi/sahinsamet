import type { Metadata } from 'next';

import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Giriş',
  robots: { index: false, follow: false, nocache: true },
};

/** Oturum açıldığında varsayılan hedef. */
const DEFAULT_CALLBACK_URL = '/panel';

/** Yalnızca origin karşılaştırması için kullanılır; ağa çıkılmaz. */
const SENTINEL_ORIGIN = 'http://gecersiz.yerel';

/**
 * `?callbackUrl=` değerini güvenli hâle getirir.
 *
 * Bu parametre saldırganın kontrolündedir. Doğrulanmadan yönlendirilirse klasik
 * bir AÇIK YÖNLENDİRME açığı olur: kullanıcı bizim alan adımızdaki giriş
 * ekranından çıkıp başka bir siteye düşer.
 *
 * Değer, elde bir sentinel origin ile ÇÖZÜMLENİR ve origin'in değişmediği
 * doğrulanır. Dize karşılaştırmasıyla ("`/` ile başlasın, `//` ile başlamasın")
 * yetinilmez — o kontrol `/\evil.com` ile atlatılıyor: WHATWG URL ayrıştırıcısı
 * ters bölüyü eğik çizgi sayar, tarayıcı bunu protokol-göreli adres gibi izler.
 * Bu atlatma T-017'de Playwright ile bizzat gözlendi (rapor / KARAR K6).
 */
export function resolveCallbackUrl(raw: string | string[] | undefined): string {
  if (typeof raw !== 'string' || raw.length === 0 || !raw.startsWith('/')) {
    return DEFAULT_CALLBACK_URL;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw, SENTINEL_ORIGIN);
  } catch {
    return DEFAULT_CALLBACK_URL;
  }

  if (parsed.origin !== SENTINEL_ORIGIN) {
    return DEFAULT_CALLBACK_URL;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export default async function GirisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialErrorCode = typeof params.code === 'string' ? params.code : undefined;

  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl">Panele giriş</h1>
          <p className="text-muted text-sm">
            Bu alan yalnızca site sahibine açıktır. Giriş denemeleri kaydedilir.
          </p>
        </div>

        <LoginForm
          callbackUrl={resolveCallbackUrl(params.callbackUrl)}
          initialErrorCode={initialErrorCode}
        />
      </CardContent>
    </Card>
  );
}
