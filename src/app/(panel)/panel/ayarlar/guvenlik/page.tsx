import type { Metadata } from 'next';
import { SessionProvider } from 'next-auth/react';

import { PasskeyYonetimi } from '@/components/auth/passkey-yonetimi';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { TotpSetup } from '@/components/auth/totp-setup';
import { Topbar } from '@/components/panel/topbar';
import {
  confirmTotpSetup,
  getTotpStatus,
  regenerateBackupCodes,
  startTotpSetup,
} from '@/server/actions/totp';
import { auth } from '@/server/auth';
import { passkeyleriListele } from '@/server/auth/passkey';

export const metadata: Metadata = {
  title: 'Güvenlik',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * §4.2 — `/panel/ayarlar` altında güvenlik sekmesi.
 *
 * Sunucu Bileşeni: durumu okur, Server Action referanslarını istemci bileşenine
 * geçirir. `TotpSetup` eylemleri prop olarak alır (T-036/K6).
 *
 * `SessionProvider` BURADA, kök layout'ta DEĞİL: `useSession().update()` yalnızca
 * bu ekranda gerekiyor (kurulum sonrası jetondaki `tfa` alanını tazelemek için).
 * Kökte olsaydı her public sayfa gereksiz yere oturum istemcisini indirir ve
 * `/api/auth/session`'a istek atardı — K1 (LCP) bedeli, karşılığı yok.
 *
 * `getTotpStatus()` bilinçli olarak HATA FIRLATMAZ: oturum yoksa ya da veritabanı
 * düşerse `{ enabled: false }` döner (§8.5, §8.6).
 */
export default async function GuvenlikAyarlariPage() {
  const [session, status] = await Promise.all([auth(), getTotpStatus()]);
  const passkeyler = session?.user?.id ? await passkeyleriListele(session.user.id) : [];

  return (
    <>
      <Topbar title="Güvenlik" />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-2xl flex-col gap-4">
          <PasskeyYonetimi passkeyler={passkeyler} kodGerekli={status.enabled} />

          <SessionProvider session={session}>
            <TotpSetup
              status={status}
              accountLabel={session?.user?.email ?? 'panel hesabı'}
              actions={{ startTotpSetup, confirmTotpSetup, regenerateBackupCodes }}
            />
          </SessionProvider>

          {/*
            Çıkış, kartın DIŞINDA ve altında. §8.1 kapısı 2FA kurmamış kullanıcıyı
            bu ekranda tutuyor; çıkış yolu olmadan ekran hapse dönüşürdü
            (Güvenlik T3). Vurgusu bilinçli olarak düşük.
          */}
          <SignOutButton />
        </div>
      </main>
    </>
  );
}
