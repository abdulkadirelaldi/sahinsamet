import type { Metadata } from 'next';

import { SifreFormu } from '@/components/panel/sifre-formu';
import { Topbar } from '@/components/panel/topbar';
import { getTotpStatus } from '@/server/actions/totp';

export const metadata: Metadata = {
  title: 'Şifre',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * `/panel/ayarlar/sifre` — §4.2.
 *
 * 2FA DURUMU SUNUCUDA OKUNUYOR (`getTotpStatus`) ve forma geçiriliyor; doğrulama
 * kodu alanı buna göre çiziliyor. Gerekçe `sifre-formu.tsx`te: alanı her zaman
 * göstermek 2FA kapalıyken doldurulamayan bir alan bırakır, `TOTP_REQUIRED`
 * yanıtında açmak ise formu gönderimden SONRA büyütür. Sunucu zaten biliyor.
 *
 * `getTotpStatus` bir Server Action ama OKUMA ve Server Component'ten
 * çağrılıyor — `/panel/ayarlar/guvenlik` sayfası da aynısını yapıyor, yani bu
 * kalıp yeni değil.
 */
export default async function SifrePage() {
  const { enabled } = await getTotpStatus();

  return (
    <>
      <Topbar title="Şifre" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-3xl flex-col gap-6">
          <SifreFormu ikiAdimliAcik={enabled} />
        </div>
      </main>
    </>
  );
}
