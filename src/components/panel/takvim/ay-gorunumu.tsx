'use client';

import Link from 'next/link';

import { gunBasligi, GUN_KISA, saatMetni } from '@/lib/takvim/bicim';
import {
  ayIzgarasi,
  gununOlusumlari,
  olusumZamanMetni,
  type TakvimOlusumu,
} from '@/lib/takvim/gorunum';
import { TAKVIM_KATEGORILERI } from '@/lib/takvim/kategoriler';
import { cn } from '@/lib/utils/cn';
import { appWallClockMinutes, type AppDay } from '@/server/services/_shared/app-date';

const EN_COK_SATIR = 3;

/**
 * AY GÖRÜNÜMÜ (2026-11-10). 375 px'te gün hücresi ~49 px: başlık kısalır ama renk ve ilk harfler
 * okunur, saat yalnızca geniş ekranda. Boş alana dokunmak o güne etkinlik açar, gün numarası Gün
 * görünümüne gider, "+N" fazlası da.
 */
export function AyGorunumu({
  tarih,
  bugun,
  olusumlar,
  ac,
  yeni,
  gunAdresi,
}: {
  tarih: AppDay;
  bugun: AppDay;
  olusumlar: readonly TakvimOlusumu[];
  ac: (o: TakvimOlusumu) => void;
  yeni: (gun: AppDay, dk: number | null) => void;
  gunAdresi: (gun: AppDay) => string;
}) {
  const haftalar = ayIzgarasi(tarih);
  const ay = tarih.slice(0, 7);

  return (
    <div className="rounded-card border-line bg-surface overflow-hidden border">
      <div className="border-line grid grid-cols-7 border-b" aria-hidden="true">
        {GUN_KISA.map((g) => (
          <span key={g} className="text-muted py-2 text-center text-[0.6875rem] font-medium">
            {g}
          </span>
        ))}
      </div>
      <ol aria-label="Ayın günleri">
        {haftalar.map((hafta) => (
          <li key={hafta[0]} className="border-line grid grid-cols-7 border-b last:border-b-0">
            <ol className="contents">
              {hafta.map((gun) => {
                const liste = gununOlusumlari(olusumlar, gun);
                const fazla = liste.length - EN_COK_SATIR;
                const buAy = gun.slice(0, 7) === ay;
                return (
                  <li
                    key={gun}
                    data-gun={gun}
                    onClick={() => yeni(gun, 9 * 60)}
                    className={cn(
                      'border-line flex min-h-[4.75rem] min-w-0 cursor-pointer flex-col gap-0.5 border-r p-0.5 last:border-r-0 sm:min-h-28 sm:p-1',
                      !buAy && 'bg-canvas/50',
                    )}
                  >
                    <Link
                      href={gunAdresi(gun)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`${gunBasligi(gun)}${liste.length ? `, ${liste.length} etkinlik` : ''}`}
                      aria-current={gun === bugun ? 'date' : undefined}
                      className={cn(
                        'focus-ring tabular mx-auto flex size-6 items-center justify-center rounded-full text-xs font-medium sm:mx-0',
                        gun === bugun
                          ? 'bg-accent text-white'
                          : buAy
                            ? 'text-primary'
                            : 'text-muted',
                      )}
                    >
                      {Number(gun.slice(8, 10))}
                    </Link>
                    <ul className="flex min-w-0 flex-col gap-0.5">
                      {liste.slice(0, EN_COK_SATIR).map((o) => (
                        <li key={o.anahtar} className="min-w-0">
                          <AyCipi olusum={o} gun={gun} ac={ac} />
                        </li>
                      ))}
                    </ul>
                    {fazla > 0 && (
                      <Link
                        href={gunAdresi(gun)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`${gunBasligi(gun)}: ${fazla} etkinlik daha`}
                        className="focus-ring text-muted hover:text-primary rounded px-0.5 text-[0.625rem] font-medium sm:text-xs"
                      >
                        +{fazla}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}

function AyCipi({
  olusum: o,
  gun,
  ac,
}: {
  olusum: TakvimOlusumu;
  gun: AppDay;
  ac: (o: TakvimOlusumu) => void;
}) {
  const k = TAKVIM_KATEGORILERI[o.kategori];
  // Önceki günden taşan saatli etkinlik o gün "devam" eder: saat yazılmaz.
  const baslangicBugun = o.gun === gun;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        ac(o);
      }}
      aria-label={`${o.baslik}, ${olusumZamanMetni(o)}`}
      className={cn(
        'focus-ring flex w-full min-w-0 items-center gap-1 rounded px-0.5 text-left text-[0.625rem] leading-4 sm:px-1 sm:text-xs sm:leading-5',
        o.tumGun ? k.dolu : 'text-primary hover:bg-elevated',
      )}
    >
      {!o.tumGun && (
        <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', k.nokta)} />
      )}
      {!o.tumGun && baslangicBugun && (
        <span className="text-muted tabular hidden shrink-0 sm:inline">
          {saatMetni(appWallClockMinutes(new Date(o.baslangic)))}
        </span>
      )}
      <span className="truncate">{o.baslik}</span>
    </button>
  );
}
