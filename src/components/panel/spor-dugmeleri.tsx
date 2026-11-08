'use client';

import { Download, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { buttonClasses } from '@/components/ui/button';
import {
  createSuggestedProgramAction,
  startSessionAction,
} from '@/server/actions/antrenman-oturumu';
import { cn } from '@/lib/utils/cn';

/** Program gününden oturum başlatır; açık oturum varsa ona gider. */
export function BaslatDugmesi({ dayId, vurgulu }: { dayId: string; vurgulu?: boolean }) {
  const router = useRouter();
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={bekliyor}
        onClick={() =>
          basla(async () => {
            setHata(null);
            try {
              const sonuc = await startSessionAction({ dayId });
              if (!sonuc.ok) return setHata(sonuc.error.message);
              router.push(`/panel/spor/oturum/${sonuc.data.id}`);
            } catch {
              setHata('Bağlantı kurulamadı. Yeniden dene.');
            }
          })
        }
        className={cn(
          buttonClasses({ variant: vurgulu ? 'primary' : 'secondary', size: 'sm' }),
          'h-10 rounded-full px-4',
        )}
      >
        <Play className="size-4" aria-hidden="true" />
        {bekliyor ? 'Açılıyor…' : 'Başlat'}
      </button>
      {hata && (
        <p role="alert" className="text-danger text-xs">
          {hata}
        </p>
      )}
    </div>
  );
}

/** Program yoksa sahibinin PDF programını tek dokunuşla yükler. */
export function ProgramYukleDugmesi() {
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
              const sonuc = await createSuggestedProgramAction();
              if (!sonuc.ok) return setHata(sonuc.error.message);
              router.refresh();
            } catch {
              setHata('Bağlantı kurulamadı. Yeniden dene.');
            }
          })
        }
        className={buttonClasses({ size: 'lg' })}
      >
        <Download className="size-4" aria-hidden="true" />
        {bekliyor ? 'Yükleniyor…' : 'Programımı yükle'}
      </button>
      {hata && (
        <p role="alert" className="text-danger text-xs">
          {hata}
        </p>
      )}
    </div>
  );
}
