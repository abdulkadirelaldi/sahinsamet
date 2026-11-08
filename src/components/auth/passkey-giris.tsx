'use client';

import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser';
import { Loader2, ScanFace } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { resolveAuthErrorMessage } from '@/components/auth/auth-errors';
import { passkeyGirisSecenekleriAction } from '@/server/actions/passkey';

/**
 * "FACE ID İLE GİRİŞ" (2026-10-30). Cihaz bu siteye kayıtlı passkey'i kendisi
 * önerir; e-posta sorulmaz. Tarayıcı WebAuthn desteklemiyorsa düğme hiç
 * görünmez — şifreli giriş her zaman yerinde.
 */
export function PasskeyGiris({
  callbackUrl,
  hata,
}: {
  callbackUrl: string;
  hata: (mesaj: string | null) => void;
}) {
  const router = useRouter();
  const [destek, setDestek] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);

  useEffect(() => {
    setDestek(browserSupportsWebAuthn());
  }, []);

  if (!destek) return null;

  const gir = async () => {
    hata(null);
    setBekliyor(true);
    try {
      const secenek = await passkeyGirisSecenekleriAction();
      if (!secenek.ok) {
        hata(secenek.error.message);
        return;
      }
      const yanit = await startAuthentication({ optionsJSON: secenek.data });
      const sonuc = await signIn('passkey', { yanit: JSON.stringify(yanit), redirect: false });
      if (sonuc && !sonuc.error) {
        router.replace(callbackUrl);
        router.refresh();
        return;
      }
      hata(resolveAuthErrorMessage(sonuc?.code ?? 'PASSKEY_FAILED'));
    } catch (error) {
      // Kullanıcı Face ID penceresini kapattı — hata değil, sessiz geç.
      if (error instanceof Error && error.name === 'NotAllowedError') return;
      hata(resolveAuthErrorMessage('PASSKEY_FAILED'));
    } finally {
      setBekliyor(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => void gir()}
        disabled={bekliyor}
        className="focus-ring rounded-btn bg-primary text-canvas flex min-h-12 w-full items-center justify-center gap-2 px-4 font-medium transition-opacity active:opacity-80 disabled:opacity-60"
      >
        {bekliyor ? (
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <ScanFace className="size-5" aria-hidden="true" />
        )}
        Face ID ile giriş
      </button>
      <div className="text-muted flex items-center gap-3 text-xs" aria-hidden="true">
        <span className="bg-line h-px flex-1" />
        ya da şifreyle
        <span className="bg-line h-px flex-1" />
      </div>
    </div>
  );
}
