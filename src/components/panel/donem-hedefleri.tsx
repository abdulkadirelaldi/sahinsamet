'use client';

import { Check, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition, type FormEvent } from 'react';

import { Input } from '@/components/ui/input';
import {
  createGoalAction,
  deleteGoalAction,
  hedefiTasiAction,
  updateGoalAction,
} from '@/server/actions/goal';
import type { GoalDto } from '@/server/services/goal';
import type { GoalPeriod } from '@/types';
import { cn } from '@/lib/utils/cn';

/**
 * DÖNEMLİ HEDEFLER (2026-10-29) — haftalık / aylık / yıllık liste.
 *
 * Telefonda iki şey hızlı olmalı: hedef EKLEMEK (tek satır yaz, ekle) ve
 * TAMAMLAMAK (tek dokunuş). Ayrıntılı düzenleme (açıklama, kategori, ilerleme)
 * hedefin kendi sayfasında.
 */
const BAGLANTI_HATASI = 'Bağlantı kurulamadı. Yeniden dene.';

export function DonemHedefleri({
  hedefler,
  period,
  periodKey,
  gecmisDonem = false,
}: {
  hedefler: GoalDto[];
  period: GoalPeriod;
  periodKey: string;
  gecmisDonem?: boolean;
}) {
  const router = useRouter();
  const [baslik, setBaslik] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  const ekle = (olay: FormEvent) => {
    olay.preventDefault();
    const temiz = baslik.trim();
    if (!temiz) return;
    setHata(null);
    basla(async () => {
      try {
        const sonuc = await createGoalAction({ title: temiz, period, periodKey });
        if (!sonuc.ok) return setHata(sonuc.error.message);
        setBaslik('');
        router.refresh();
      } catch {
        setHata(BAGLANTI_HATASI);
      }
    });
  };

  const tamamlanan = hedefler.filter((h) => h.status === 'ACHIEVED').length;

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={ekle} className="flex gap-2">
        <Input
          value={baslik}
          onChange={(o) => setBaslik(o.target.value)}
          placeholder="Yeni hedef yaz…"
          aria-label="Yeni hedef"
          maxLength={200}
          enterKeyHint="done"
        />
        <button
          type="submit"
          disabled={bekliyor || !baslik.trim()}
          aria-label="Hedefi ekle"
          className="focus-ring bg-accent hover:bg-accent-hover rounded-input flex size-11 shrink-0 items-center justify-center text-white transition-colors disabled:opacity-50"
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>
      </form>
      {hata && (
        <p role="alert" className="text-danger text-xs">
          {hata}
        </p>
      )}

      {hedefler.length === 0 ? (
        <p className="text-muted rounded-card border-line bg-surface border p-5 text-center text-sm">
          Bu dönem için hedef yok — yukarıdan ekleyebilirsin.
        </p>
      ) : (
        <>
          <p className="tabular text-muted text-sm">
            {tamamlanan} / {hedefler.length} tamamlandı
          </p>
          <ul className="flex flex-col gap-2">
            {hedefler.map((h) => (
              <HedefSatiri key={h.id} hedef={h} tasinabilir={gecmisDonem} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function HedefSatiri({ hedef, tasinabilir }: { hedef: GoalDto; tasinabilir: boolean }) {
  const router = useRouter();
  const [tamam, setTamam] = useState(hedef.status === 'ACHIEVED');
  const [silOnay, setSilOnay] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  const degistir = () => {
    const yeni = !tamam;
    setTamam(yeni);
    setHata(null);
    basla(async () => {
      try {
        const sonuc = await updateGoalAction(
          yeni
            ? { id: hedef.id, status: 'ACHIEVED', progress: 100 }
            : { id: hedef.id, status: 'ACTIVE', progress: 0 },
        );
        if (!sonuc.ok) {
          setTamam(!yeni);
          return setHata(sonuc.error.message);
        }
        router.refresh();
      } catch {
        setTamam(!yeni);
        setHata(BAGLANTI_HATASI);
      }
    });
  };

  // iOS düğmeye odak vermeyebilir: onay yalnızca `onBlur` ile sönmesin.
  useEffect(() => {
    if (!silOnay) return;
    const t = setTimeout(() => setSilOnay(false), 5000);
    return () => clearTimeout(t);
  }, [silOnay]);

  const tasi = () => {
    setHata(null);
    basla(async () => {
      try {
        const sonuc = await hedefiTasiAction({ id: hedef.id });
        if (!sonuc.ok) return setHata(sonuc.error.message);
        router.refresh();
      } catch {
        setHata(BAGLANTI_HATASI);
      }
    });
  };

  /* İki dokunuş: ilki silmeyi "kurar" (kırmızı), ikincisi siler — yanlış dokunuşa karşı. */
  const sil = () => {
    if (!silOnay) {
      setSilOnay(true);
      return;
    }
    basla(async () => {
      try {
        const sonuc = await deleteGoalAction({ id: hedef.id });
        if (!sonuc.ok) return setHata(sonuc.error.message);
        router.refresh();
      } catch {
        setHata(BAGLANTI_HATASI);
      }
    });
  };

  return (
    <li
      className={cn(
        'rounded-card flex items-center gap-3 border p-3 transition-colors',
        tamam ? 'border-success/40 bg-success/8' : 'border-line bg-surface',
      )}
    >
      <button
        type="button"
        onClick={degistir}
        disabled={bekliyor}
        aria-pressed={tamam}
        aria-label={`${hedef.title}: ${tamam ? 'tamamlanmadı olarak işaretle' : 'tamamlandı'}`}
        className={cn(
          'focus-ring flex size-11 shrink-0 items-center justify-center rounded-full border transition-[transform,background-color] active:scale-90',
          tamam ? 'border-success bg-success text-white' : 'border-line bg-canvas text-muted',
        )}
      >
        <Check className="size-5" aria-hidden="true" />
      </button>

      <Link
        href={`/panel/hayat/hedefler/${hedef.id}`}
        className={cn(
          'focus-ring rounded-btn min-w-0 flex-1 truncate font-medium',
          tamam ? 'text-muted line-through' : 'text-primary',
        )}
      >
        {hedef.title}
      </Link>

      {tasinabilir && !tamam && (
        <button
          type="button"
          onClick={tasi}
          disabled={bekliyor}
          aria-label={`${hedef.title}: bu döneme taşı`}
          className="focus-ring text-accent min-h-11 shrink-0 rounded-full px-2 text-xs font-medium"
        >
          Bu döneme taşı
        </button>
      )}

      <button
        type="button"
        onClick={sil}
        disabled={bekliyor}
        onBlur={() => setSilOnay(false)}
        aria-label={silOnay ? `${hedef.title}: silmek için tekrar dokun` : `${hedef.title}: sil`}
        className={cn(
          'focus-ring flex size-11 shrink-0 items-center justify-center rounded-full transition-colors',
          silOnay ? 'bg-danger text-white' : 'text-muted hover:text-danger',
        )}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>

      {hata && (
        <p role="alert" className="text-danger basis-full text-xs">
          {hata}
        </p>
      )}
    </li>
  );
}
