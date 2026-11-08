import type { Metadata } from 'next';
import Link from 'next/link';

import { HayatAltMenu } from '@/components/panel/hayat-alt-menu';
import { simgeMetni } from '@/components/panel/hayat-bicim';
import { Topbar } from '@/components/panel/topbar';
import { appToday } from '@/server/services/_shared';
import { fetchHabitReport, type GunDurumu } from '@/server/services/habit-gun';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = {
  title: 'Hayat raporu',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const ARALIKLAR = [
  { gun: 7, etiket: 'Son 7 gün' },
  { gun: 30, etiket: 'Son 30 gün' },
] as const;

const KARE: Record<GunDurumu, string> = {
  YAPILDI: 'bg-success',
  EKSIK: 'bg-warning',
  YAPILMADI: 'bg-danger',
  ISARETSIZ: 'bg-elevated border border-line',
};

const DURUM_ADI: Record<GunDurumu, string> = {
  YAPILDI: 'yapıldı',
  EKSIK: 'eksik',
  YAPILMADI: 'yapılmadı',
  ISARETSIZ: 'işaretlenmedi',
};

/**
 * HAYAT · RAPOR (2026-10-29) — son 7 / 30 günün alışkanlık dökümü.
 *
 * Her satır: tamamlama oranı, dört durumun sayısı ve gün gün renkli kareler
 * (yeşil yapıldı · sarı eksik · kırmızı yapılmadı · boş işaretlenmedi).
 * Alışkanlık eklendiği günden önce sayılmıyor (habit-gun.ts notu).
 */
export default async function HayatRaporPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const gunSayisi = parametreler.aralik === '30' ? 30 : 7;
  const rapor = await fetchHabitReport(appToday(), gunSayisi);
  const enZayif = [...rapor.satirlar]
    .filter((s) => s.gunSayisi > 0)
    .sort((a, b) => a.oran - b.oran)[0];

  return (
    <>
      <Topbar title="Hayat raporu" />

      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <HayatAltMenu aktif="rapor" />

          <div className="bg-elevated grid grid-cols-2 gap-1 rounded-full p-1">
            {ARALIKLAR.map((a) => (
              <Link
                key={a.gun}
                href={`/panel/hayat/rapor?aralik=${a.gun}`}
                aria-current={a.gun === gunSayisi ? 'page' : undefined}
                className={cn(
                  'focus-ring rounded-full py-2 text-center text-sm font-medium transition-colors',
                  a.gun === gunSayisi ? 'bg-canvas text-primary shadow-sm' : 'text-muted',
                )}
              >
                {a.etiket}
              </Link>
            ))}
          </div>

          {rapor.satirlar.length === 0 ? (
            <p className="text-muted rounded-card border-line bg-surface border p-6 text-center text-sm">
              Rapor için önce alışkanlık eklemelisin.
            </p>
          ) : (
            <>
              <section className="rounded-card border-line bg-surface flex flex-col gap-1 border p-5">
                <span className="text-muted text-sm">Genel tamamlama</span>
                <span className="tabular text-primary text-4xl font-semibold">
                  %{rapor.genelOran}
                </span>
                {enZayif && enZayif.oran < 100 && (
                  <p className="text-body text-sm">
                    En çok aksayan: <span className="text-primary font-medium">{enZayif.name}</span>{' '}
                    (%
                    {enZayif.oran}) — {enZayif.yapilmadi} gün yapılmadı, {enZayif.isaretsiz} gün
                    işaretlenmedi.
                  </p>
                )}
              </section>

              <ul className="flex flex-col gap-3">
                {rapor.satirlar.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-card border-line bg-surface flex flex-col gap-3 border p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-primary flex min-w-0 items-center gap-2 font-medium">
                        <span aria-hidden="true">{simgeMetni(s.icon).trim() || '•'}</span>
                        <span className="truncate">{s.name}</span>
                      </span>
                      <span className="tabular text-primary font-semibold">%{s.oran}</span>
                    </div>

                    <div
                      className={cn('grid gap-1', gunSayisi === 7 ? 'grid-cols-7' : 'grid-cols-10')}
                      aria-label={`${s.name} gün gün`}
                    >
                      {s.gunler.map((d, i) => (
                        <span
                          key={rapor.gunler[i]}
                          title={`${rapor.gunler[i]}: ${d ? DURUM_ADI[d] : 'henüz yoktu'}`}
                          className={cn('aspect-square rounded-sm', d ? KARE[d] : 'bg-transparent')}
                        />
                      ))}
                    </div>

                    <p className="tabular text-muted text-xs">
                      {s.yapildi} yapıldı · {s.eksik} eksik · {s.yapilmadi} yapılmadı ·{' '}
                      {s.isaretsiz} işaretlenmedi
                    </p>
                  </li>
                ))}
              </ul>

              <p className="text-muted flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <Lejant renk="bg-success" ad="yapıldı" />
                <Lejant renk="bg-warning" ad="eksik" />
                <Lejant renk="bg-danger" ad="yapılmadı" />
                <Lejant renk="bg-elevated border border-line" ad="işaretlenmedi" />
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function Lejant({ renk, ad }: { renk: string; ad: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className={cn('size-3 rounded-sm', renk)} />
      {ad}
    </span>
  );
}
