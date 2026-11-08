'use client';

import { useEffect, useState, type CSSProperties } from 'react';

const RENKLER = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#0ea5e9', '#f43f5e', '#a3e635'];

/** Bitiş konfetisi: 40 parça, sabit tohumla dağılır (her açılışta aynı, hidrasyon güvenli). */
export function Konfeti() {
  const parcalar = Array.from({ length: 40 }, (_, i) => {
    const t = (i * 37) % 100;
    return {
      sol: `${(i * 53) % 100}%`,
      x: `${((i * 29) % 40) - 20}vw`,
      r: `${((i * 71) % 720) - 360}deg`,
      d: `${2.2 + (t % 18) / 10}s`,
      gecikme: `${(i % 10) * 0.07}s`,
      renk: RENKLER[i % RENKLER.length],
    };
  });
  return (
    <div aria-hidden="true">
      {parcalar.map((p, i) => (
        <span
          key={i}
          className="ing-konfeti"
          style={
            {
              left: p.sol,
              background: p.renk,
              animationDelay: p.gecikme,
              '--x': p.x,
              '--r': p.r,
              '--d': p.d,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Sayı sıfırdan hedefe ~0,8 sn'de sayar; "hareketi azalt" açıksa doğrudan hedef. */
export function Sayac({ hedef, onEk = '' }: { hedef: number; onEk?: string }) {
  const [deger, setDeger] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDeger(hedef);
      return;
    }
    const bas = performance.now();
    let kare = 0;
    const adim = (simdi: number) => {
      const t = Math.min(1, (simdi - bas) / 800);
      setDeger(Math.round(hedef * (1 - (1 - t) ** 3)));
      if (t < 1) kare = requestAnimationFrame(adim);
    };
    kare = requestAnimationFrame(adim);
    return () => cancelAnimationFrame(kare);
  }, [hedef]);
  return (
    <>
      {onEk}
      {deger}
    </>
  );
}
