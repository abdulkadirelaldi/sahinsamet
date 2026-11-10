'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type MouseEvent } from 'react';

import { gunBasligi, GUN_KISA, saatMetni } from '@/lib/takvim/bicim';
import {
  gununOlusumlari,
  gunParcasi,
  olusumZamanMetni,
  sutunYerlesimi,
  EN_KISA_KUTU_DK,
  type TakvimOlusumu,
} from '@/lib/takvim/gorunum';
import { TAKVIM_KATEGORILERI } from '@/lib/takvim/kategoriler';
import { haftaninGunu } from '@/lib/takvim/tekrar';
import { cn } from '@/lib/utils/cn';
import { appWallClockMinutes, toAppDay, type AppDay } from '@/server/services/_shared/app-date';

/** Bir saatin yüksekliği (px). */
const SAAT = 48;
const SAATLER = Array.from({ length: 24 }, (_, i) => i);

/**
 * HAFTA ve GÜN GÖRÜNÜMÜ (2026-11-10) — saat ızgarası. Tek kaydırıcı iki yönde: başlık ve tüm gün
 * satırı üstte, saat sütunu solda yapışık. Haftada yedi sütun telefonda sığmaz; ızgara en az
 * 42rem genişler ve kutunun İÇİNDE yatay kayar (sayfa taşmaz). Boş alana dokunmak o saate (yarım
 * saate yuvarlanır) etkinlik açar; tüm gün satırına dokunmak tüm gün etkinlik.
 */
