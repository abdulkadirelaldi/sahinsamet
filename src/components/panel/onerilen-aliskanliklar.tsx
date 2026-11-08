'use client';

import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { buttonClasses } from '@/components/ui/button';
import { createSuggestedHabitsAction } from '@/server/actions/habit';

/** Boş panelde sahibinin 8 alışkanlığını tek dokunuşla ekler (habit-gun.ts listesi). */
export function OnerilenAliskanliklar() {
  const router = useRouter();
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={bekliyor}
        onClick={() =>
          basla(async () => {
            try {
              const sonuc = await createSuggestedHabitsAction();
              if (!sonuc.ok) return setHata(sonuc.error.message);
              router.refresh();
            } catch {
              setHata('Bağlantı kurulamadı. Yeniden dene.');
            }
          })
        }
        className={buttonClasses({ size: 'lg' })}
      >
        <Sparkles className="size-4" aria-hidden="true" />
        {bekliyor ? 'Ekleniyor…' : 'Listemi ekle'}
      </button>
      <p className="text-muted text-center text-xs">
        Diş fırçala · yüze buz · spor · su 3,5 L · kod · kitap · İngilizce · ders
      </p>
      {hata && (
        <p role="alert" className="text-danger text-xs">
          {hata}
        </p>
      )}
    </div>
  );
}
