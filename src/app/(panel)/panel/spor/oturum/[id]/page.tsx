import { Flame, Timer, Weight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { OturumEkrani } from '@/components/panel/oturum-ekrani';
import { Topbar } from '@/components/panel/topbar';
import { buttonClasses } from '@/components/ui/button';
import { cuidSchema } from '@/lib/schemas/common';
import { fetchSession, type OturumDto } from '@/server/services/antrenman-oturumu';
import { fetchExercises } from '@/server/services/exercise';

export const metadata: Metadata = {
  title: 'Antrenman',
  robots: { index: false, follow: false, nocache: true },
};

/**
 * CANLI ANTRENMAN (2026-10-30). Bitmemişse oturum ekranı, bitmişse özet:
 * süre, set, toplam hacim (kg × tekrar) ve tahmini kalori.
 */
export default async function OturumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!cuidSchema.safeParse(id).success) notFound();
  const oturum = await fetchSession(id);
  if (!oturum) notFound();
  const egzersizler = oturum.finishedAt
    ? []
    : (await fetchExercises({ page: 1, perPage: 100, isArchived: false })).items.map((e) => ({
        id: e.id,
        name: e.name,
        kas: e.muscleGroup,
      }));

  return (
    <>
      <Topbar title={oturum.gunAdi ?? 'Antrenman'} />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-xl flex-col gap-4">
          {oturum.finishedAt ? (
            <Ozet oturum={oturum} />
          ) : (
            <OturumEkrani oturum={oturum} egzersizler={egzersizler} />
          )}
        </div>
      </main>
    </>
  );
}

function Ozet({ oturum }: { oturum: OturumDto }) {
  const setler = oturum.hareketler.flatMap((h) => h.yapilanSetler);
  const hacim = setler.reduce((t, s) => t + (s.weightKg ? Number(s.weightKg) * s.reps : 0), 0);

  return (
    <>
      <section className="rounded-card border-success/40 bg-success/8 flex flex-col items-center gap-1 border p-6 text-center">
        <span className="text-4xl" aria-hidden="true">
          🎉
        </span>
        <h2 className="text-primary text-xl font-semibold">Antrenman tamamlandı</h2>
        {oturum.odak && <p className="text-muted text-sm">{oturum.odak}</p>}
      </section>

      <dl className="grid grid-cols-3 gap-3">
        <Kutu
          ikon={<Timer className="size-4" />}
          etiket="Süre"
          deger={`${oturum.durationMin ?? 0} dk`}
        />
        <Kutu
          ikon={<Weight className="size-4" />}
          etiket="Hacim"
          deger={`${Math.round(hacim)} kg`}
        />
        <Kutu ikon={<Flame className="size-4" />} etiket="Kalori" deger={`~${oturum.kcal ?? 0}`} />
      </dl>
      <p className="text-muted text-xs">
        Kalori tahmini: MET × son tartı kilon × süre. Kesin ölçüm değil; nabız verisi yok.
      </p>
      <Link
        href={`/panel/spor/${oturum.id}`}
        className={buttonClasses({ variant: 'secondary', size: 'sm' })}
      >
        Setleri ve süreyi düzelt
      </Link>

      <ul className="flex flex-col gap-2">
        {oturum.hareketler.map((h) => (
          <li
            key={h.id}
            className="rounded-card border-line bg-surface flex items-center justify-between gap-3 border p-3"
          >
            <span className="text-primary min-w-0 truncate text-sm font-medium">{h.ad}</span>
            <span className="tabular text-muted shrink-0 text-xs">
              {h.yapilanSetler.length > 0
                ? h.yapilanSetler
                    .map((s) => (s.weightKg ? `${s.weightKg.replace('.', ',')}×${s.reps}` : s.reps))
                    .join(' · ')
                : 'yapılmadı'}
            </span>
          </li>
        ))}
      </ul>

      <Link href="/panel/spor" className={buttonClasses({ size: 'lg' })}>
        Spora dön
      </Link>
    </>
  );
}

function Kutu({ ikon, etiket, deger }: { ikon: React.ReactNode; etiket: string; deger: string }) {
  return (
    <div className="rounded-card border-line bg-surface flex flex-col items-center gap-1 border p-3">
      <dt className="text-muted flex items-center gap-1 text-xs">
        {ikon}
        {etiket}
      </dt>
      <dd className="tabular text-primary text-lg font-semibold">{deger}</dd>
    </div>
  );
}
