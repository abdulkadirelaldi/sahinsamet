'use client';

import { Download } from 'lucide-react';

import { useKurulumIstemi } from '@/components/panel/kurulum-istemi';

/**
 * "Uygulamayı yükle" kartı (2026-11-11). Yalnızca Chrome yükleme olayını attıysa ve panel zaten
 * yüklü uygulamada açık değilse görünür; yüklenince (`appinstalled`) kaybolur. Tarayıcı
 * uyarı/onay penceresi yok — onayı Chrome'un kendi yükleme sayfası ister.
 */
export function UygulamaYukle() {
  const { yukle } = useKurulumIstemi();
  if (!yukle) return null;
  return (
    <section className="rounded-card border-line bg-surface flex items-center gap-3 border p-4">
      <span className="bg-accent/12 text-accent flex size-10 shrink-0 items-center justify-center rounded-xl">
        <Download className="size-5" aria-hidden="true" />
      </span>
      <p className="text-muted min-w-0 flex-1 text-sm">
        Paneli uygulama olarak yükle: ana ekrandan tam ekran açılır, kısayolları olur.
      </p>
      <button
        type="button"
        onClick={() => void yukle()}
        className="focus-ring rounded-btn bg-elevated text-primary min-h-11 shrink-0 px-4 text-sm font-medium"
      >
        Uygulamayı yükle
      </button>
    </section>
  );
}