export function ZamanIzgarasi({
  gunler,
  bugun,
  olusumlar,
  ac,
  yeni,
  gunAdresi,
}: {
  gunler: readonly AppDay[];
  bugun: AppDay;
  olusumlar: readonly TakvimOlusumu[];
  ac: (o: TakvimOlusumu) => void;
  yeni: (gun: AppDay, dk: number | null) => void;
  gunAdresi: (gun: AppDay) => string;
}) {
  const kaydirici = useRef<HTMLDivElement>(null);
  const [simdi, setSimdi] = useState<Date | null>(null);
  const cok = gunler.length > 1;
  const anahtar = gunler.join();

  // Şimdi çizgisi yalnızca tarayıcıda: sunucu saatiyle hidrasyon farkı olmasın.
  useEffect(() => {
    const tik = () => setSimdi(new Date());
    tik();
    const id = window.setInterval(tik, 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Açılışta bugünse şimdinin biraz üstüne, değilse 07:00'ye kayar.
  useEffect(() => {
    const el = kaydirici.current;
    if (!el) return;
    const an = new Date();
    const dk = gunler.includes(toAppDay(an)) ? appWallClockMinutes(an) - 90 : 7 * 60;
    // Yapışık başlık satırlarının altında kalmasın diye biraz yukarıdan.
    el.scrollTop = Math.max(0, (dk / 60) * SAAT - 16);
    // Yalnızca görünen günler değişince; her yeniden çizimde kaydırma sıfırlanmasın.
  }, [anahtar]);

  const tumGunler = olusumlar.filter((o) => o.tumGun);
  const saatliler = olusumlar.filter((o) => !o.tumGun);
  const sutunlar = cok
    ? 'min-w-[42rem] grid-cols-[3rem_repeat(7,minmax(0,1fr))]'
    : 'grid-cols-[3rem_minmax(0,1fr)]';

  return (
    <div
      ref={kaydirici}
      className="rounded-card border-line bg-surface relative max-h-[calc(100dvh-19rem)] min-h-[20rem] overflow-auto overscroll-contain border lg:max-h-[calc(100dvh-12rem)]"
    >
      <div className={cn('grid', sutunlar)}>
        {/* Başlık satırı */}
        <div className="bg-surface border-line sticky top-0 left-0 z-30 h-14 border-b" />
        {gunler.map((gun) => {
          const icerik = (
            <>
              <span className="text-muted text-[0.6875rem] font-medium">
                {GUN_KISA[haftaninGunu(gun) - 1]}
              </span>
              <span
                className={cn(
                  'tabular flex size-7 items-center justify-center rounded-full text-sm font-semibold',
                  gun === bugun ? 'bg-accent text-white' : 'text-primary',
                )}
              >
                {Number(gun.slice(8, 10))}
              </span>
            </>
          );
          return (
            <div
              key={gun}
              className="bg-surface border-line sticky top-0 z-20 flex h-14 items-center justify-center border-b border-l"
            >
              {cok ? (
                <Link
                  href={gunAdresi(gun)}
                  aria-label={`${gunBasligi(gun)} — gün görünümü`}
                  aria-current={gun === bugun ? 'date' : undefined}
                  className="focus-ring flex flex-col items-center rounded-lg px-2"
                >
                  {icerik}
                </Link>
              ) : (
                <span className="flex flex-col items-center">{icerik}</span>
              )}
            </div>
          );
        })}

        {/* Tüm gün satırı */}
        <div className="bg-surface border-line text-muted sticky top-14 left-0 z-30 flex items-center justify-center border-b px-0.5 text-center text-[0.625rem] leading-tight">
          tüm gün
        </div>
        {gunler.map((gun) => (
          <div
            key={gun}
            data-tum-gun={gun}
            onClick={() => yeni(gun, null)}
            className="bg-surface border-line sticky top-14 z-20 flex min-h-9 cursor-pointer flex-col gap-0.5 border-b border-l p-0.5"
          >
            {gununOlusumlari(tumGunler, gun).map((o) => (
              <button
                key={o.anahtar}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  ac(o);
                }}
                aria-label={`${o.baslik}, ${olusumZamanMetni(o)}`}
                className={cn(
                  'focus-ring truncate rounded px-1.5 text-left text-xs leading-5',
                  TAKVIM_KATEGORILERI[o.kategori].dolu,
                )}
              >
                {o.baslik}
              </button>
            ))}
          </div>
        ))}

        {/* Saat sütunu */}
        <div
          className="bg-surface text-muted sticky left-0 z-10"
          style={{ height: 24 * SAAT }}
          aria-hidden="true"
        >
          {SAATLER.slice(1).map((s) => (
            <span
              key={s}
              className="tabular absolute right-1.5 -translate-y-1/2 text-[0.625rem]"
              style={{ top: s * SAAT }}
            >
              {saatMetni(s * 60)}
            </span>
          ))}
        </div>
        {gunler.map((gun) => (
          <GunSutunu key={gun} gun={gun} olusumlar={saatliler} simdi={simdi} ac={ac} yeni={yeni} />
        ))}
      </div>
    </div>
  );
}

function GunSutunu({
  gun,
  olusumlar,
  simdi,
  ac,
  yeni,
}: {
  gun: AppDay;
  olusumlar: readonly TakvimOlusumu[];
  simdi: Date | null;
  ac: (o: TakvimOlusumu) => void;
  yeni: (gun: AppDay, dk: number | null) => void;
}) {
  const parcalar = olusumlar.flatMap((o) => {
    const p = gunParcasi(o, gun);
    return p ? [{ o, anahtar: o.anahtar, ...p }] : [];
  });
  const yerlesim = sutunYerlesimi(parcalar);
  const simdiDk = simdi && toAppDay(simdi) === gun ? appWallClockMinutes(simdi) : null;

  const tikla = (e: MouseEvent<HTMLDivElement>) => {
    const kutu = e.currentTarget.getBoundingClientRect();
    const dk = Math.floor((((e.clientY - kutu.top) / SAAT) * 60) / 30) * 30;
    yeni(gun, Math.min(23 * 60 + 30, Math.max(0, dk)));
  };

  return (
    <div
      data-saat-gun={gun}
      onClick={tikla}
      className="border-line relative cursor-pointer border-l"
      style={{
        height: 24 * SAAT,
        backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0 1px, transparent 1px ${SAAT}px)`,
      }}
    >
      {parcalar.map((p) => {
        const y = yerlesim.get(p.anahtar) ?? { sutun: 0, sutunSayisi: 1 };
        const yukseklik = (Math.max(p.bit - p.bas, EN_KISA_KUTU_DK) / 60) * SAAT - 2;
        const k = TAKVIM_KATEGORILERI[p.o.kategori];
        const zaman = olusumZamanMetni(p.o);
        return (
          <button
            key={p.anahtar}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              ac(p.o);
            }}
            aria-label={`${p.o.baslik}, ${zaman}`}
            className="focus-ring bg-surface absolute z-[1] overflow-hidden rounded-md text-left"
            style={{
              top: (p.bas / 60) * SAAT + 1,
              height: yukseklik,
              left: `calc(${(y.sutun / y.sutunSayisi) * 100}% + 2px)`,
              width: `calc(${100 / y.sutunSayisi}% - 4px)`,
            }}
          >
            <span
              className={cn(
                'flex h-full flex-col rounded-md border-l-[3px] px-1.5 py-0.5 text-xs leading-4',
                k.acik,
              )}
            >
              <span className="text-primary truncate font-medium">{p.o.baslik}</span>
              {yukseklik >= 34 && <span className="text-muted tabular truncate">{zaman}</span>}
              {yukseklik >= 52 && p.o.konum && (
                <span className="text-muted truncate">{p.o.konum}</span>
              )}
            </span>
          </button>
        );
      })}
      {simdiDk !== null && (
        <div
          aria-hidden="true"
          data-simdi
          className="bg-danger pointer-events-none absolute inset-x-0 z-[2] h-0.5"
          style={{ top: (simdiDk / 60) * SAAT }}
        >
          <span className="bg-danger absolute -top-1 -left-1 size-2.5 rounded-full" />
        </div>
      )}
    </div>
  );
}
