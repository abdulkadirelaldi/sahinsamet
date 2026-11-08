import { ChevronLeft, ChevronRight, Dumbbell, Scale, Sparkles, Wallet } from 'lucide-react';
import type { Metadata } from 'next';

import { gunAy, HAFTA_GUNLERI_KISA } from '@/components/panel/hayat-bicim';
import { GezinmeDugmesi, OzetKarti } from '@/components/panel/ozet-karti';
import { paraBicim } from '@/components/panel/para-bicim';
import { Topbar } from '@/components/panel/topbar';
import { addAppDays, appToday, startOfAppWeek } from '@/server/services/_shared';
import { fetchHaftalikOzet } from '@/server/services/haftalik-ozet';

export const metadata: Metadata = {
  title: 'Haftalık özet',
  robots: { index: false, follow: false, nocache: true },
};

type SayfaProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function gecerliGun(ham: unknown): string | null {
  if (typeof ham !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ham)) return null;
  const tarih = new Date(`${ham}T00:00:00Z`);
  return !Number.isNaN(tarih.getTime()) && tarih.toISOString().slice(0, 10) === ham ? ham : null;
}

const sayi = (n: number) => n.toLocaleString('tr-TR');

/** `/panel/haftalik` — alışkanlık, spor, harcama ve kilo tek ekranda (2026-11-01). */
export default async function HaftalikPage({ searchParams }: SayfaProps) {
  const istenen = gecerliGun((await searchParams).hafta);
  const buHafta = startOfAppWeek(appToday());
  const hafta = istenen && startOfAppWeek(istenen) < buHafta ? startOfAppWeek(istenen) : buHafta;

  const o = await fetchHaftalikOzet(hafta);
  const sonraki = hafta < buHafta ? addAppDays(hafta, 7) : null;

  const harcamaFark = Number(o.harcama.tl) - Number(o.harcama.oncekiTl);
  const hacimFark = o.spor.hacimKg - o.spor.oncekiHacimKg;
  const yuzdeFark =
    o.aliskanlik.yuzde !== null && o.aliskanlik.oncekiYuzde !== null
      ? o.aliskanlik.yuzde - o.aliskanlik.oncekiYuzde
      : null;
  const kiloFark = o.kilo.fark === null ? null : Number(o.kilo.fark);

  return (
    <>
      <Topbar title="Haftalık özet" />
      <main id="panel-icerik" className="flex-1 px-4 py-4 lg:p-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <nav aria-label="Hafta seçimi" className="flex items-center justify-between">
            <GezinmeDugmesi
              href={`/panel/haftalik?hafta=${addAppDays(hafta, -7)}`}
              etiket="Önceki hafta"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </GezinmeDugmesi>
            <h2 className="text-primary text-base font-semibold">
              {gunAy(o.bas)} – {gunAy(o.son)}
            </h2>
            {sonraki ? (
              <GezinmeDugmesi href={`/panel/haftalik?hafta=${sonraki}`} etiket="Sonraki hafta">
                <ChevronRight className="size-5" aria-hidden="true" />
              </GezinmeDugmesi>
            ) : (
              <span className="size-10" aria-hidden="true" />
            )}
          </nav>

          <OzetKarti
            href="/panel/hayat"
            ikon={<Sparkles className="size-4" aria-hidden="true" />}
            renk="from-violet-500 to-purple-500"
            baslik="Alışkanlık"
            deger={o.aliskanlik.yuzde === null ? '—' : `%${o.aliskanlik.yuzde}`}
            alt={
              yuzdeFark === null
                ? null
                : `Geçen haftaya göre ${yuzdeFark > 0 ? '+' : ''}${yuzdeFark} puan`
            }
          >
            {o.aliskanlik.adet > 0 && (
              <ol className="mt-1 grid grid-cols-7 gap-1.5">
                {o.aliskanlik.gunler.map((oran, i) => (
                  <li
                    key={HAFTA_GUNLERI_KISA[i]}
                    aria-label={`${HAFTA_GUNLERI_KISA[i]}: %${Math.round(oran * 100)}`}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="bg-elevated flex h-14 w-full items-end overflow-hidden rounded-md">
                      {oran > 0 && (
                        <span
                          className="w-full rounded-md bg-violet-500"
                          style={{ height: `${Math.max(8, oran * 100)}%` }}
                        />
                      )}
                    </span>
                    <span className="text-muted text-[10px]">{HAFTA_GUNLERI_KISA[i]}</span>
                  </li>
                ))}
              </ol>
            )}
          </OzetKarti>

          <div className="grid gap-3 sm:grid-cols-3">
            <OzetKarti
              href="/panel/spor/gelisim"
              ikon={<Dumbbell className="size-4" aria-hidden="true" />}
              renk="from-orange-500 to-amber-500"
              baslik="Spor"
              deger={`${o.spor.antrenman} antrenman`}
              alt={
                o.spor.hacimKg > 0 || o.spor.oncekiHacimKg > 0
                  ? `${sayi(o.spor.hacimKg)} kg hacim · ${hacimFark >= 0 ? '+' : ''}${sayi(hacimFark)}`
                  : null
              }
            />
            <OzetKarti
              href="/panel/cuzdan/rapor"
              ikon={<Wallet className="size-4" aria-hidden="true" />}
              renk="from-emerald-500 to-teal-500"
              baslik="Harcama"
              deger={paraBicim(o.harcama.tl, 'TRY')}
              alt={
                Number(o.harcama.oncekiTl) > 0 || Number(o.harcama.tl) > 0
                  ? `Geçen hafta ${paraBicim(o.harcama.oncekiTl, 'TRY')}${hafta === buHafta || harcamaFark === 0 ? '' : harcamaFark > 0 ? ' · arttı' : ' · azaldı'}`
                  : 'Düzenli ödemeler hariç'
              }
            />
            <OzetKarti
              href="/panel/saglik"
              ikon={<Scale className="size-4" aria-hidden="true" />}
              renk="from-rose-500 to-pink-500"
              baslik="Kilo"
              deger={o.kilo.son ? `${String(Number(o.kilo.son)).replace('.', ',')} kg` : '—'}
              alt={
                kiloFark === null
                  ? o.kilo.son
                    ? null
                    : 'Bu hafta tartı yok'
                  : `Geçen haftaya göre ${kiloFark > 0 ? '+' : ''}${String(kiloFark).replace('.', ',')} kg`
              }
            />
          </div>
        </div>
      </main>
    </>
  );
}
