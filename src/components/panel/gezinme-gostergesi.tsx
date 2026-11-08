'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

/** Yeni sayfa bu sürede gelmediyse çizgi kaldırılır: sonsuza kadar akmasın. */
const EN_UZUN_MS = 15_000;

function Cizgi() {
  const yol = usePathname();
  const arama = useSearchParams().toString();
  const [bekliyor, setBekliyor] = useState(false);

  useEffect(() => {
    setBekliyor(false);
  }, [yol, arama]);

  useEffect(() => {
    if (!bekliyor) return;
    const zaman = window.setTimeout(() => setBekliyor(false), EN_UZUN_MS);
    return () => window.clearTimeout(zaman);
  }, [bekliyor]);

  useEffect(() => {
    const tiklandi = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || !a.href || a.target === '_blank' || a.hasAttribute('download')) return;
      const hedef = new URL(a.href);
      if (hedef.origin !== location.origin || !hedef.pathname.startsWith('/panel')) return;
      if (hedef.pathname === location.pathname && hedef.search === location.search) return;
      setBekliyor(true);
    };
    document.addEventListener('click', tiklandi);
    return () => document.removeEventListener('click', tiklandi);
  }, []);

  return bekliyor ? <span aria-hidden="true" className="gezinme-cizgisi" /> : null;
}

/**
 * ANINDA TEPKİ (2026-11-01). Sekmelerdeki ilerleme çizgisi panelin bütün iç
 * bağlantılarına: dokunuşla başlar, yeni adres gelince biter. `loading.tsx`
 * kullanılmıyor, gerekçesi `alt-sekmeler.tsx`te.
 */
export function GezinmeGostergesi() {
  return (
    <Suspense fallback={null}>
      <Cizgi />
    </Suspense>
  );
}
