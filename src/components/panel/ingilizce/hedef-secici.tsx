'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { cn } from '@/lib/utils/cn';
import { ingilizceHedefAction } from '@/server/actions/ingilizce';

const SECENEKLER = [
  { xp: 10, ad: 'Rahat' },
  { xp: 20, ad: 'Normal' },
  { xp: 30, ad: 'Ciddi' },
  { xp: 50, ad: 'Yoğun' },
] as const;

/** Günlük XP hedefi (2026-11-06). Bir ders ~10–15 XP. */
export function HedefSecici({ hedef }: { hedef: number }) {
  const router = useRouter();
  const [secili, setSecili] = useState(hedef);
  const [hata, setHata] = useState<string | null>(null);

  const sec = async (xp: number) => {
    const onceki = secili;
    setSecili(xp);
    setHata(null);
    try {
      const sonuc = await ingilizceHedefAction({ hedef: xp });
      if (!sonuc.ok) {
        setSecili(onceki);
        setHata(sonuc.error.message);
      } else router.refresh();
    } catch {
      setSecili(onceki);
      setHata('Bağlantı kurulamadı.');
    }
  };

  return (
    <section className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4">
      <h2 className="text-primary text-sm font-semibold">Günlük hedef</h2>
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Günlük XP hedefi">
        {SECENEKLER.map((s) => (
          <button
            key={s.xp}
            type="button"
            role="radio"
            aria-checked={secili === s.xp}
            onClick={() => void sec(s.xp)}
            className={cn(
              'focus-ring flex flex-col items-center rounded-2xl border-2 px-2 py-2 transition-colors',
              secili === s.xp ? 'border-accent bg-accent/10' : 'border-line',
            )}
          >
            <span className="text-primary text-sm font-semibold">{s.ad}</span>
            <span className="text-muted tabular text-xs">{s.xp} XP</span>
          </button>
        ))}
      </div>
      {hata && <p className="text-danger text-xs">{hata}</p>}
    </section>
  );
}
