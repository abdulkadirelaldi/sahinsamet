import { ChevronRight, Flame, Timer } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { gunAyYil } from '@/components/panel/hayat-bicim';
import { BaslatDugmesi, ProgramYukleDugmesi } from '@/components/panel/spor-dugmeleri';
import { HAFTA_GUNLERI_KISA } from '@/components/panel/hayat-bicim';
import { SporSekmeleri } from '@/components/panel/spor-sekmeleri';
import { Topbar } from '@/components/panel/topbar';
import { appToday } from '@/server/services/_shared';
import {
  fetchActiveSession,
  fetchProgram,
  fetchRecentSessions,
} from '@/server/services/antrenman-oturumu';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = {
  title: 'Spor',
  robots: { index: false, follow: false, nocache: true },
};

const GUN_ADI = ['', ...HAFTA_GUNLERI_KISA] as const;

/** İstanbul gününün haftadaki sırası: 1 = pazartesi … 7 = pazar. */
function haftaGunu(gun: string): number {
  const d = new Date(`${gun}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/**
 * SPOR · PROGRAM (2026-10-30, telefon öncelikli).
 *
 * Bugünün program günü en üstte ve vurgulu; "Başlat" canlı oturumu açar (açık
 * oturum varsa ona gider). Program yoksa sahibinin PDF programı tek dokunuşla
 * yüklenir. Altta son antrenmanlar — süre ve tahmini kaloriyle.
 */
export default async function SporPage() {
  const bugun = appToday();
  const [program, acik, sonlar] = await Promise.all([
    fetchProgram(),
    fetchActiveSession(),
    fetchRecentSessions(5),
  ]);
  const bugunNo = haftaGunu(bugun);
  const sirali = [...program].sort(
    (a, b) => Number(b.haftaGunu === bugunNo) - Number(a.haftaGunu === bugunNo),
  );

  return (
    <>
      <Topbar title="Spor" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <SporSekmeleri secili="program" />

          {acik && (
            <Link
              href={`/panel/spor/oturum/${acik.id}`}
              className="aura aura-spor focus-ring flex items-center justify-between gap-3 p-4"
            >
              <span className="flex flex-col">
                <span className="text-sm opacity-90">Devam eden antrenman</span>
                <span className="font-semibold">{acik.gunAdi ?? 'Antrenman'}</span>
              </span>
              <ChevronRight className="size-5" aria-hidden="true" />
            </Link>
          )}

          {program.length === 0 ? (
            <section className="rounded-card border-line bg-surface flex flex-col items-center gap-3 border p-6 text-center">
              <p className="text-primary font-semibold">Henüz program yok</p>
              <p className="text-muted text-sm">
                5 günlük kol ağırlıklı programın (İtiş · Çekiş · Bacak A · Üst/Kol · Bacak B) ve
                cumartesi yüzme/koşu tek dokunuşla yüklenir.
              </p>
              <ProgramYukleDugmesi />
              <Link
                href="/panel/spor/program"
                className="focus-ring text-accent text-sm font-medium"
              >
                Ya da kendi programını oluştur →
              </Link>
            </section>
          ) : (
            <ul className="flex flex-col gap-3">
              {sirali.map((gun) => {
                const bugunku = gun.haftaGunu === bugunNo;
                const setSayisi = gun.hareketler.reduce((t, h) => t + h.sets, 0);
                return (
                  <li
                    key={gun.id}
                    className={cn(
                      'p-4',
                      bugunku ? 'aura aura-spor' : 'rounded-card border-line bg-surface border',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-muted text-xs font-medium">
                          {gun.haftaGunu ? GUN_ADI[gun.haftaGunu] : 'Serbest'}
                          {bugunku && <span className="text-accent"> · Bugün</span>}
                        </span>
                        <span className="text-primary text-lg font-semibold">{gun.ad}</span>
                        {gun.odak && <span className="text-muted text-sm">{gun.odak}</span>}
                        <span className="tabular text-muted text-xs">
                          {gun.hareketler.length} hareket · {setSayisi} set
                        </span>
                      </div>
                      <BaslatDugmesi dayId={gun.id} vurgulu={bugunku} />
                    </div>

                    <details className="group mt-3">
                      <summary className="text-accent cursor-pointer text-sm font-medium">
                        Hareketleri gör
                      </summary>
                      <ol className="mt-2 flex flex-col gap-1.5">
                        {gun.hareketler.map((h) => (
                          <li
                            key={h.id}
                            className="flex items-baseline justify-between gap-3 text-sm"
                          >
                            <span className="text-body min-w-0">{h.ad}</span>
                            <span className="tabular text-muted shrink-0 text-xs">
                              {h.sets} × {h.reps}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}

          {program.length > 0 && (
            <Link
              href="/panel/spor/program"
              className="focus-ring text-accent min-h-11 content-center self-center px-3 text-sm font-medium"
            >
              Programı düzenle →
            </Link>
          )}

          {sonlar.length > 0 && (
            <section className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-primary text-base font-semibold">Son antrenmanlar</h2>
                <Link href="/panel/spor/gecmis" className="text-accent text-sm font-medium">
                  Tümü →
                </Link>
              </div>
              <ul className="flex flex-col gap-2">
                {sonlar.map((w) => (
                  <li key={w.id}>
                    <Link
                      href={w.oturum ? `/panel/spor/oturum/${w.id}` : `/panel/spor/${w.id}`}
                      className="focus-ring rounded-card border-line bg-surface flex items-center justify-between gap-3 border p-3"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="text-primary truncate text-sm font-medium">
                          {w.gunAdi ?? 'Antrenman'}
                          {w.suruyor && <span className="text-accent"> · sürüyor</span>}
                        </span>
                        <span className="tabular text-muted text-xs">
                          {gunAyYil(w.date)} · {w.setSayisi} set
                        </span>
                      </span>
                      <span className="tabular text-muted flex shrink-0 items-center gap-3 text-xs">
                        {w.durationMin !== null && (
                          <span className="flex items-center gap-1">
                            <Timer className="size-3.5" aria-hidden="true" />
                            {w.durationMin} dk
                          </span>
                        )}
                        {w.kcal !== null && (
                          <span className="flex items-center gap-1">
                            <Flame className="size-3.5" aria-hidden="true" />~{w.kcal}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
