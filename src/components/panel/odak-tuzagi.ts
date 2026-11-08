'use client';

import { useEffect, type RefObject } from 'react';

const ODAKLANABILIR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal pencere odağı (2026-11-02): açılınca odak pencereye girer, Tab içeride döner, Esc kapatır,
 * kapanınca odak açan düğmeye döner. Yoksa klavye ve ekran okuyucu arkadaki sayfada geziyordu.
 */
export function useOdakTuzagi(
  acik: boolean,
  pencere: RefObject<HTMLElement | null>,
  kapat: () => void,
): void {
  useEffect(() => {
    if (!acik) return;
    const onceki = document.activeElement as HTMLElement | null;
    pencere.current?.focus();

    const tus = (e: KeyboardEvent) => {
      const kok = pencere.current;
      if (!kok) return;
      if (e.key === 'Escape') {
        kapat();
        return;
      }
      if (e.key !== 'Tab') return;
      const ogeler = [...kok.querySelectorAll<HTMLElement>(ODAKLANABILIR)];
      const ilk = ogeler[0];
      const son = ogeler[ogeler.length - 1];
      if (!ilk || !son) {
        e.preventDefault();
        return;
      }
      const aktif = document.activeElement;
      // İçerik değişip odak dışarı düştüyse de pencereye döner.
      if (!kok.contains(aktif) || (e.shiftKey && (aktif === ilk || aktif === kok))) {
        e.preventDefault();
        (e.shiftKey ? son : ilk).focus();
      } else if (!e.shiftKey && aktif === son) {
        e.preventDefault();
        ilk.focus();
      }
    };
    document.addEventListener('keydown', tus);
    return () => {
      document.removeEventListener('keydown', tus);
      onceki?.focus?.();
    };
    // `kapat` her çizimde yenilenir; bağımlılıkta yok: yalnızca açılıp kapanırken kurulur.
  }, [acik]);
}
