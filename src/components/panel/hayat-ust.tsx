import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { HAFTA_GUNLERI_KISA } from '@/components/panel/hayat-bicim';
import { cn } from '@/lib/utils/cn';

const HAFTA_GUNU = HAFTA_GUNLERI_KISA;

/** Halka: `oran` 0–1. `zemin` üstünde beyaz; animasyon yalnızca stroke (`halka-dol`). */
function Halka({ oran, boyut, kalinlik }: { oran: number; boyut: number; kalinlik: number }) {
  const r = boyut / 2 - kalinlik / 2;
  const cevre = 2 * Math.PI * r;
  return (
    <svg width={boyut} height={boyut} className="-rotate-90" aria-hidden="true">
      <circle
        cx={boyut / 2}
        cy={boyut / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.25}
        strokeWidth={kalinlik}
      />
      {oran > 0 && (
        <circle
          cx={boyut / 2}
          cy={boyut / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={kalinlik}
          strokeLinecap="round"
          strokeDasharray={cevre}
          strokeDashoffset={cevre * (1 - Math.min(1, oran))}
          className="halka-dol"
          style={{ ['--halka-cevre' as string]: cevre }}
        />
      )}
    </svg>
  );
}

/** İlerlemeye göre kısa cümle. SAF. */
function motivasyon(yapildi: number, toplam: number): string {
  const kalan = toplam - yapildi;
  if (toplam === 0) return 'Alışkanlık ekleyerek başla';
  if (kalan === 0) return 'Hepsi tamam, harikasın 🎉';
  if (yapildi === 0) return `Sırada ${toplam} alışkanlık var`;
  return kalan === 1 ? 'Bir tane kaldı, bitir gitsin' : `${kalan} alışkanlık kaldı`;
}

/**
 * HAYAT ÜST KARTI (2026-10-31): seçili günün ilerlemesi ve hafta şeridi. Her gün
 * kendi tamamlanma halkasıyla; dokununca o güne gider. Sunucuda çizilir.
 */
export function HayatUstKarti({
  etiket,
  gun,
  bugun,
  gunler,
  oranlar,
  yapildi,
  toplam,
}: {
  etiket: string;
  gun: string;
  bugun: string;
  gunler: readonly string[];
  oranlar: readonly number[];
  yapildi: number;
  toplam: number;
}) {
  const oran = toplam === 0 ? 0 : yapildi / toplam;
  const yuzde = Math.round(oran * 100);
  const onceki = new Date(`${gun}T00:00:00Z`);
  onceki.setUTCDate(onceki.getUTCDate() - 1);
  const sonraki = new Date(`${gun}T00:00:00Z`);
  sonraki.setUTCDate(sonraki.getUTCDate() + 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <section aria-label={`${etiket} özeti`} className="aura aura-hayat flex flex-col gap-5 p-5">
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1">
            <GunOku href={`/panel/hayat?gun=${iso(onceki)}`} etiket="Önceki gün">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </GunOku>
            <h2 className="truncate text-xl font-semibold text-white capitalize">{etiket}</h2>
            {gun < bugun && (
              <GunOku href={`/panel/hayat?gun=${iso(sonraki)}`} etiket="Sonraki gün">
                <ChevronRight className="size-4" aria-hidden="true" />
              </GunOku>
            )}
          </div>
          <p className="text-sm text-white/85">{motivasyon(yapildi, toplam)}</p>
          {gun !== bugun && (
            <Link
              href="/panel/hayat"
              className="focus-ring w-fit rounded text-xs font-medium text-white underline underline-offset-2"
            >
              Bugüne dön
            </Link>
          )}
        </div>

        <div
          role="progressbar"
          aria-valuenow={yuzde}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${etiket} ilerleme`}
          className="relative flex size-22 shrink-0 items-center justify-center"
        >
          <span className="absolute inset-0">
            <Halka oran={oran} boyut={88} kalinlik={9} />
          </span>
          <span className="tabular flex flex-col items-center leading-none">
            <span className="text-xl font-semibold">%{yuzde}</span>
            <span className="mt-1 text-[0.6875rem] text-white/80">
              {yapildi}/{toplam}
            </span>
          </span>
        </div>
      </div>

      <ol className="grid grid-cols-7 gap-1">
        {gunler.map((g, i) => {
          const gelecek = g > bugun;
          const secili = g === gun;
          const icerik = (
            <>
              <span className="text-[0.6875rem] font-medium">{HAFTA_GUNU[i]}</span>
              <span className="relative flex size-8 items-center justify-center">
                <span className="absolute inset-0">
                  <Halka oran={oranlar[i] ?? 0} boyut={32} kalinlik={3} />
                </span>
                <span className="tabular text-xs font-semibold">{Number(g.slice(8, 10))}</span>
              </span>
            </>
          );
          const sinif = cn(
            'flex flex-col items-center gap-1 rounded-2xl py-2',
            secili && 'bg-white/16 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)]',
            gelecek && 'opacity-45',
          );
          return (
            <li key={g}>
              {gelecek ? (
                <span className={sinif}>{icerik}</span>
              ) : (
                <Link
                  href={g === bugun ? '/panel/hayat' : `/panel/hayat?gun=${g}`}
                  aria-current={secili ? 'date' : undefined}
                  aria-label={`${HAFTA_GUNU[i]} ${Number(g.slice(8, 10))}, yüzde ${Math.round((oranlar[i] ?? 0) * 100)}`}
                  className={cn('focus-ring', sinif)}
                >
                  {icerik}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function GunOku({ href, etiket, children }: { href: string; etiket: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={etiket}
      className="focus-ring flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/30"
    >
      {children}
    </Link>
  );
}

/** Üçlü istatistik şeridi. */
export function HayatIstatistik({
  kalemler,
}: {
  kalemler: readonly { etiket: string; deger: string; ek?: string }[];
}) {
  return (
    <dl className="grid grid-cols-3 gap-2.5">
      {kalemler.map((k) => (
        <div
          key={k.etiket}
          className="rounded-card border-line bg-surface flex flex-col gap-1 border p-3"
        >
          <dt className="text-muted truncate text-xs">{k.etiket}</dt>
          <dd className="tabular text-primary truncate text-lg font-semibold tracking-tight">
            {k.deger}
            {k.ek && <span className="text-muted ml-1 text-xs font-normal">{k.ek}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
