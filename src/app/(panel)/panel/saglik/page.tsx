import { Pencil, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { SaglikDegerlendirmesiKarti } from '@/components/panel/saglik-degerlendirmesi';
import { SaglikHedefKarti } from '@/components/panel/saglik-hedef';
import { SaglikEkrani } from '@/components/panel/saglik-ekrani';
import { Sayfalama } from '@/components/panel/sayfalama';
import { Topbar } from '@/components/panel/topbar';
import { TrendGrafigi, type TrendNoktasi } from '@/components/panel/trend-grafigi';
import { buttonClasses } from '@/components/ui/button';
import { healthLogFilterSchema } from '@/lib/schemas/health-log';
import { cn } from '@/lib/utils/cn';
import { auth } from '@/server/auth';
import { addAppDays, appToday } from '@/server/services/_shared';
import {
  fetchHealthLogs,
  fetchHealthTrend,
  fetchSaglikHedefi,
  findHealthLogIdByDay,
  type HealthLogDto,
} from '@/server/services/health-log';

export const metadata: Metadata = {
  title: 'Sağlık',
  robots: { index: false, follow: false, nocache: true },
};

const SAYFA_BOYUTU = 20;

/**
 * ARALIKLAR KAPALI BİR KÜME — adres çubuğu kullanıcı girdisidir (ADR-032).
 * `?aralik=9999` gibi bir değer `TREND_MAX_DAYS`i delmeye çalışamaz; tanınmayan
 * değer varsayılana düşer.
 */
const ARALIKLAR = [
  { anahtar: '30', etiket: '30 gün', gun: 30 },
  { anahtar: '90', etiket: '90 gün', gun: 90 },
  { anahtar: '365', etiket: '1 yıl', gun: 365 },
] as const;

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const tek = (ham: string | string[] | undefined): string =>
  (Array.isArray(ham) ? ham[0] : ham) ?? '';

function sayfaNumarasi(ham: string | string[] | undefined): number {
  const sayi = Number(tek(ham));
  return Number.isInteger(sayi) && sayi > 0 ? sayi : 1;
}

function yol(aralik: string, sayfa?: number): string {
  const p = new URLSearchParams();
  if (aralik !== '90') p.set('aralik', aralik);
  if (sayfa && sayfa > 1) p.set('sayfa', String(sayfa));
  const q = p.toString();
  return q ? `/panel/saglik?${q}` : '/panel/saglik';
}

/** Bir ölçünün dolu olduğu günler — boş gün NOKTA ÜRETMEZ (sıfır sayılmaz). */
function seri(
  kayitlar: HealthLogDto[],
  alan: (k: HealthLogDto) => string | number | null,
): TrendNoktasi[] {
  return kayitlar.flatMap((k) => {
    const deger = alan(k);
    return deger === null ? [] : [{ gun: k.date, deger: String(deger) }];
  });
}

/**
 * `/panel/saglik` — §4.2 "kilo, uyku, su, ölçüm girişi + trend grafikleri".
 *
 * İKİ AYRI OKUMA (T-110 kararı): trend ARTAN sırada ve aralığın TAMAMINI
 * istiyor, liste en yeniyi önce ve sayfalı. Sayfalı listeden grafik çizmek
 * yalnızca ilk 20 günü çizerdi.
 */
export default async function SaglikPage({ searchParams }: SayfaProps) {
  const parametreler = await searchParams;
  const aralik = ARALIKLAR.find((a) => a.anahtar === tek(parametreler.aralik)) ?? ARALIKLAR[1];
  const bugun = appToday();
  const from = addAppDays(bugun, -(aralik.gun - 1));

  const filtre = healthLogFilterSchema.safeParse({
    page: sayfaNumarasi(parametreler.sayfa),
    perPage: SAYFA_BOYUTU,
  });

  const session = await auth();
  const [trend, liste, bugunId, hedef] = await Promise.all([
    fetchHealthTrend({ from, to: bugun }),
    fetchHealthLogs(filtre.success ? filtre.data : { page: 1, perPage: SAYFA_BOYUTU }),
    findHealthLogIdByDay(bugun),
    session?.user?.id ? fetchSaglikHedefi(session.user.id) : Promise.resolve(null),
  ]);

  const grafikler = [
    { baslik: 'Kilo', renk: '#6d4aff', birim: 'kg', noktalar: seri(trend, (k) => k.weightKg) },
    {
      baslik: 'Vücut yağı',
      renk: '#f43f5e',
      tarti: true,
      birim: '%',
      noktalar: seri(trend, (k) => k.bodyFatPct),
    },
    {
      baslik: 'İç yağ',
      renk: '#f97316',
      tarti: true,
      birim: '',
      noktalar: seri(trend, (k) => k.visceralFat),
    },
    {
      baslik: 'Kas',
      renk: '#10b981',
      tarti: true,
      birim: 'kg',
      noktalar: seri(trend, (k) => k.muscleKg),
    },
    {
      baslik: 'Vücut suyu',
      renk: '#0ea5e9',
      tarti: true,
      birim: '%',
      noktalar: seri(trend, (k) => k.waterPct),
    },
    { baslik: 'Uyku', renk: '#6366f1', birim: 'sa', noktalar: seri(trend, (k) => k.sleepHours) },
    {
      baslik: 'Dinlenik nabız',
      renk: '#ef4444',
      birim: 'bpm',
      noktalar: seri(trend, (k) => k.restingHr),
    },
    { baslik: 'Adım', renk: '#f59e0b', birim: 'adım', noktalar: seri(trend, (k) => k.steps) },
  ];

  return (
    <>
      <Topbar
        title="Sağlık"
        actions={
          bugunId ? (
            <Link
              href={`/panel/saglik/${bugunId}`}
              className={buttonClasses({ size: 'sm', variant: 'secondary' })}
            >
              <Pencil className="size-4" aria-hidden="true" />
              Bugünü düzenle
            </Link>
          ) : (
            <Link href="/panel/saglik/yeni" className={buttonClasses({ size: 'sm' })}>
              <Plus className="size-4" aria-hidden="true" />
              Bugünü kaydet
            </Link>
          )
        }
      />

      <main id="panel-icerik" className="flex-1 p-4 lg:p-6">
        <div className="flex max-w-5xl flex-col gap-6">
          <SaglikHedefKarti hedef={hedef} />
          <SaglikDegerlendirmesiKarti />

          <section aria-labelledby="trend-baslik" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="trend-baslik" className="text-primary text-base font-semibold">
                Trendler
              </h2>
              <nav aria-label="Trend aralığı">
                <ul className="flex gap-1.5">
                  {ARALIKLAR.map((a) => {
                    const secili = a.anahtar === aralik.anahtar;
                    return (
                      <li key={a.anahtar}>
                        <Link
                          href={yol(a.anahtar)}
                          aria-current={secili ? 'page' : undefined}
                          className={cn(
                            'focus-ring ease-brand duration-micro rounded-btn inline-flex items-center border px-3 py-1.5 text-sm transition-colors',
                            secili
                              ? 'border-accent/40 bg-accent/12 text-accent-soft'
                              : 'border-line bg-surface text-body hover:border-line-hover hover:text-primary',
                          )}
                        >
                          {a.etiket}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {grafikler
                // Tartı grafikleri yalnızca verisi varken; temel dördü boş durumuyla hep görünür.
                .filter((g) => !('tarti' in g) || g.noktalar.length > 0)
                .map((g) => (
                  <TrendGrafigi
                    key={g.baslik}
                    baslik={g.baslik}
                    birim={g.birim}
                    noktalar={g.noktalar}
                    renk={g.renk}
                  />
                ))}
            </div>
          </section>

          <section aria-labelledby="kayit-baslik" className="flex flex-col gap-3">
            <h2 id="kayit-baslik" className="text-primary text-base font-semibold">
              Kayıtlar
            </h2>
            <SaglikEkrani kayitlar={liste.items} toplam={liste.total} />
            <Sayfalama
              sayfa={liste.page}
              perPage={liste.perPage}
              toplam={liste.total}
              yol={(s) => yol(aralik.anahtar, s)}
            />
          </section>
        </div>
      </main>
    </>
  );
}
