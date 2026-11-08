'use client';

import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { Button, buttonClasses } from '@/components/ui/button';
import { istemciHatasiAction } from '@/server/actions/hata-kaydi';

/**
 * Panel hata sınırı — public taraftaki `(public)/error.tsx`'in panel karşılığı.
 *
 * AYRI DOSYA ŞART: hata sınırı en yakın `error.tsx`'i bulur ve public olan
 * `(public)` grubunun içinde. Panelde bir sunucu bileşeni fırlatırsa oraya
 * DÜŞMEZ; sınır olmadan Next'in çıplak hata ekranı çıkardı.
 *
 * METİN SIZDIRMAZ (§8.20): mesaj ekrana yazılmaz, sorgu ya da dosya yolu
 * içerebilir. `digest` sunucu günlüğündeki kaydın opak kimliği — panelde
 * kullanıcı zaten site sahibi, o kimlikle günlükte kaydı bulabilir.
 *
 * ÇIKIŞ YOLU İKİ TANE: tekrar dene (geçici hataysa yeter) ve panele dön
 * (bozuk bir alt sayfada sıkışmasın).
 */
export default function PanelHata({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // Hata kaydına bildir (2026-10-31) — sahibi Ayarlar → Hatalar'da görür.
    // Bildirim başarısız olursa sessiz: hata ekranı ikinci bir hata üretmesin.
    void istemciHatasiAction({
      ad: error.name,
      mesaj: error.message,
      yol: window.location.pathname,
      ...(error.digest ? { digest: error.digest } : {}),
    }).catch(() => undefined);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-start gap-4 p-6 lg:p-10">
      <p className="tabular text-accent-soft text-xs tracking-wider uppercase">Hata</p>

      <h1 className="text-2xl md:text-3xl">Bu ekran yüklenemedi</h1>

      <p className="text-muted max-w-xl text-sm">
        Beklenmedik bir şey oldu ve veri getirilemedi. Tekrar denemek çoğu zaman yetiyor; devam
        ederse sunucu günlüğünde aşağıdaki kodu ara.
      </p>

      {error.digest && (
        <p className="text-muted text-sm">
          Hata kodu: <span className="tabular text-body">{error.digest}</span>
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Tekrar dene
        </Button>

        <Link href="/panel" className={buttonClasses({ variant: 'secondary' })}>
          Panele dön
        </Link>
      </div>
    </div>
  );
}
