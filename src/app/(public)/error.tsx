'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

import { buttonClasses } from '@/components/ui/button';

/**
 * Public bölümün hata sınırı.
 *
 * NEDEN VAR: `getProfile` profil kaydı yoksa BİLEREK fırlatır (ADR-017 —
 * tekil kayıt, yokluğu boş durum değil kurulum hatası). Sınır olmasaydı
 * ziyaretçi Next'in çıplak hata ekranını görürdü.
 *
 * HATA METNİ EKRANA YAZILMAZ (§8): mesaj veritabanı/dosya yolu sızdırabilir.
 * `digest` sunucu günlüğündeki kayda karşılık gelen opak kimliktir; ziyaretçi
 * onu bize iletince günlükte tam kaydı buluruz. Ayrıntı konsola düşer, sayfaya
 * değil.
 */
export default function PublicHata({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="icerik"
      className="profil-zemin flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center"
    >
      <h1 className="font-display text-primary text-2xl font-bold sm:text-3xl">
        Bir şeyler ters gitti
      </h1>

      <p className="text-body max-w-md">Sayfa şu an yüklenemedi. Biraz sonra tekrar dene.</p>

      {/* Hata METNİ yazılmıyor (yukarıdaki §8 notu); yalnızca opak `digest`. */}
      {error.digest && (
        <p className="text-muted text-sm">
          Hata kodu: <span className="text-primary font-mono">{error.digest}</span>
        </p>
      )}

      <button
        type="button"
        onClick={reset}
        className={buttonClasses({ variant: 'primary', size: 'md' })}
      >
        <RefreshCw className="size-4" aria-hidden="true" />
        Tekrar dene
      </button>
    </main>
  );
}
