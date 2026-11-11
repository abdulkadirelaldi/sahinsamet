'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

import { useGeriTusuylaKapat } from '@/components/panel/geri-tusu';
import { useOdakTuzagi } from '@/components/panel/odak-tuzagi';

/**
 * TAKVİM PENCERESİ (2026-11-10) — hızlı kaydın alt sayfa deseni (`hizli-ekle.tsx`): telefonda
 * alttan çıkan sayfa, masaüstünde ortada pencere. Odak içeride döner, Esc kapatır, kapanınca odak
 * açan öğeye döner (`useOdakTuzagi`). `data-ilk-odak` taşıyan öğe açılışta odağı alır. Android'in
 * geri jesti pencereyi kapatır, takvimden çıkmaz (`useGeriTusuylaKapat`).
 */
export function Pencere({
  baslik,
  kapat,
  children,
}: {
  baslik: string;
  kapat: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useOdakTuzagi(true, ref, kapat);
  useGeriTusuylaKapat(true, kapat);

  // Odak tuzağı pencerenin kendisine odaklandıktan SONRA (aynı bileşende, sırayla).
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-ilk-odak]')?.focus();
    const onceki = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = onceki;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <button
        type="button"
        aria-label="Kapat"
        tabIndex={-1}
        onClick={kapat}
        className="hizli-ortu absolute inset-0 bg-black/40"
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="takvim-pencere-baslik"
        className="hizli-sayfa bg-surface relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl lg:rounded-[1.75rem] lg:pb-5"
      >
        <span
          aria-hidden="true"
          className="bg-line mx-auto mb-4 block h-1.5 w-10 rounded-full lg:hidden"
        />
        <div className="mb-4 flex items-center gap-2">
          <h2 id="takvim-pencere-baslik" className="text-primary min-w-0 flex-1 truncate text-lg">
            {baslik}
          </h2>
          <button
            type="button"
            onClick={kapat}
            aria-label="Kapat"
            className="focus-ring bg-elevated text-muted hover:text-primary flex size-11 shrink-0 items-center justify-center rounded-full"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
