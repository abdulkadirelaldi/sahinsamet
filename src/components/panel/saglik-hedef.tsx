'use client';

import { Pencil, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { saglikHedefiAction } from '@/server/actions/saglik-hedef';
import type { SaglikHedefiDto } from '@/server/services/health-log';

const tr = (s: string) => s.replace('.', ',');

/**
 * HEDEF KİLO KARTI (2026-10-31) — Sağlık'ın üstünde. Başlangıç, hedefin
 * konduğu andaki son ölçüm; çubuk o yolun yüzde kaçının yüründüğünü gösterir.
 */
export function SaglikHedefKarti({ hedef }: { hedef: SaglikHedefiDto | null }) {
  const router = useRouter();
  const [duzenle, setDuzenle] = useState(false);
  const [deger, setDeger] = useState(hedef ? tr(hedef.hedefKg.replace(/\.?0+$/, '')) : '');
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  const kaydet = async () => {
    const kg = deger.trim().replace(',', '.');
    if (!/^\d{2,3}(\.\d{1,2})?$/.test(kg)) return setHata('Hedef geçersiz — örn. 78 ya da 78,5');
    setBekliyor(true);
    setHata(null);
    try {
      const sonuc = await saglikHedefiAction({ hedefKg: kg });
      if (sonuc.ok) {
        setDuzenle(false);
        router.refresh();
      } else setHata(sonuc.error.message);
    } catch {
      setHata('Bağlantı kurulamadı. Yeniden dene.');
    } finally {
      setBekliyor(false);
    }
  };

  return (
    <section aria-labelledby="hedef-baslik" className="aura aura-saglik flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className="cam-kutu flex size-8 items-center justify-center rounded-[0.6rem] text-white">
          <Target className="size-4" aria-hidden="true" />
        </span>
        <h2 id="hedef-baslik" className="text-primary flex-1 text-base font-semibold">
          Hedef kilo
        </h2>
        {hedef && !duzenle && (
          <button
            type="button"
            onClick={() => setDuzenle(true)}
            aria-label="Hedefi düzenle"
            className="focus-ring text-muted hover:text-primary flex size-9 items-center justify-center rounded-full"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {duzenle ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void kaydet();
          }}
        >
          <label className="sr-only" htmlFor="hedef-kg">
            Hedef kilo (kg)
          </label>
          <input
            id="hedef-kg"
            inputMode="decimal"
            value={deger}
            onChange={(e) => setDeger(e.target.value)}
            placeholder="78"
            className="focus-ring rounded-input border-line-strong bg-elevated text-primary tabular h-12 min-w-0 flex-1 border px-4 text-lg"
          />
          <button
            type="submit"
            disabled={bekliyor}
            className="focus-ring rounded-btn bg-gradient-accent h-12 px-5 font-medium text-white disabled:opacity-60"
          >
            Kaydet
          </button>
        </form>
      ) : !hedef ? (
        <button
          type="button"
          onClick={() => setDuzenle(true)}
          className="focus-ring text-accent min-h-10 self-start rounded text-sm font-medium"
        >
          Hedef kilo koy →
        </button>
      ) : (
        hedef && (
          <>
            <p className="text-primary flex items-baseline gap-2">
              <span className="tabular sayi-buyuk text-3xl font-semibold">
                {tr(hedef.hedefKg.replace(/\.?0+$/, ''))} kg
              </span>
              {hedef.kalanKg !== null && (
                <span className="text-muted text-sm">
                  {Number(hedef.kalanKg) === 0
                    ? 'hedefe ulaştın 🎉'
                    : `${tr(hedef.kalanKg)} kg kaldı`}
                </span>
              )}
            </p>
            {hedef.yuzde !== null && (
              <div
                role="progressbar"
                aria-valuenow={hedef.yuzde}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Hedefe ilerleme"
                className="bg-elevated h-2.5 overflow-hidden rounded-full"
              >
                <div
                  className="h-full rounded-full bg-linear-to-r from-rose-300 to-pink-400 transition-[width] duration-700"
                  style={{ width: `${hedef.yuzde}%` }}
                />
              </div>
            )}
            {hedef.baslangicKg && hedef.sonKg && (
              <p className="tabular text-muted text-xs">
                {tr(hedef.baslangicKg)} kg → şimdi {tr(hedef.sonKg)} kg · %{hedef.yuzde ?? 0}
              </p>
            )}
          </>
        )
      )}
      {hata && (
        <p role="alert" className="text-danger text-sm">
          {hata}
        </p>
      )}
    </section>
  );
}
