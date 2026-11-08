'use client';

import { Check, Copy, KeyRound, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  saglikAnahtariSilAction,
  saglikAnahtariUretAction,
} from '@/server/actions/saglik-baglantisi';

const ZAMAN = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Istanbul',
});

/** Anahtar üret / iptal et. Düz anahtar YALNIZCA üretildiği anda ekranda durur. */
export function SaglikBaglanti({
  baglanti,
}: {
  baglanti: { olusturma: string; sonKullanim: string | null } | null;
}) {
  const router = useRouter();
  const [anahtar, setAnahtar] = useState<string | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [emin, setEmin] = useState(false);

  const uret = async () => {
    if (baglanti && !emin) return setEmin(true);
    setEmin(false);
    setHata(null);
    const sonuc = await saglikAnahtariUretAction();
    if (sonuc.ok) {
      setAnahtar(sonuc.data.anahtar);
      router.refresh();
    } else setHata(sonuc.error.message);
  };

  const sil = async () => {
    setHata(null);
    const sonuc = await saglikAnahtariSilAction();
    if (sonuc.ok) {
      setAnahtar(null);
      router.refresh();
    } else setHata(sonuc.error.message);
  };

  const kopyala = async () => {
    if (!anahtar) return;
    await navigator.clipboard.writeText(anahtar);
    setKopyalandi(true);
  };

  return (
    <section className="rounded-card border-line bg-surface flex flex-col gap-4 border p-5">
      <div className="flex items-start gap-3">
        <span className="bg-accent/12 text-accent flex size-10 shrink-0 items-center justify-center rounded-xl">
          <KeyRound className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-primary text-base">
            {baglanti ? 'Bağlantı açık' : 'Bağlantı kapalı'}
          </h2>
          <p className="text-muted text-sm">
            {baglanti
              ? baglanti.sonKullanim
                ? `Son veri: ${ZAMAN.format(new Date(baglanti.sonKullanim))}`
                : 'Henüz veri gelmedi.'
              : 'Anahtar yalnızca ölçü yazabilir; hiçbir veriyi okuyamaz, panele giremez.'}
          </p>
        </div>
      </div>

      {anahtar && (
        <div className="bg-elevated flex flex-col gap-2 rounded-xl p-3">
          <p className="text-warning text-xs font-medium">
            Bu anahtar yalnızca şimdi görünür. Kopyalayıp Kısayol’a yapıştır.
          </p>
          <code className="text-primary text-xs break-all select-all">{anahtar}</code>
          <button
            type="button"
            onClick={() => void kopyala()}
            className="focus-ring rounded-btn bg-gradient-accent flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-white"
          >
            {kopyalandi ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {kopyalandi ? 'Kopyalandı' : 'Anahtarı kopyala'}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void uret()}
          className="focus-ring rounded-btn border-line text-primary min-h-11 flex-1 border px-4 text-sm font-medium"
        >
          {emin
            ? 'Eski anahtar iptal olur — emin misin?'
            : baglanti
              ? 'Yeni anahtar üret'
              : 'Anahtar üret'}
        </button>
        {baglanti && (
          <button
            type="button"
            onClick={() => void sil()}
            className="focus-ring text-danger flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Bağlantıyı kapat
          </button>
        )}
      </div>

      {hata && (
        <p role="alert" className="text-danger text-sm">
          {hata}
        </p>
      )}
    </section>
  );
}
